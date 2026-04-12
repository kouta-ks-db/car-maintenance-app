import Link from 'next/link';

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#09090b',
        color: '#fafafa',
        padding: '24px',
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>
        カーメンテナンスアプリ
      </h1>

      <p style={{ color: '#a1a1aa', marginBottom: '24px' }}>
        自分用の記録アプリを開発中です。
      </p>

      <section
        style={{
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          background: '#18181b',
        }}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>次回メンテ目安</h2>
        <p>オイル交換: あと 2,000km</p>
        <p>タイヤ交換: 2026-10-12</p>
      </section>

      <section
        style={{
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          background: '#18181b',
        }}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>最近の給油</h2>
        <p>2026-04-12 / 24.5L / 4,200円</p>
      </section>

      <Link
        href="/fuel"
        style={{
          display: 'inline-block',
          padding: '12px 16px',
          background: '#fafafa',
          color: '#09090b',
          borderRadius: '12px',
          fontWeight: 'bold',
          textDecoration: 'none',
        }}
      >
        給油記録を見る
      </Link>
    </main>
  );
}