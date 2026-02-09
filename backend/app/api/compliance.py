"""
HBL Compliance Chatbot - Compliance API Routes
Handles compliance queries and analysis
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.db.session import get_db
from app.db.models import Document, ComplianceQuery, ComplianceResponse
from app.services.compliance import compliance_analyzer
from app.services.rag import rag_engine, document_processor
from app.schemas import (
    ComplianceQueryCreate, ComplianceResult, ChatRequest, ChatResponse,
    SearchRequest, SearchResponse, SearchResult, DocumentChunkResponse
)
from app.core.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.post("/analyze", response_model=ComplianceResult)
async def analyze_compliance(
    request: ComplianceQueryCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze a compliance query against the knowledge base
    
    This endpoint:
    1. Retrieves relevant regulatory clauses from the knowledge base
    2. Analyzes the query against those clauses
    3. Returns a structured compliance assessment
    
    Response includes:
    - Compliance status (COMPLIANT/PARTIALLY COMPLIANT/NON-COMPLIANT/INSUFFICIENT INFORMATION)
    - Summary
    - Analysis with clause references
    - Violations (if any)
    - Recommendations
    """
    result = await compliance_analyzer.analyze_compliance(
        db=db,
        query_text=request.query_text,
        document_id=request.document_id
    )
    
    return result


@router.post("/check-document/{document_id}", response_model=ComplianceResult)
async def check_document_compliance(
    document_id: UUID,
    categories: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Check an uploaded document for compliance
    
    - document_id: ID of the previously uploaded document
    - categories: Optional list of compliance categories to check (e.g., ["AML", "KYC"])
    
    The document will be analyzed against all relevant SBP regulations and HBL policies.
    """
    # Get document
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
            detail="Document has not been processed yet. Please wait for processing to complete."
        )
    
    # Extract document content
    try:
        content, _ = await document_processor.process_file(document.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read document: {str(e)}"
        )
    
    # Run compliance check
    compliance_result = await compliance_analyzer.check_document_compliance(
        db=db,
        document_id=document_id,
        document_content=content,
        check_categories=categories
    )
    
    return compliance_result


@router.post("/chat", response_model=ChatResponse)
async def compliance_chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Interactive compliance chat endpoint
    
    Send a message and get a compliance-focused response with sources.
    Optionally attach a document for context-aware analysis.
    """
    # Get document content if provided
    document_content = None
    if request.document_id:
        stmt = select(Document).where(Document.id == request.document_id)
        result = await db.execute(stmt)
        document = result.scalar_one_or_none()
        
        if document and document.is_processed:
            try:
                document_content, _ = await document_processor.process_file(document.file_path)
            except Exception:
                pass  # Continue without document content
    
    # Get compliance analysis
    compliance_result = await compliance_analyzer.analyze_compliance(
        db=db,
        query_text=request.message,
        document_content=document_content,
        document_id=request.document_id
    )
    
    # Get source chunks
    context_list = await rag_engine.retrieve_context(
        db=db,
        query=request.message,
        top_k=5
    )
    
    # Convert to source chunks - use dict format from Milvus results
    sources = []
    for ctx in context_list:
        sources.append({
            "content": ctx["content"],
            "section_title": ctx.get("section_title"),
            "clause_number": ctx.get("clause_number"),
            "page_number": ctx.get("page_number"),
            "document_name": ctx.get("document_name"),
            "similarity_score": ctx.get("similarity_score")
        })
    
    return ChatResponse(
        response=compliance_result,
        sources=sources
    )


@router.post("/search", response_model=SearchResponse)
async def search_knowledge_base(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Search the compliance knowledge base
    
    Returns relevant policy clauses and document chunks matching the query.
    Results are ranked by:
    1. Regulatory authority (SBP > Internal Policy)
    2. Similarity score
    3. Recency
    """
    from app.services.rag.vector_store import vector_store
    
    # Convert document type if provided
    doc_type = None
    if request.document_type:
        doc_type = request.document_type.value
    
    # Search Milvus vector store
    results = await vector_store.search_similar(
        query=request.query,
        top_k=request.top_k,
        document_type=doc_type
    )
    
    # Format results
    search_results = []
    for result in results:
        search_results.append(SearchResult(
            chunk_id=None,  # Milvus uses internal IDs
            document_id=UUID(result["document_id"]) if result.get("document_id") else None,
            content=result["content"],
            similarity_score=result["similarity_score"],
            clause_number=result.get("clause_number"),
            section_title=result.get("section_title"),
            document_name=result.get("document_name"),
            document_type=result.get("document_type")
        ))
    
    return SearchResponse(
        query=request.query,
        results=search_results,
        total_results=len(search_results)
    )


@router.get("/history", response_model=List[dict])
async def get_compliance_history(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """
    Get compliance query history for audit purposes
    """
    stmt = (
        select(ComplianceQuery, ComplianceResponse)
        .outerjoin(ComplianceResponse, ComplianceQuery.id == ComplianceResponse.query_id)
        .order_by(ComplianceQuery.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(stmt)
    rows = result.fetchall()
    
    history = []
    for query, response in rows:
        entry = {
            "query_id": str(query.id),
            "query_text": query.query_text[:200],
            "query_type": query.query_type,
            "created_at": query.created_at.isoformat(),
            "status": response.status.value if response else None,
            "confidence_score": response.confidence_score if response else None
        }
        history.append(entry)
    
    return history
