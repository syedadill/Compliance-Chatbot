'use client';

import { MessageSquare, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HRSidebarProps {
  messages: Message[];
}

export default function HRSidebar({ messages }: HRSidebarProps) {
  // Group messages into conversations (user message + assistant response)
  const conversations = [];
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      conversations.push({
        id: messages[i].id,
        query: messages[i].content,
        timestamp: messages[i].timestamp,
      });
    }
  }

  return (
    <aside className="w-80 bg-white border-r border-hbl-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-hbl-gray-200">
        <h3 className="text-sm font-semibold text-hbl-gray-700 uppercase tracking-wide flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <span>Recent Chats</span>
        </h3>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-hbl-gray-300 mx-auto mb-2" />
              <p className="text-sm text-hbl-gray-500">No chats yet</p>
              <p className="text-xs text-hbl-gray-400 mt-1">
                Start a conversation to see your chat history
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((chat) => (
                <div
                  key={chat.id}
                  className="p-3 rounded-lg border border-hbl-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-hbl-gray-900 line-clamp-2">
                        {chat.query}
                      </p>
                      <div className="flex items-center space-x-1 mt-1 text-xs text-hbl-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(chat.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-hbl-gray-200 bg-blue-50">
        <p className="text-xs text-blue-600 text-center">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>
    </aside>
  );
}
