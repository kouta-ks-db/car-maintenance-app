'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type FuelRecord = {
  id: number;
  date: string;
  odometer: string;
  liters: string;
  price: string;
};

type FuelErrors = {
  date?: string;
  odometer?: string;
  liters?: string;
  price?: string;
};

type OldFuelRecord = {
  id: number;
  date: string;
  liters: string;
  price: string;
  odometer?: string;
};

const STORAGE_KEY = 'fuel-records';

const DEFAULT_RECORDS: FuelRecord[] = [
  { id: 1, date: '2026-04-12', odometer: '45200', liters: '24.5', price: '4200' },
  { id: 2, date: '2026-03-30', odometer: '44800', liters: '26.1', price: '4520' },
];

function normalizeRecord(record: OldFuelRecord): FuelRecord {
  return {
    id: record.id,
    date: record.date ?? '',
    odometer: record.odometer ?? '',
    liters: record.liters ?? '',
    price: record.price ?? '',
  };
}

function calculateUnitPrice(liters: string, price: string) {
  if (!liters || !price || Number(liters) <= 0) return 0;
  return Number(price) / Number(liters);
}

function calculateFuelEconomy(current: FuelRecord, previous?: FuelRecord) {
  if (!previous) return null;

  const currentOdometer = Number(current.odometer);
  const previousOdometer = Number(previous.odometer);
  const litersValue = Number(current.liters);

  if (
    !current.odometer ||
    !previous.odometer ||
    Number.isNaN(currentOdometer) ||
    Number.isNaN(previousOdometer) ||
    Number.isNaN(litersValue) ||
    litersValue <= 0 ||
    currentOdometer <= previousOdometer
  ) {
    return null;
  }

  return (currentOdometer - previousOdometer) / litersValue;
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

export default function FuelPage() {
  const [date, setDate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<FuelErrors>({});
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const unitPrice = useMemo(() => calculateUnitPrice(liters, price), [liters, price]);

  useEffect(() => {
    const savedRecords = window.localStorage.getItem(STORAGE_KEY);

    if (savedRecords) {
      try {
        const parsed = JSON.parse(savedRecords) as OldFuelRecord[];
        setRecords(Array.isArray(parsed) ? parsed.map(normalizeRecord) : DEFAULT_RECORDS);
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
    const newErrors: FuelErrors = {};

    if (!date) newErrors.date = '日付を入れてください';

    if (!odometer) {
      newErrors.odometer = '走行距離を入れてください';
    } else if (Number(odometer) <= 0) {
      newErrors.odometer = '走行距離は 0 より大きい数を入れてください';
    }

    if (!liters) {
      newErrors.liters = '給油量を入れてください';
    } else if (Number(liters) <= 0) {
      newErrors.liters = '給油量は 0 より大きい数を入れてください';
    }

    if (!price) {
      newErrors.price = '金額を入れてください';
    } else if (Number(price) <= 0) {
      newErrors.price = '金額は 0 より大きい数を入れてください';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSavedMessage('入力内容を確認してください');
      return;
    }

    if (editingId !== null) {
      setRecords((prev) =>
        prev.map((record) =>
          record.id === editingId ? { ...record, date, odometer, liters, price } : record
        )
      );
      setSavedMessage(
        `更新した内容: ${date} / ${odometer}km / ${liters}L / ${price}円 / ${unitPrice.toFixed(1)}円/L`
      );
      setEditingId(null);
    } else {
      const newRecord: FuelRecord = {
        id: Date.now(),
        date,
        odometer,
        liters,
        price,
      };
      setRecords((prev) => [newRecord, ...prev]);
      setSavedMessage(
        `保存した内容: ${date} / ${odometer}km / ${liters}L / ${price}円 / ${unitPrice.toFixed(1)}円/L`
      );
    }

    setDate('');
    setOdometer('');
    setLiters('');
    setPrice('');
    setErrors({});
  }

  function handleEdit(record: FuelRecord) {
    setDate(record.date);
    setOdometer(record.odometer);
    setLiters(record.liters);
    setPrice(record.price);
    setEditingId(record.id);
    setErrors({});
    setSavedMessage(`編集中: ${record.date} の記録`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id: number) {
    const targetRecord = records.find((record) => record.id === id);
    if (!targetRecord) return;

    const ok = window.confirm(
      `${targetRecord.date} / ${targetRecord.odometer}km / ${targetRecord.liters}L / ${Number(
        targetRecord.price
      ).toLocaleString()}円 を削除しますか？`
    );

    if (!ok) return;

    setRecords((prev) => prev.filter((record) => record.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setDate('');
      setOdometer('');
      setLiters('');
      setPrice('');
      setErrors({});
    }

    setSavedMessage('記録を削除しました');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDate('');
    setOdometer('');
    setLiters('');
    setPrice('');
    setErrors({});
    setSavedMessage('編集をキャンセルしました');
  }

  const sortedRecords = [...records].sort(
    (a, b) => Number(b.odometer || 0) - Number(a.odometer || 0)
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
          icon="⛽"
          englishLabel="Fuel Log"
          title="給油記録"
          description="給油量・価格・走行距離・燃費をまとめて管理"
        />

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? '給油記録を編集' : '給油を入力'}
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
                value={odometer}
                onChange={(e) => {
                  setOdometer(e.target.value);
                  setErrors((prev) => ({ ...prev, odometer: undefined }));
                }}
                placeholder="例: 45200"
                style={inputStyle(!!errors.odometer)}
              />
              {errors.odometer ? (
                <p style={{ color: '#f87171', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                  {errors.odometer}
                </p>
              ) : null}
            </div>

            <div>
              <label style={labelStyle()}>給油量 (L)</label>
              <input
                type="number"
                value={liters}
                onChange={(e) => {
                  setLiters(e.target.value);
                  setErrors((prev) => ({ ...prev, liters: undefined }));
                }}
                style={inputStyle(!!errors.liters)}
              />
              {errors.liters ? (
                <p style={{ color: '#f87171', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                  {errors.liters}
                </p>
              ) : null}
            </div>

            <div>
              <label style={labelStyle()}>金額 (円)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                style={inputStyle(!!errors.price)}
              />
              {errors.price ? (
                <p style={{ color: '#f87171', fontSize: '14px', marginTop: '8px', marginBottom: 0 }}>
                  {errors.price}
                </p>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '18px',
            }}
          >
            <div
              style={{
                borderRadius: '16px',
                background: '#09090b',
                border: '1px solid #27272a',
                padding: '14px',
              }}
            >
              <p style={{ margin: '0 0 6px 0', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                単価
              </p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                {unitPrice ? unitPrice.toFixed(1) : '-'}
                <span style={{ fontSize: '14px', color: '#a1a1aa', marginLeft: '6px' }}>円/L</span>
              </p>
            </div>

            <div
              style={{
                borderRadius: '16px',
                background: '#09090b',
                border: '1px solid #27272a',
                padding: '14px',
              }}
            >
              <p style={{ margin: '0 0 6px 0', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                燃費
              </p>
              <p style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                一覧で自動計算
              </p>
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
          <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>記録一覧</h2>
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
              {sortedRecords.map((record, index) => {
                const previousRecord = sortedRecords[index + 1];
                const recordUnitPrice = calculateUnitPrice(record.liters, record.price);
                const fuelEconomy = calculateFuelEconomy(record, previousRecord);

                return (
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
                    <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
                      {record.odometer}km / {record.liters}L / {Number(record.price).toLocaleString()}円
                    </p>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '10px',
                        marginTop: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          borderRadius: '12px',
                          padding: '12px',
                          background: '#18181b',
                          border: '1px solid #27272a',
                        }}
                      >
                        <p style={{ margin: '0 0 4px 0', color: '#71717a', fontSize: '12px' }}>
                          単価
                        </p>
                        <p style={{ margin: 0, fontWeight: 700 }}>
                          {recordUnitPrice ? recordUnitPrice.toFixed(1) : '-'} 円/L
                        </p>
                      </div>

                      <div
                        style={{
                          borderRadius: '12px',
                          padding: '12px',
                          background: '#18181b',
                          border: '1px solid #27272a',
                        }}
                      >
                        <p style={{ margin: '0 0 4px 0', color: '#71717a', fontSize: '12px' }}>
                          燃費
                        </p>
                        <p style={{ margin: 0, fontWeight: 700 }}>
                          {fuelEconomy ? `${fuelEconomy.toFixed(1)} km/L` : '-'}
                        </p>
                      </div>
                    </div>

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
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}