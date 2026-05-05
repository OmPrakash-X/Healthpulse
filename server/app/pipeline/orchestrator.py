"""
Pipeline Orchestrator — ties everything together.
Flow: Raw Post → LLM Analysis → Risk Score → Validate → Store Signal
"""
import hashlib
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.pipeline.llm_router import analyze
from app.pipeline.risk_scorer import score_signal
from app.pipeline.signal_validator import validate_signal
from app.models.signal import Signal, SignalEvidence, EntityMention


CONFIDENCE_REVIEW_THRESHOLD = 0.7


async def process_post(db: AsyncIOMotorDatabase, post: dict) -> list[Signal]:
    """
    Process a single raw post through the full pipeline.
    Returns list of signals detected (0-N per post).
    """
    text = post.get("text", "")
    if not text.strip():
        return []

    # --- Step 1: LLM Analysis (Groq → Gemini → Mistral) ---
    analysis = await analyze(text)

    # --- Step 2: Update post with redacted text + model used ---
    await db["raw_posts"].update_one(
        {"_id": post["_id"]},
        {"$set": {
            "text": analysis.redacted_text,
            "pii_detected": analysis.pii_detected,
            "pii_types": analysis.pii_types,
            "processed": True,
            "model_used": analysis.model_used,
        }}
    )

    # If no adverse event detected, skip signal creation
    if not analysis.is_adverse_event or not analysis.drugs or not analysis.symptoms:
        return []

    signals_created = []

    # Create one signal per drug-symptom pair
    for drug in analysis.drugs:
        for symptom in analysis.symptoms:
            # --- Step 3: Risk Scoring ---
            risk_data = await score_signal(db, drug, symptom, analysis.severity)

            # --- Step 4: Cross-platform Validation + FAERS ---
            validation = await validate_signal(
                db, drug, symptom, post.get("project_id", ""),
                current_source=post.get("source", ""),
            )

            # --- Step 5: Build Signal ---
            evidence = SignalEvidence(
                post_id=str(post["_id"]),
                source=post.get("source", "unknown"),
                snippet=text[:300],
                sentiment=analysis.sentiment,
                sentiment_score=analysis.sentiment_score,
            )
            entity_mentions = [
                EntityMention(text=drug, label="DRUG", confidence=analysis.adverse_confidence),
                EntityMention(text=symptom, label="SYMPTOM", confidence=analysis.adverse_confidence),
            ]

            signal = Signal(
                project_id=post.get("project_id", ""),
                drug=drug,
                symptom=symptom,
                severity=risk_data["severity"],
                frequency=risk_data["frequency"],
                velocity=risk_data["velocity"],
                risk_score=risk_data["risk_score"],
                risk_level=risk_data["risk_level"],
                confidence=analysis.adverse_confidence,
                sentiment_avg=analysis.sentiment_score,
                post_ids=[str(post["_id"])],
                platform_count=validation["platform_count"],
                platforms=validation["platforms"],
                faers_match=validation["faers_match"],
                faers_count=validation["faers_count"],
                cross_platform_validated=validation["cross_platform_validated"],
                spike_detected=validation["spike_detected"],
                evidence=[evidence],
                entities=entity_mentions,
                needs_review=analysis.adverse_confidence < CONFIDENCE_REVIEW_THRESHOLD,
            )

            # Upsert: update existing signal for same drug+symptom pair or create new
            signal_dict = signal.model_dump(exclude={"id"})
            existing = await db["signals"].find_one({
                "project_id": post.get("project_id", ""),
                "drug": drug,
                "symptom": symptom,
            })
            if existing:
                # Merge evidence into existing signal
                await db["signals"].update_one(
                    {"_id": existing["_id"]},
                    {
                        "$push": {"post_ids": str(post["_id"]), "evidence": evidence.model_dump()},
                        "$addToSet": {"platforms": post.get("source", "unknown")},
                        "$set": {
                            "risk_score": risk_data["risk_score"],
                            "risk_level": risk_data["risk_level"],
                            "frequency": risk_data["frequency"],
                            "velocity": risk_data["velocity"],
                            "faers_match": validation["faers_match"],
                            "spike_detected": validation["spike_detected"],
                            "platform_count": len(set(existing.get("platforms", [])) | {post.get("source", "unknown")}),
                            "updated_at": datetime.now(timezone.utc),
                        },
                    }
                )
            else:
                await db["signals"].insert_one(signal_dict)

            signals_created.append(signal)

    return signals_created


async def process_batch(db: AsyncIOMotorDatabase, project_id: str, limit: int = 50):
    """Process all unprocessed posts for a project."""
    cursor = db["raw_posts"].find(
        {"project_id": project_id, "processed": False}
    ).limit(limit)
    posts = await cursor.to_list(length=limit)

    total_signals = 0
    for post in posts:
        try:
            signals = await process_post(db, post)
            total_signals += len(signals)
        except Exception as e:
            print(f"[Orchestrator] Failed to process post {post.get('_id')}: {e}")

    print(f"[Orchestrator] Processed {len(posts)} posts → {total_signals} signals for project {project_id}")
    return {"posts_processed": len(posts), "signals_created": total_signals}
