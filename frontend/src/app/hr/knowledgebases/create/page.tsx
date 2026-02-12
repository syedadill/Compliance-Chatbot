"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HRHeader from "@/components/HRHeader";
import { createKnowledgebase } from "@/lib/knowledgebaseApi";
import { ArrowLeft, Database, Save } from "lucide-react";

const CreateHRKnowledgebasePage = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Please enter a name for the knowledgebase");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const kb = await createKnowledgebase({
        name: name.trim(),
        description: description.trim() || undefined,
        chatbot_type: 'HR'
      });
      
      router.push(`/hr/knowledgebases/${kb.id}`);
    } catch (err: any) {
      console.error('Failed to create knowledgebase:', err);
      setError(err?.response?.data?.detail || 'Failed to create knowledgebase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <HRHeader />
      
      <main className="flex-1 overflow-auto bg-hbl-gray-50">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Back Button */}
          <Link href="/hr/knowledgebases">
            <button className="flex items-center space-x-2 text-hbl-gray-600 hover:text-blue-500 transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Knowledgebases</span>
            </button>
          </Link>

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-hbl-gray-200 p-8 shadow-sm">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Database className="h-8 w-8 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-hbl-gray-900">Create HR Knowledgebase</h1>
                <p className="text-hbl-gray-600">Add a new knowledgebase for HR policy documents</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-hbl-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Employee Handbook 2024"
                  className="w-full px-4 py-3 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-hbl-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the purpose of this knowledgebase..."
                  rows={4}
                  className="w-full px-4 py-3 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end space-x-4 pt-4">
                <Link href="/hr/knowledgebases">
                  <button
                    type="button"
                    className="px-6 py-3 border border-hbl-gray-300 text-hbl-gray-700 rounded-lg hover:bg-hbl-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5" />
                  <span>{loading ? "Creating..." : "Create Knowledgebase"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateHRKnowledgebasePage;
