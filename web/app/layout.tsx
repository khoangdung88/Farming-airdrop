import '../styles/globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import TopNav from '@/components/TopNav';

export const metadata: Metadata = {
  title: 'Farming Airdrop Manager',
  description: 'Quản lý quy trình airdrop farming',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
