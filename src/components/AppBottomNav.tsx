'use client';

import Link from 'next/link';

type AppBottomNavItem = {
  href: string;
  icon: string;
  label: string;
  id: AppBottomNavActive;
};

type AppBottomNavActive = 'home' | 'records' | 'tools' | 'weather' | 'calculator';

type AppBottomNavProps = {
  active: AppBottomNavActive;
};

const NAV_ITEMS: AppBottomNavItem[] = [
  { href: '/', icon: '⌂', label: 'ホーム', id: 'home' },
  { href: '/wash', icon: '◌', label: '記録', id: 'records' },
  { href: '/wash-tools', icon: '▣', label: '道具', id: 'tools' },
  { href: '/weather', icon: '☀', label: '天気', id: 'weather' },
  { href: '/dilution', icon: '∶', label: '計算', id: 'calculator' },
];

export default function AppBottomNav({ active }: AppBottomNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(14px + env(safe-area-inset-bottom))',
        transform: 'translateX(-50%)',
        width: 'min(calc(100% - 28px), 540px)',
        zIndex: 50,
        border: '1px solid rgba(226,232,240,0.18)',
        borderRadius: '22px',
        background: 'rgba(15,23,42,0.84)',
        boxShadow:
          '0 18px 46px rgba(15,23,42,0.42), inset 0 1px 0 rgba(255,255,255,0.1)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        padding: '7px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)`,
          gap: '4px',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                minWidth: 0,
                minHeight: '58px',
                borderRadius: '15px',
                border: isActive
                  ? '1px solid rgba(125,211,252,0.5)'
                  : '1px solid transparent',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(14,165,233,0.28), rgba(124,58,237,0.2))'
                  : 'transparent',
                color: isActive ? '#f8fafc' : '#cbd5e1',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: '19px',
                  lineHeight: 1,
                  transform: isActive ? 'translateY(-1px)' : 'none',
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
