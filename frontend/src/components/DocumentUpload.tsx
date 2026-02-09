'use client';

import { useState, useCallback } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadDocument } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';
import type { Document, DocumentType } from '@/types';

interface DocumentUploadProps {
  onUploadComplete: (document: Document) => void;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'USER_UPLOAD', label: 'General Upload' },
  { value: 'SBP_CIRCULAR', label: 'SBP Circular' },
  { value: 'SBP_POLICY', label: 'SBP Policy' },
  { value: 'INTERNAL_POLICY', label: 'Internal Policy' },
  { value: 'GUIDELINE', label: 'Guideline' },
];

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('USER_UPLOAD');
  const [source, setSource] = useState('');
  const [circularNumber, setCircularNumber] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const allowedTypes = ['.pdf', '.docx', '.txt'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(extension)) {
      setError('Invalid file type. Please upload PDF, DOCX, or TXT files.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }

    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const document = await uploadDocument(file, {
        title: title || undefined,
        description: description || undefined,
        document_type: documentType,
        source: source || undefined,
        circular_number: circularNumber || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onUploadComplete(document);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setDocumentType('USER_UPLOAD');
    setSource('');
    setCircularNumber('');
    setError(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="card text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-hbl-gray-900 mb-2">
          Upload Successful!
        </h3>
        <p className="text-hbl-gray-600">
          Your document is being processed and indexed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-hbl-green bg-green-50'
            : 'border-hbl-gray-300 hover:border-hbl-gray-400'
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center space-x-4">
            <File className="h-12 w-12 text-hbl-green" />
            <div className="text-left">
              <p className="font-medium text-hbl-gray-900">{file.name}</p>
              <p className="text-sm text-hbl-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="p-1 hover:bg-hbl-gray-100 rounded-full"
            >
              <X className="h-5 w-5 text-hbl-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-hbl-gray-400 mx-auto mb-4" />
            <p className="text-hbl-gray-600 mb-2">
              Drag and drop your file here, or{' '}
              <label className="text-hbl-green hover:underline cursor-pointer">
                browse
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                />
              </label>
            </p>
            <p className="text-sm text-hbl-gray-400">
              Supports PDF, DOCX, TXT (max 10MB)
            </p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Metadata Form */}
      {file && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-hbl-gray-900">Document Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-hbl-gray-700 mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 border border-hbl-gray-300 rounded-lg focus:ring-2 focus:ring-hbl-green focus:border-transparent"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-hbl-gray-700 mb-1">
                Source
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., SBP, Internal Policy"
                className="w-full px-3 py-2 border border-hbl-gray-300 rounded-lg focus:ring-2 focus:ring-hbl-green focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-hbl-gray-700 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="w-full px-3 py-2 border border-hbl-gray-300 rounded-lg focus:ring-2 focus:ring-hbl-green focus:border-transparent"
            />
          </div>

          {(documentType === 'SBP_CIRCULAR' || documentType === 'SBP_POLICY') && (
            <div>
              <label className="block text-sm font-medium text-hbl-gray-700 mb-1">
                Circular Number
              </label>
              <input
                type="text"
                value={circularNumber}
                onChange={(e) => setCircularNumber(e.target.value)}
                placeholder="e.g., BPRD Circular No. 7"
                className="w-full px-3 py-2 border border-hbl-gray-300 rounded-lg focus:ring-2 focus:ring-hbl-green focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-hbl-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of the document"
              className="w-full px-3 py-2 border border-hbl-gray-300 rounded-lg focus:ring-2 focus:ring-hbl-green focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-hbl-gray-700 hover:bg-hbl-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2 bg-hbl-green text-white rounded-lg hover:bg-hbl-green-dark transition-colors disabled:bg-hbl-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="loading-spinner !w-4 !h-4 !border-2"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload & Process</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
