from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class RawPost(BaseModel):
    """Raw post as stored in MongoDB — text is PII-redacted before storage"""
    id: Optional[str] = Field(default=None, alias="_id")
    project_id: str
    engine_id: str
    source: str                     # "reddit" | "twitter" | "quora"
    external_id: str                # platform's own ID
    text: str                       # PII-redacted content
    original_url: Optional[str] = None
    author_hash: Optional[str] = None   # SHA256 of username — never stored plain
    timestamp: datetime             # when post was made on platform
    ingested_at: datetime = Field(default_factory=utcnow)
    pii_detected: bool = False
    pii_types: list[str] = []       # e.g. ["PERSON", "PHONE_NUMBER"]
    processed: bool = False
    metadata: dict[str, Any] = {}   # source-specific extra fields

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}
