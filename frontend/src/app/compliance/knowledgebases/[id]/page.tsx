"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getKnowledgebase, updateKnowledgebase, deleteKnowledgebase } from "@/lib/knowledgebaseApi";
import ComplianceHeader from "@/components/ComplianceHeader";
import axios from "axios";
import { 
  ArrowLeft, Upload, FileText, CheckCircle, Clock, 
  AlertCircle, Play, Trash2, RefreshCw, Pencil, X, Check 
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

interface Document {
  id: string;
  original_filename: string;
  document_type: string;
  file_size: number;
  is_processed: boolean;
  chunk_count: number;
  processing_error: string | null;
  created_at: string;
}

interface PaginatedResponse {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const ComplianceKnowledgebaseDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const kbId = params.id as string;
  
  const [kb, setKb] = useState<any>(null);
  const [files, setFiles] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deletingKb, setDeletingKb] = useState(false);

  useEffect(() => {
    if (kbId) {
      loadKnowledgebase();
      loadFiles();
    }
  }, [kbId, page]);

  const loadKnowledgebase = async () => {
    try {
      const data = await getKnowledgebase(kbId);
      setKb(data);
      setEditName(data.name);
      setEditDescription(data.description || "");
    } catch (err) {
      console.error("Failed to load knowledgebase:", err);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get<PaginatedResponse>(
        `/documents/knowledgebase/${kbId}/files?page=${page}&page_size=${pageSize}`
      );
      setFiles(res.data?.items || []);
      setTotalPages(res.data?.total_pages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to load files:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("knowledgebase_id", kbId);

        try {
          await api.post(`/documents/upload`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
        } catch (err: any) {
          console.error(`Failed to upload ${file.name}:`, err);
          alert(`Failed to upload ${file.name}: ${err?.response?.data?.detail || "Upload failed"}`);
        }
      }
      
      await loadFiles();
      await loadKnowledgebase();
      e.target.value = "";
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleParse = async (docId: string) => {
    try {
      setParsing(docId);
      await api.post(`/documents/parse/${docId}`);
      await loadFiles();
      await loadKnowledgebase();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Parsing failed");
    } finally {
      setParsing(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      setDeleting(docId);
      await api.delete(`/documents/${docId}`);
      await loadFiles();
      await loadKnowledgebase();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const handleEditKb = async () => {
    try {
      await updateKnowledgebase(kbId, {
        name: editName,
        description: editDescription
      });
      setIsEditing(false);
      await loadKnowledgebase();
    } catch (err) {
      console.error("Failed to update knowledgebase:", err);
      alert("Failed to update knowledgebase");
    }
  };

  const handleDeleteKb = async () => {
    if (!confirm("Are you sure you want to delete this knowledgebase? All documents will be removed.")) return;
    
    try {
      setDeletingKb(true);
      await deleteKnowledgebase(kbId);
      router.push("/compliance/knowledgebases");
    } catch (err) {
      console.error("Failed to delete knowledgebase:", err);
      alert("Failed to delete knowledgebase");
    } finally {
      setDeletingKb(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!kb) return (
    <div className="flex flex-col h-screen">
      <ComplianceHeader />
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hbl-green"></div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <ComplianceHeader />
      
      <main className="flex-1 overflow-auto bg-hbl-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Back Button */}
          <Link href="/compliance/knowledgebases">
            <button className="flex items-center space-x-2 text-hbl-gray-600 hover:text-hbl-green transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Knowledgebases</span>
            </button>
          </Link>

          {/* Header Section */}
          <div className="bg-white rounded-xl border border-hbl-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-3xl font-bold text-hbl-gray-900 w-full px-3 py-2 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hbl-green"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="text-hbl-gray-600 w-full px-3 py-2 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hbl-green resize-none"
                      rows={2}
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleEditKb}
                        className="flex items-center space-x-2 px-4 py-2 bg-hbl-green text-white rounded-lg hover:bg-hbl-green-dark transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(kb.name);
                          setEditDescription(kb.description || "");
                        }}
                        className="px-4 py-2 border border-hbl-gray-300 text-hbl-gray-700 rounded-lg hover:bg-hbl-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-3xl font-bold text-hbl-gray-900">{kb.name}</h1>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 text-hbl-gray-400 hover:text-hbl-green hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleDeleteKb}
                        disabled={deletingKb}
                        className="p-2 text-hbl-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-hbl-gray-600 mb-4">
                      {kb.description || "No description provided"}
                    </p>
                  </>
                )}
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2 text-hbl-gray-700">
                    <FileText className="h-5 w-5 text-hbl-green" />
                    <span className="font-semibold">{total}</span>
                    <span className="text-sm">documents</span>
                  </div>
                  <div className="flex items-center space-x-2 text-hbl-gray-500 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Created {formatDate(kb.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 bg-hbl-green text-white px-6 py-3 rounded-lg hover:bg-hbl-green-dark transition-colors cursor-pointer shadow-md">
                  <Upload className="h-5 w-5" />
                  <span>{uploading ? "Uploading..." : "Upload Documents"}</span>
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    disabled={uploading}
                    accept=".pdf,.txt,.docx,.doc"
                    multiple
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-xl border border-hbl-gray-200 shadow-sm">
            <div className="p-6 border-b border-hbl-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-hbl-gray-900">Documents</h2>
                <button
                  onClick={loadFiles}
                  className="flex items-center space-x-2 text-hbl-gray-600 hover:text-hbl-green transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">Refresh</span>
                </button>
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hbl-green"></div>
              </div>
            )}

            {!loading && files.length === 0 && (
              <div className="p-12 text-center">
                <FileText className="h-16 w-16 text-hbl-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-hbl-gray-900 mb-2">
                  No documents uploaded yet
                </h3>
                <p className="text-hbl-gray-600 mb-6">
                  Upload your first compliance document to get started
                </p>
              </div>
            )}

            {!loading && files.length > 0 && (
              <div className="divide-y divide-hbl-gray-100">
                {files.map((file) => (
                  <div key={file.id} className="p-6 hover:bg-hbl-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="p-3 bg-green-50 rounded-lg">
                          <FileText className="h-6 w-6 text-hbl-green" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-hbl-gray-900 mb-1 truncate">
                            {file.original_filename}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-hbl-gray-600">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>•</span>
                            <span>{formatDate(file.created_at)}</span>
                          </div>
                          
                          <div className="mt-3">
                            {file.is_processed ? (
                              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700">
                                  Parsed • {file.chunk_count} chunks
                                </span>
                              </div>
                            ) : file.processing_error ? (
                              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <span className="text-sm font-medium text-red-700">Error</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                                <Clock className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-medium text-amber-700">Unparsed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!file.is_processed && !file.processing_error && (
                          <button
                            onClick={() => handleParse(file.id)}
                            disabled={parsing === file.id}
                            className="flex items-center space-x-2 px-4 py-2 bg-hbl-green text-white rounded-lg hover:bg-hbl-green-dark transition-colors disabled:opacity-50"
                          >
                            <Play className="h-4 w-4" />
                            <span>{parsing === file.id ? "Parsing..." : "Parse Now"}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file.id)}
                          disabled={deleting === file.id}
                          className="p-2 text-hbl-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && files.length > 0 && totalPages > 1 && (
              <div className="p-6 border-t border-hbl-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-hbl-gray-600">
                    Showing page {page} of {totalPages}
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border border-hbl-gray-300 text-hbl-gray-700 rounded-lg hover:bg-hbl-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-hbl-gray-300 text-hbl-gray-700 rounded-lg hover:bg-hbl-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplianceKnowledgebaseDetailPage;
