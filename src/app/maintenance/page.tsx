'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type MaintenanceMenu = 'インテリア追加' | 'エクステリア追加' | 'パーツ交換';

type MaintenanceRecord = {
  id: number;
  date: string;
  menu: MaintenanceMenu;
  price: string;
  memo: string;
};

type MaintenanceErrors = {
  date?: string;
  menu?: string;
  price?: string;
};

type OldMaintenanceRecord = {
  id: number;
  date: string;
  menu: MaintenanceMenu;
  price?: string;
  memo?: string;
};

const STORAGE_KEY = 'maintenance-records';

const MAINTENANCE_MENU_OPTIONS: MaintenanceMenu[] = [
  'インテリア追加',
  'エクステリア追加',
  'パーツ交換',
];

const DEFAULT_RECORDS: MaintenanceRecord[] = [
  {
    id: 1,
    date: '2026-04-12',
    menu: 'インテリア追加',
    price: '3500',
    memo: '車内の小物を追加',
  },
  {
    id: 2,
    date: '2026-04-05',
    menu: 'パーツ交換',
    price: '2800',
    memo: 'ワイパー交換',
  },
];

function normalizeRecord(record: OldMaintenanceRecord): MaintenanceRecord {
  return {
    id: record.id,
    date: record.date ?? '',
    menu: record.menu,
    price: record.price ?? '',
    memo: record.memo ?? '',
  };
}

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

export default function MaintenancePage() {
  const [date, setDate] = useState('');
  const [menu, setMenu] = useState('');
  const [price, setPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<MaintenanceErrors>({});
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedRecords = window.localStorage.getItem(STORAGE_KEY);

    if (savedRecords) {
      try {
        const parsed = JSON.parse(savedRecords) as OldMaintenanceRecord[];
        const normalized = Array.isArray(parsed)
          ? parsed.map(normalizeRecord)
          : DEFAULT_RECORDS;
        setRecords(normalized);
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
    const newErrors: MaintenanceErrors = {};

    if (!date) {
      newErrors.date = 'メンテ日を入れてください';
    }

    if (!menu) {
      newErrors.menu = 'メニューを選んでください';
    }

    if (price && Number(price) < 0) {
      newErrors.price = '価格は 0 以上で入力してください';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSavedMessage('入力内容を確認してください');
      return;
    }

    if (editingId !== null) {
      const updatedRecords = records.map((record) =>
        record.id === editingId
          ? {
              ...record,
              date,
              menu: menu as MaintenanceMenu,
              price,
              memo,
            }
          : record
      );

      setRecords(updatedRecords);
      setSavedMessage('メンテ記録を更新しました');
      setEditingId(null);
    } else {
      const newRecord: MaintenanceRecord = {
        id: Date.now(),
        date,
        menu: menu as MaintenanceMenu,
        price,
        memo,
      };

      setRecords([newRecord, ...records]);
      setSavedMessage('メンテ記録を保存しました');
    }

    setDate('');
    setMenu('');
    setPrice('');
    setMemo('');
    setErrors({});
  }

  function handleEdit(record: MaintenanceRecord) {
    setDate(record.date);
    setMenu(record.menu);
    setPrice(record.price);
    setMemo(record.memo);
    setEditingId(record.id);
    setErrors({});
    setSavedMessage(`編集中: ${record.date} のメンテ記録`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id: number) {
    const targetRecord = records.find((record) => record.id === id);

    if (!targetRecord) return;

    const ok = window.confirm(
      `${targetRecord.date} / ${targetRecord.menu} を削除しますか？`
    );

    if (!ok) return;

    const nextRecords = records.filter((record) => record.id !== id);
    setRecords(nextRecords);

    if (editingId === id) {
      setEditingId(null);
      setDate('');
      setMenu('');
      setPrice('');
      setMemo('');
      setErrors({});
    }

    setSavedMessage('メンテ記録を削除しました');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDate('');
    setMenu('');
    setPrice('');
    setMemo('');
    setErrors({});
    setSavedMessage('編集をキャンセルしました');
  }

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
          icon="🔧"
          englishLabel="Maintenance Log"
          title="メンテ記録"
          description="追加作業・交換作業・費用をまとめて記録"
        />

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? 'メンテ記録を編集' : 'メンテを入力'}
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <DateInputWithPicker
              label="メンテ日"
              value={date}
              onChange={(value) => {
                setDate(value);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              error={errors.date}
            />

            <div>
              <label style={labelStyle()}>メニュー</label>
              <select
                value={menu}
                onChange={(e) => {
                  setMenu(e.target.value);
                  setErrors((prev) => ({ ...prev, menu: undefined }));
                }}
                style={inputStyle(!!errors.menu)}
              >
                <option value="">選んでください</option>
                {MAINTENANCE_MENU_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.menu ? (
                <p
                  style={{
                    color: '#f87171',
                    fontSize: '14px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}
                >
                  {errors.menu}
                </p>
              ) : null}
            </div>

            <div>
              <label style={labelStyle()}>価格（円）</label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="例: 3000"
                style={inputStyle(!!errors.price)}
              />
              {errors.price ? (
                <p
                  style={{
                    color: '#f87171',
                    fontSize: '14px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}
                >
                  {errors.price}
                </p>
              ) : null}
            </div>

            <div>
              <label style={labelStyle()}>メモ</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={4}
                placeholder="例: 追加したもの、交換した内容など"
                style={{ ...inputStyle(false), resize: 'vertical' }}
              />
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
              {editingId !== null ? '更新する' : '保存する'}
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>メンテ記録一覧</h2>
            <span style={{ color: '#71717a', fontSize: '13px' }}>
              {isLoaded ? `${records.length} 件` : '読み込み中...'}
            </span>
          </div>

          {!isLoaded ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>読み込み中...</p>
          ) : records.length === 0 ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>記録がありません</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {records.map((record) => (
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

                  <p style={{ margin: '0 0 8px 0', color: '#a1a1aa', fontSize: '14px' }}>
                    {record.menu}
                    {record.price ? ` / ${Number(record.price).toLocaleString()}円` : ''}
                  </p>

                  {record.memo ? (
                    <p style={{ margin: '0 0 12px 0', color: '#d4d4d8', fontSize: '14px' }}>
                      {record.memo}
                    </p>
                  ) : null}

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