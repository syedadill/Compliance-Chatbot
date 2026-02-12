"use client";
import React, { useEffect, useState } from "react";
import ComplianceHeader from "@/components/ComplianceHeader";
import { 
  Play, Plus, Trash2, CheckCircle, MessageSquare, 
  AlertTriangle, Sparkles, X, FileText
} from "lucide-react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

interface Correction {
  id: string;
  chatbot_type: string;
  original_query: string;
  original_response: string;
  correction: string;
  is_applied: boolean;
  created_at: string;
}

interface TestResult {
  response: string;
  sources: { document_name: string; chunk_text: string }[];
  prompt_used: string;
  processing_time_ms: number;
}

const TrainTestPage = () => {
  // Test query state
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Corrections state
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loadingCorrections, setLoadingCorrections] = useState(true);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [applyingCorrections, setApplyingCorrections] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadCorrections();
  }, []);

  const loadCorrections = async () => {
    try {
      setLoadingCorrections(true);
      const res = await api.get<Correction[]>("/system-prompts/corrections", {
        params: { chatbot_type: "COMPLIANCE" }
      });
      setCorrections(res.data);
    } catch (err) {
      console.error("Failed to load corrections:", err);
    } finally {
      setLoadingCorrections(false);
    }
  };

  const handleTest = async () => {
    if (!testQuery.trim()) {
      alert("Please enter a test query");
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const res = await api.post<TestResult>("/system-prompts/test", {
        query: testQuery,
        chatbot_type: "COMPLIANCE"
      });
      setTestResult(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleAddCorrection = async () => {
    if (!correctionText.trim() || !testResult) {
      alert("Please provide a correction");
      return;
    }

    try {
      setSavingCorrection(true);
      await api.post("/system-prompts/corrections", {
        chatbot_type: "COMPLIANCE",
        original_query: testQuery,
        original_response: testResult.response,
        correction: correctionText
      });
      setShowCorrectionModal(false);
      setCorrectionText("");
      await loadCorrections();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to save correction");
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleDeleteCorrection = async (correctionId: string) => {
    if (!confirm("Are you sure you want to delete this correction?")) return;

    try {
      setDeleting(correctionId);
      await api.delete(`/system-prompts/corrections/${correctionId}`);
      await loadCorrections();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to delete correction");
    } finally {
      setDeleting(null);
    }
  };

  const handleApplyCorrections = async () => {
    const pendingCount = corrections.filter(c => !c.is_applied).length;
    if (pendingCount === 0) {
      alert("No pending corrections to apply");
      return;
    }

    if (!confirm(`Apply ${pendingCount} correction(s) to the system prompt? This will modify how the chatbot responds.`)) return;

    try {
      setApplyingCorrections(true);
      const res = await api.post("/system-prompts/corrections/apply", null, {
        params: { chatbot_type: "COMPLIANCE" }
      });
      alert(res.data.message);
      await loadCorrections();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to apply corrections");
    } finally {
      setApplyingCorrections(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const pendingCount = corrections.filter(c => !c.is_applied).length;
  const appliedCount = corrections.filter(c => c.is_applied).length;

  return (
    <div className="flex flex-col h-screen">
      <ComplianceHeader />

      <main className="flex-1 overflow-auto bg-hbl-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-hbl-gray-900 mb-2">
              Train & Test
            </h1>
            <p className="text-hbl-gray-600">
              Test compliance queries and add corrections to improve responses
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Test Query Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-hbl-gray-200 shadow-sm">
                <div className="p-6 border-b border-hbl-gray-200">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-6 w-6 text-hbl-green" />
                    <h2 className="text-xl font-bold text-hbl-gray-900">Test Query</h2>
                  </div>
                  <p className="text-sm text-hbl-gray-600 mt-2">
                    Test how the chatbot responds to a compliance question
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-hbl-gray-700 mb-2">
                      Enter Query
                    </label>
                    <textarea
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      placeholder="Enter a compliance question to test..."
                      className="w-full h-28 px-4 py-3 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hbl-green text-sm resize-none"
                    />
                  </div>

                  <button
                    onClick={handleTest}
                    disabled={testing || !testQuery.trim()}
                    className="flex items-center justify-center space-x-2 w-full bg-hbl-green text-white px-6 py-3 rounded-lg hover:bg-hbl-green-dark transition-colors disabled:opacity-50"
                  >
                    <Play className="h-5 w-5" />
                    <span>{testing ? "Testing..." : "Run Test"}</span>
                  </button>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className="bg-white rounded-xl border border-hbl-gray-200 shadow-sm">
                  <div className="p-6 border-b border-hbl-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-hbl-gray-900">Response</h3>
                      <span className="text-xs text-hbl-gray-500">
                        {testResult.processing_time_ms}ms
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="prose prose-sm max-w-none text-hbl-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {testResult.response}
                    </div>

                    {testResult.sources && testResult.sources.length > 0 && (
                      <div className="pt-4 border-t border-hbl-gray-100">
                        <h4 className="text-sm font-semibold text-hbl-gray-700 mb-2 flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Sources ({testResult.sources.length})</span>
                        </h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {testResult.sources.map((source, idx) => (
                            <div key={idx} className="p-2 bg-hbl-gray-50 rounded text-xs">
                              <p className="font-medium text-hbl-gray-900">{source.document_name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Wrong Response Button */}
                    <div className="pt-4 border-t border-hbl-gray-100">
                      <button
                        onClick={() => setShowCorrectionModal(true)}
                        className="flex items-center justify-center space-x-2 w-full border-2 border-amber-400 text-amber-700 px-4 py-3 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <AlertTriangle className="h-5 w-5" />
                        <span>Response is Wrong - Add Correction</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Corrections Section */}
            <div className="bg-white rounded-xl border border-hbl-gray-200 shadow-sm">
              <div className="p-6 border-b border-hbl-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Sparkles className="h-6 w-6 text-hbl-green" />
                    <div>
                      <h2 className="text-xl font-bold text-hbl-gray-900">Corrections</h2>
                      <p className="text-sm text-hbl-gray-500">
                        {pendingCount} pending • {appliedCount} applied
                      </p>
                    </div>
                  </div>
                  {pendingCount > 0 && (
                    <button
                      onClick={handleApplyCorrections}
                      disabled={applyingCorrections}
                      className="flex items-center space-x-2 px-4 py-2 bg-hbl-green text-white rounded-lg hover:bg-hbl-green-dark transition-colors disabled:opacity-50 text-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{applyingCorrections ? "Applying..." : `Apply (${pendingCount})`}</span>
                    </button>
                  )}
                </div>
              </div>

              {loadingCorrections && (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-hbl-green"></div>
                </div>
              )}

              {!loadingCorrections && corrections.length === 0 && (
                <div className="p-12 text-center">
                  <Sparkles className="h-16 w-16 text-hbl-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-hbl-gray-900 mb-2">
                    No corrections yet
                  </h3>
                  <p className="text-hbl-gray-600 text-sm">
                    Test queries and add corrections when responses are wrong
                  </p>
                </div>
              )}

              {!loadingCorrections && corrections.length > 0 && (
                <div className="divide-y divide-hbl-gray-100 max-h-[600px] overflow-y-auto">
                  {corrections.map((correction) => (
                    <div key={correction.id} className="p-4 hover:bg-hbl-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            {correction.is_applied ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                <span>Applied</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Pending</span>
                              </span>
                            )}
                            <span className="text-xs text-hbl-gray-400">
                              {formatDate(correction.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-hbl-gray-600 mb-1">
                            <span className="font-medium text-hbl-gray-700">Query: </span>
                            {correction.original_query.substring(0, 80)}...
                          </p>
                          
                          <p className="text-sm text-hbl-gray-800 bg-hbl-gray-50 p-2 rounded">
                            <span className="font-medium text-hbl-green">Correction: </span>
                            {correction.correction}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteCorrection(correction.id)}
                          disabled={deleting === correction.id}
                          className="p-2 text-hbl-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-hbl-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-hbl-gray-900">Add Correction</h3>
                <p className="text-sm text-hbl-gray-600 mt-1">
                  Describe what the correct response should be
                </p>
              </div>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="p-2 text-hbl-gray-400 hover:text-hbl-gray-600 hover:bg-hbl-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-hbl-gray-700 mb-1">
                  Original Query
                </label>
                <p className="text-sm text-hbl-gray-600 bg-hbl-gray-50 p-3 rounded-lg">
                  {testQuery}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-hbl-gray-700 mb-2">
                  What should the correct response include?
                </label>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder="e.g., The response should mention that according to SBP circular XYZ, the limit is 50,000 PKR not 100,000 PKR..."
                  className="w-full h-32 px-4 py-3 border border-hbl-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-hbl-green text-sm resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-hbl-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="px-6 py-2 border border-hbl-gray-300 text-hbl-gray-700 rounded-lg hover:bg-hbl-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCorrection}
                disabled={savingCorrection || !correctionText.trim()}
                className="flex items-center space-x-2 px-6 py-2 bg-hbl-green text-white rounded-lg hover:bg-hbl-green-dark transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{savingCorrection ? "Saving..." : "Add Correction"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainTestPage;
