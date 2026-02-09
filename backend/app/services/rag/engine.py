"""
HBL Compliance Chatbot - RAG Engine
Core retrieval-augmented generation engine
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.db.models import Document, DocumentType
from app.services.rag.document_processor import document_processor
from app.services.rag.chunker import text_chunker, TextChunk
from app.services.rag.vector_store import vector_store
from app.services.rag.embeddings import embedding_service
from app.core.config import settings

logger = structlog.get_logger()


class RAGEngine:
    """
    Retrieval-Augmented Generation Engine
    Orchestrates document processing, storage, and retrieval
    Uses Milvus for vector storage and Gemini for embeddings
    """
    
    def __init__(self):
        self.logger = logger.bind(service="rag_engine")
        self.document_processor = document_processor
        self.text_chunker = text_chunker
        self.vector_store = vector_store
        self.embedding_service = embedding_service
    
    def initialize(self):
        """Initialize connections (call on startup)"""
        self.vector_store.connect()
    
    def shutdown(self):
        """Cleanup connections (call on shutdown)"""
        self.vector_store.disconnect()
    
    async def ingest_document(
        self,
        db: AsyncSession,
        document: Document,
        file_path: str
    ) -> int:
        """
        Ingest a document: extract text, chunk, embed, and store in Milvus
        
        Args:
            db: Database session
            document: Document model instance
            file_path: Path to the file
            
        Returns:
            Number of chunks created
        """
        self.logger.info(
            "ingesting_document",
            document_id=str(document.id),
            file_path=file_path
        )
        
        try:
            # Step 1: Extract text from document
            text, metadata = await self.document_processor.process_file(file_path)
            
            if not text or len(text.strip()) < 50:
                raise ValueError("Document contains insufficient text content")
            
            # Update document metadata if available
            if metadata.get("title") and not document.title:
                document.title = metadata["title"]
            
            # Step 2: Chunk the text
            chunks = self.text_chunker.chunk_text(text, metadata)
            
            if not chunks:
                raise ValueError("Failed to create chunks from document")
            
            # Step 3: Prepare chunks for storage
            chunk_data = []
            for chunk in chunks:
                chunk_data.append({
                    "content": chunk.content,
                    "chunk_index": chunk.chunk_index,
                    "section_title": chunk.section_title,
                    "clause_number": chunk.clause_number,
                    "page_number": chunk.page_number,
                    "token_count": chunk.token_count
                })
            
            # Step 4: Prepare document metadata for Milvus
            document_metadata = {
                "document_type": document.document_type.value,
                "document_name": document.original_filename,
                "source": document.source or "",
                "circular_number": document.circular_number or ""
            }
            
            # Step 5: Store chunks with embeddings in Milvus
            stored_count = await self.vector_store.store_chunks(
                document_id=document.id,
                chunks=chunk_data,
                document_metadata=document_metadata
            )
            
            # Update document status in PostgreSQL
            document.is_processed = True
            document.chunk_count = stored_count
            await db.flush()
            
            self.logger.info(
                "document_ingested",
                document_id=str(document.id),
                chunk_count=stored_count
            )
            
            return stored_count
            
        except Exception as e:
            self.logger.error(
                "ingestion_error",
                document_id=str(document.id),
                error=str(e)
            )
            document.processing_error = str(e)
            await db.flush()
            raise
    
    async def retrieve_context(
        self,
        db: AsyncSession,
        query: str,
        top_k: int = None,
        document_type: Optional[str] = None,
        document_ids: Optional[List[UUID]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant context for a query from Milvus
        
        Args:
            db: Database session (for future PostgreSQL lookups if needed)
            query: User query
            top_k: Number of results
            document_type: Filter by document type
            document_ids: Filter by specific documents
            
        Returns:
            List of context dictionaries with content and metadata
        """
        top_k = top_k or settings.TOP_K_RESULTS
        
        self.logger.info(
            "retrieving_context",
            query_preview=query[:100],
            top_k=top_k
        )
        
        # Search for similar chunks in Milvus
        results = await self.vector_store.search_similar(
            query=query,
            top_k=top_k,
            document_type=document_type,
            document_ids=document_ids
        )
        
        self.logger.info(
            "context_retrieved",
            result_count=len(results),
            avg_similarity=sum(c["similarity_score"] for c in results) / len(results) if results else 0
        )
        
        return results
    
    def format_context_for_llm(
        self,
        context_list: List[Dict[str, Any]]
    ) -> str:
        """
        Format retrieved context for LLM prompt
        
        Args:
            context_list: List of context dictionaries
            
        Returns:
            Formatted context string
        """
        if not context_list:
            return "No relevant policy documents found in the knowledge base."
        
        formatted_parts = []
        
        for i, ctx in enumerate(context_list, 1):
            source_info = []
            
            if ctx.get("circular_number"):
                source_info.append(f"Circular: {ctx['circular_number']}")
            elif ctx.get("document_name"):
                source_info.append(f"Document: {ctx['document_name']}")
            
            if ctx.get("clause_number"):
                source_info.append(f"Clause {ctx['clause_number']}")
            
            if ctx.get("section_title"):
                source_info.append(f"Section: {ctx['section_title']}")
            
            if ctx.get("source"):
                source_info.append(f"Source: {ctx['source']}")
            
            source_str = " | ".join(source_info) if source_info else "Unknown Source"
            
            formatted_parts.append(
                f"[Reference {i}] ({source_str})\n"
                f"{ctx['content']}\n"
            )
        
        return "\n---\n".join(formatted_parts)
    
    def calculate_confidence(
        self,
        context_list: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate confidence score based on retrieved context
        
        Args:
            context_list: List of context dictionaries
            
        Returns:
            Confidence score (0-1)
        """
        if not context_list:
            return 0.0
        
        # Factors for confidence:
        # 1. Average similarity score
        avg_similarity = sum(c["similarity_score"] for c in context_list) / len(context_list)
        
        # 2. Number of relevant results
        result_factor = min(len(context_list) / settings.TOP_K_RESULTS, 1.0)
        
        # 3. Source authority (SBP documents boost confidence)
        sbp_count = sum(1 for c in context_list if "SBP" in c.get("document_type", ""))
        authority_factor = 0.1 * (sbp_count / len(context_list)) if context_list else 0
        
        # Weighted confidence
        confidence = (0.6 * avg_similarity) + (0.3 * result_factor) + (0.1 + authority_factor)
        
        return min(max(confidence, 0.0), 1.0)
    
    async def delete_document(self, document_id: UUID):
        """Delete document chunks from Milvus"""
        await self.vector_store.delete_document_chunks(document_id)


# Singleton instance
rag_engine = RAGEngine()
