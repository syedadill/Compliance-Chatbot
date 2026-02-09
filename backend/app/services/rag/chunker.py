"""
HBL Compliance Chatbot - Text Chunker
Intelligent text chunking optimized for legal/regulatory documents
"""

import re
from typing import List, Optional
from dataclasses import dataclass
import tiktoken
import structlog

from app.core.config import settings

logger = structlog.get_logger()


@dataclass
class TextChunk:
    """Represents a chunk of text with metadata"""
    content: str
    chunk_index: int
    token_count: int
    section_title: Optional[str] = None
    clause_number: Optional[str] = None
    page_number: Optional[int] = None
    start_char: Optional[int] = None
    end_char: Optional[int] = None


class TextChunker:
    """
    Intelligent text chunker for legal/regulatory documents
    Optimized chunk size: 300-500 tokens for compliance text
    """
    
    def __init__(
        self,
        chunk_size: int = None,
        chunk_overlap: int = None,
        min_chunk_size: int = 100
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        self.min_chunk_size = min_chunk_size
        self.logger = logger.bind(service="text_chunker")
        
        # Use tiktoken for accurate token counting
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.tokenizer = tiktoken.get_encoding("gpt2")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.tokenizer.encode(text))
    
    def chunk_text(self, text: str, metadata: dict = None) -> List[TextChunk]:
        """
        Chunk text intelligently, respecting document structure
        
        Args:
            text: Full document text
            metadata: Optional document metadata (pages, sections)
            
        Returns:
            List of TextChunk objects
        """
        if not text or not text.strip():
            return []
        
        # First, try to split by sections/clauses
        section_chunks = self._split_by_sections(text)
        
        if section_chunks:
            # Process each section
            all_chunks = []
            for section in section_chunks:
                section_sub_chunks = self._chunk_section(section)
                all_chunks.extend(section_sub_chunks)
            
            # Re-index all chunks
            for i, chunk in enumerate(all_chunks):
                chunk.chunk_index = i
            
            return all_chunks
        
        # Fallback to simple chunking
        return self._simple_chunk(text)
    
    def _split_by_sections(self, text: str) -> List[dict]:
        """
        Split text by section/clause headers
        """
        # Patterns for section headers in regulatory documents
        section_patterns = [
            r'^(?:SECTION|Section|CLAUSE|Clause|ARTICLE|Article)\s+\d+(?:\.\d+)*[:\.\s]',
            r'^\d+(?:\.\d+)*\s+[A-Z][A-Za-z\s]+$',  # "1.2 Risk Assessment"
            r'^(?:ANNEX|Annex)\s+[A-Z]',
            r'^(?:CHAPTER|Chapter)\s+\d+',
        ]
        
        sections = []
        current_section = {
            "title": None,
            "clause_number": None,
            "content": "",
            "start": 0
        }
        
        lines = text.split('\n')
        current_pos = 0
        
        for line in lines:
            is_header = False
            clause_match = None
            
            for pattern in section_patterns:
                match = re.match(pattern, line.strip())
                if match:
                    is_header = True
                    clause_match = re.search(r'(\d+(?:\.\d+)*)', line)
                    break
            
            if is_header and current_section["content"].strip():
                # Save previous section
                sections.append(current_section.copy())
                
                # Start new section
                current_section = {
                    "title": line.strip(),
                    "clause_number": clause_match.group(1) if clause_match else None,
                    "content": line + "\n",
                    "start": current_pos
                }
            else:
                current_section["content"] += line + "\n"
            
            current_pos += len(line) + 1
        
        # Add final section
        if current_section["content"].strip():
            sections.append(current_section)
        
        return sections if len(sections) > 1 else []
    
    def _chunk_section(self, section: dict) -> List[TextChunk]:
        """
        Chunk a single section, respecting token limits
        """
        text = section["content"]
        token_count = self.count_tokens(text)
        
        if token_count <= self.chunk_size:
            # Section fits in one chunk
            return [TextChunk(
                content=text.strip(),
                chunk_index=0,
                token_count=token_count,
                section_title=section.get("title"),
                clause_number=section.get("clause_number"),
                start_char=section.get("start")
            )]
        
        # Need to split section further
        chunks = []
        sentences = self._split_into_sentences(text)
        
        current_chunk = ""
        current_tokens = 0
        chunk_start = section.get("start", 0)
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            if current_tokens + sentence_tokens > self.chunk_size:
                if current_chunk:
                    chunks.append(TextChunk(
                        content=current_chunk.strip(),
                        chunk_index=len(chunks),
                        token_count=current_tokens,
                        section_title=section.get("title"),
                        clause_number=section.get("clause_number"),
                        start_char=chunk_start
                    ))
                
                # Handle overlap
                if self.chunk_overlap > 0 and chunks:
                    overlap_text = self._get_overlap_text(current_chunk)
                    current_chunk = overlap_text + " " + sentence
                    current_tokens = self.count_tokens(current_chunk)
                else:
                    current_chunk = sentence
                    current_tokens = sentence_tokens
                
                chunk_start = section.get("start", 0) + len(text) - len(current_chunk)
            else:
                current_chunk += " " + sentence if current_chunk else sentence
                current_tokens += sentence_tokens
        
        # Add final chunk
        if current_chunk and current_tokens >= self.min_chunk_size:
            chunks.append(TextChunk(
                content=current_chunk.strip(),
                chunk_index=len(chunks),
                token_count=current_tokens,
                section_title=section.get("title"),
                clause_number=section.get("clause_number"),
                start_char=chunk_start
            ))
        
        return chunks
    
    def _simple_chunk(self, text: str) -> List[TextChunk]:
        """
        Simple chunking by sentences when section detection fails
        """
        chunks = []
        sentences = self._split_into_sentences(text)
        
        current_chunk = ""
        current_tokens = 0
        current_start = 0
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            if current_tokens + sentence_tokens > self.chunk_size:
                if current_chunk:
                    chunks.append(TextChunk(
                        content=current_chunk.strip(),
                        chunk_index=len(chunks),
                        token_count=current_tokens,
                        start_char=current_start
                    ))
                
                # Handle overlap
                if self.chunk_overlap > 0 and chunks:
                    overlap_text = self._get_overlap_text(current_chunk)
                    current_chunk = overlap_text + " " + sentence
                    current_tokens = self.count_tokens(current_chunk)
                else:
                    current_chunk = sentence
                    current_tokens = sentence_tokens
                
                current_start = len(text) - len(current_chunk)
            else:
                current_chunk += " " + sentence if current_chunk else sentence
                current_tokens += sentence_tokens
        
        # Add final chunk
        if current_chunk and current_tokens >= self.min_chunk_size:
            chunks.append(TextChunk(
                content=current_chunk.strip(),
                chunk_index=len(chunks),
                token_count=current_tokens,
                start_char=current_start
            ))
        
        self.logger.info(
            "text_chunked",
            total_chunks=len(chunks),
            avg_tokens=sum(c.token_count for c in chunks) / len(chunks) if chunks else 0
        )
        
        return chunks
    
    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences
        """
        # Pattern for sentence boundaries
        sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z])'
        sentences = re.split(sentence_pattern, text)
        
        # Clean sentences
        return [s.strip() for s in sentences if s.strip()]
    
    def _get_overlap_text(self, text: str) -> str:
        """
        Get overlap text from the end of a chunk
        """
        sentences = self._split_into_sentences(text)
        if not sentences:
            return ""
        
        overlap_text = ""
        overlap_tokens = 0
        
        # Get sentences from end until we reach overlap size
        for sentence in reversed(sentences):
            sentence_tokens = self.count_tokens(sentence)
            if overlap_tokens + sentence_tokens > self.chunk_overlap:
                break
            overlap_text = sentence + " " + overlap_text
            overlap_tokens += sentence_tokens
        
        return overlap_text.strip()


# Singleton instance
text_chunker = TextChunker()
