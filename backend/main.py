import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from database import engine
from api.events import router as events_router
from api.auth import router as auth_router
from api.registrations import router as registrations_router
from api.profiles import router as profiles_router
from api.admin import router as admin_router

load_dotenv()
logger = logging.getLogger(__name__)
allowed_origins = [origin.strip() for origin in os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
).split(",") if origin.strip()]

app = FastAPI(
    title="Event Registration & Management System",
    description="Backend API for Nowshera Events Co.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(auth_router)
app.include_router(registrations_router)
app.include_router(profiles_router)
app.include_router(admin_router)

@app.get("/")
def home():
    return {
        "message": "Event Management System API is running!",
        "status": "success",
    }


@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
        }

    except Exception:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database is unavailable")
    