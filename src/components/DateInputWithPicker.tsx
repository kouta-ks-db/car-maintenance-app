'use client';

import { useRef } from 'react';

type DateInputWithPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

function labelStyle() {
  return {
    display: 'block',
    marginBottom: '9px',
    color: '#e2e8f0',
    fontSize: '13px',
    fontWeight: 700,
  } as const;
}

function inputStyle(hasError = false) {
  return {
    width: '100%',
    padding: '15px 16px',
    borderRadius: '16px',
    border: hasError ? '1px solid #ef4444' : '1px solid rgba(226,232,240,0.18)',
    background:
      'linear-gradient(180deg, rgba(248,250,252,0.1) 0%, rgba(15,23,42,0.62) 100%)',
    color: '#f8fafc',
    outline: 'none',
    fontSize: '15px',
    boxShadow: hasError
      ? '0 0 0 3px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.045)'
      : 'inset 0 1px 0 rgba(255,255,255,0.08)',
    transition: 'border-color 140ms ease, box-shadow 140ms ease, background 140ms ease',
    colorScheme: 'dark',
  } as const;
}

export default function DateInputWithPicker({
  label,
  value,
  onChange,
  error,
}: DateInputWithPickerProps) {
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  return (
    <div>
      <label style={labelStyle()}>{label}</label>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          ref={dateInputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle(!!error), flex: 1 }}
        />

        <button
          type="button"
          onClick={openDatePicker}
          style={{
            width: '52px',
            minWidth: '52px',
            borderRadius: '16px',
            border: error ? '1px solid #ef4444' : '1px solid rgba(226,232,240,0.18)',
            background:
              'linear-gradient(180deg, rgba(248,250,252,0.1) 0%, rgba(15,23,42,0.62) 100%)',
            color: '#f8fafc',
            cursor: 'pointer',
            fontSize: '20px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
          aria-label="カレンダーを開く"
          title="カレンダーを開く"
        >
          📅
        </button>
      </div>

      {error ? (
        <p
          style={{
            color: '#f87171',
            fontSize: '14px',
            marginTop: '8px',
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
