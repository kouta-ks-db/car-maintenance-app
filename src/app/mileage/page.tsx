'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type MileageRecord = {
  id: number;
  docId?: string;
  date: string;
  distance: string;
  memo: string;
};

type OldMileageRecord = {
  id: number;
  date: string;
  distance?: string;
  memo?: string;
};

type FirestoreMileageRecord = {
  id?: number;
  date?: string;
  distance?: string;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
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
    memo: '週末ドライブ後',
  },
  {
    id: 2,
    date: '2026-04-01',
    distance: '44800',
    memo: '月初の記録',
  },
];

function normalizeLocalRecord(record: OldMileageRecord): MileageRecord {
  return {
    id: record.id,
    date: record.date ?? '',
    distance: record.distance ?? '',
    memo: record.memo ?? '',
  };
}

function normalizeFirestoreRecord(
  docId: string,
  record: FirestoreMileageRecord,
  fallbackId: number
): MileageRecord {
  return {
    id: typeof record.id === 'number' ? record.id : fallbackId,
    docId,
    date: record.date ?? '',
    distance: record.distance ?? '',
    memo: record.memo ?? '',
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

export default function MileagePage() {
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState('');
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<MileageErrors>({});
  const [records, setRecords] = useState<MileageRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadRecords() {
      try {
        const { db, collection, getDocs } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, 'mileageRecords'));

        if (!snapshot.empty) {
          const firestoreRecords = snapshot.docs
            .map((docItem, index) =>
              normalizeFirestoreRecord(
                docItem.id,
                docItem.data() as FirestoreMileageRecord,
                Date.now() + index
              )
            )
            .filter((record) => record.date && record.distance)
            .sort((a, b) => {
              const aTime = new Date(b.date).getTime();
              const bTime = new Date(a.date).getTime();
              return aTime - bTime;
            });

          setRecords(firestoreRecords);
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(firestoreRecords)
          );
          setSavedMessage('Firebaseから走行距離記録を読み込みました');
          setIsLoaded(true);
          return;
        }

        const savedRecords = window.localStorage.getItem(STORAGE_KEY);

        if (savedRecords) {
          try {
            const parsed = JSON.parse(savedRecords) as OldMileageRecord[];
            const normalized = Array.isArray(parsed)
              ? parsed.map(normalizeLocalRecord)
              : DEFAULT_RECORDS;
            setRecords(normalized);
            setSavedMessage('localStorageから走行距離記録を読み込みました');
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
            const parsed = JSON.parse(savedRecords) as OldMileageRecord[];
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
    const newErrors: MileageErrors = {};

    if (!date) {
      newErrors.date = '記録日を入れてください';
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

    try {
      const { db, collection, addDoc, doc, updateDoc } =
        await getFirebaseModules();

      if (editingId !== null) {
        const targetRecord = records.find((record) => record.id === editingId);

        if (!targetRecord?.docId) {
          setSavedMessage('更新対象のFirebaseデータが見つかりませんでした');
          return;
        }

        await updateDoc(doc(db, 'mileageRecords', targetRecord.docId), {
          date,
          distance,
          memo,
          updatedAt: new Date().toISOString(),
        });

        const updatedRecords = records
          .map((record) =>
            record.id === editingId
              ? {
                  ...record,
                  date,
                  distance,
                  memo,
                }
              : record
          )
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRecords(updatedRecords);
        setSavedMessage('走行距離記録を更新しました');
        setEditingId(null);
      } else {
        const newRecordBase: MileageRecord = {
          id: Date.now(),
          date,
          distance,
          memo,
        };

        const docRef = await addDoc(collection(db, 'mileageRecords'), {
          ...newRecordBase,
          createdAt: new Date().toISOString(),
        });

        const newRecord: MileageRecord = {
          ...newRecordBase,
          docId: docRef.id,
        };

        setRecords((prev) =>
          [newRecord, ...prev].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
        setSavedMessage('走行距離記録を保存しました');
      }

      setDate('');
      setDistance('');
      setMemo('');
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

  function handleEdit(record: MileageRecord) {
    setDate(record.date);
    setDistance(record.distance);
    setMemo(record.memo);
    setEditingId(record.id);
    setErrors({});
    setSavedMessage(`編集中: ${record.date} の走行距離記録`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: number) {
    const targetRecord = records.find((record) => record.id === id);

    if (!targetRecord) return;

    const ok = window.confirm(
      `${targetRecord.date} / ${Number(targetRecord.distance).toLocaleString()}km を削除しますか？`
    );

    if (!ok) return;

    try {
      if (targetRecord.docId) {
        const { db, doc, deleteDoc } = await getFirebaseModules();
        await deleteDoc(doc(db, 'mileageRecords', targetRecord.docId));
      }

      const nextRecords = records.filter((record) => record.id !== id);
      setRecords(nextRecords);

      if (editingId === id) {
        setEditingId(null);
        setDate('');
        setDistance('');
        setMemo('');
        setErrors({});
      }

      setSavedMessage('走行距離記録を削除しました');
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
    setDistance('');
    setMemo('');
    setErrors({});
    setSavedMessage('編集をキャンセルしました');
  }

  const latestDistance = useMemo(() => {
    if (records.length === 0) return null;
    return Math.max(...records.map((record) => Number(record.distance || 0)));
  }, [records]);

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
          title="走行距離記録"
          description="走行距離の履歴をまとめて管理"
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
            Mileage Summary
          </p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>
            {latestDistance !== null ? latestDistance.toLocaleString() : '-'}
            <span style={{ fontSize: '15px', color: '#a1a1aa', marginLeft: '8px' }}>
              km
            </span>
          </p>
        </SectionCard>

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? '走行距離記録を編集' : '走行距離を入力'}
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <DateInputWithPicker
              label="記録日"
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
                value={distance}
                onChange={(e) => {
                  setDistance(e.target.value);
                  setErrors((prev) => ({ ...prev, distance: undefined }));
                }}
                placeholder="例: 45200"
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

            <div>
              <label style={labelStyle()}>メモ</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={4}
                placeholder="例: 月初記録、ドライブ後"
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>走行距離記録一覧</h2>
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

                  <p style={{ margin: '0 0 8px 0', color: '#d4d4d8', fontSize: '14px' }}>
                    {Number(record.distance).toLocaleString()} km
                  </p>

                  {record.memo ? (
                    <p style={{ margin: '0 0 12px 0', color: '#a1a1aa', fontSize: '14px' }}>
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