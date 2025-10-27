import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '../components/layout/Sidebar';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ayaz Logistics - 3PL Management System',
  description: 'Comprehensive 3PL management system for warehouse and transportation operations',
  keywords: 'logistics, 3PL, warehouse management, transportation, supply chain',
  authors: [{ name: 'Ayaz Logistics' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow', // Admin panel should not be indexed
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            <div className="flex h-screen bg-gray-100">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}