"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getKnowledgebases } from "@/lib/knowledgebaseApi";
import Header from "@/components/Header";
import { Database, Plus, FileText, Clock, MessageCircle, Folder } from "lucide-react";

interface Knowledgebase {
  id: string;
  name: string;
  description: string | null;
  document_count: number;
  created_at: string;
  updated_at: string;
}

const KnowledgebasesPage = () => {
  const router = useRouter();
  const [knowledgebases, setKnowledgebases] = useState<Knowledgebase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKnowledgebases()
      .then(setKnowledgebases)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <main className="flex-1 overflow-auto bg-hbl-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-hbl-gray-900 flex items-center space-x-3">
                <Database className="h-8 w-8 text-hbl-green" />
                <span>Knowledgebases</span>
              </h1>
              <p className="text-hbl-gray-600 mt-2">
                Organize and manage your compliance documents
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link href="/">
                <button className="flex items-center space-x-2 px-4 py-2 border border-hbl-green text-hbl-green rounded-lg hover:bg-green-50 transition-colors">
                  <MessageCircle className="h-5 w-5" />
                  <span>Go to Chat</span>
                </button>
              </Link>
              <Link href="/knowledgebases/create">
                <button className="flex items-center space-x-2 bg-hbl-green text-white px-6 py-3 rounded-lg hover:bg-hbl-green-dark transition-colors shadow-md">
                  <Plus className="h-5 w-5" />
                  <span>Create Knowledgebase</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hbl-green"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && knowledgebases.length === 0 && (
            <div className="bg-white rounded-xl border border-hbl-gray-200 p-12 text-center">
              <Folder className="h-16 w-16 text-hbl-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-hbl-gray-900 mb-2">
                No knowledgebases yet
              </h3>
              <p className="text-hbl-gray-600 mb-6">
                Create your first knowledgebase to organize compliance documents
              </p>
              <Link href="/knowledgebases/create">
                <button className="inline-flex items-center space-x-2 bg-hbl-green text-white px-6 py-3 rounded-lg hover:bg-hbl-green-dark transition-colors">
                  <Plus className="h-5 w-5" />
                  <span>Create Knowledgebase</span>
                </button>
              </Link>
            </div>
          )}

          {/* Knowledgebase Grid */}
          {!loading && knowledgebases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {knowledgebases.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => router.push(`/knowledgebases/${kb.id}`)}
                  className="bg-white rounded-xl border border-hbl-gray-200 p-6 hover:shadow-lg hover:border-hbl-green transition-all cursor-pointer group"
                >
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
    </div>
  );
};

export default KnowledgebasesPage;
