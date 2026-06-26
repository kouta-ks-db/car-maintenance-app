type AppHeaderCardProps = {
  icon: string;
  englishLabel: string;
  title: string;
  description: string;
};

function cardStyle() {
  return {
    border: '1px solid rgba(226,232,240,0.18)',
    borderRadius: '24px',
    padding: '24px',
    background:
      'radial-gradient(circle at 12% 0%, rgba(34,211,238,0.22) 0%, transparent 34%), radial-gradient(circle at 92% 16%, rgba(167,139,250,0.16) 0%, transparent 32%), linear-gradient(145deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.94) 62%, rgba(17,24,39,0.9) 100%)',
    boxShadow:
      '0 24px 60px rgba(15,23,42,0.42), inset 0 1px 0 rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  } as const;
}

function sectionLabelStyle() {
  return {
    color: '#94a3b8',
    fontSize: '12px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    margin: 0,
  };
}

function accentLineStyle() {
  return {
    width: '46px',
    height: '2px',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #22d3ee 0%, #60a5fa 48%, #a78bfa 100%)',
    marginTop: '10px',
  } as const;
}

export default function AppHeaderCard({
  icon,
  englishLabel,
  title,
  description,
}: AppHeaderCardProps) {
  return (
    <section style={{ ...cardStyle(), marginBottom: '18px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '16px',
            background:
              'linear-gradient(145deg, rgba(51,65,85,0.92), rgba(15,23,42,0.98))',
            border: '1px solid rgba(226,232,240,0.2)',
            boxShadow:
              '0 10px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          {icon}
        </div>

        <div>
          <p style={sectionLabelStyle()}>{englishLabel}</p>
          <div style={accentLineStyle()} />
        </div>
      </div>

      <h1 style={{ fontSize: '31px', margin: '0 0 10px 0', lineHeight: 1.2 }}>
        {title}
      </h1>

      <p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.65 }}>{description}</p>
    </section>
  );
}
