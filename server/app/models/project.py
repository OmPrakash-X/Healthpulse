from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId


def utcnow():
    return datetime.now(timezone.utc)


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    keywords: list[str] = []
    sources: list[str] = []   # ["reddit", "twitter", "quora"]
    status: str = "active"    # active | paused


class ProjectDB(ProjectCreate):
    id: Optional[str] = Field(default=None, alias="_id")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[list[str]] = None
    sources: Optional[list[str]] = None
    status: Optional[str] = None
