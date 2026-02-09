/**
 * HBL Compliance Chatbot - Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ComplianceStatus } from '@/types';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Get status color
export function getStatusColor(status: ComplianceStatus): string {
  switch (status) {
    case 'COMPLIANT':
      return 'text-status-compliant bg-green-50 border-green-200';
    case 'PARTIALLY COMPLIANT':
      return 'text-status-partial bg-amber-50 border-amber-200';
    case 'NON-COMPLIANT':
      return 'text-status-noncompliant bg-red-50 border-red-200';
    case 'INSUFFICIENT INFORMATION':
      return 'text-status-insufficient bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// Get status badge color
export function getStatusBadgeColor(status: ComplianceStatus): string {
  switch (status) {
    case 'COMPLIANT':
      return 'bg-green-100 text-green-800';
    case 'PARTIALLY COMPLIANT':
      return 'bg-amber-100 text-amber-800';
    case 'NON-COMPLIANT':
      return 'bg-red-100 text-red-800';
    case 'INSUFFICIENT INFORMATION':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Get priority color
export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'text-red-600 bg-red-50';
    case 'medium':
      return 'text-amber-600 bg-amber-50';
    case 'low':
      return 'text-green-600 bg-green-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Format confidence score
export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}
