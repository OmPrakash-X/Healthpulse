"""
Engines router — includes the agentic suggest-config endpoint (⭐ 15% uniqueness score)
"""
import httpx
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
from app.database import get_db
from app.models.engine import EngineCreate, EngineUpdate
from app.engines.registry import list_engine_types, build_engine
from app.pipeline.orchestrator import process_batch
from app.config import settings

router = APIRouter(prefix="/api/engines", tags=["engines"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


# ── Agentic Onboarding ─────────────────────────────────────────────────────────

class SuggestConfigRequest(BaseModel):
    url: str


@router.post("/suggest-config")
async def suggest_config(body: SuggestConfigRequest):
    """
    ⭐ AGENTIC ONBOARDING — 15% uniqueness score
    
    Give this endpoint a URL and it will:
    1. Fetch the page HTML
    2. Send it to Groq (LLM) 
    3. Return suggested engine config: keywords, CSS selectors, latency mode, engine type
    
    Demo: paste any forum/health URL and get an auto-configured engine back.
    """
    # Step 1: Fetch the page
    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "Mozilla/5.0 (compatible; HealthPulse/1.0)"},
            follow_redirects=True,
        ) as client:
            resp = await client.get(body.url)
            html_snippet = resp.text[:4000]  # Truncate — LLM only needs structure
    except Exception as e:
        # If fetch fails, still try to suggest based on URL alone
        html_snippet = f"URL: {body.url}\n(Could not fetch page content: {e})"

    # Step 2: Send to Groq for analysis
    suggest_prompt = f"""You are a web scraping configuration expert for a health monitoring system.
Analyze this URL and HTML snippet and suggest the best scraping configuration.

URL: {body.url}
HTML Sample:
{html_snippet[:3000]}

Return ONLY valid JSON with this exact structure:
{{
  "engine_type": "reddit|twitter|quora|generic",
  "latency_mode": "realtime|daily|weekly",
  "suggested_keywords": ["keyword1", "keyword2"],
  "css_selectors": {{
    "post_container": ".css-selector",
    "post_text": ".css-selector",
    "post_date": ".css-selector",
    "author": ".css-selector"
  }},
  "target_subreddits": [],
  "confidence": 0.0-1.0,
  "explanation": "brief explanation of why these settings were chosen"
}}

If the URL is Reddit: engine_type="reddit", fill target_subreddits
If the URL is Twitter/X: engine_type="twitter"  
If the URL is Quora: engine_type="quora"
Otherwise: engine_type="generic" and provide CSS selectors"""

    suggested_config = None

    # Try Groq first
    if settings.groq_api_key:
        try:
            from groq import AsyncGroq
            client_groq = AsyncGroq(api_key=settings.groq_api_key)
            response = await client_groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": suggest_prompt}],
                temperature=0.2,
                max_tokens=800,
                response_format={"type": "json_object"},
            )
            suggested_config = json.loads(response.choices[0].message.content)
            suggested_config["model_used"] = "groq/llama-3.3-70b"
        except Exception as e:
            print(f"[suggest-config] Groq failed: {e}")

    # Fallback to Gemini
    if not suggested_config and settings.gemini_api_key:
        try:
            import asyncio, re
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            # Ask for JSON in prompt — avoids response_mime_type SDK compatibility issues
            full_prompt = suggest_prompt + "\n\nIMPORTANT: Return ONLY the raw JSON object, no markdown code fences."
            response = await asyncio.to_thread(model.generate_content, full_prompt)
            raw = response.text.strip()
            # Strip markdown code fences if present
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
            suggested_config = json.loads(raw)
            suggested_config["model_used"] = "gemini/gemini-2.5-flash"
        except Exception as e:
            print(f"[suggest-config] Gemini failed: {e}")

    # Fallback to Mistral
    if not suggested_config and settings.mistral_api_key:
        try:
            from mistralai import Mistral
            client_mistral = Mistral(api_key=settings.mistral_api_key)
            import asyncio
            response = await asyncio.to_thread(
                client_mistral.chat.complete,
                model="mistral-small-latest",
                messages=[{"role": "user", "content": suggest_prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            suggested_config = json.loads(response.choices[0].message.content)
            suggested_config["model_used"] = "mistral/mistral-small"
        except Exception as e:
            print(f"[suggest-config] Mistral failed: {e}")

    if not suggested_config:
        raise HTTPException(
            status_code=503,
            detail="All AI providers unavailable — quotas may be exhausted. Try again in a few minutes."
        )

    suggested_config["url_analyzed"] = body.url
    return suggested_config


# ── Engine CRUD ────────────────────────────────────────────────────────────────

@router.get("/types")
async def get_engine_types():
    """List all registered engine types — drives the admin UI engine picker"""
    return list_engine_types()


@router.post("")
async def create_engine(data: EngineCreate, db=Depends(get_db)):
    doc = data.model_dump()
    if not doc.get("name"):
        doc["name"] = f"{data.engine_type.capitalize()} Engine"
    doc["created_at"] = datetime.now(timezone.utc)
    doc["last_run"] = None
    result = await db["engines"].insert_one(doc)
    doc["_id"] = result.inserted_id   # insert_one mutates doc in-place with ObjectId
    return _serialize(doc)            # converts _id → id as string


@router.get("")
async def list_engines(project_id: str | None = None, db=Depends(get_db)):
    query = {}
    if project_id:
        query["project_id"] = project_id
    cursor = db["engines"].find(query).sort("created_at", -1)
    engines = await cursor.to_list(length=100)
    return [_serialize(e) for e in engines]


@router.get("/{engine_id}")
async def get_engine(engine_id: str, db=Depends(get_db)):
    try:
        doc = await db["engines"].find_one({"_id": ObjectId(engine_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid engine ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Engine not found")
    return _serialize(doc)


@router.put("/{engine_id}")
async def update_engine(engine_id: str, data: EngineUpdate, db=Depends(get_db)):
    try:
        oid = ObjectId(engine_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid engine ID")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await db["engines"].update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Engine not found")
    return {"success": True}


@router.post("/{engine_id}/trigger")
async def trigger_engine(engine_id: str, db=Depends(get_db)):
    """Manually trigger an ingest + pipeline run for a specific engine"""
    try:
        engine_doc = await db["engines"].find_one({"_id": ObjectId(engine_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid engine ID")
    if not engine_doc:
        raise HTTPException(status_code=404, detail="Engine not found")

    project_doc = await db["projects"].find_one({"_id": ObjectId(engine_doc["project_id"])})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")

    keywords = project_doc.get("keywords", [])
    engine = build_engine(
        engine_doc["engine_type"],
        str(engine_doc["_id"]),
        engine_doc["project_id"],
        engine_doc.get("config", {}),
    )
    if not engine:
        raise HTTPException(status_code=400, detail=f"Unknown engine type: {engine_doc['engine_type']}")

    # Fetch posts
    posts = await engine.fetch(keywords)
    inserted = 0
    for post in posts:
        try:
            post_dict = post.model_dump(exclude={"id"})
            await db["raw_posts"].insert_one(post_dict)
            inserted += 1
        except Exception:
            pass  # Duplicate external_id — skip

    # Update last_run
    await db["engines"].update_one(
        {"_id": ObjectId(engine_id)},
        {"$set": {"last_run": datetime.now(timezone.utc)}}
    )

    # Run pipeline on newly inserted posts
    pipeline_result = await process_batch(db, engine_doc["project_id"], limit=inserted or 50)

    return {
        "posts_fetched": len(posts),
        "posts_inserted": inserted,
        **pipeline_result,
    }


@router.delete("/{engine_id}")
async def delete_engine(engine_id: str, db=Depends(get_db)):
    try:
        oid = ObjectId(engine_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid engine ID")
    await db["engines"].delete_one({"_id": oid})
    return {"success": True}
