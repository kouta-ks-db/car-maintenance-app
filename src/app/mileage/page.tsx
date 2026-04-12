'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type MileageRecord = {
  id: number;
  date: string;
  distance: string;
};

type MileageErrors = {
  date?: string;
  distance?: string;
};

const STORAGE_KEY = 'mileage-records';

const DEFAULT_RECORDS: MileageRecord[] = [
  {
    id: 1,
    date: '2026-04-12',
    distance: '45200',
  },
  {
    id: 2,
    date: '2026-04-01',
    distance: '44800',
  },
];

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

export default function MileagePage() {
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<MileageErrors>({});
  const [records, setRecords] = useState<MileageRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as MileageRecord[];
        setRecords(Array.isArray(parsed) ? parsed : DEFAULT_RECORDS);
      } catch {
        setRecords(DEFAULT_RECORDS);
      }
    } else {
      setRecords(DEFAULT_RECORDS);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, isLoaded]);

  function handleSave() {
    const newErrors: MileageErrors = {};

    if (!date) {
      newErrors.date = '日付を入れてください';
    }

    if (!distance) {
      newErrors.distance = '走行距離を入れてください';
    } else if (Number(distance) <= 0) {
      newErrors.distance = '0より大きい値にしてください';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSavedMessage('入力内容を確認してください');
      return;
    }

    if (editingId !== null) {
      const updated = records.map((record) =>
        record.id === editingId ? { ...record, date, distance } : record
      );
      setRecords(updated);
      setEditingId(null);
      setSavedMessage('更新しました');
    } else {
      const newRecord: MileageRecord = {
        id: Date.now(),
        date,
        distance,
      };

      setRecords([newRecord, ...records]);
      setSavedMessage('保存しました');
    }

    setDate('');
    setDistance('');
    setErrors({});
  }

  function handleEdit(record: MileageRecord) {
    setDate(record.date);
    setDistance(record.distance);
    setEditingId(record.id);
    setErrors({});
    setSavedMessage('編集中');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id: number) {
    if (!window.confirm('削除しますか？')) return;

    setRecords(records.filter((record) => record.id !== id));
    setSavedMessage('削除しました');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDate('');
    setDistance('');
    setErrors({});
    setSavedMessage('編集をキャンセルしました');
  }

  const latest =
    records.length > 0
      ? Math.max(...records.map((record) => Number(record.distance)))
      : 0;

  const sortedRecords = [...records].sort(
    (a, b) => Number(b.distance || 0) - Number(a.distance || 0)
  );

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(63,63,70,0.45) 0%, #0a0a0b 28%, #09090b 100%)',
        color: '#fafafa',
        padding: '24px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: '24px',
            color: '#a1a1aa',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          ← ホームに戻る
        </Link>

        <AppHeaderCard
          icon="📍"
          englishLabel="Mileage Log"
          title="走行距離"
          description="日付ごとの走行距離を記録して推移を確認"
        />

        <SectionCard>
          <p
            style={{
              margin: '0 0 8px 0',
              color: '#71717a',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Current Mileage
          </p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>
            {latest.toLocaleString()}
            <span style={{ fontSize: '15px', color: '#a1a1aa', marginLeft: '8px' }}>
              km
            </span>
          </p>
        </SectionCard>

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? '走行距離を編集' : '走行距離を入力'}
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <DateInputWithPicker
              label="日付"
              value={date}
              onChange={(value) => {
                setDate(value);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              error={errors.date}
            />

            <div>
              <label style={labelStyle()}>走行距離 (km)</label>
              <input
                type="number"
                placeholder="例: 45200"
                value={distance}
                onChange={(e) => {
                  setDistance(e.target.value);
                  setErrors((prev) => ({ ...prev, distance: undefined }));
                }}
                style={inputStyle(!!errors.distance)}
              />
              {errors.distance ? (
                <p
                  style={{
                    color: '#f87171',
                    fontSize: '14px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}
                >
                  {errors.distance}
                </p>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                background: '#fafafa',
                color: '#09090b',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '15px',
              }}
            >
              {editingId ? '更新する' : '保存する'}
            </button>

            {editingId !== null ? (
              <button
                onClick={handleCancelEdit}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '14px',
                  border: '1px solid #3f3f46',
                  background: 'transparent',
                  color: '#fafafa',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '15px',
                }}
              >
                キャンセル
              </button>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard>
          <p
            style={{
              margin: '0 0 8px 0',
              color: '#71717a',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Status
          </p>
          <p style={{ margin: 0, color: '#e4e4e7' }}>
            {savedMessage || 'まだ保存していません'}
          </p>
        </SectionCard>

        <SectionCard marginBottom="0">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            <h2 style={{ fontSize: '20px', margin: 0 }}>走行距離一覧</h2>
            <span style={{ color: '#71717a', fontSize: '13px' }}>
              {isLoaded ? `${sortedRecords.length} 件` : '読み込み中...'}
            </span>
          </div>

          {!isLoaded ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>読み込み中...</p>
          ) : sortedRecords.length === 0 ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>記録がありません</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {sortedRecords.map((record) => (
                <div
                  key={record.id}
                  style={{
                    borderRadius: '16px',
                    border: '1px solid #27272a',
                    background: '#09090b',
                    padding: '16px',
                  }}
                >
                  <p style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700 }}>
                    {record.date}
                  </p>

                  <p style={{ margin: '0 0 12px 0', color: '#a1a1aa', fontSize: '14px' }}>
                    {Number(record.distance).toLocaleString()} km
                  </p>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(record)}
                      style={{
                        padding: '9px 13px',
                        borderRadius: '12px',
                        border: '1px solid #1d4ed8',
                        background: '#172554',
                        color: '#bfdbfe',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      編集
                    </button>

                    <button
                      onClick={() => handleDelete(record.id)}
                      style={{
                        padding: '9px 13px',
                        borderRadius: '12px',
                        border: '1px solid #7f1d1d',
                        background: '#450a0a',
                        color: '#fecaca',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}