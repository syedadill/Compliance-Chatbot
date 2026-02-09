"""
HBL Compliance Chatbot - Document API Routes
Handles document upload, processing, and management
"""

import os
import shutil
from typing import List, Optional
from uuid import UUID
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog
import aiofiles

from app.db.session import get_db
from app.db.models import Document, DocumentType
from app.services.rag import rag_engine
from app.schemas import (
    DocumentResponse, DocumentCreate, DocumentTypeEnum,
    DocumentChunkResponse
)
from app.core.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/documents", tags=["documents"])


def _ensure_upload_dir():
    """Ensure upload directory exists"""
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    knowledgebase_id: Optional[UUID] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    document_type: DocumentTypeEnum = Form(DocumentTypeEnum.USER_UPLOAD),
    source: Optional[str] = Form(None),
    circular_number: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a compliance document
    
    - Supports PDF, DOCX, TXT files
    - Maximum file size: 10MB
    - Document will be processed and indexed for RAG retrieval
    """
    _ensure_upload_dir()
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Validate file size
    content = await file.read()
    file_size = len(content)
    
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    # Generate unique filename
    import uuid
    unique_id = str(uuid.uuid4())
    safe_filename = f"{unique_id}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create document record
    document = Document(
        filename=safe_filename,
        original_filename=file.filename,
        document_type=DocumentType(document_type.value),
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        title=title,
        description=description,
        source=source,
        circular_number=circular_number,
        knowledgebase_id=knowledgebase_id
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    logger.info(
        "document_uploaded",
        document_id=str(document.id),
        filename=file.filename,
        size=file_size
    )
    
    return document


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    document_type: Optional[DocumentTypeEnum] = None,
    is_processed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    List all documents with optional filtering
    """
    stmt = select(Document).order_by(Document.created_at.desc())
    
    if document_type:
        stmt = stmt.where(Document.document_type == DocumentType(document_type.value))
    
    if is_processed is not None:
        stmt = stmt.where(Document.is_processed == is_processed)
    
    stmt = stmt.offset(skip).limit(limit)
    
    result = await db.execute(stmt)
    documents = result.scalars().all()
    
    return documents


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get document details by ID
    """
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    return document


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Download the original document file
    """
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found on disk"
        )
    
    return FileResponse(
        path=document.file_path,
        filename=document.original_filename,
        media_type=document.mime_type
    )


@router.get("/{document_id}/chunks")
async def get_document_chunks(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all chunks for a document from Milvus
    """
    from app.services.rag.vector_store import vector_store
    
    # First verify document exists in PostgreSQL
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not document.is_processed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has not been processed yet"
        )
    
    # Note: For Milvus, chunks are stored there, not in PostgreSQL
    # Return basic info about chunks
    return {
        "document_id": str(document_id),
        "chunk_count": document.chunk_count,
        "message": "Chunks are stored in Milvus vector database. Use search endpoints to retrieve relevant chunks."
    }


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a document and its chunks from both PostgreSQL and Milvus
    """
    from app.services.rag.vector_store import vector_store
    from app.db.models import ComplianceQuery
    from sqlalchemy import update
    
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Clear foreign key references in compliance_queries
    update_stmt = (
        update(ComplianceQuery)
        .where(ComplianceQuery.uploaded_document_id == document_id)
        .values(uploaded_document_id=None)
    )
    await db.execute(update_stmt)
    await db.flush()
    
    # Delete file from disk
    if os.path.exists(document.file_path):
        os.remove(document.file_path)
    
    # Delete chunks from Milvus
    await vector_store.delete_document_chunks(document_id)
    
    # Delete document from PostgreSQL
    await db.delete(document)
    await db.commit()
    
    logger.info("document_deleted", document_id=str(document_id))


@router.post("/{document_id}/reprocess", response_model=DocumentResponse)
async def reprocess_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Reprocess a document (re-chunk and re-embed)
    """
    from app.services.rag.vector_store import vector_store
    
    stmt = select(Document).where(Document.id == document_id)
    result = await db.execute(stmt)
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document file not found on disk"
        )
    
    # Delete existing chunks from Milvus
    await vector_store.delete_document_chunks(document_id)
    
    # Reset document status
    document.is_processed = False
    document.processing_error = None
    document.chunk_count = 0
    
    # Reprocess
    try:
        chunk_count = await rag_engine.ingest_document(
            db=db,
            document=document,
            file_path=document.file_path
        )
        logger.info(
            "document_reprocessed",
            document_id=str(document_id),
            chunks=chunk_count
        )
    except Exception as e:
        logger.error(
            "document_reprocessing_failed",
            document_id=str(document_id),
            error=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reprocess document: {str(e)}"
        )
    
    await db.refresh(document)
    return document


@router.get("/knowledgebase/{knowledgebase_id}/files")
async def list_files_by_knowledgebase(
    knowledgebase_id: UUID,
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    List files for a knowledgebase with pagination
    """
    from pydantic import BaseModel
    
    stmt = select(Document).where(Document.knowledgebase_id == knowledgebase_id).order_by(Document.created_at.desc())
    all_docs = (await db.execute(stmt)).scalars().all()
    
    total = len(all_docs)
    total_pages = (total + page_size - 1) // page_size
    
    start = (page - 1) * page_size
    end = start + page_size
    paginated_docs = all_docs[start:end]
    
    class PaginatedResponse(BaseModel):
        items: List[DocumentResponse]
        total: int
        page: int
        page_size: int
        total_pages: int
        
        class Config:
            from_attributes = True
    
    return PaginatedResponse(
        items=paginated_docs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.post("/parse/{document_id}", response_model=DocumentResponse)
async def parse_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Parse and chunk document, create embeddings
    """
    stmt = select(Document).where(Document.id == document_id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=400, detail="Document file not found on disk")
    
    try:
        chunk_count = await rag_engine.ingest_document(
            db=db,
            document=doc,
            file_path=doc.file_path
        )
        doc.is_processed = True
        doc.chunk_count = chunk_count
        doc.processing_error = None
        await db.commit()
        await db.refresh(doc)
        
        logger.info(
            "document_parsed",
            document_id=str(document_id),
            chunks=chunk_count
        )
        return doc
    except Exception as e:
        doc.processing_error = str(e)
        await db.commit()
        logger.error(
            "document_parsing_failed",
            document_id=str(document_id),
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")
