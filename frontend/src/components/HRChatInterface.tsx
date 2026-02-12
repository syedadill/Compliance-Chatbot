'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Users, AlertCircle } from 'lucide-react';
import { hrChat } from '@/lib/api';
import type { Document, HRChatResponse } from '@/types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { document_name: string; content: string }[];
  timestamp: Date;
}

interface HRChatInterfaceProps {
  selectedDocument: Document | null;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
}

export default function HRChatInterface({ selectedDocument, messages, onMessagesChange }: HRChatInterfaceProps) {
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
      const response = await hrChat({
        message: input.trim(),
        document_id: selectedDocument?.id,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        sources: response.sources,
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
    'What is the leave policy for employees?',
    'How do I apply for medical benefits?',
    'What are the working hours and attendance rules?',
    'Explain the performance review process',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-hbl-gray-900 mb-3">
              HR Assistant
            </h2>
            <p className="text-hbl-gray-600 mb-8">
              Ask any HR-related question. I'll help you understand employee policies,
              benefits, leave management, and workplace guidelines.
            </p>

            {/* Example Queries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exampleQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => setInput(query)}
                  className="text-left p-4 bg-white border border-hbl-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
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
                  <div className="max-w-lg bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                    <p>{message.content}</p>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="bg-white border border-hbl-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-hbl-gray-800 whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Sources */}
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-hbl-gray-100">
                              <p className="text-xs font-semibold text-hbl-gray-500 mb-2">SOURCES</p>
                              <div className="space-y-2">
                                {message.sources.map((source, idx) => (
                                  <div key={idx} className="text-xs text-hbl-gray-600 bg-hbl-gray-50 p-2 rounded">
                                    <span className="font-medium">{source.document_name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-blue-500">
                <div className="loading-spinner"></div>
                <span>Finding information...</span>
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
                placeholder="Ask an HR question..."
                rows={1}
                className="w-full px-4 py-3 border border-hbl-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:bg-hbl-gray-300 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-hbl-gray-400 mt-2 text-center">
            Responses are based on HR policies. For specific cases, please contact HR department.
          </p>
        </form>
      </div>
    </div>
  );
}
