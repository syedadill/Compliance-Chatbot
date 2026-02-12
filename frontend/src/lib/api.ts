/**
 * HBL Compliance Chatbot - API Client
 */

import axios from 'axios';
import type {
  Document,
  ComplianceResult,
  ChatRequest,
  ChatResponse,
  SearchRequest,
  SearchResponse,
  HealthCheck,
  ComplianceQueryRequest,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Health Check
export const getHealth = async (): Promise<HealthCheck> => {
  const response = await api.get('/health');
  return response.data;
};

// Documents
export const uploadDocument = async (
  file: File,
  metadata?: {
    title?: string;
    description?: string;
    document_type?: string;
    source?: string;
    circular_number?: string;
  }
): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (metadata?.title) formData.append('title', metadata.title);
  if (metadata?.description) formData.append('description', metadata.description);
  if (metadata?.document_type) formData.append('document_type', metadata.document_type);
  if (metadata?.source) formData.append('source', metadata.source);
  if (metadata?.circular_number) formData.append('circular_number', metadata.circular_number);
  
  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDocuments = async (params?: {
  document_type?: string;
  is_processed?: boolean;
  skip?: number;
  limit?: number;
}): Promise<Document[]> => {
  const response = await api.get('/documents', { params });
  return response.data;
};

export const getDocument = async (documentId: string): Promise<Document> => {
  const response = await api.get(`/documents/${documentId}`);
  return response.data;
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/documents/${documentId}`);
};

// Compliance
export const analyzeCompliance = async (
  request: ComplianceQueryRequest
): Promise<ComplianceResult> => {
  const response = await api.post('/compliance/analyze', request);
  return response.data;
};

export const checkDocumentCompliance = async (
  documentId: string,
  categories?: string[]
): Promise<ComplianceResult> => {
  const response = await api.post(`/compliance/check-document/${documentId}`, null, {
    params: { categories },
  });
  return response.data;
};

export const complianceChat = async (request: ChatRequest): Promise<ChatResponse> => {
  const response = await api.post('/compliance/chat', request);
  return response.data;
};

// HR Chatbot endpoints
export interface HRChatRequest {
  message: string;
  document_id?: string;
}

export interface HRChatResponse {
  response: string;
  sources: { document_name: string; content: string }[];
}

export const hrChat = async (request: HRChatRequest): Promise<HRChatResponse> => {
  const response = await api.post('/hr/chat', request);
  return response.data;
};

export const searchKnowledgeBase = async (
  request: SearchRequest
): Promise<SearchResponse> => {
  const response = await api.post('/compliance/search', request);
  return response.data;
};

export const getComplianceHistory = async (
  skip?: number,
  limit?: number
): Promise<any[]> => {
  const response = await api.get('/compliance/history', {
    params: { skip, limit },
  });
  return response.data;
};

export default api;
