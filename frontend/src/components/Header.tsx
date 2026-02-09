'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Database } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-hbl-green text-white shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-bold">Compliance Chatbot</h1>
              <p className="text-sm text-green-100">Regulatory Compliance Assistant</p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center space-x-2">
            <Link
              href="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                pathname === '/'
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MessageCircle className="h-5 w-5" />
              <span>Chat</span>
            </Link>
            <Link
              href="/knowledgebases"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                pathname?.startsWith('/knowledgebases')
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
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
