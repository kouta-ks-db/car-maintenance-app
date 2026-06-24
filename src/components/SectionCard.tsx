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
        border: active
          ? '1px solid rgba(96,165,250,0.7)'
          : '1px solid rgba(113,113,122,0.22)',
        borderRadius: '18px',
        padding: '18px',
        background:
          'linear-gradient(180deg, rgba(30,30,34,0.9) 0%, rgba(12,12,14,0.98) 100%)',
        boxShadow: active
          ? '0 0 0 1px rgba(96,165,250,0.18), 0 18px 42px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 14px 34px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.035)',
        marginBottom,
      }}
    >
      {children}
    </section>
  );
}
