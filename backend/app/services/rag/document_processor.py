"""
HBL Compliance Chatbot - Document Processor
Handles document parsing and text extraction
"""

import os
import re
from typing import List, Tuple, Optional
from pathlib import Path
import aiofiles
import structlog

from pypdf import PdfReader
from docx import Document as DocxDocument

logger = structlog.get_logger()


class DocumentProcessor:
    """
    Document processor for extracting text from various file formats
    Supports: PDF, DOCX, TXT
    """
    
    SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.txt'}
    
    def __init__(self):
        self.logger = logger.bind(service="document_processor")
    
    async def process_file(self, file_path: str) -> Tuple[str, dict]:
        """
        Process a file and extract text content
        
        Args:
            file_path: Path to the file
            
        Returns:
            Tuple of (extracted_text, metadata)
        """
        path = Path(file_path)
        extension = path.suffix.lower()
        
        if extension not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {extension}")
        
        self.logger.info("processing_file", file_path=file_path, extension=extension)
        
        if extension == '.pdf':
            return await self._process_pdf(file_path)
        elif extension == '.docx':
            return await self._process_docx(file_path)
        elif extension == '.txt':
            return await self._process_txt(file_path)
        
        raise ValueError(f"Unsupported file type: {extension}")
    
    async def _process_pdf(self, file_path: str) -> Tuple[str, dict]:
        """Extract text from PDF file"""
        text_parts = []
        metadata = {
            "page_count": 0,
            "pages": []
        }
        
        try:
            reader = PdfReader(file_path)
            metadata["page_count"] = len(reader.pages)
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
                metadata["pages"].append({
                    "page_number": page_num,
                    "char_count": len(page_text)
                })
            
            # Extract PDF metadata if available
            if reader.metadata:
                metadata["title"] = reader.metadata.get("/Title", "")
                metadata["author"] = reader.metadata.get("/Author", "")
                metadata["subject"] = reader.metadata.get("/Subject", "")
            
            full_text = "\n\n".join(text_parts)
            
            self.logger.info(
                "pdf_processed",
                file_path=file_path,
                page_count=metadata["page_count"],
                char_count=len(full_text)
            )
            
            return full_text, metadata
            
        except Exception as e:
            self.logger.error("pdf_processing_error", file_path=file_path, error=str(e))
            raise
    
    async def _process_docx(self, file_path: str) -> Tuple[str, dict]:
        """Extract text from DOCX file"""
        metadata = {
            "paragraph_count": 0,
            "sections": []
        }
        
        try:
            doc = DocxDocument(file_path)
            text_parts = []
            current_section = None
            
            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                
                # Detect section headers (usually bold or styled)
                if para.style and 'Heading' in para.style.name:
                    current_section = text
                    metadata["sections"].append(current_section)
                
                text_parts.append(text)
            
            metadata["paragraph_count"] = len(text_parts)
            
            # Extract document properties
            if doc.core_properties:
                metadata["title"] = doc.core_properties.title or ""
                metadata["author"] = doc.core_properties.author or ""
                metadata["subject"] = doc.core_properties.subject or ""
            
            full_text = "\n\n".join(text_parts)
            
            self.logger.info(
                "docx_processed",
                file_path=file_path,
                paragraph_count=metadata["paragraph_count"],
                char_count=len(full_text)
            )
            
            return full_text, metadata
            
        except Exception as e:
            self.logger.error("docx_processing_error", file_path=file_path, error=str(e))
            raise
    
    async def _process_txt(self, file_path: str) -> Tuple[str, dict]:
        """Extract text from TXT file"""
        metadata = {
            "line_count": 0
        }
        
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            
            metadata["line_count"] = content.count('\n') + 1
            
            self.logger.info(
                "txt_processed",
                file_path=file_path,
                line_count=metadata["line_count"],
                char_count=len(content)
            )
            
            return content, metadata
            
        except Exception as e:
            self.logger.error("txt_processing_error", file_path=file_path, error=str(e))
            raise
    
    def extract_clause_references(self, text: str) -> List[dict]:
        """
        Extract clause references from text
        Patterns: "Clause X.Y", "Section X", "Article X", etc.
        """
        patterns = [
            r'(?:Clause|clause)\s+(\d+(?:\.\d+)*)',
            r'(?:Section|section)\s+(\d+(?:\.\d+)*)',
            r'(?:Article|article)\s+(\d+(?:\.\d+)*)',
            r'(?:Para|para|Paragraph|paragraph)\s+(\d+(?:\.\d+)*)',
            r'(?:Annex|annex)\s+([A-Z](?:,\s*(?:Clause|clause)\s+\d+(?:\.\d+)*)?)',
        ]
        
        references = []
        for pattern in patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                references.append({
                    "reference": match.group(0),
                    "number": match.group(1),
                    "position": match.start()
                })
        
        return references
    
    def clean_text(self, text: str) -> str:
        """
        Clean and normalize text for processing
        """
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s.,;:!?\-\'\"()\[\]{}]', '', text)
        
        # Normalize quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        return text.strip()


# Singleton instance
document_processor = DocumentProcessor()
