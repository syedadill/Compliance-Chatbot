"""
HBL Compliance Chatbot - Health Check API Routes
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_db
from app.schemas import HealthCheck
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheck)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Health check endpoint
    
    Returns the status of the application and its dependencies.
    """
    # Check database connection
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
    
    # Check vector store (pgvector)
    vector_status = "ready"
    try:
        result = await db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'"))
        if not result.scalar():
            vector_status = "extension not installed"
    except Exception:
        vector_status = "error"
    
    return HealthCheck(
        status="healthy" if db_status == "connected" else "unhealthy",
        version=settings.APP_VERSION,
        database=db_status,
        vector_store=vector_status
    )


@router.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Enterprise-grade AI Compliance Chatbot for HBL Bank Pakistan",
        "docs": "/docs"
    }
