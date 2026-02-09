"""
HBL Compliance Chatbot - API Routes Module
"""

from fastapi import APIRouter

from app.api.documents import router as documents_router
from app.api.compliance import router as compliance_router
from app.api.health import router as health_router
from app.api.knowledgebases import router as knowledgebases_router

# Main API router
api_router = APIRouter()

# Include all routers
api_router.include_router(health_router)
api_router.include_router(documents_router)
api_router.include_router(compliance_router)
api_router.include_router(knowledgebases_router)

__all__ = ["api_router"]
