import { ReactNode } from 'react';

type SectionCardProps = {
  children: ReactNode;
  active?: boolean;
  marginBottom?: string;
};

export default function SectionCard({
  children,
  active = false,
  marginBottom = '16px',
}: SectionCardProps) {
  return (
    <section
      style={{
        border: active ? '1px solid #60a5fa' : '1px solid #27272a',
        borderRadius: '20px',
        padding: '18px',
        background:
          'linear-gradient(180deg, rgba(39,39,42,0.9) 0%, rgba(24,24,27,0.95) 100%)',
        boxShadow: active
          ? '0 0 0 1px rgba(96,165,250,0.18), 0 12px 30px rgba(0,0,0,0.28)'
          : '0 12px 30px rgba(0,0,0,0.22)',
        marginBottom,
      }}
    >
      {children}
    </section>
  );
}