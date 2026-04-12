import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'カーメンテ',
  description: '車のメンテナンス管理アプリ',
  applicationName: 'カーメンテ',
  appleWebApp: {
    capable: true,
    title: 'カーメンテ',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}