"""
Risk Scorer — pure Python, no AI needed.
Formula: Risk = 0.4*S + 0.3*F + 0.3*V
  S = Severity (1-5) — from LLM analysis output
  F = Frequency (1-5) — normalized count of same drug+symptom in last 30 days
  V = Velocity (1-5) — rate of increase vs 30-day baseline
"""
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase


RISK_THRESHOLDS = {"low": 2.0, "moderate": 3.5}  # > 3.5 = high


def compute_risk_level(risk_score: float) -> str:
    if risk_score <= RISK_THRESHOLDS["low"]:
        return "low"
    elif risk_score <= RISK_THRESHOLDS["moderate"]:
        return "moderate"
    return "high"


def normalize_to_scale(value: float, min_val: float, max_val: float) -> float:
    """Normalize a value to 1-5 scale"""
    if max_val == min_val:
        return 1.0
    normalized = (value - min_val) / (max_val - min_val)
    return round(1 + normalized * 4, 2)


async def compute_frequency_score(db: AsyncIOMotorDatabase, drug: str, symptom: str) -> float:
    """F: How many times this drug+symptom combo appeared in last 30 days (normalized 1-5)"""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    count = await db["signals"].count_documents({
        "drug": {"$regex": drug, "$options": "i"},
        "symptom": {"$regex": symptom, "$options": "i"},
        "created_at": {"$gte": since},
    })
    # Cap at 20 occurrences for normalization
    return normalize_to_scale(min(count, 20), 0, 20)


async def compute_velocity_score(db: AsyncIOMotorDatabase, drug: str, symptom: str) -> float:
    """V: Rate of increase — last 7 days vs previous 23 days (normalized 1-5)"""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    query_base = {
        "drug": {"$regex": drug, "$options": "i"},
        "symptom": {"$regex": symptom, "$options": "i"},
    }
    recent_count = await db["signals"].count_documents({
        **query_base, "created_at": {"$gte": week_ago}
    })
    baseline_count = await db["signals"].count_documents({
        **query_base, "created_at": {"$gte": month_ago, "$lt": week_ago}
    })

    if baseline_count == 0:
        return 3.0 if recent_count > 0 else 1.0  # new signal with no history = moderate velocity

    # Daily rate comparison
    recent_daily = recent_count / 7
    baseline_daily = baseline_count / 23
    ratio = recent_daily / baseline_daily

    # ratio > 3x = high velocity (5), 1x = neutral (3), 0 = (1)
    return min(5.0, max(1.0, round(ratio * 1.5, 2)))


async def score_signal(
    db: AsyncIOMotorDatabase,
    drug: str,
    symptom: str,
    severity: int,  # from LLM output (1-5)
) -> dict:
    s = float(max(1, min(5, severity)))
    f = await compute_frequency_score(db, drug, symptom)
    v = await compute_velocity_score(db, drug, symptom)

    risk_score = round(0.4 * s + 0.3 * f + 0.3 * v, 3)
    risk_level = compute_risk_level(risk_score)

    return {
        "severity": s,
        "frequency": f,
        "velocity": v,
        "risk_score": risk_score,
        "risk_level": risk_level,
    }
