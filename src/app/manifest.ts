import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'カーメンテナンス',
    short_name: 'カーメンテ',
    description: '車のメンテナンス管理アプリ',
    start_url: '/',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
