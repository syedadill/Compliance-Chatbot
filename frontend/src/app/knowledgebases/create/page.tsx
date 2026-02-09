"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createKnowledgebase } from "../../../lib/knowledgebaseApi";
import Header from "@/components/Header";
import { Database, ArrowLeft, Save } from "lucide-react";

const CreateKnowledgebasePage = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createKnowledgebase({ name, description });
      router.push("/knowledgebases");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to create knowledgebase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <main className="flex-1 overflow-auto bg-hbl-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Back Button */}
          <Link href="/knowledgebases">
            <button className="flex items-center space-x-2 text-hbl-gray-600 hover:text-hbl-green transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Knowledgebases</span>
            </button>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-hbl-gray-900 flex items-center space-x-3">
              <Database className="h-8 w-8 text-hbl-green" />
              <span>Create Knowledgebase</span>
            </h1>
            <p className="text-hbl-gray-600 mt-2">
              Create a new knowledgebase to organize related compliance documents
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl border border-hbl-gray-200 p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-semibold text-hbl-gray-700 mb-2">
                  Knowledgebase Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="e.g., AML Compliance Policies"
                  className="w-full border border-hbl-gray-300 rounded-lg px-4 py-3 text-hbl-gray-900 placeholder-hbl-gray-400 focus:outline-none focus:ring-2 focus:ring-hbl-green focus:border-transparent transition-all"
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-semibold text-hbl-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the purpose and contents of this knowledgebase..."
                  rows={4}
                  className="w-full border border-hbl-gray-300 rounded-lg px-4 py-3 text-hbl-gray-900 placeholder-hbl-gray-400 focus:outline-none focus:ring-2 focus:ring-hbl-green focus:border-transparent transition-all resize-none"
                />
                <p className="text-xs text-hbl-gray-500 mt-2">
                  Optional: Add a description to help identify this knowledgebase
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <Link href="/knowledgebases">
                  <button
                    type="button"
                    className="px-6 py-3 border border-hbl-gray-300 text-hbl-gray-700 rounded-lg hover:bg-hbl-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </Link>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center space-x-2 bg-hbl-green text-white px-8 py-3 rounded-lg hover:bg-hbl-green-dark transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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

export default CreateKnowledgebasePage;
