"""
HBL Compliance Chatbot - RAG Services Module
Uses Milvus for vector storage and Gemini for embeddings
"""

from app.services.rag.engine import rag_engine, RAGEngine
from app.services.rag.document_processor import document_processor, DocumentProcessor
from app.services.rag.chunker import text_chunker, TextChunker, TextChunk
from app.services.rag.embeddings import embedding_service, EmbeddingService
from app.services.rag.vector_store import vector_store, MilvusVectorStore

__all__ = [
    "rag_engine", "RAGEngine",
    "document_processor", "DocumentProcessor",
    "text_chunker", "TextChunker", "TextChunk",
    "embedding_service", "EmbeddingService",
    "vector_store", "MilvusVectorStore"
]
