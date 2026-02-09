'use client';

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Lightbulb,
  BookOpen,
} from 'lucide-react';
import { useState } from 'react';
import { getStatusBadgeColor, getPriorityColor, formatConfidence } from '@/lib/utils';
import type { ComplianceResult as ComplianceResultType } from '@/types';

interface ComplianceResultProps {
  result: ComplianceResultType;
}

export default function ComplianceResult({ result }: ComplianceResultProps) {
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showViolations, setShowViolations] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showSources, setShowSources] = useState(true);

  const getStatusIcon = () => {
    switch (result.status) {
      case 'COMPLIANT':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'PARTIALLY COMPLIANT':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      case 'NON-COMPLIANT':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'INSUFFICIENT INFORMATION':
        return <HelpCircle className="h-6 w-6 text-gray-500" />;
      default:
        return <HelpCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusBorderColor = () => {
    switch (result.status) {
      case 'COMPLIANT':
        return 'border-l-green-500';
      case 'PARTIALLY COMPLIANT':
        return 'border-l-amber-500';
      case 'NON-COMPLIANT':
        return 'border-l-red-500';
      case 'INSUFFICIENT INFORMATION':
        return 'border-l-gray-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className={`bg-white border border-hbl-gray-200 rounded-xl overflow-hidden border-l-4 ${getStatusBorderColor()}`}>
      {/* Status Header */}
      <div className="p-4 bg-hbl-gray-50 border-b border-hbl-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(result.status)}`}>
                {result.status}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-hbl-gray-500">Confidence</p>
            <p className="font-semibold text-hbl-gray-900">
              {formatConfidence(result.confidence_score)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 border-b border-hbl-gray-200">
        <h4 className="text-sm font-semibold text-hbl-gray-700 mb-2">Summary</h4>
        <p className="text-hbl-gray-800">{result.summary}</p>
      </div>

      {/* Compliance Analysis */}
      <div className="border-b border-hbl-gray-200">
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-hbl-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-hbl-green" />
            <span className="font-semibold text-hbl-gray-700">Compliance Analysis</span>
            <span className="text-xs text-hbl-gray-400">({result.analysis.length} points)</span>
          </div>
          {showAnalysis ? (
            <ChevronUp className="h-4 w-4 text-hbl-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-hbl-gray-400" />
          )}
        </button>
        
        {showAnalysis && (
          <div className="px-4 pb-4">
            <ul className="space-y-3">
              {result.analysis.map((point, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-hbl-green text-white text-xs rounded-full flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-hbl-gray-800">{point.point}</p>
                    {point.clause_reference && (
                      <p className="text-sm text-hbl-green mt-1">
                        📎 {point.clause_reference}
                        {point.document_name && ` - ${point.document_name}`}
                        {point.section_number && ` (Section ${point.section_number})`}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Violations */}
      {result.violations && result.violations.length > 0 && (
        <div className="border-b border-hbl-gray-200">
          <button
            onClick={() => setShowViolations(!showViolations)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-hbl-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="font-semibold text-hbl-gray-700">Violations</span>
              <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {result.violations.length} found
              </span>
            </div>
            {showViolations ? (
              <ChevronUp className="h-4 w-4 text-hbl-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-hbl-gray-400" />
            )}
          </button>
          
          {showViolations && (
            <div className="px-4 pb-4">
              <div className="space-y-4">
                {result.violations.map((violation, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-red-600 uppercase">What</p>
                        <p className="text-hbl-gray-800">{violation.what}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-600 uppercase">Why</p>
                        <p className="text-hbl-gray-800">{violation.why}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-600 uppercase">Violated Clause</p>
                        <p className="text-red-700 font-medium">{violation.clause}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div className="border-b border-hbl-gray-200">
        <button
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-hbl-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-hbl-gray-700">Recommendations</span>
            <span className="text-xs text-hbl-gray-400">({result.recommendations.length})</span>
          </div>
          {showRecommendations ? (
            <ChevronUp className="h-4 w-4 text-hbl-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-hbl-gray-400" />
          )}
        </button>
        
        {showRecommendations && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(rec.priority)}`}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <p className="text-hbl-gray-800">{rec.recommendation}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Source Documents */}
      {result.source_documents && result.source_documents.length > 0 && (
        <div className="border-b border-hbl-gray-200">
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-hbl-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-hbl-green" />
              <span className="font-semibold text-hbl-gray-700">Source Documents</span>
              <span className="text-xs text-hbl-green bg-green-50 px-2 py-0.5 rounded-full">
                {result.source_documents.length} {result.source_documents.length === 1 ? 'document' : 'documents'}
              </span>
            </div>
            {showSources ? (
              <ChevronUp className="h-4 w-4 text-hbl-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-hbl-gray-400" />
            )}
          </button>
          
          {showSources && (
            <div className="px-4 pb-4">
              <ul className="space-y-2">
                {result.source_documents.map((source) => (
                  <li key={source.document_id}>
                    <a
                      href={`http://localhost:8000/api/v1/documents/${source.document_id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-hbl-green hover:text-hbl-green-dark hover:underline transition-colors"
                    >
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{source.document_name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-4 bg-hbl-gray-50">
        <p className="text-xs text-hbl-gray-500 italic">
          ⚠️ {result.disclaimer}
        </p>
        {result.processing_time_ms && (
          <p className="text-xs text-hbl-gray-400 mt-1">
            Processed in {result.processing_time_ms}ms
          </p>
        )}
      </div>
    </div>
  );
}
