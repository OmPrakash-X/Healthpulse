from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from app.database import get_db
from app.models.project import ProjectCreate, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.post("")
async def create_project(data: ProjectCreate, db=Depends(get_db)):
    doc = data.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    doc["updated_at"] = datetime.now(timezone.utc)
    result = await db["projects"].insert_one(doc)
    return _serialize(doc)


@router.get("")
async def list_projects(db=Depends(get_db)):
    cursor = db["projects"].find().sort("created_at", -1)
    projects = await cursor.to_list(length=100)
    result = []
    for p in projects:
        p = _serialize(p)
        # Add quick stats
        p["signal_count"] = await db["signals"].count_documents({"project_id": p["id"]})
        p["post_count"] = await db["raw_posts"].count_documents({"project_id": p["id"]})
        result.append(p)
    return result


@router.get("/{project_id}")
async def get_project(project_id: str, db=Depends(get_db)):
    try:
        doc = await db["projects"].find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    p = _serialize(doc)
    p["signal_count"] = await db["signals"].count_documents({"project_id": project_id})
    p["post_count"] = await db["raw_posts"].count_documents({"project_id": project_id})
    p["high_risk_count"] = await db["signals"].count_documents({"project_id": project_id, "risk_level": "high"})
    return p


@router.put("/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, db=Depends(get_db)):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db["projects"].update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}


@router.delete("/{project_id}")
async def delete_project(project_id: str, db=Depends(get_db)):
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    await db["projects"].delete_one({"_id": oid})
    return {"success": True}
