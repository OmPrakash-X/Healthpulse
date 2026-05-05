"""
Seed script — populates MongoDB with realistic demo data.
Run once before demo: python scripts/seed.py

Inserts directly (no LLM calls) so it's instant.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.config import settings

def ts(days_ago: float = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


async def seed():
    client = AsyncIOMotorClient(settings.mongo_uri)
    db = client[settings.db_name]

    # Clear existing data
    for col in ["projects", "engines", "raw_posts", "signals"]:
        await db[col].drop()
    print("✓ Cleared existing collections")

    # ── Project ────────────────────────────────────────────────────
    project_result = await db["projects"].insert_one({
        "name": "OTC Drug Watch India",
        "description": "Monitor adverse events from OTC drugs shared across Reddit, X, and Quora",
        "keywords": ["paracetamol", "dolo-650", "crocin", "ibuprofen", "azithromycin", "metformin"],
        "is_active": True,
        "created_at": ts(7),
        "updated_at": ts(0),
    })
    project_id = str(project_result.inserted_id)
    print(f"✓ Project created: {project_id}")

    project_result2 = await db["projects"].insert_one({
        "name": "Antibiotic Resistance Watch",
        "description": "Track self-medication patterns with antibiotics",
        "keywords": ["amoxicillin", "azithromycin", "ciprofloxacin", "levofloxacin"],
        "is_active": True,
        "created_at": ts(3),
        "updated_at": ts(0),
    })
    print(f"✓ Project 2 created: {project_result2.inserted_id}")

    # ── Engines ────────────────────────────────────────────────────
    await db["engines"].insert_many([
        {"project_id": project_id, "engine_type": "twitter", "latency_mode": "realtime", "config": {}, "is_active": True, "last_run": ts(0.003), "created_at": ts(7)},
        {"project_id": project_id, "engine_type": "quora",   "latency_mode": "daily",    "config": {}, "is_active": True, "last_run": ts(0.1),   "created_at": ts(7)},
    ])
    print("✓ Engines created")

    # ── Raw Posts ──────────────────────────────────────────────────
    posts_data = [
        {"source": "twitter", "text": "Been taking Dolo 650 for 3 days for fever. Now feeling very dizzy and liver area is hurting badly. Should I stop?", "keyword": "dolo-650"},
        {"source": "quora",   "text": "Paracetamol 500mg twice daily for chronic pain. After 2 weeks I have severe nausea and loss of appetite every morning.", "keyword": "paracetamol"},
        {"source": "twitter", "text": "Azithromycin day 3 - stomach pain is unbearable. Loose motions since yesterday. Is this normal antibiotic reaction?", "keyword": "azithromycin"},
        {"source": "quora",   "text": "Started metformin for diabetes 2 weeks ago. Constant headache and extreme fatigue. Is this from metformin?", "keyword": "metformin"},
        {"source": "twitter", "text": "Amoxicillin gave me full body rash within 6 hours of first dose. Rushed to emergency. Allergic reaction confirmed.", "keyword": "amoxicillin"},
        {"source": "quora",   "text": "Pantoprazole daily for 6 months now. My joints are aching constantly. Doctor says unrelated but started exactly when I took this medicine.", "keyword": "pantoprazole"},
        {"source": "twitter", "text": "Dolo 650 se mujhe chakkar aa rahe hain aur ulti jaisi feel ho rahi hai. Koi bata sakta hai ye side effects hain?", "keyword": "dolo-650"},
        {"source": "quora",   "text": "Ibuprofen 400mg for tooth pain. After 5 days my stomach is burning and I see some blood in stool. Very worried.", "keyword": "ibuprofen"},
        {"source": "twitter", "text": "Cetirizine makes me so drowsy I cannot function at work. But without it my allergies are unbearable.", "keyword": "cetirizine"},
        {"source": "quora",   "text": "Crocin fever tablet 3 times a day for 5 days. Now my urine is dark yellow. Is this kidney damage?", "keyword": "crocin"},
    ]

    post_docs = []
    for i, p in enumerate(posts_data):
        post_docs.append({
            "project_id": project_id,
            "engine_id": "seed",
            "source": p["source"],
            "external_id": f"seed_{i}",
            "text": p["text"],
            "original_url": f"https://{p['source']}.com/post/{i}",
            "author_hash": f"anon_{i:03d}",
            "timestamp": ts(i * 0.3),
            "processed": True,
            "pii_detected": False,
            "pii_types": [],
            "model_used": "groq/llama-3.3-70b",
            "metadata": {"keyword": p["keyword"]},
        })
    await db["raw_posts"].insert_many(post_docs)
    print(f"✓ {len(post_docs)} posts inserted")

    # ── Signals ────────────────────────────────────────────────────
    signals_data = [
        {"drug": "Dolo-650",     "symptom": "Liver pain",    "risk_level": "high",     "risk_score": 4.2, "severity": 4, "confidence": 0.91, "platforms": ["twitter", "quora"], "faers_match": True,  "days_ago": 0.1},
        {"drug": "Dolo-650",     "symptom": "Dizziness",     "risk_level": "high",     "risk_score": 3.8, "severity": 4, "confidence": 0.88, "platforms": ["twitter"],          "faers_match": True,  "days_ago": 0.5},
        {"drug": "Paracetamol",  "symptom": "Nausea",        "risk_level": "moderate", "risk_score": 3.1, "severity": 3, "confidence": 0.78, "platforms": ["quora"],            "faers_match": True,  "days_ago": 1.0},
        {"drug": "Amoxicillin",  "symptom": "Allergic rash", "risk_level": "high",     "risk_score": 4.0, "severity": 4, "confidence": 0.93, "platforms": ["twitter"],          "faers_match": True,  "days_ago": 0.2},
        {"drug": "Azithromycin", "symptom": "Stomach pain",  "risk_level": "moderate", "risk_score": 2.9, "severity": 3, "confidence": 0.82, "platforms": ["twitter"],          "faers_match": False, "days_ago": 1.5},
        {"drug": "Metformin",    "symptom": "Headache",      "risk_level": "low",      "risk_score": 2.1, "severity": 2, "confidence": 0.71, "platforms": ["quora"],            "faers_match": False, "days_ago": 2.0},
        {"drug": "Ibuprofen",    "symptom": "GI bleeding",   "risk_level": "high",     "risk_score": 4.5, "severity": 5, "confidence": 0.95, "platforms": ["quora"],            "faers_match": True,  "days_ago": 0.8},
        {"drug": "Pantoprazole", "symptom": "Joint pain",    "risk_level": "moderate", "risk_score": 2.7, "severity": 3, "confidence": 0.74, "platforms": ["quora"],            "faers_match": False, "days_ago": 3.0},
        {"drug": "Crocin",       "symptom": "Dark urine",    "risk_level": "high",     "risk_score": 3.9, "severity": 4, "confidence": 0.87, "platforms": ["quora"],            "faers_match": True,  "days_ago": 0.4},
        {"drug": "Cetirizine",   "symptom": "Drowsiness",    "risk_level": "low",      "risk_score": 1.9, "severity": 1, "confidence": 0.65, "platforms": ["twitter"],          "faers_match": False, "days_ago": 4.0},
    ]

    signal_docs = []
    for s in signals_data:
        signal_docs.append({
            "project_id": project_id,
            "drug": s["drug"],
            "symptom": s["symptom"],
            "risk_level": s["risk_level"],
            "risk_score": s["risk_score"],
            "severity": s["severity"],
            "frequency": round(s["risk_score"] * 0.8, 2),
            "velocity": round(s["risk_score"] * 0.7, 2),
            "confidence": s["confidence"],
            "sentiment_avg": 1 - s["confidence"] * 0.4,
            "post_ids": [],
            "platform_count": len(s["platforms"]),
            "platforms": s["platforms"],
            "faers_match": s["faers_match"],
            "faers_count": 12 if s["faers_match"] else 0,
            "cross_platform_validated": len(s["platforms"]) >= 2,
            "spike_detected": s["risk_score"] > 3.5,
            "evidence": [],
            "entities": [],
            "needs_review": s["confidence"] < 0.75,
            "created_at": ts(s["days_ago"]),
            "updated_at": ts(s["days_ago"]),
        })
    await db["signals"].insert_many(signal_docs)
    print(f"✓ {len(signal_docs)} signals inserted")

    # ── Stats summary ───────────────────────────────────────────────
    total_posts = await db["raw_posts"].count_documents({})
    total_signals = await db["signals"].count_documents({})
    high_risk = await db["signals"].count_documents({"risk_level": "high"})
    print(f"\n🚀 Seed complete!")
    print(f"   Posts:   {total_posts}")
    print(f"   Signals: {total_signals} ({high_risk} high risk)")
    print(f"\nOpen http://localhost:3000/dashboard to see the dashboard with real data.")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
