"""
HBL Compliance Chatbot - FastAPI Main Application
Enterprise-grade AI Compliance Chatbot for HBL Bank Pakistan
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import settings
from app.api import api_router
from app.db.session import init_db, close_db
from app.services.rag.engine import rag_engine

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager
    Handles startup and shutdown events
    """
    # Startup
    logger.info(
        "application_starting",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT
    )
    
    # Initialize database
    try:
        await init_db()
        logger.info("database_initialized")
    except Exception as e:
        logger.error("database_initialization_failed", error=str(e))
    
    # Initialize Milvus vector store
    try:
        rag_engine.initialize()
        logger.info("milvus_vector_store_initialized")
    except Exception as e:
        logger.error("milvus_initialization_failed", error=str(e))
    
    yield
    
    # Shutdown
    logger.info("application_shutting_down")
    
    # Close Milvus connection
    try:
        rag_engine.shutdown()
        logger.info("milvus_connection_closed")
    except Exception as e:
        logger.error("milvus_shutdown_error", error=str(e))
    
    await close_db()
    logger.info("database_connection_closed")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## HBL Compliance Chatbot API
    
    Enterprise-grade AI Compliance Chatbot for HBL Bank Pakistan using RAG architecture.
    
    ### Features
    - **Document Upload**: Upload compliance documents (PDF, DOCX, TXT)
    - **Compliance Analysis**: Analyze queries against SBP regulations and HBL policies
    - **Knowledge Base Search**: Search the compliance knowledge base
    - **Audit Trail**: Track all compliance queries for audit purposes
    
    ### Response Format
    All compliance responses include:
    - Compliance Status (COMPLIANT/PARTIALLY COMPLIANT/NON-COMPLIANT/INSUFFICIENT INFORMATION)
    - Summary
    - Analysis with clause references
    - Violations (if any)
    - Recommendations
    - Disclaimer
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Also include health check at root level
@app.get("/health")
async def root_health():
    """Root health check"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
