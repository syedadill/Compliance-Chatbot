"""
HBL Compliance Chatbot - Pydantic Schemas
Request/Response models with strict validation
"""

from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from enum import Enum


# ============== Enums ==============

class ComplianceStatusEnum(str, Enum):
    """Compliance status options"""
    COMPLIANT = "COMPLIANT"
    PARTIALLY_COMPLIANT = "PARTIALLY COMPLIANT"
    NON_COMPLIANT = "NON-COMPLIANT"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT INFORMATION"


class DocumentTypeEnum(str, Enum):
    """Document type options"""
    SBP_CIRCULAR = "SBP_CIRCULAR"
    SBP_POLICY = "SBP_POLICY"
    INTERNAL_POLICY = "INTERNAL_POLICY"
    USER_UPLOAD = "USER_UPLOAD"
    GUIDELINE = "GUIDELINE"


# ============== Document Schemas ==============

class DocumentBase(BaseModel):
    """Base document schema"""
    title: Optional[str] = None
    description: Optional[str] = None
    document_type: DocumentTypeEnum = DocumentTypeEnum.USER_UPLOAD
    source: Optional[str] = None
    circular_number: Optional[str] = None


class DocumentCreate(DocumentBase):
    """Schema for creating a document"""
    pass


class DocumentResponse(DocumentBase):
    """Schema for document response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    mime_type: Optional[str] = None
    is_processed: bool
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class DocumentChunkResponse(BaseModel):
    """Schema for document chunk response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    content: str
    chunk_index: int
    section_title: Optional[str] = None
    clause_number: Optional[str] = None
    page_number: Optional[int] = None
    token_count: Optional[int] = None


# ============== Compliance Query Schemas ==============

class ComplianceQueryCreate(BaseModel):
    """Schema for creating a compliance query"""
    query_text: str = Field(..., min_length=10, max_length=5000)
    query_type: Optional[str] = "policy_inquiry"
    document_id: Optional[UUID] = None  # If checking an uploaded document


class AnalysisPoint(BaseModel):
    """Single analysis point with clause reference"""
    point: str
    clause_reference: Optional[str] = None
    document_name: Optional[str] = None
    section_number: Optional[str] = None


class Violation(BaseModel):
    """Violation detail"""
    what: str = Field(..., description="What is violated")
    why: str = Field(..., description="Why it is a violation")
    clause: str = Field(..., description="Which clause is violated")


class Recommendation(BaseModel):
    """Recommendation for compliance"""
    recommendation: str
    priority: Optional[str] = "medium"  # high, medium, low


class ComplianceResponseCreate(BaseModel):
    """Schema for creating a compliance response"""
    status: ComplianceStatusEnum
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    summary: str
    analysis: List[AnalysisPoint]
    violations: Optional[List[Violation]] = None
    recommendations: List[Recommendation]
    retrieved_chunks: Optional[List[UUID]] = None
    processing_time_ms: Optional[int] = None
    llm_model_used: Optional[str] = None


class SourceDocument(BaseModel):
    """Source document with relevant chunks"""
    document_id: UUID
    document_name: str
    chunks: List[str] = Field(default_factory=list, description="Relevant text chunks used")


class ComplianceResult(BaseModel):
    """Complete compliance result returned to frontend"""
    query_id: UUID
    status: ComplianceStatusEnum
    confidence_score: float
    summary: str
    analysis: List[AnalysisPoint]
    violations: Optional[List[Violation]] = None
    recommendations: List[Recommendation]
    source_documents: List[SourceDocument] = Field(default_factory=list, description="Source files and chunks used")
    disclaimer: str = "This assessment is based solely on the uploaded documents and available regulatory references."
    processing_time_ms: Optional[int] = None
    created_at: datetime


class ComplianceQueryResponse(BaseModel):
    """Schema for compliance query response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    query_text: str
    query_type: Optional[str] = None
    created_at: datetime
    result: Optional[ComplianceResult] = None


# ============== Chat Schemas ==============

class ChatMessage(BaseModel):
    """Chat message schema"""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    """Chat request schema"""
    message: str = Field(..., min_length=1, max_length=5000)
    document_id: Optional[UUID] = None
    conversation_history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    """Chat response schema"""
    response: ComplianceResult
    sources: List[dict] = []  # List of source chunk dictionaries from Milvus


# ============== Health Check Schemas ==============

class HealthCheck(BaseModel):
    """Health check response"""
    status: str = "healthy"
    version: str
    database: str = "connected"
    vector_store: str = "ready"


# ============== Search Schemas ==============

class SearchRequest(BaseModel):
    """Search request schema"""
    query: str = Field(..., min_length=3, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)
    document_type: Optional[DocumentTypeEnum] = None
    min_similarity: float = Field(default=0.7, ge=0.0, le=1.0)


class SearchResult(BaseModel):
    """Single search result"""
    chunk_id: Optional[UUID] = None  # Optional as Milvus uses internal IDs
    document_id: Optional[UUID] = None
    content: str
    similarity_score: float
    clause_number: Optional[str] = None
    section_title: Optional[str] = None
    document_name: Optional[str] = None
    document_type: Optional[str] = None


class SearchResponse(BaseModel):
    """Search response with multiple results"""
    query: str
    results: List[SearchResult]
    total_results: int
