'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, FileText, AlertCircle } from 'lucide-react';
import { complianceChat } from '@/lib/api';
import ComplianceResult from '@/components/ComplianceResult';
import type { Document, ChatResponse as ChatResponseType, ComplianceResult as ComplianceResultType } from '@/types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: ComplianceResultType;
  timestamp: Date;
}

interface ChatInterfaceProps {
  selectedDocument: Document | null;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  chatbotType?: 'compliance' | 'hr';
}

export default function ChatInterface({ selectedDocument, messages, onMessagesChange, chatbotType = 'compliance' }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    onMessagesChange([...messages, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response: ChatResponseType = await complianceChat({
        message: input.trim(),
        document_id: selectedDocument?.id,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response.summary,
        result: response.response,
        timestamp: new Date(),
      };

      onMessagesChange([...messages, userMessage, assistantMessage]);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    'What are the mandatory requirements for valid electronic filing?',
    'Does this SRO override the Income Tax Ordinance?',
    'What authority is cited for issuing this SRO?',
    'What information must be included in withholding tax statements?',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Context Banner */}
      {selectedDocument && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-center space-x-2 text-sm text-green-800">
            <FileText className="h-4 w-4" />
            <span>
              Analyzing against: <strong>{selectedDocument.original_filename}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 bg-hbl-green rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-hbl-gray-900 mb-3">
              Compliance Assistant
            </h2>
            <p className="text-hbl-gray-600 mb-8">
              Ask any compliance-related question. I'll analyze it against regulatory requirements
              and internal policies to provide accurate, cited responses.
            </p>

            {/* Example Queries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => setInput(query)}
                  className="text-left p-4 bg-white border border-hbl-gray-200 rounded-lg hover:border-hbl-green hover:bg-green-50 transition-colors"
                >
                  <p className="text-sm text-hbl-gray-700">{query}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-enter ${
                  message.role === 'user' ? 'flex justify-end' : ''
                }`}
              >
                {message.role === 'user' ? (
                  <div className="max-w-lg bg-hbl-green text-white rounded-2xl rounded-tr-sm px-4 py-3">
                    <p>{message.content}</p>
                  </div>
                ) : (
                  <div className="w-full">
                    {message.result ? (
                      <ComplianceResult result={message.result} />
                    ) : (
                      <div className="bg-white border border-hbl-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-hbl-gray-800">{message.content}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-hbl-gray-500">
                <div className="loading-spinner"></div>
                <span>Analyzing compliance...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-hbl-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask a compliance question..."
                rows={1}
                className="w-full px-4 py-3 border border-hbl-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-hbl-green focus:border-transparent"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 bg-hbl-green text-white rounded-xl hover:bg-hbl-green-dark transition-colors disabled:bg-hbl-gray-300 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-hbl-gray-400 mt-2 text-center">
            Responses are based on regulatory requirements and internal policies. Always verify with compliance officers.
          </p>
        </form>
      </div>
    </div>
  );
}
