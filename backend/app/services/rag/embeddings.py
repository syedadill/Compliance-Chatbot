"""
HBL Compliance Chatbot - Embedding Service
Generates vector embeddings using Google Gemini
"""

from typing import List
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

from app.core.config import settings

logger = structlog.get_logger()

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


class EmbeddingService:
    """
    Embedding service using Google Gemini embedding-001
    Dimension: 3072
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.logger = logger.bind(service="embedding_service")
        self.model_name = settings.GEMINI_EMBEDDING_MODEL
        self._initialized = True
        self.logger.info(
            "embedding_service_initialized",
            model=self.model_name,
            dimension=settings.EMBEDDING_DIMENSION
        )
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for a single text using Gemini
        
        Args:
            text: Text to embed
            
        Returns:
            List of floats (3072 dimensions)
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        result = genai.embed_content(
            model=self.model_name,
            content=text,
            task_type="retrieval_document"
        )
        
        embedding = result['embedding']
        self.logger.debug(
            "text_embedded",
            text_length=len(text),
            embedding_dim=len(embedding)
        )
        
        return embedding
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a query (optimized for retrieval)
        
        Args:
            query: Query text to embed
            
        Returns:
            List of floats (3072 dimensions)
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        
        result = genai.embed_content(
            model=self.model_name,
            content=query,
            task_type="retrieval_query"
        )
        
        embedding = result['embedding']
        self.logger.debug(
            "query_embedded",
            query_length=len(query),
            embedding_dim=len(embedding)
        )
        
        return embedding
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (batch processing)
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embeddings (each 768 dimensions)
        """
        if not texts:
            return []
        
        # Filter empty texts
        valid_texts = [t for t in texts if t and t.strip()]
        
        if not valid_texts:
            raise ValueError("All texts are empty")
        
        self.logger.info("embedding_batch", count=len(valid_texts))
        
        embeddings = []
        # Process in batches to avoid rate limits
        batch_size = 100
        for i in range(0, len(valid_texts), batch_size):
            batch = valid_texts[i:i + batch_size]
            for text in batch:
                embedding = self.embed_text(text)
                embeddings.append(embedding)
        
        return embeddings
    
    def get_embedding_dimension(self) -> int:
        """Get the embedding dimension"""
        return settings.EMBEDDING_DIMENSION


# Singleton instance
embedding_service = EmbeddingService()
