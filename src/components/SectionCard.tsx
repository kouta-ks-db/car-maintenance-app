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
          ? '1px solid rgba(14,165,233,0.5)'
          : '1px solid rgba(226,232,240,0.16)',
        borderRadius: '22px',
        padding: '20px',
        background:
          'linear-gradient(180deg, rgba(30,41,59,0.86) 0%, rgba(15,23,42,0.9) 100%)',
        boxShadow: active
          ? '0 0 0 1px rgba(14,165,233,0.14), 0 22px 54px rgba(15,23,42,0.38), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 18px 44px rgba(15,23,42,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        marginBottom,
      }}
    >
      {children}
    </section>
  );
}
