/**
 * Compliance Chatbot - TypeScript Types
 */

// Compliance Status Types
export type ComplianceStatus = 
  | 'COMPLIANT' 
  | 'PARTIALLY COMPLIANT' 
  | 'NON-COMPLIANT' 
  | 'INSUFFICIENT INFORMATION';

export type DocumentType = 
  | 'SBP_CIRCULAR' 
  | 'SBP_POLICY' 
  | 'INTERNAL_POLICY' 
  | 'USER_UPLOAD' 
  | 'GUIDELINE';

// Document Types
export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  document_type: DocumentType;
  file_size: number;
  mime_type: string | null;
  title: string | null;
  description: string | null;
  source: string | null;
  circular_number: string | null;
  is_processed: boolean;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  chunk_index: number;
  section_title: string | null;
  clause_number: string | null;
  page_number: number | null;
  token_count: number | null;
}

// Compliance Types
export interface AnalysisPoint {
  point: string;
  clause_reference: string | null;
  document_name: string | null;
  section_number: string | null;
}

export interface Violation {
  what: string;
  why: string;
  clause: string;
}

export interface Recommendation {
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SourceDocument {
  document_id: string;
  document_name: string;
  chunks: string[];
}

export interface ComplianceResult {
  query_id: string;
  status: ComplianceStatus;
  confidence_score: number;
  summary: string;
  analysis: AnalysisPoint[];
  violations: Violation[] | null;
  recommendations: Recommendation[];
  source_documents: SourceDocument[];
  disclaimer: string;
  processing_time_ms: number | null;
  created_at: string;
}

// API Request Types
export interface ComplianceQueryRequest {
  query_text: string;
  query_type?: string;
  document_id?: string;
}

export interface ChatRequest {
  message: string;
  document_id?: string;
}

export interface ChatResponse {
  response: ComplianceResult;
  sources: DocumentChunk[];
}

export interface SearchRequest {
  query: string;
  top_k?: number;
  document_type?: DocumentType;
  min_similarity?: number;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  content: string;
  similarity_score: number;
  clause_number: string | null;
  section_title: string | null;
  document_name: string | null;
  document_type: DocumentType;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
}

// Health Check
export interface HealthCheck {
  status: string;
  version: string;
  database: string;
  vector_store: string;
}

// HR Chatbot Types
export interface HRChatRequest {
  message: string;
  document_id?: string;
}

export interface HRSource {
  document_name: string;
  content: string;
}

export interface HRChatResponse {
  response: string;
  sources: HRSource[];
}

// Chatbot Type
export type ChatbotType = 'COMPLIANCE' | 'HR';

// Knowledgebase Types
export interface Knowledgebase {
  id: string;
  name: string;
  description: string | null;
  chatbot_type: ChatbotType;
  document_count: number;
  created_at: string;
  updated_at: string;
}
