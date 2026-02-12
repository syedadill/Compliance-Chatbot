'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Database, Users, Home } from 'lucide-react';

export default function HRHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">HR Chatbot</h1>
              <p className="text-sm text-blue-100">Your HR Policy Assistant</p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center space-x-2">
            <Link
              href="/"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link
              href="/hr"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                pathname === '/hr'
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MessageCircle className="h-5 w-5" />
              <span>Chat</span>
            </Link>
            <Link
              href="/hr/knowledgebases"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                pathname?.startsWith('/hr/knowledgebases')
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Database className="h-5 w-5" />
              <span>Knowledgebases</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
