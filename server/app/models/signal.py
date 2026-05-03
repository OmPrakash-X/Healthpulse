from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class EntityMention(BaseModel):
    text: str
    label: str      # "DRUG" | "DISEASE" | "SYMPTOM"
    confidence: float


class SignalEvidence(BaseModel):
    post_id: str
    source: str
    snippet: str    # relevant excerpt from post
    sentiment: str
    sentiment_score: float


class Signal(BaseModel):
    """A validated adverse/safety signal detected from posts"""
    id: Optional[str] = Field(default=None, alias="_id")
    project_id: str
    drug: str
    symptom: str
    # Risk scoring components
    severity: float         # S: 1-5
    frequency: float        # F: 1-5 (normalized count)
    velocity: float         # V: 1-5 (trend speed)
    risk_score: float       # 0.4*S + 0.3*F + 0.3*V
    risk_level: str         # "low" | "moderate" | "high"
    # NLP outputs
    confidence: float       # 0-1 overall confidence
    sentiment_avg: float    # average sentiment score across posts
    # Validation
    post_ids: list[str] = []
    platform_count: int = 1         # how many platforms this appeared on
    platforms: list[str] = []
    faers_match: bool = False       # found in OpenFDA FAERS
    faers_count: Optional[int] = None
    cross_platform_validated: bool = False
    spike_detected: bool = False
    # Traceability
    evidence: list[SignalEvidence] = []
    entities: list[EntityMention] = []
    needs_review: bool = False      # flagged if confidence < 0.7
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class SignalFilter(BaseModel):
    project_id: Optional[str] = None
    drug: Optional[str] = None
    risk_level: Optional[str] = None
    min_confidence: Optional[float] = None
    faers_match: Optional[bool] = None
    limit: int = 50
    skip: int = 0
