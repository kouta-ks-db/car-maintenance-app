type AppHeaderCardProps = {
  icon: string;
  englishLabel: string;
  title: string;
  description: string;
};

function cardStyle() {
  return {
    border: '1px solid rgba(113,113,122,0.24)',
    borderRadius: '18px',
    padding: '24px',
    background:
      'linear-gradient(145deg, rgba(39,39,42,0.86) 0%, rgba(12,12,14,0.98) 64%, rgba(24,24,27,0.94) 100%)',
    boxShadow:
      '0 18px 42px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)',
  } as const;
}

function sectionLabelStyle() {
  return {
    color: '#71717a',
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
    background: 'linear-gradient(90deg, #f8fafc 0%, #38bdf8 55%, #71717a 100%)',
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
            borderRadius: '15px',
            background:
              'linear-gradient(145deg, rgba(24,24,27,0.92), rgba(9,9,11,0.98))',
            border: '1px solid rgba(113,113,122,0.28)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
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

      <p style={{ color: '#c4c4cc', margin: 0, lineHeight: 1.65 }}>{description}</p>
    </section>
  );
}
