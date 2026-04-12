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
    marginBottom: '8px',
    color: '#a1a1aa',
    fontSize: '14px',
  } as const;
}

function inputStyle(hasError = false) {
  return {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: hasError ? '1px solid #ef4444' : '1px solid #3f3f46',
    background: '#09090b',
    color: '#fafafa',
    outline: 'none',
    fontSize: '15px',
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
            borderRadius: '14px',
            border: error ? '1px solid #ef4444' : '1px solid #3f3f46',
            background: '#09090b',
            color: '#fafafa',
            cursor: 'pointer',
            fontSize: '20px',
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