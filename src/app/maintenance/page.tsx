'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type MaintenanceMenu =
  | 'インテリア追加'
  | 'エクステリア追加'
  | 'パーツ交換';

type MaintenanceRecord = {
  id: number;
  docId?: string;
  date: string;
  menu: MaintenanceMenu;
  price: string;
  memo: string;
};

type OldMaintenanceRecord = {
  id: number;
  date: string;
  menu?: string;
  price?: string;
  memo?: string;
};

type FirestoreMaintenanceRecord = {
  id?: number;
  date?: string;
  menu?: MaintenanceMenu;
  price?: string;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MaintenanceErrors = {
  date?: string;
  menu?: string;
  price?: string;
};

const STORAGE_KEY = 'maintenance-records';

const MENU_OPTIONS: MaintenanceMenu[] = [
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

function normalizeLocalRecord(record: OldMaintenanceRecord): MaintenanceRecord {
  return {
    id: record.id,
    date: record.date ?? '',
    menu: (record.menu as MaintenanceMenu) ?? 'インテリア追加',
    price: record.price ?? '',
    memo: record.memo ?? '',
  };
}

function normalizeFirestoreRecord(
  docId: string,
  record: FirestoreMaintenanceRecord,
  fallbackId: number
): MaintenanceRecord {
  return {
    id: typeof record.id === 'number' ? record.id : fallbackId,
    docId,
    date: record.date ?? '',
    menu: record.menu ?? 'インテリア追加',
    price: record.price ?? '',
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

export default function MaintenancePage() {
  const [date, setDate] = useState('');
  const [menu, setMenu] = useState<MaintenanceMenu>('インテリア追加');
  const [price, setPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<MaintenanceErrors>({});
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadRecords() {
      try {
        const { db, collection, getDocs } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, 'maintenanceRecords'));

        if (!snapshot.empty) {
          const firestoreRecords = snapshot.docs
            .map((docItem, index) =>
              normalizeFirestoreRecord(
                docItem.id,
                docItem.data() as FirestoreMaintenanceRecord,
                Date.now() + index
              )
            )
            .filter((record) => record.date && record.menu)
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
          setSavedMessage('Firebaseからメンテ記録を読み込みました');
          setIsLoaded(true);
          return;
        }

        const savedRecords = window.localStorage.getItem(STORAGE_KEY);

        if (savedRecords) {
          try {
            const parsed = JSON.parse(savedRecords) as OldMaintenanceRecord[];
            const normalized = Array.isArray(parsed)
              ? parsed.map(normalizeLocalRecord)
              : DEFAULT_RECORDS;
            setRecords(normalized);
            setSavedMessage('localStorageからメンテ記録を読み込みました');
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
            const parsed = JSON.parse(savedRecords) as OldMaintenanceRecord[];
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
    const newErrors: MaintenanceErrors = {};

    if (!date) {
      newErrors.date = '実施日を入れてください';
    }

    if (!menu) {
      newErrors.menu = 'メニューを選んでください';
    }

    if (!price) {
      newErrors.price = '価格を入れてください';
    } else if (Number(price) < 0) {
      newErrors.price = '0以上の値にしてください';
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

        await updateDoc(doc(db, 'maintenanceRecords', targetRecord.docId), {
          date,
          menu,
          price,
          memo,
          updatedAt: new Date().toISOString(),
        });

        const updatedRecords = records
          .map((record) =>
            record.id === editingId
              ? {
                  ...record,
                  date,
                  menu,
                  price,
                  memo,
                }
              : record
          )
          .sort((a, b) => {
            const aTime = new Date(a.date).getTime();
            const bTime = new Date(b.date).getTime();
            return bTime - aTime;
          });

        setRecords(updatedRecords);
        setSavedMessage('メンテ記録を更新しました');
        setEditingId(null);
      } else {
        const newRecordBase: MaintenanceRecord = {
          id: Date.now(),
          date,
          menu,
          price,
          memo,
        };

        const docRef = await addDoc(collection(db, 'maintenanceRecords'), {
          ...newRecordBase,
          createdAt: new Date().toISOString(),
        });

        const newRecord: MaintenanceRecord = {
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
        setSavedMessage('メンテ記録を保存しました');
      }

      setDate('');
      setMenu('インテリア追加');
      setPrice('');
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

  async function handleDelete(id: number) {
    const targetRecord = records.find((record) => record.id === id);

    if (!targetRecord) return;

    const ok = window.confirm(
      `${targetRecord.date} / ${targetRecord.menu} を削除しますか？`
    );

    if (!ok) return;

    try {
      if (targetRecord.docId) {
        const { db, doc, deleteDoc } = await getFirebaseModules();
        await deleteDoc(doc(db, 'maintenanceRecords', targetRecord.docId));
      }

      const nextRecords = records.filter((record) => record.id !== id);
      setRecords(nextRecords);

      if (editingId === id) {
        setEditingId(null);
        setDate('');
        setMenu('インテリア追加');
        setPrice('');
        setMemo('');
        setErrors({});
      }

      setSavedMessage('メンテ記録を削除しました');
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
    setMenu('インテリア追加');
    setPrice('');
    setMemo('');
    setErrors({});
    setSavedMessage('編集をキャンセルしました');
  }

  const totalCost = records.reduce((sum, record) => sum + Number(record.price || 0), 0);

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
          description="インテリア・エクステリア・パーツ交換をまとめて管理"
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
            Maintenance Summary
          </p>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 700 }}>
            {totalCost.toLocaleString()}
            <span style={{ fontSize: '15px', color: '#a1a1aa', marginLeft: '8px' }}>
              円
            </span>
          </p>
        </SectionCard>

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? 'メンテ記録を編集' : 'メンテを入力'}
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <DateInputWithPicker
              label="実施日"
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
                  setMenu(e.target.value as MaintenanceMenu);
                  setErrors((prev) => ({ ...prev, menu: undefined }));
                }}
                style={inputStyle(!!errors.menu)}
              >
                {MENU_OPTIONS.map((option) => (
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
              <label style={labelStyle()}>価格 (円)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="例: 3500"
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
                placeholder="例: ワイパーを交換、車内小物を追加"
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
                  </p>

                  <p style={{ margin: '0 0 8px 0', color: '#d4d4d8', fontSize: '14px' }}>
                    {Number(record.price).toLocaleString()}円
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