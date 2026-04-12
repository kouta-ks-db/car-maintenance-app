import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'カーメンテ',
  description: '車のメンテナンス管理アプリ',
  applicationName: 'カーメンテ',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
    shortcut: '/icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'カーメンテ',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}