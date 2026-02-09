'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ChatInterface, { type Message } from '@/components/ChatInterface';
import Sidebar from '@/components/Sidebar';
import type { Document as DocumentType } from '@/types';

export default function Home() {
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar messages={messages} />
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface 
            selectedDocument={selectedDocument} 
            messages={messages}
            onMessagesChange={setMessages}
          />
        </main>
      </div>
    </div>
  );
}
