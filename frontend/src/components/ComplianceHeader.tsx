'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Database, Shield, Home, Settings, FlaskConical } from 'lucide-react';

export default function ComplianceHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-hbl-green text-white shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Compliance Chatbot</h1>
              <p className="text-sm text-green-100">Regulatory Compliance Assistant</p>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center space-x-2">
            <Link
              href="/"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-green-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            <Link
              href="/compliance"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                pathname === '/compliance'
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <MessageCircle className="h-5 w-5" />
              <span>Chat</span>
            </Link>
            <Link
              href="/compliance/knowledgebases"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                pathname?.startsWith('/compliance/knowledgebases')
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Database className="h-5 w-5" />
              <span>Knowledgebases</span>
            </Link>
            <Link
              href="/compliance/train-test"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                pathname?.startsWith('/compliance/train-test')
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FlaskConical className="h-5 w-5" />
              <span>Train & Test</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
