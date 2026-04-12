'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type FuelRecord = {
  id: number;
  date: string;
  liters: string;
  price: string;
};

type FuelErrors = {
  date?: string;
  liters?: string;
  price?: string;
};

const STORAGE_KEY = 'fuel-records';

export default function FuelPage() {
  const [date, setDate] = useState('');
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<FuelErrors>({});
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const unitPrice =
    liters && price && Number(liters) > 0
      ? Number(price) / Number(liters)
      : 0;

  useEffect(() => {
    const savedRecords = window.localStorage.getItem(STORAGE_KEY);

    if (savedRecords) {
      try {
        const parsed = JSON.parse(savedRecords) as FuelRecord[];
        setRecords(parsed);
      } catch {
        setRecords([
          { id: 1, date: '2026-04-12', liters: '24.5', price: '4200' },
          { id: 2, date: '2026-03-30', liters: '26.1', price: '4520' },
        ]);
      }
    } else {
      setRecords([
        { id: 1, date: '2026-04-12', liters: '24.5', price: '4200' },
        { id: 2, date: '2026-03-30', liters: '26.1', price: '4520' },
      ]);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, isLoaded]);

  function handleSave() {
    const newErrors: FuelErrors = {};

    if (!date) {
      newErrors.date = '日付を入れてください';
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
      const updatedRecords = records.map((record) =>
        record.id === editingId
          ? {
              ...record,
              date,
              liters,
              price,
            }
          : record
      );

      setRecords(updatedRecords);
      setSavedMessage(
        `更新した内容: ${date} / ${liters}L / ${price}円 / ${unitPrice.toFixed(1)}円/L`
      );
      setEditingId(null);
    } else {
      const newRecord: FuelRecord = {
        id: Date.now(),
        date,
        liters,
        price,
      };

      setRecords([newRecord, ...records]);
      setSavedMessage(
        `保存した内容: ${date} / ${liters}L / ${price}円 / ${unitPrice.toFixed(1)}円/L`
      );
    }

    setDate('');
    setLiters('');
    setPrice('');
    setErrors({});
  }

  function handleEdit(record: FuelRecord) {
    setDate(record.date);
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
      `${targetRecord.date} / ${targetRecord.liters}L / ${Number(
        targetRecord.price
      ).toLocaleString()}円 を削除しますか？`
    );

    if (!ok) return;

    const nextRecords = records.filter((record) => record.id !== id);
    setRecords(nextRecords);

    if (editingId === id) {
      setEditingId(null);
      setDate('');
      setLiters('');
      setPrice('');
      setErrors({});
    }

    setSavedMessage('記録を削除しました');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDate('');
    setLiters('');
    setPrice('');
    setErrors({});
    setSavedMessage('編集をキャンセルしました');
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#09090b',
        color: '#fafafa',
        padding: '24px',
        fontFamily: 'sans-serif',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'inline-block',
          marginBottom: '24px',
          color: '#a1a1aa',
          textDecoration: 'none',
        }}
      >
        ← ホームに戻る
      </Link>

      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>給油記録</h1>

      <p style={{ color: '#a1a1aa', marginBottom: '24px' }}>
        ここに給油記録を入力していきます。
      </p>

      <section
        style={{
          border: editingId !== null ? '1px solid #60a5fa' : '1px solid #27272a',
          borderRadius: '16px',
          padding: '16px',
          background: '#18181b',
          marginBottom: '24px',
          boxShadow:
            editingId !== null ? '0 0 0 1px rgba(96, 165, 250, 0.2)' : 'none',
        }}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
          {editingId !== null ? '給油記録を編集' : '給油を入力'}
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa' }}>
            日付
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setErrors((prev) => ({ ...prev, date: undefined }));
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: errors.date ? '1px solid #ef4444' : '1px solid #3f3f46',
              background: '#09090b',
              color: '#fafafa',
            }}
          />
          {errors.date ? (
            <p style={{ color: '#f87171', fontSize: '14px', marginTop: '8px' }}>
              {errors.date}
            </p>
          ) : null}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa' }}>
            給油量 (L)
          </label>
          <input
            type="number"
            value={liters}
            onChange={(e) => {
              setLiters(e.target.value);
              setErrors((prev) => ({ ...prev, liters: undefined }));
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: errors.liters ? '1px solid #ef4444' : '1px solid #3f3f46',
              background: '#09090b',
              color: '#fafafa',
            }}
          />
          {errors.liters ? (
            <p style={{ color: '#f87171', fontSize: '14px', marginTop: '8px' }}>
              {errors.liters}
            </p>
          ) : null}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa' }}>
            金額 (円)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setErrors((prev) => ({ ...prev, price: undefined }));
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: errors.price ? '1px solid #ef4444' : '1px solid #3f3f46',
              background: '#09090b',
              color: '#fafafa',
            }}
          />
          {errors.price ? (
            <p style={{ color: '#f87171', fontSize: '14px', marginTop: '8px' }}>
              {errors.price}
            </p>
          ) : null}
        </div>

        <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '16px' }}>
          単価: {unitPrice ? unitPrice.toFixed(1) : '-'} 円/L
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: '#fafafa',
              color: '#09090b',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {editingId !== null ? '更新する' : '保存'}
          </button>

          {editingId !== null ? (
            <button
              onClick={handleCancelEdit}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #3f3f46',
                background: '#18181b',
                color: '#fafafa',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          ) : null}
        </div>
      </section>

      <section
        style={{
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '16px',
          background: '#18181b',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>保存結果</h2>
        <p>{savedMessage || 'まだ保存していません'}</p>
      </section>

      <section
        style={{
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '16px',
          background: '#18181b',
        }}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>記録一覧</h2>

        {!isLoaded ? (
          <p style={{ color: '#a1a1aa' }}>読み込み中...</p>
        ) : records.length === 0 ? (
          <p style={{ color: '#a1a1aa' }}>記録がありません</p>
        ) : (
          records.map((record) => {
            const recordUnitPrice =
              Number(record.liters) > 0
                ? Number(record.price) / Number(record.liters)
                : 0;

            return (
              <div
                key={record.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #27272a',
                }}
              >
                <p style={{ marginBottom: '8px' }}>
                  {record.date} / {record.liters}L /{' '}
                  {Number(record.price).toLocaleString()}円 /{' '}
                  {recordUnitPrice.toFixed(1)}円/L
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(record)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #1d4ed8',
                      background: '#172554',
                      color: '#bfdbfe',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    編集
                  </button>

                  <button
                    onClick={() => handleDelete(record.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #7f1d1d',
                      background: '#450a0a',
                      color: '#fecaca',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}