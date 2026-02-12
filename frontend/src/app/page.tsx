'use client';

import Link from 'next/link';
import { Shield, Users, MessageCircle, Database, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-hbl-gray-50 to-green-50">
      {/* Header */}
      <header className="bg-hbl-green text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">HBL Enterprise Chatbot</h1>
            <p className="text-green-100 mt-2">AI-Powered Assistant for Compliance & HR</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-hbl-gray-900 mb-4">
            Select Your Assistant
          </h2>
          <p className="text-hbl-gray-600 text-lg max-w-2xl mx-auto">
            Choose the chatbot that best fits your needs. Each assistant is specialized
            and uses dedicated knowledge bases to provide accurate responses.
          </p>
        </div>

        {/* Chatbot Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Compliance Chatbot Card */}
          <Link href="/compliance" className="group">
            <div className="bg-white rounded-2xl border-2 border-hbl-gray-200 p-8 hover:border-hbl-green hover:shadow-xl transition-all duration-300 h-full">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-hbl-green group-hover:scale-110 transition-all duration-300">
                  <Shield className="h-10 w-10 text-hbl-green group-hover:text-white transition-colors" />
                </div>
                
                <h3 className="text-2xl font-bold text-hbl-gray-900 mb-3 group-hover:text-hbl-green transition-colors">
                  Compliance Chatbot
                </h3>
                
                <p className="text-hbl-gray-600 mb-6">
                  Get instant answers about regulatory compliance, SBP regulations,
                  AML/KYC requirements, and internal policies. Analyze documents
                  for compliance.
                </p>

                <ul className="text-left text-sm text-hbl-gray-600 space-y-2 mb-6 w-full">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-hbl-green rounded-full"></span>
                    <span>SBP Regulations & Circulars</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-hbl-green rounded-full"></span>
                    <span>AML/KYC Compliance</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-hbl-green rounded-full"></span>
                    <span>Document Compliance Check</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-hbl-green rounded-full"></span>
                    <span>Internal Policy Analysis</span>
                  </li>
                </ul>

                <div className="flex items-center space-x-4 w-full">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg flex-1 justify-center group-hover:bg-green-100 transition-colors">
                    <MessageCircle className="h-4 w-4 text-hbl-green" />
                    <span className="text-sm font-medium text-hbl-green">Chat</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg flex-1 justify-center group-hover:bg-green-100 transition-colors">
                    <Database className="h-4 w-4 text-hbl-green" />
                    <span className="text-sm font-medium text-hbl-green">Knowledge</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center space-x-2 text-hbl-green font-semibold group-hover:translate-x-2 transition-transform">
                  <span>Enter Compliance Chatbot</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Link>

          {/* HR Chatbot Card */}
          <Link href="/hr" className="group">
            <div className="bg-white rounded-2xl border-2 border-hbl-gray-200 p-8 hover:border-blue-500 hover:shadow-xl transition-all duration-300 h-full">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-300">
                  <Users className="h-10 w-10 text-blue-500 group-hover:text-white transition-colors" />
                </div>
                
                <h3 className="text-2xl font-bold text-hbl-gray-900 mb-3 group-hover:text-blue-500 transition-colors">
                  HR Chatbot
                </h3>
                
                <p className="text-hbl-gray-600 mb-6">
                  Your AI HR assistant for employee policies, benefits information,
                  leave management, and workplace guidelines. Get quick answers
                  to HR queries.
                </p>

                <ul className="text-left text-sm text-hbl-gray-600 space-y-2 mb-6 w-full">
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    <span>Employee Policies</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    <span>Benefits & Compensation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    <span>Leave & Attendance</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    <span>Workplace Guidelines</span>
                  </li>
                </ul>

                <div className="flex items-center space-x-4 w-full">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg flex-1 justify-center group-hover:bg-blue-100 transition-colors">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-500">Chat</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg flex-1 justify-center group-hover:bg-blue-100 transition-colors">
                    <Database className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-500">Knowledge</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center space-x-2 text-blue-500 font-semibold group-hover:translate-x-2 transition-transform">
                  <span>Enter HR Chatbot</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-hbl-gray-500 text-sm">
        <p>© 2026 HBL Bank Pakistan. Enterprise AI Chatbot Platform.</p>
      </footer>
    </div>
  );
}
