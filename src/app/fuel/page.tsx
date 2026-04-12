'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type FuelRecord = {
  id: number;
  docId?: string;
  date: string;
  odometer: string;
  liters: string;
  price: string;
};

type OldFuelRecord = {
  id: number;
  date: string;
  odometer?: string;
  liters?: string;
  price?: string;
};

type FirestoreFuelRecord = {
  id?: number;
  date?: string;
  odometer?: string;
  liters?: string;
  price?: string;
  createdAt?: string;
  updatedAt?: string;
};

type FuelErrors = {
  date?: string;
  odometer?: string;
  liters?: string;
  price?: string;
};

const STORAGE_KEY = 'fuel-records';

const DEFAULT_RECORDS: FuelRecord[] = [
  {
    id: 1,
    date: '2026-04-12',
    odometer: '45200',
    liters: '24.5',
    price: '4200',
  },
  {
    id: 2,
    date: '2026-03-30',
    odometer: '44800',
    liters: '26.1',
    price: '4520',
  },
];

function normalizeLocalRecord(record: OldFuelRecord): FuelRecord {
  return {
    id: record.id,
    date: record.date ?? '',
    odometer: record.odometer ?? '',
    liters: record.liters ?? '',
    price: record.price ?? '',
  };
}

function normalizeFirestoreRecord(
  docId: string,
  record: FirestoreFuelRecord,
  fallbackId: number
): FuelRecord {
  return {
    id: typeof record.id === 'number' ? record.id : fallbackId,
    docId,
    date: record.date ?? '',
    odometer: record.odometer ?? '',
    liters: record.liters ?? '',
    price: record.price ?? '',
  };
}

async function getFirebaseModules() {
  const [{ db }, firestore] = await Promise.all([
    import('@/lib/firebase'),
    import('firebase/firestore/lite'),
  ]);

  return {
    db,
    collection: firestore.collection,
    addDoc: firestore.addDoc,
    getDocs: firestore.getDocs,
    doc: firestore.doc,
    updateDoc: firestore.updateDoc,
    deleteDoc: firestore.deleteDoc,
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

function calculateFuelEconomy(current: FuelRecord, previous?: FuelRecord) {
  if (!previous) return null;

  const currentOdometer = Number(current.odometer);
  const previousOdometer = Number(previous.odometer);
  const liters = Number(current.liters);

  if (
    Number.isNaN(currentOdometer) ||
    Number.isNaN(previousOdometer) ||
    Number.isNaN(liters) ||
    liters <= 0 ||
    currentOdometer <= previousOdometer
  ) {
    return null;
  }

  return (currentOdometer - previousOdometer) / liters;
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

  useEffect(() => {
    async function loadRecords() {
      try {
        const { db, collection, getDocs } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, 'fuelRecords'));

        if (!snapshot.empty) {
          const firestoreRecords = snapshot.docs
            .map((docItem, index) =>
              normalizeFirestoreRecord(
                docItem.id,
                docItem.data() as FirestoreFuelRecord,
                Date.now() + index
              )
            )
            .filter((record) => record.date && record.odometer && record.liters)
            .sort((a, b) => {
              const aTime = new Date(a.date).getTime();
              const bTime = new Date(b.date).getTime();
              return bTime - aTime;
            });

          setRecords(firestoreRecords);
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(firestoreRecords)
          );
          setSavedMessage('Firebaseから給油記録を読み込みました');
          setIsLoaded(true);
          return;
        }

        const savedRecords = window.localStorage.getItem(STORAGE_KEY);

        if (savedRecords) {
          try {
            const parsed = JSON.parse(savedRecords) as OldFuelRecord[];
            const normalized = Array.isArray(parsed)
              ? parsed.map(normalizeLocalRecord)
              : DEFAULT_RECORDS;
            setRecords(normalized);
            setSavedMessage('localStorageから給油記録を読み込みました');
          } catch {
            setRecords(DEFAULT_RECORDS);
            setSavedMessage('初期データを読み込みました');
          }
        } else {
          setRecords(DEFAULT_RECORDS);
          setSavedMessage('初期データを読み込みました');
        }
      } catch (error) {
        console.error('Firestoreからの読み込みに失敗しました:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'unknown error';

        const savedRecords = window.localStorage.getItem(STORAGE_KEY);

        if (savedRecords) {
          try {
            const parsed = JSON.parse(savedRecords) as OldFuelRecord[];
            const normalized = Array.isArray(parsed)
              ? parsed.map(normalizeLocalRecord)
              : DEFAULT_RECORDS;
            setRecords(normalized);
            setSavedMessage(
              `Firebase読み込み失敗: ${errorMessage} / localStorageを表示しています`
            );
          } catch {
            setRecords(DEFAULT_RECORDS);
            setSavedMessage(
              `Firebase読み込み失敗: ${errorMessage} / 初期データを表示しています`
            );
          }
        } else {
          setRecords(DEFAULT_RECORDS);
          setSavedMessage(
            `Firebase読み込み失敗: ${errorMessage} / 初期データを表示しています`
          );
        }
      } finally {
        setIsLoaded(true);
      }
    }

    loadRecords();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records, isLoaded]);

  async function handleSave() {
    const newErrors: FuelErrors = {};

    if (!date) {
      newErrors.date = '給油日を入れてください';
    }

    if (!odometer) {
      newErrors.odometer = '走行距離を入れてください';
    } else if (Number(odometer) <= 0) {
      newErrors.odometer = '0より大きい値にしてください';
    }

    if (!liters) {
      newErrors.liters = '給油量を入れてください';
    } else if (Number(liters) <= 0) {
      newErrors.liters = '0より大きい値にしてください';
    }

    if (!price) {
      newErrors.price = '給油金額を入れてください';
    } else if (Number(price) <= 0) {
      newErrors.price = '0より大きい値にしてください';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSavedMessage('入力内容を確認してください');
      return;
    }

    try {
      const { db, collection, addDoc, doc, updateDoc } =
        await getFirebaseModules();

      if (editingId !== null) {
        const targetRecord = records.find((record) => record.id === editingId);

        if (!targetRecord?.docId) {
          setSavedMessage('更新対象のFirebaseデータが見つかりませんでした');
          return;
        }

        await updateDoc(doc(db, 'fuelRecords', targetRecord.docId), {
          date,
          odometer,
          liters,
          price,
          updatedAt: new Date().toISOString(),
        });

        const updatedRecords = records
          .map((record) =>
            record.id === editingId
              ? {
                  ...record,
                  date,
                  odometer,
                  liters,
                  price,
                }
              : record
          )
          .sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();
            return bTime - aTime;
          });

        setRecords(updatedRecords);
        setSavedMessage('給油記録を更新しました');
        setEditingId(null);
      } else {
        const newRecordBase: FuelRecord = {
          id: Date.now(),
          date,
          odometer,
          liters,
          price,
        };

        const docRef = await addDoc(collection(db, 'fuelRecords'), {
          ...newRecordBase,
          createdAt: new Date().toISOString(),
        });

        const newRecord: FuelRecord = {
          ...newRecordBase,
          docId: docRef.id,
        };

        setRecords((prev) =>
          [newRecord, ...prev].sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();
            return bTime - aTime;
          })
        );
        setSavedMessage('給油記録を保存しました');
      }

      setDate('');
      setOdometer('');
      setLiters('');
      setPrice('');
      setErrors({});
    } catch (error) {
      console.error('Firestoreへの保存に失敗しました:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'unknown error';

      setSavedMessage(
        `Firebase保存失敗: ${errorMessage} / localStorageへの保存状態を確認してください`
      );
    }
  }

  function handleEdit(record: FuelRecord) {
    setDate(record.date);
    setOdometer(record.odometer);
    setLiters(record.liters);
    setPrice(record.price);
    setEditingId(record.id);
    setErrors({});
    setSavedMessage(`編集中: ${record.date} の給油記録`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: number) {
    const targetRecord = records.find((record) => record.id === id);

    if (!targetRecord) return;

    const ok = window.confirm(
      `${targetRecord.date} / ${Number(targetRecord.liters).toFixed(1)}L を削除しますか？`
    );

    if (!ok) return;

    try {
      if (targetRecord.docId) {
        const { db, doc, deleteDoc } = await getFirebaseModules();
        await deleteDoc(doc(db, 'fuelRecords', targetRecord.docId));
      }

      const nextRecords = records.filter((record) => record.id !== id);
      setRecords(nextRecords);

      if (editingId === id) {
        setEditingId(null);
        setDate('');
        setOdometer('');
        setLiters('');
        setPrice('');
        setErrors({});
      }

      setSavedMessage('給油記録を削除しました');
    } catch (error) {
      console.error('Firestoreからの削除に失敗しました:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'unknown error';

      setSavedMessage(`Firebase削除失敗: ${errorMessage}`);
    }
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

  const sortedByOdometer = useMemo(() => {
    return [...records].sort(
      (a, b) => Number(b.odometer || 0) - Number(a.odometer || 0)
    );
  }, [records]);

  const latestRecord = records.length > 0 ? records[0] : null;

  const averageFuelEconomy = useMemo(() => {
    const validEconomies: number[] = [];

    sortedByOdometer.forEach((record, index) => {
      const previousRecord = sortedByOdometer[index + 1];
      const fuelEconomy = calculateFuelEconomy(record, previousRecord);

      if (fuelEconomy !== null) {
        validEconomies.push(fuelEconomy);
      }
    });

    if (validEconomies.length === 0) return null;

    const total = validEconomies.reduce((sum, value) => sum + value, 0);
    return total / validEconomies.length;
  }, [sortedByOdometer]);

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
          description="給油量・金額・走行距離をまとめて管理"
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
            Fuel Summary
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
            }}
          >
            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid #27272a',
                background: '#09090b',
              }}
            >
              <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                平均燃費
              </p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
                {averageFuelEconomy !== null ? averageFuelEconomy.toFixed(1) : '-'}
                <span style={{ fontSize: '13px', color: '#a1a1aa', marginLeft: '6px' }}>
                  km/L
                </span>
              </p>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid #27272a',
                background: '#09090b',
              }}
            >
              <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                最新走行距離
              </p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
                {latestRecord ? Number(latestRecord.odometer).toLocaleString() : '-'}
                <span style={{ fontSize: '13px', color: '#a1a1aa', marginLeft: '6px' }}>
                  km
                </span>
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? '給油記録を編集' : '給油を入力'}
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <DateInputWithPicker
              label="給油日"
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
                <p
                  style={{
                    color: '#f87171',
                    fontSize: '14px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}
                >
                  {errors.odometer}
                </p>
              ) : null}
            </div>

            <div>
              <label style={labelStyle()}>給油量 (L)</label>
              <input
                type="number"
                step="0.1"
                value={liters}
                onChange={(e) => {
                  setLiters(e.target.value);
                  setErrors((prev) => ({ ...prev, liters: undefined }));
                }}
                placeholder="例: 24.5"
                style={inputStyle(!!errors.liters)}
              />
              {errors.liters ? (
                <p
                  style={{
                    color: '#f87171',
                    fontSize: '14px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}
                >
                  {errors.liters}
                </p>
              ) : null}
            </div>

            <div>
              <label style={labelStyle()}>給油金額 (円)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="例: 4200"
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>給油記録一覧</h2>
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
              {sortedByOdometer.map((record, index) => {
                const previousRecord = sortedByOdometer[index + 1];
                const fuelEconomy = calculateFuelEconomy(record, previousRecord);
                const unitPrice =
                  Number(record.liters) > 0
                    ? Number(record.price) / Number(record.liters)
                    : null;

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

                    <p style={{ margin: '0 0 8px 0', color: '#a1a1aa', fontSize: '14px' }}>
                      {Number(record.odometer).toLocaleString()} km
                    </p>

                    <p style={{ margin: '0 0 8px 0', color: '#d4d4d8', fontSize: '14px' }}>
                      {Number(record.liters).toFixed(1)}L /{' '}
                      {Number(record.price).toLocaleString()}円
                    </p>

                    <p style={{ margin: '0 0 12px 0', color: '#a1a1aa', fontSize: '14px' }}>
                      単価:{' '}
                      {unitPrice !== null ? `${Math.round(unitPrice).toLocaleString()}円/L` : '-'}
                      {' / '}
                      燃費:{' '}
                      {fuelEconomy !== null ? `${fuelEconomy.toFixed(1)} km/L` : '-'}
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
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}