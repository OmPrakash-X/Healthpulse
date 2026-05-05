"""
APScheduler — runs engine ingestion on configurable latency modes.
realtime → every 5 minutes
daily    → every 24 hours  
weekly   → every 7 days
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone, timedelta
from bson import ObjectId

_scheduler: AsyncIOScheduler | None = None


async def _run_scheduled_engines():
    """Fetch all active engines and trigger ingest for due ones"""
    try:
        from app.database import get_db
        from app.engines.registry import build_engine
        from app.pipeline.orchestrator import process_batch

        db = get_db()
        now = datetime.now(timezone.utc)
        now_naive = datetime.utcnow()  # naive UTC — matches MongoDB stored datetimes

        cursor = db["engines"].find({"is_active": True})
        engines = await cursor.to_list(length=100)

        for engine_doc in engines:
            last_run = engine_doc.get("last_run")  # MongoDB returns naive datetime
            latency = engine_doc.get("latency_mode", "daily")

            intervals = {"realtime": timedelta(minutes=5), "daily": timedelta(days=1), "weekly": timedelta(days=7)}
            due_interval = intervals.get(latency, timedelta(days=1))

            if last_run and (now_naive - last_run) < due_interval:
                continue  # Not due yet

            try:
                project = await db["projects"].find_one({"_id": ObjectId(engine_doc["project_id"])})
            except Exception:
                project = None

            keywords = project.get("keywords", [])
            engine = build_engine(
                engine_doc["engine_type"],
                str(engine_doc["_id"]),
                engine_doc["project_id"],
                engine_doc.get("config", {}),
            )
            if not engine:
                continue

            posts = await engine.fetch(keywords)
            for post in posts:
                try:
                    await db["raw_posts"].insert_one(post.model_dump(exclude={"id"}))
                except Exception:
                    pass

            await db["engines"].update_one(
                {"_id": engine_doc["_id"]},
                {"$set": {"last_run": now}}
            )
            await process_batch(db, engine_doc["project_id"])
    except Exception as e:
        print(f"[Scheduler] Error: {e}")


def start_scheduler():
    """Only starts the auto-scheduler if ENABLE_SCHEDULER=true in env.
    By default it is OFF to preserve free-tier LLM API quotas.
    Manual triggers via POST /api/engines/{id}/trigger always work regardless.
    """
    import os
    global _scheduler

    if os.getenv("ENABLE_SCHEDULER", "false").lower() != "true":
        print("⏸️  APScheduler disabled (ENABLE_SCHEDULER != true). Manual triggers still work.")
        return

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _run_scheduled_engines,
        trigger=IntervalTrigger(minutes=5),
        id="engine_scheduler",
        name="Engine Scheduler",
        replace_existing=True,
    )
    _scheduler.start()
    print("✅ APScheduler started (checks engines every 5 min)")


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
