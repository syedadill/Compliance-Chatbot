"""
HBL Compliance Chatbot - Configuration Settings
Enterprise-grade settings with environment-based configuration
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Optional, List, Union
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with validation"""
    
    # Application
    APP_NAME: str = "HBL Compliance Chatbot"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (PostgreSQL for metadata)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/compliance_db",
        description="PostgreSQL connection string"
    )
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Milvus Vector Database
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    MILVUS_COLLECTION_NAME: str = "compliance_chunks"
    
    # Google Gemini (LLM + Embeddings)
    GEMINI_API_KEY: str = Field(
        default="",
        description="Google Gemini API Key"
    )
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    
    # Embedding Configuration (Gemini text-embedding-004 = 768 dimensions)
    EMBEDDING_DIMENSION: int = 3072
    CHUNK_SIZE: int = 400  # Optimized for legal text
    CHUNK_OVERLAP: int = 50
    
    # RAG Configuration
    TOP_K_RESULTS: int = 5
    MIN_SIMILARITY_THRESHOLD: float = 0.25  # Lowered for better recall with legal documents
    CONFIDENCE_THRESHOLD: float = 0.9
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: Union[str, List[str]] = [".pdf", ".docx", ".txt", ".xlsx"]
    UPLOAD_DIR: str = "./uploads"
    
    # Security
    SECRET_KEY: str = Field(
        default="your-super-secret-key-change-in-production",
        description="Secret key for JWT"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - accepts comma-separated string or JSON array from env
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list"""
        if isinstance(v, str):
            # Handle comma-separated values
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000"]
    
    @field_validator("ALLOWED_EXTENSIONS", mode="before")
    @classmethod
    def parse_allowed_extensions(cls, v):
        """Parse allowed extensions from comma-separated string or list"""
        if isinstance(v, str):
            return [ext.strip() for ext in v.split(",") if ext.strip()]
        elif isinstance(v, list):
            return v
        return [".pdf", ".docx", ".txt", ".xlsx"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
