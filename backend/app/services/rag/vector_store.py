"""
HBL Compliance Chatbot - Vector Store
Milvus-based vector storage and retrieval
"""

from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from pymilvus import (
    connections, Collection, FieldSchema, CollectionSchema, DataType,
    utility, MilvusClient
)
import structlog

from app.services.rag.embeddings import embedding_service
from app.core.config import settings

logger = structlog.get_logger()


class MilvusVectorStore:
    """
    Vector store using Milvus
    Handles storage and retrieval of document embeddings
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self.logger = logger.bind(service="milvus_vector_store")
        self.collection_name = settings.MILVUS_COLLECTION_NAME
        self.embedding_service = embedding_service
        self._collection = None
        self._initialized = True
    
    def connect(self):
        """Connect to Milvus server"""
        try:
            connections.connect(
                alias="default",
                host=settings.MILVUS_HOST,
                port=settings.MILVUS_PORT
            )
            self.logger.info(
                "milvus_connected",
                host=settings.MILVUS_HOST,
                port=settings.MILVUS_PORT
            )
        except Exception as e:
            self.logger.error("milvus_connection_error", error=str(e))
            raise
    
    def disconnect(self):
        """Disconnect from Milvus"""
        connections.disconnect("default")
        self.logger.info("milvus_disconnected")
    
    def _ensure_collection(self) -> Collection:
        """Ensure collection exists and return it"""
        if self._collection is not None:
            # Check if collection is loaded, reload if not
            try:
                if not self._collection.is_loaded:
                    self._collection.load()
                    self.logger.info("collection_loaded", name=self.collection_name)
            except Exception as e:
                self.logger.warning("collection_load_check_failed", error=str(e))
                self._collection.load()
            return self._collection
        
        # Check if collection exists
        if not utility.has_collection(self.collection_name):
            self._create_collection()
        
        self._collection = Collection(self.collection_name)
        self._collection.load()
        self.logger.info("collection_loaded", name=self.collection_name)
        
        return self._collection
    
    def _create_collection(self):
        """Create Milvus collection with schema"""
        self.logger.info("creating_milvus_collection", name=self.collection_name)
        
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, is_primary=True, max_length=36),
            FieldSchema(name="document_id", dtype=DataType.VARCHAR, max_length=36),
            FieldSchema(name="chunk_index", dtype=DataType.INT64),
            FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="section_title", dtype=DataType.VARCHAR, max_length=500),
            FieldSchema(name="clause_number", dtype=DataType.VARCHAR, max_length=100),
            FieldSchema(name="document_type", dtype=DataType.VARCHAR, max_length=50),
            FieldSchema(name="document_name", dtype=DataType.VARCHAR, max_length=255),
            FieldSchema(name="source", dtype=DataType.VARCHAR, max_length=255),
            FieldSchema(name="circular_number", dtype=DataType.VARCHAR, max_length=100),
            FieldSchema(
                name="embedding",
                dtype=DataType.FLOAT_VECTOR,
                dim=settings.EMBEDDING_DIMENSION
            )
        ]
        
        schema = CollectionSchema(
            fields=fields,
            description="HBL Compliance Document Chunks"
        )
        
        collection = Collection(
            name=self.collection_name,
            schema=schema
        )
        
        # Create IVF_FLAT index for similarity search
        index_params = {
            "metric_type": "COSINE",
            "index_type": "IVF_FLAT",
            "params": {"nlist": 128}
        }
        
        collection.create_index(
            field_name="embedding",
            index_params=index_params
        )
        
        self.logger.info("milvus_collection_created", name=self.collection_name)
    
    async def store_chunks(
        self,
        document_id: UUID,
        chunks: List[dict],
        document_metadata: dict
    ) -> int:
        """
        Store document chunks with their embeddings in Milvus
        
        Args:
            document_id: Parent document ID
            chunks: List of chunk dictionaries with content and metadata
            document_metadata: Document metadata (type, name, source, etc.)
            
        Returns:
            Number of chunks stored
        """
        self.logger.info(
            "storing_chunks_milvus",
            document_id=str(document_id),
            chunk_count=len(chunks)
        )
        
        collection = self._ensure_collection()
        
        # Extract texts for batch embedding
        texts = [chunk["content"] for chunk in chunks]
        
        # Generate embeddings in batch
        embeddings = self.embedding_service.embed_texts(texts)
        
        # Prepare data for insertion
        import uuid
        
        ids = []
        document_ids = []
        chunk_indices = []
        contents = []
        section_titles = []
        clause_numbers = []
        document_types = []
        document_names = []
        sources = []
        circular_numbers = []
        embedding_vectors = []
        
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            ids.append(str(uuid.uuid4()))
            document_ids.append(str(document_id))
            chunk_indices.append(chunk.get("chunk_index", i))
            contents.append(chunk["content"][:65530])  # Milvus max length
            section_titles.append(chunk.get("section_title", "") or "")
            clause_numbers.append(chunk.get("clause_number", "") or "")
            document_types.append(document_metadata.get("document_type", "USER_UPLOAD"))
            document_names.append(document_metadata.get("document_name", "")[:250])
            sources.append(document_metadata.get("source", "") or "")
            circular_numbers.append(document_metadata.get("circular_number", "") or "")
            embedding_vectors.append(embedding)
        
        # Insert data
        data = [
            ids,
            document_ids,
            chunk_indices,
            contents,
            section_titles,
            clause_numbers,
            document_types,
            document_names,
            sources,
            circular_numbers,
            embedding_vectors
        ]
        
        collection.insert(data)
        collection.flush()
        
        # Wait for data to be indexed
        import time
        max_wait = 10  # seconds
        wait_interval = 0.5
        elapsed = 0
        
        while elapsed < max_wait:
            # Check if collection is fully indexed
            index_info = collection.index()
            if index_info:
                # Collection has index, data should be searchable
                break
            time.sleep(wait_interval)
            elapsed += wait_interval
        
        # Reload collection to ensure data is searchable
        collection.load()
        
        self.logger.info(
            "chunks_stored_milvus",
            document_id=str(document_id),
            stored_count=len(chunks),
            wait_time=elapsed
        )
        
        return len(chunks)
    
    async def search_similar(
        self,
        query: str,
        top_k: int = None,
        min_similarity: float = None,
        document_type: Optional[str] = None,
        document_ids: Optional[List[UUID]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using vector similarity
        
        Args:
            query: Search query text
            top_k: Number of results to return
            min_similarity: Minimum similarity threshold
            document_type: Filter by document type
            document_ids: Filter by specific document IDs
            
        Returns:
            List of result dictionaries with content and metadata
        """
        top_k = top_k or settings.TOP_K_RESULTS
        min_similarity = min_similarity or settings.MIN_SIMILARITY_THRESHOLD
        
        self.logger.info(
            "searching_similar_milvus",
            query_preview=query[:100],
            top_k=top_k
        )
        
        collection = self._ensure_collection()
        
        # Log collection stats
        try:
            num_entities = collection.num_entities
            self.logger.info(
                "collection_stats",
                num_entities=num_entities,
                collection_name=self.collection_name
            )
        except Exception as e:
            self.logger.warning("failed_to_get_collection_stats", error=str(e))
        
        # Generate query embedding (use query-optimized embedding)
        query_embedding = self.embedding_service.embed_query(query)
        
        # Build filter expression
        filter_expr = None
        if document_type:
            filter_expr = f'document_type == "{document_type}"'
        if document_ids:
            ids_str = ", ".join([f'"{str(did)}"' for did in document_ids])
            doc_filter = f"document_id in [{ids_str}]"
            filter_expr = f"{filter_expr} and {doc_filter}" if filter_expr else doc_filter
        
        # Search parameters
        search_params = {
            "metric_type": "COSINE",
            "params": {"nprobe": 10}
        }
        
        # Perform search
        results = collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=top_k * 2,  # Get more results to filter by similarity
            expr=filter_expr,
            output_fields=[
                "id", "document_id", "chunk_index", "content",
                "section_title", "clause_number", "document_type",
                "document_name", "source", "circular_number"
            ]
        )
        
        # Log raw results count
        raw_count = sum(len(hits) for hits in results)
        self.logger.info(
            "raw_search_results",
            raw_count=raw_count,
            min_similarity=min_similarity
        )
        
        # Format results
        formatted_results = []
        for hits in results:
            for hit in hits:
                similarity = 1 - hit.distance  # Convert distance to similarity for COSINE
                
                self.logger.debug(
                    "result_similarity",
                    similarity=similarity,
                    distance=hit.distance,
                    min_threshold=min_similarity
                )
                
                if similarity < min_similarity:
                    continue
                
                formatted_results.append({
                    "chunk_id": hit.entity.get("id"),
                    "document_id": hit.entity.get("document_id"),
                    "content": hit.entity.get("content"),
                    "similarity_score": similarity,
                    "section_title": hit.entity.get("section_title"),
                    "clause_number": hit.entity.get("clause_number"),
                    "document_type": hit.entity.get("document_type"),
                    "document_name": hit.entity.get("document_name"),
                    "source": hit.entity.get("source"),
                    "circular_number": hit.entity.get("circular_number")
                })
        
        # Sort by document type priority (SBP > Internal) then by similarity
        def sort_key(x):
            type_priority = 0 if "SBP" in x.get("document_type", "") else 1
            return (type_priority, -x["similarity_score"])
        
        formatted_results.sort(key=sort_key)
        
        self.logger.info(
            "search_completed_milvus",
            results_found=len(formatted_results[:top_k])
        )
        
        return formatted_results[:top_k]
    
    async def delete_document_chunks(self, document_id: UUID) -> int:
        """
        Delete all chunks for a document
        
        Args:
            document_id: Document ID
            
        Returns:
            Number of deleted chunks (approximate)
        """
        collection = self._ensure_collection()
        
        expr = f'document_id == "{str(document_id)}"'
        collection.delete(expr)
        
        self.logger.info(
            "chunks_deleted_milvus",
            document_id=str(document_id)
        )
        
        return 0  # Milvus doesn't return delete count easily
    
    def drop_collection(self):
        """Drop the entire collection (use with caution)"""
        if utility.has_collection(self.collection_name):
            utility.drop_collection(self.collection_name)
            self._collection = None
            self.logger.info("milvus_collection_dropped", name=self.collection_name)


# Singleton instance
vector_store = MilvusVectorStore()
