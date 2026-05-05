"""
Signal Validator — pure Python + MongoDB queries.
Cross-platform validation and spike detection.
FAERS cross-reference via free OpenFDA API.
"""
import httpx
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.config import settings


async def validate_signal(
    db: AsyncIOMotorDatabase,
    drug: str,
    symptom: str,
    project_id: str,
    current_source: str = "",
) -> dict:
    """
    Returns validation metadata for a drug+symptom pair.
    """
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    query = {
        "project_id": project_id,
        "drug": {"$regex": drug, "$options": "i"},
        "symptom": {"$regex": symptom, "$options": "i"},
    }

    # --- Platform count ---
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$platforms", "count": {"$sum": 1}}},
    ]
    platform_docs = await db["signals"].aggregate(pipeline).to_list(length=100)
    all_platforms = set()
    if current_source:                    # always include the current post's platform
        all_platforms.add(current_source)
    for doc in platform_docs:
        if isinstance(doc.get("_id"), list):
            all_platforms.update(doc["_id"])
    platform_count = len(all_platforms)

    # --- Spike detection ---
    recent = await db["signals"].count_documents({**query, "created_at": {"$gte": week_ago}})
    baseline = await db["signals"].count_documents({
        **query, "created_at": {"$gte": month_ago, "$lt": week_ago}
    })
    baseline_weekly_avg = baseline / 3.28  # 23 days / 7
    spike_detected = recent > max(3, baseline_weekly_avg * 2)

    # --- FAERS cross-reference ---
    faers_match, faers_count = await check_faers(drug, symptom)

    return {
        "platform_count": platform_count,
        "platforms": list(all_platforms),
        "cross_platform_validated": platform_count >= 2,
        "spike_detected": spike_detected,
        "faers_match": faers_match,
        "faers_count": faers_count,
    }


async def check_faers(drug: str, symptom: str) -> tuple[bool, int]:
    """Query OpenFDA FAERS API — completely free, no API key needed."""
    try:
        url = settings.faers_base_url
        params = {
            "search": f'patient.drug.medicinalproduct:"{drug}"+AND+patient.reaction.reactionmeddrapt:"{symptom}"',
            "limit": 1,
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                total = data.get("meta", {}).get("results", {}).get("total", 0)
                return total > 0, total
    except Exception as e:
        print(f"[FAERS] Check failed: {e}")
    return False, 0
