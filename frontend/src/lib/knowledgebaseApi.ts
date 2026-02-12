import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with ngrok header to bypass browser warning
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

export type ChatbotType = 'COMPLIANCE' | 'HR';

export interface Knowledgebase {
  id: string;
  name: string;
  description: string | null;
  chatbot_type: ChatbotType;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgebaseCreate {
  name: string;
  description?: string;
  chatbot_type?: ChatbotType;
}

export interface KnowledgebaseUpdate {
  name?: string;
  description?: string;
}

export interface DocumentFile {
  id: string;
  filename: string;
  original_filename: string;
  document_type: string;
  file_size: number;
  mime_type: string | null;
  is_processed: boolean;
  chunk_count: number;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  knowledgebase_id: string;
}

export interface PaginatedDocuments {
  items: DocumentFile[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Get all knowledgebases
export async function getKnowledgebases(chatbotType?: ChatbotType): Promise<Knowledgebase[]> {
  const params = chatbotType ? { chatbot_type: chatbotType } : {};
  const response = await api.get(`/knowledgebases`, { params });
  return response.data;
}

// Get single knowledgebase
export async function getKnowledgebase(id: string): Promise<Knowledgebase> {
  const response = await api.get(`/knowledgebases/${id}`);
  return response.data;
}

// Create knowledgebase
export async function createKnowledgebase(data: KnowledgebaseCreate): Promise<Knowledgebase> {
  const response = await api.post(`/knowledgebases`, data);
  return response.data;
}

// Update knowledgebase
export async function updateKnowledgebase(id: string, data: KnowledgebaseUpdate): Promise<Knowledgebase> {
  const response = await api.put(`/knowledgebases/${id}`, data);
  return response.data;
}

// Delete knowledgebase
export async function deleteKnowledgebase(id: string): Promise<void> {
  await api.delete(`/knowledgebases/${id}`);
}

// Get files in knowledgebase (paginated)
export async function getKnowledgebaseFiles(
  knowledgebaseId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedDocuments> {
  const response = await api.get(
    `/documents/knowledgebase/${knowledgebaseId}/files`,
    { params: { page, page_size: pageSize } }
  );
  return response.data;
}

// Parse/process document
export async function parseDocument(documentId: string): Promise<DocumentFile> {
  const response = await api.post(`/documents/parse/${documentId}`);
  return response.data;
}

// Upload file to knowledgebase
export async function uploadFileToKnowledgebase(
  knowledgebaseId: string,
  file: File,
  document_type: string = 'USER_UPLOAD'
): Promise<DocumentFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', document_type);
  formData.append('knowledgebase_id', knowledgebaseId);

  const response = await api.post(`/documents/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}
