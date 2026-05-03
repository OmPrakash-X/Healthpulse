from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime, timezone


def utcnow():
    return datetime.now(timezone.utc)


class EngineConfig(BaseModel):
    """Flexible config dict — each engine type defines its own schema"""
    subreddits: Optional[list[str]] = None      # reddit
    search_query_template: Optional[str] = None  # twitter
    target_urls: Optional[list[str]] = None      # quora/generic scraper
    max_results: int = 50
    extra: dict[str, Any] = {}


class EngineCreate(BaseModel):
    project_id: str
    engine_type: str          # "reddit" | "twitter" | "quora"
    name: str = ""            # auto-filled on create if empty
    latency_mode: str = "daily"  # "realtime" | "daily" | "weekly"
    config: dict = Field(default_factory=dict)
    is_active: bool = True


class EngineDB(EngineCreate):
    id: Optional[str] = Field(default=None, alias="_id")
    last_run: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class EngineUpdate(BaseModel):
    name: Optional[str] = None
    latency_mode: Optional[str] = None
    config: Optional[EngineConfig] = None
    is_active: Optional[bool] = None
