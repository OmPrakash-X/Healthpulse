from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from typing import Optional
from app.database import get_db

router = APIRouter(prefix="/api/signals", tags=["signals"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("")
async def list_signals(
    project_id: Optional[str] = None,
    drug: Optional[str] = None,
    risk_level: Optional[str] = None,
    min_confidence: Optional[float] = None,
    faers_match: Optional[bool] = None,
    needs_review: Optional[bool] = None,
    limit: int = Query(default=50, le=200),
    skip: int = 0,
    db=Depends(get_db),
):
    query: dict = {}
    if project_id:
        query["project_id"] = project_id
    if drug:
        query["drug"] = {"$regex": drug, "$options": "i"}
    if risk_level:
        query["risk_level"] = risk_level
    if min_confidence is not None:
        query["confidence"] = {"$gte": min_confidence}
    if faers_match is not None:
        query["faers_match"] = faers_match
    if needs_review is not None:
        query["needs_review"] = needs_review

    cursor = db["signals"].find(query).sort("risk_score", -1).skip(skip).limit(limit)
    signals = await cursor.to_list(length=limit)
    total = await db["signals"].count_documents(query)
    return {"total": total, "signals": [_serialize(s) for s in signals]}


@router.get("/timeline")
async def signals_timeline(
    project_id: Optional[str] = None,
    drug: Optional[str] = None,
    days: int = 30,
    db=Depends(get_db),
):
    """Time-series signal count by day — powers the timeline chart"""
    from datetime import datetime, timedelta, timezone
    since = datetime.now(timezone.utc) - timedelta(days=days)
    match: dict = {"created_at": {"$gte": since}}
    if project_id:
        match["project_id"] = project_id
    if drug:
        match["drug"] = {"$regex": drug, "$options": "i"}

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "risk_level": "$risk_level",
            },
            "count": {"$sum": 1},
            "avg_risk": {"$avg": "$risk_score"},
        }},
        {"$sort": {"_id.date": 1}},
    ]
    results = await db["signals"].aggregate(pipeline).to_list(length=1000)
    return results


@router.get("/{signal_id}")
async def get_signal(signal_id: str, db=Depends(get_db)):
    try:
        doc = await db["signals"].find_one({"_id": ObjectId(signal_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signal ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Signal not found")
    return _serialize(doc)


@router.patch("/{signal_id}/review")
async def mark_reviewed(signal_id: str, db=Depends(get_db)):
    """Mark a signal as reviewed (removes from manual review queue)"""
    try:
        oid = ObjectId(signal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signal ID")
    await db["signals"].update_one({"_id": oid}, {"$set": {"needs_review": False}})
    return {"success": True}
