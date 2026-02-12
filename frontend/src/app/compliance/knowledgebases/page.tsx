"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getKnowledgebases, deleteKnowledgebase, updateKnowledgebase } from "@/lib/knowledgebaseApi";
import ComplianceHeader from "@/components/ComplianceHeader";
import { Database, Plus, FileText, Clock, Folder, Pencil, Trash2, X, Check } from "lucide-react";

interface Knowledgebase {
  id: string;
  name: string;
  description: string | null;
  chatbot_type: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

const ComplianceKnowledgebasesPage = () => {
  const router = useRouter();
  const [knowledgebases, setKnowledgebases] = useState<Knowledgebase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKb, setEditingKb] = useState<Knowledgebase | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadKnowledgebases = () => {
    setLoading(true);
    getKnowledgebases('COMPLIANCE')
      .then((data) => {
        setKnowledgebases(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Failed to fetch knowledgebases:', err);
        setError('Failed to load knowledgebases. Please ensure the backend is running.');
        setKnowledgebases([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadKnowledgebases();
  }, []);

  const handleEdit = (kb: Knowledgebase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingKb(kb);
    setEditName(kb.name);
    setEditDescription(kb.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingKb) return;
    try {
      await updateKnowledgebase(editingKb.id, {
        name: editName,
        description: editDescription
      });
      setEditingKb(null);
      loadKnowledgebases();
    } catch (err) {
      console.error('Failed to update knowledgebase:', err);
      alert('Failed to update knowledgebase');
    }
  };

  const handleDelete = async (kbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this knowledgebase? All documents will be removed.")) return;
    
    try {
      setDeleting(kbId);
      await deleteKnowledgebase(kbId);
      loadKnowledgebases();
    } catch (err) {
      console.error('Failed to delete knowledgebase:', err);
      alert('Failed to delete knowledgebase');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <ComplianceHeader />
      
      <main className="flex-1 overflow-auto bg-hbl-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-hbl-gray-900 flex items-center space-x-3">
                <Database className="h-8 w-8 text-hbl-green" />
                <span>Compliance Knowledgebases</span>
              </h1>
              <p className="text-hbl-gray-600 mt-2">
                Manage compliance documents and regulatory policies
              </p>
            </div>
            
            <Link href="/compliance/knowledgebases/create">
              <button className="flex items-center space-x-2 bg-hbl-green text-white px-6 py-3 rounded-lg hover:bg-hbl-green-dark transition-colors shadow-md">
                <Plus className="h-5 w-5" />
                <span>Create Knowledgebase</span>
              </button>
            </Link>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hbl-green"></div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && knowledgebases.length === 0 && (
            <div className="bg-white rounded-xl border border-hbl-gray-200 p-12 text-center">
              <Folder className="h-16 w-16 text-hbl-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-hbl-gray-900 mb-2">
                No compliance knowledgebases yet
              </h3>
              <p className="text-hbl-gray-600 mb-6">
                Create your first knowledgebase to organize compliance documents
              </p>
              <Link href="/compliance/knowledgebases/create">
                <button className="inline-flex items-center space-x-2 bg-hbl-green text-white px-6 py-3 rounded-lg hover:bg-hbl-green-dark transition-colors">
                  <Plus className="h-5 w-5" />
                  <span>Create Knowledgebase</span>
                </button>
              </Link>
            </div>
          )}

          {/* Knowledgebase Grid */}
          {!loading && !error && knowledgebases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {knowledgebases.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => router.push(`/compliance/knowledgebases/${kb.id}`)}
                  className="bg-white rounded-xl border border-hbl-gray-200 p-6 hover:shadow-lg hover:border-hbl-green transition-all cursor-pointer group relative"
                >
                  {/* Edit/Delete Actions */}
                  <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEdit(kb, e)}
                      className="p-2 text-hbl-gray-400 hover:text-hbl-green hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit knowledgebase"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(kb.id, e)}
                      disabled={deleting === kb.id}
                      className="p-2 text-hbl-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete knowledgebase"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                        <Database className="h-6 w-6 text-hbl-green" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-hbl-gray-900 group-hover:text-hbl-green transition-colors">
                          {kb.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-hbl-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                    {kb.description || "No description provided"}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-hbl-gray-100">
                    <div className="flex items-center space-x-2 text-hbl-gray-600">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {kb.document_count} {kb.document_count === 1 ? "document" : "documents"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-hbl-gray-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">{formatDate(kb.created_at)}</span>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="mt-4">
                    <button className="w-full py-2 px-4 bg-hbl-gray-50 text-hbl-green rounded-lg group-hover:bg-hbl-green group-hover:text-white transition-colors font-medium text-sm">
                      View Documents
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingKb && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-hbl-gray-900">Edit Knowledgebase</h3>
              <button
                onClick={() => setEditingKb(null)}
                className="p-2 text-hbl-gray-400 hover:text-hbl-gray-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-hbl-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hbl-green focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-hbl-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hbl-green focus:border-transparent resize-none"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setEditingKb(null)}
                  className="px-4 py-2 border border-hbl-gray-300 text-hbl-gray-700 rounded-lg hover:bg-hbl-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center space-x-2 px-4 py-2 bg-hbl-green text-white rounded-lg hover:bg-hbl-green-dark transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceKnowledgebasesPage;
