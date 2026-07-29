import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'ConsistentChar — Karakter AI Konsisten untuk Semua Platform',
  description:
    'Upload 5-20 foto, AI ekstrak karakter DNA, generate prompt untuk FLUX, Midjourney, Gemini, dan 9+ model AI lainnya.',
  openGraph: {
    title: 'ConsistentChar — Karakter AI Konsisten',
    description: 'Satu karakter, semua platform AI. Prompt konsisten untuk 10+ model.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body><ClientLayout>{children}</ClientLayout></body>
    </html>
  );
}
