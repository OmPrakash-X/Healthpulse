from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_db, close_db
from app.config import settings
from app.routers import projects, engines, signals, analytics, faers
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    await connect_db()
    start_scheduler()
    print("🚀 HealthPulse server started")
    yield
    # Shutdown
    stop_scheduler()
    await close_db()
    print("HealthPulse server stopped")


app = FastAPI(
    title="HealthPulse API",
    description="Real-Time Patient Signal Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",      # Vercel preview + production URLs
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(projects.router)
app.include_router(engines.router)
app.include_router(signals.router)
app.include_router(analytics.router)
app.include_router(faers.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "HealthPulse API", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "message": "HealthPulse API",
        "docs": "/docs",
        "health": "/health",
    }
