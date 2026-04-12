type AppHeaderCardProps = {
  icon: string;
  englishLabel: string;
  title: string;
  description: string;
};

function cardStyle() {
  return {
    border: '1px solid #27272a',
    borderRadius: '20px',
    padding: '24px',
    background:
      'linear-gradient(180deg, rgba(39,39,42,0.9) 0%, rgba(24,24,27,0.95) 100%)',
    boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
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
    width: '42px',
    height: '3px',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #fafafa 0%, #71717a 100%)',
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
          gap: '14px',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: '#18181b',
            border: '1px solid #27272a',
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

      <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', lineHeight: 1.2 }}>
        {title}
      </h1>

      <p style={{ color: '#a1a1aa', margin: 0 }}>{description}</p>
    </section>
  );
}