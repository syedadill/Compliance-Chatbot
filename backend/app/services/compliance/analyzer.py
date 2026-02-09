"""
HBL Compliance Chatbot - Compliance Analyzer
Core compliance analysis engine using Gemini 2.5 Flash
"""

import json
import time
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

from app.core.config import settings
from app.db.models import ComplianceStatus, ComplianceQuery, ComplianceResponse
from app.services.rag.engine import rag_engine
from app.schemas import (
    ComplianceResult, ComplianceStatusEnum, 
    AnalysisPoint, Violation, Recommendation, SourceDocument
)

logger = structlog.get_logger()


# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


COMPLIANCE_SYSTEM_PROMPT = """You are an expert banking compliance officer for HBL Bank Pakistan.
Your role is to analyze documents and queries against SBP (State Bank of Pakistan) regulations and internal HBL policies.

CRITICAL RULES:
1. NEVER hallucinate or fabricate compliance rules
2. ONLY cite clauses that are explicitly provided in the context
3. If information is insufficient, respond with "INSUFFICIENT INFORMATION"
4. SBP regulations ALWAYS override internal policies when in conflict
5. Be conservative and precise - prefer refusal over hallucination
6. Confidence below 90% means "INSUFFICIENT INFORMATION"

RESPONSE FORMAT (JSON):
{
    "status": "COMPLIANT" | "PARTIALLY COMPLIANT" | "NON-COMPLIANT" | "INSUFFICIENT INFORMATION",
    "confidence_score": 0.0-1.0,
    "summary": "2-3 lines maximum",
    "analysis": [
        {
            "point": "Analysis point text",
            "clause_reference": "Clause X.Y",
            "document_name": "Document name",
            "section_number": "Section number if available"
        }
    ],
    "violations": [
        {
            "what": "What is violated",
            "why": "Why it is a violation",
            "clause": "Which clause is violated"
        }
    ],
    "recommendations": [
        {
            "recommendation": "Concrete step to become compliant",
            "priority": "high" | "medium" | "low"
        }
    ]
}

COMPLIANCE STATUS CRITERIA:
- COMPLIANT: All requirements are met with high confidence
- PARTIALLY COMPLIANT: Some requirements met, some gaps exist
- NON-COMPLIANT: Clear violations identified
- INSUFFICIENT INFORMATION: Cannot make determination due to missing data or low confidence

Always include violations array (empty if none).
Always include at least one recommendation.
Be specific with clause references - use exact numbers from provided context."""


class ComplianceAnalyzer:
    """
    Compliance analyzer using Gemini 2.5 Flash
    Structured analysis following HBL compliance standards
    """
    
    def __init__(self):
        self.logger = logger.bind(service="compliance_analyzer")
        self.model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            generation_config={
                "temperature": 0.1,  # Low temperature for consistent, factual responses
                "top_p": 0.8,
                "max_output_tokens": 2048,
            },
            system_instruction=COMPLIANCE_SYSTEM_PROMPT
        )
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def analyze_compliance(
        self,
        db: AsyncSession,
        query_text: str,
        document_content: Optional[str] = None,
        document_id: Optional[UUID] = None
    ) -> ComplianceResult:
        """
        Analyze compliance for a query or document
        
        Args:
            db: Database session
            query_text: User query or analysis request
            document_content: Optional document content to analyze
            document_id: Optional specific document to check against
            
        Returns:
            ComplianceResult with structured analysis
        """
        start_time = time.time()
        
        self.logger.info(
            "starting_compliance_analysis",
            query_preview=query_text[:100],
            has_document=bool(document_content)
        )
        
        # Step 1: Create compliance query record
        compliance_query = ComplianceQuery(
            query_text=query_text,
            query_type="document_check" if document_content else "policy_inquiry",
            uploaded_document_id=document_id
        )
        db.add(compliance_query)
        await db.flush()
        
        try:
            # Step 2: Retrieve relevant context from knowledge base
            context_list = await rag_engine.retrieve_context(
                db=db,
                query=query_text,
                top_k=settings.TOP_K_RESULTS
            )
            
            # Step 3: Calculate initial confidence
            initial_confidence = rag_engine.calculate_confidence(context_list)
            
            # Step 4: Format context for LLM
            formatted_context = rag_engine.format_context_for_llm(context_list)
            
            # Step 5: Build analysis prompt
            prompt = self._build_analysis_prompt(
                query=query_text,
                context=formatted_context,
                document_content=document_content,
                initial_confidence=initial_confidence
            )
            
            # Step 6: Call Gemini for analysis
            response = await self._call_gemini(prompt)
            
            # Step 7: Parse and validate response
            analysis_result = self._parse_response(response, initial_confidence)
            
            # Step 8: Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Step 9: Store response
            # Note: Milvus doesn't return chunk_id in the same format, store document_ids instead
            retrieved_doc_ids = list(set(
                UUID(c["document_id"]) for c in context_list 
                if c.get("document_id")
            ))
            
            compliance_response = ComplianceResponse(
                query_id=compliance_query.id,
                status=ComplianceStatus(analysis_result["status"]),
                confidence_score=analysis_result["confidence_score"],
                summary=analysis_result["summary"],
                analysis=analysis_result["analysis"],
                violations=analysis_result.get("violations"),
                recommendations=analysis_result["recommendations"],
                retrieved_chunks={"document_ids": [str(d) for d in retrieved_doc_ids]},
                processing_time_ms=processing_time_ms,
                llm_model_used=settings.GEMINI_MODEL
            )
            db.add(compliance_response)
            await db.flush()
            
            # Step 10: Group context by document for source references
            source_docs_dict = {}
            for ctx in context_list:
                doc_id = ctx.get("document_id")
                doc_name = ctx.get("document_name", "Unknown Document")
                content = ctx.get("content", "")
                
                if doc_id:
                    if doc_id not in source_docs_dict:
                        source_docs_dict[doc_id] = {
                            "document_id": UUID(doc_id),
                            "document_name": doc_name,
                            "chunks": []
                        }
                    if content and content not in source_docs_dict[doc_id]["chunks"]:
                        source_docs_dict[doc_id]["chunks"].append(content)
            
            source_documents = [SourceDocument(**v) for v in source_docs_dict.values()]
            
            # Step 11: Build result
            result = ComplianceResult(
                query_id=compliance_query.id,
                status=ComplianceStatusEnum(analysis_result["status"]),
                confidence_score=analysis_result["confidence_score"],
                summary=analysis_result["summary"],
                analysis=[AnalysisPoint(**point) for point in analysis_result["analysis"]],
                violations=[Violation(**v) for v in analysis_result.get("violations", [])] if analysis_result.get("violations") else None,
                recommendations=[Recommendation(**r) for r in analysis_result["recommendations"]],
                source_documents=source_documents,
                processing_time_ms=processing_time_ms,
                created_at=compliance_query.created_at
            )
            
            self.logger.info(
                "compliance_analysis_complete",
                query_id=str(compliance_query.id),
                status=result.status.value,
                confidence=result.confidence_score,
                processing_time_ms=processing_time_ms
            )
            
            return result
            
        except Exception as e:
            self.logger.error(
                "compliance_analysis_error",
                error=str(e),
                query_id=str(compliance_query.id)
            )
            
            # Return insufficient information on error
            return ComplianceResult(
                query_id=compliance_query.id,
                status=ComplianceStatusEnum.INSUFFICIENT_INFORMATION,
                confidence_score=0.0,
                summary="Unable to complete compliance analysis due to an error. Please try again.",
                analysis=[AnalysisPoint(
                    point="Analysis could not be completed",
                    clause_reference=None
                )],
                violations=None,
                recommendations=[Recommendation(
                    recommendation="Please retry the query or contact support",
                    priority="high"
                )],
                processing_time_ms=int((time.time() - start_time) * 1000),
                created_at=compliance_query.created_at
            )
    
    def _build_analysis_prompt(
        self,
        query: str,
        context: str,
        document_content: Optional[str],
        initial_confidence: float
    ) -> str:
        """Build the analysis prompt for Gemini"""
        
        prompt_parts = [
            "COMPLIANCE ANALYSIS REQUEST",
            "=" * 50,
            "",
            f"USER QUERY: {query}",
            "",
            "KNOWLEDGE BASE CONTEXT (Use ONLY these references):",
            "-" * 50,
            context,
            "-" * 50,
        ]
        
        if document_content:
            prompt_parts.extend([
                "",
                "DOCUMENT TO ANALYZE:",
                "-" * 50,
                document_content[:5000],  # Limit document content
                "-" * 50,
            ])
        
        prompt_parts.extend([
            "",
            f"INITIAL CONFIDENCE FROM RETRIEVAL: {initial_confidence:.2f}",
            "",
            "INSTRUCTIONS:",
            "1. Analyze the query/document against the provided knowledge base context",
            "2. Cite ONLY clauses that appear in the context above",
            "3. If confidence < 0.9 or context is insufficient, status MUST be 'INSUFFICIENT INFORMATION'",
            "4. Return response as valid JSON only, no markdown",
            "",
            "Provide your compliance analysis in JSON format:"
        ])
        
        return "\n".join(prompt_parts)
    
    async def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API and get response"""
        
        response = self.model.generate_content(prompt)
        
        if not response.text:
            raise ValueError("Empty response from Gemini")
        
        return response.text
    
    def _parse_response(
        self,
        response: str,
        initial_confidence: float
    ) -> Dict[str, Any]:
        """Parse and validate Gemini response"""
        
        # Clean response (remove markdown code blocks if present)
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError as e:
            self.logger.error("json_parse_error", error=str(e), response=response[:500])
            # Return default insufficient information response
            return {
                "status": "INSUFFICIENT INFORMATION",
                "confidence_score": 0.0,
                "summary": "Unable to parse compliance analysis. Please rephrase your query.",
                "analysis": [{"point": "Analysis parsing failed", "clause_reference": None}],
                "violations": [],
                "recommendations": [{"recommendation": "Please retry with a clearer query", "priority": "medium"}]
            }
        
        # Validate and adjust confidence
        result_confidence = result.get("confidence_score", 0.0)
        
        # If retrieval confidence is low, override the result
        if initial_confidence < settings.CONFIDENCE_THRESHOLD:
            result["status"] = "INSUFFICIENT INFORMATION"
            result["confidence_score"] = min(result_confidence, initial_confidence)
            result["summary"] = f"Insufficient regulatory context found. {result.get('summary', '')}"
        
        # Ensure required fields
        if "status" not in result:
            result["status"] = "INSUFFICIENT INFORMATION"
        
        if "summary" not in result:
            result["summary"] = "No summary available"
        
        if "analysis" not in result or not result["analysis"]:
            result["analysis"] = [{"point": "No analysis available", "clause_reference": None}]
        
        if "recommendations" not in result or not result["recommendations"]:
            result["recommendations"] = [{"recommendation": "Review with compliance officer", "priority": "medium"}]
        
        if "violations" not in result:
            result["violations"] = []
        
        return result
    
    async def check_document_compliance(
        self,
        db: AsyncSession,
        document_id: UUID,
        document_content: str,
        check_categories: Optional[List[str]] = None
    ) -> ComplianceResult:
        """
        Check uploaded document for compliance
        
        Args:
            db: Database session
            document_id: Document ID
            document_content: Extracted document content
            check_categories: Optional specific categories to check (e.g., "AML", "KYC")
            
        Returns:
            ComplianceResult
        """
        # Build query based on categories
        if check_categories:
            categories_str = ", ".join(check_categories)
            query = f"Check this document for compliance with {categories_str} requirements"
        else:
            query = "Perform comprehensive compliance check on this document against all SBP regulations and HBL policies"
        
        return await self.analyze_compliance(
            db=db,
            query_text=query,
            document_content=document_content,
            document_id=document_id
        )


# Singleton instance
compliance_analyzer = ComplianceAnalyzer()
