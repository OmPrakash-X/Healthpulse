from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db():
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongo_uri)
    _db = _client[settings.db_name]
    # Create indexes
    await _db["raw_posts"].create_index([("project_id", 1), ("source", 1)])
    await _db["raw_posts"].create_index([("external_id", 1), ("source", 1)], unique=True)
    await _db["signals"].create_index([("project_id", 1), ("created_at", -1)])
    await _db["signals"].create_index([("drug", 1), ("symptom", 1)])
    print("✅ MongoDB connected and indexes created")


async def close_db():
    global _client
    if _client:
        _client.close()
        print("MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db
