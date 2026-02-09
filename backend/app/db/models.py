"""
HBL Compliance Chatbot - Database Models
Enterprise-grade SQLAlchemy models
Embeddings stored in Milvus, metadata in PostgreSQL
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, DateTime, Float, Integer, 
    ForeignKey, Boolean, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid
import enum

Base = declarative_base()


class ComplianceStatus(str, enum.Enum):
    """Compliance status enumeration"""
    COMPLIANT = "COMPLIANT"
    PARTIALLY_COMPLIANT = "PARTIALLY COMPLIANT"
    NON_COMPLIANT = "NON-COMPLIANT"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT INFORMATION"


class DocumentType(str, enum.Enum):
    """Document type enumeration"""
    SBP_CIRCULAR = "SBP_CIRCULAR"
    SBP_POLICY = "SBP_POLICY"
    INTERNAL_POLICY = "INTERNAL_POLICY"
    USER_UPLOAD = "USER_UPLOAD"
    GUIDELINE = "GUIDELINE"


class Knowledgebase(Base):
    """Knowledgebase model for grouping related documents"""
    __tablename__ = "knowledgebases"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", back_populates="knowledgebase")
    
    def __repr__(self):
        return f"<Knowledgebase(id={self.id}, name={self.name})>"


class Document(Base):
    """
    Document model for storing uploaded compliance documents
    """
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    document_type = Column(SQLEnum(DocumentType), nullable=False, default=DocumentType.USER_UPLOAD)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100))
    
    # Metadata
    title = Column(String(500))
    description = Column(Text)
    source = Column(String(255))  # e.g., "SBP", "HBL Internal"
    circular_number = Column(String(100))  # e.g., "BPRD Circular No. 7"
    effective_date = Column(DateTime)
    
    # Processing status
    is_processed = Column(Boolean, default=False)
    processing_error = Column(Text)
    chunk_count = Column(Integer, default=0)
    
    # Knowledgebase relationship
    knowledgebase_id = Column(UUID(as_uuid=True), ForeignKey("knowledgebases.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    knowledgebase = relationship("Knowledgebase", back_populates="documents")
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename={self.filename})>"


class DocumentChunk(Base):
    """
    Document chunk model for storing text chunks and their metadata
    Embeddings stored in Milvus, metadata stored here
    """
    __tablename__ = "document_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    
    # Chunk content
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Position in document
    
    # Milvus reference
    milvus_id = Column(String(100), nullable=True)  # ID in Milvus vector DB
    
    # Chunk metadata
    page_number = Column(Integer)
    start_char = Column(Integer)
    end_char = Column(Integer)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document")
    
    def __repr__(self):
        return f"<DocumentChunk(id={self.id}, document_id={self.document_id}, index={self.chunk_index})>"


class ComplianceQuery(Base):
    """
    Compliance query log for audit trail
    """
    __tablename__ = "compliance_queries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Query content
    query_text = Column(Text, nullable=False)
    query_type = Column(String(100))  # e.g., "document_check", "policy_inquiry"
    
    # Uploaded document (if any)
    uploaded_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    uploaded_document = relationship("Document")
    response = relationship("ComplianceResponse", back_populates="query", uselist=False)
    
    def __repr__(self):
        return f"<ComplianceQuery(id={self.id})>"


class ComplianceResponse(Base):
    """
    Compliance response with structured format
    """
    __tablename__ = "compliance_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), ForeignKey("compliance_queries.id"), nullable=False)
    
    # Compliance status
    status = Column(SQLEnum(ComplianceStatus), nullable=False)
    confidence_score = Column(Float, nullable=False)
    
    # Structured response
    summary = Column(Text, nullable=False)
    analysis = Column(JSON)  # List of analysis points with clause references
    violations = Column(JSON)  # List of violations if any
    recommendations = Column(JSON)  # List of recommendations
    
    # Retrieved context
    retrieved_chunks = Column(JSON)  # List of chunk IDs used for response
    
    # Processing metadata
    processing_time_ms = Column(Integer)
    llm_model_used = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    query = relationship("ComplianceQuery", back_populates="response")
    
    def __repr__(self):
        return f"<ComplianceResponse(id={self.id}, status={self.status})>"


class PolicyClause(Base):
    """
    Indexed policy clauses for quick reference
    """
    __tablename__ = "policy_clauses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    
    # Clause identification
    clause_number = Column(String(100), nullable=False)
    clause_title = Column(String(500))
    
    # Content
    content = Column(Text, nullable=False)
    
    # Categorization
    category = Column(String(100))  # e.g., "AML", "KYC", "Data Protection"
    subcategory = Column(String(100))
    
    # Authority ranking
    authority_level = Column(Integer, default=1)  # 1=SBP, 2=Internal Policy
    
    # Timestamps
    effective_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document")
    
    def __repr__(self):
        return f"<PolicyClause(id={self.id}, clause={self.clause_number})>"
