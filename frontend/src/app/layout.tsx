import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Compliance Chatbot',
  description: 'Enterprise-grade AI Compliance Chatbot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-hbl-gray-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
