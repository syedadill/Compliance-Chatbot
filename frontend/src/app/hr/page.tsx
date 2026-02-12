'use client';

import { useState } from 'react';
import HRHeader from '@/components/HRHeader';
import HRChatInterface, { type Message } from '@/components/HRChatInterface';
import HRSidebar from '@/components/HRSidebar';
import type { Document as DocumentType } from '@/types';

export default function HRChatPage() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div className="flex flex-col h-screen">
      <HRHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <HRSidebar messages={messages} />
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <HRChatInterface 
            selectedDocument={selectedDocument} 
            messages={messages}
            onMessagesChange={setMessages}
          />
        </main>
      </div>
    </div>
  );
}
