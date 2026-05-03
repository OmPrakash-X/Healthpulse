from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
async def get_overview(project_id: Optional[str] = None, db=Depends(get_db)):
    """Main dashboard stats card data"""
    query = {"project_id": project_id} if project_id else {}

    total_posts = await db["raw_posts"].count_documents(query)
    total_signals = await db["signals"].count_documents(query)
    high_risk = await db["signals"].count_documents({**query, "risk_level": "high"})
    moderate_risk = await db["signals"].count_documents({**query, "risk_level": "moderate"})
    pii_flagged = await db["raw_posts"].count_documents({**query, "pii_detected": True})
    needs_review = await db["signals"].count_documents({**query, "needs_review": True})
    faers_validated = await db["signals"].count_documents({**query, "faers_match": True})
    cross_platform = await db["signals"].count_documents({**query, "cross_platform_validated": True})
    total_projects = await db["projects"].count_documents({})

    return {
        "total_posts": total_posts,
        "total_signals": total_signals,
        "high_risk_signals": high_risk,
        "moderate_risk_signals": moderate_risk,
        "low_risk_signals": total_signals - high_risk - moderate_risk,
        "pii_flagged_posts": pii_flagged,
        "needs_review": needs_review,
        "faers_validated": faers_validated,
        "cross_platform_signals": cross_platform,
        "total_projects": total_projects,
    }


@router.get("/trending-drugs")
async def trending_drugs(
    project_id: Optional[str] = None,
    days: int = 7,
    limit: int = 10,
    db=Depends(get_db),
):
    """Top drugs by signal count in the last N days"""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    match: dict = {"created_at": {"$gte": since}}
    if project_id:
        match["project_id"] = project_id

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": "$drug",
            "count": {"$sum": 1},
            "avg_risk": {"$avg": "$risk_score"},
            "max_risk": {"$max": "$risk_score"},
            "faers_matches": {"$sum": {"$cond": ["$faers_match", 1, 0]}},
        }},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    results = await db["signals"].aggregate(pipeline).to_list(length=limit)
    return [{"drug": r["_id"], **{k: v for k, v in r.items() if k != "_id"}} for r in results]


@router.get("/sentiment")
async def sentiment_distribution(project_id: Optional[str] = None, db=Depends(get_db)):
    """Sentiment breakdown across all processed posts"""
    query = {"project_id": project_id} if project_id else {}
    pipeline = [
        {"$match": {**query, "processed": True}},
        {"$group": {"_id": None, "texts": {"$push": "$pii_types"}}},
    ]
    # Use signals' sentiment_avg for distribution
    sig_query = {"project_id": project_id} if project_id else {}
    pipeline2 = [
        {"$match": sig_query},
        {"$bucket": {
            "groupBy": "$sentiment_avg",
            "boundaries": [0, 0.2, 0.4, 0.6, 0.8, 1.01],
            "default": "other",
            "output": {"count": {"$sum": 1}},
        }},
    ]
    buckets = await db["signals"].aggregate(pipeline2).to_list(length=10)
    labels = ["Very Negative", "Negative", "Neutral", "Positive", "Very Positive"]
    result = []
    for i, b in enumerate(buckets[:5]):
        result.append({"label": labels[i] if i < len(labels) else "Other", "count": b["count"]})
    return result


@router.get("/risk-distribution")
async def risk_distribution(project_id: Optional[str] = None, db=Depends(get_db)):
    query = {"project_id": project_id} if project_id else {}
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}},
    ]
    results = await db["signals"].aggregate(pipeline).to_list(length=10)
    return [{"level": r["_id"], "count": r["count"]} for r in results]


@router.get("/platform-breakdown")
async def platform_breakdown(project_id: Optional[str] = None, db=Depends(get_db)):
    """Post count by source platform"""
    query = {"project_id": project_id} if project_id else {}
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$source", "count": {"$sum": 1}, "pii_flagged": {"$sum": {"$cond": ["$pii_detected", 1, 0]}}}},
    ]
    results = await db["raw_posts"].aggregate(pipeline).to_list(length=10)
    return [{"platform": r["_id"], "count": r["count"], "pii_flagged": r["pii_flagged"]} for r in results]


@router.get("/drug-symptom-matrix")
async def drug_symptom_matrix(project_id: Optional[str] = None, limit: int = 20, db=Depends(get_db)):
    """Top drug-symptom pairs for heatmap"""
    query = {"project_id": project_id} if project_id else {}
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {"drug": "$drug", "symptom": "$symptom"},
            "count": {"$sum": 1},
            "avg_risk": {"$avg": "$risk_score"},
        }},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    results = await db["signals"].aggregate(pipeline).to_list(length=limit)
    return [{"drug": r["_id"]["drug"], "symptom": r["_id"]["symptom"], "count": r["count"], "avg_risk": r["avg_risk"]} for r in results]
