'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppBottomNav from '@/components/AppBottomNav';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type MaintenanceMenu =
  | 'インテリア'
  | 'エクステリア'
  | 'タイヤ交換'
  | 'オイル交換'
  | 'パーツ交換';

type MaintenanceLocation = 'DIY' | 'ディーラー' | '整備工場' | 'カー用品店' | 'その他';

type MaintenanceRecord = {
  id: number;
  docId?: string;
  date: string;
  menu: MaintenanceMenu;
  odometer: string;
  nextDate: string;
  nextOdometer: string;
  productName: string;
  location: MaintenanceLocation;
  price: string;
  memo: string;
};

type OldMaintenanceRecord = {
  id: number;
  date: string;
  menu?: string;
  odometer?: string;
  nextDate?: string;
  nextOdometer?: string;
  productName?: string;
  location?: string;
  price?: string;
  memo?: string;
};

type FirestoreMaintenanceRecord = {
  id?: number;
  date?: string;
  menu?: string;
  odometer?: string;
  nextDate?: string;
  nextOdometer?: string;
  productName?: string;
  location?: string;
  price?: string;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MaintenanceErrors = {
  date?: string;
  menu?: string;
  odometer?: string;
  nextOdometer?: string;
  price?: string;
};

const STORAGE_KEY = 'maintenance-records';

const MENU_OPTIONS: MaintenanceMenu[] = [
  'インテリア',
  'エクステリア',
  'タイヤ交換',
  'オイル交換',
  'パーツ交換',
];

const LOCATION_OPTIONS: MaintenanceLocation[] = [
  'DIY',
  'ディーラー',
  '整備工場',
  'カー用品店',
  'その他',
];

const DEFAULT_RECORDS: MaintenanceRecord[] = [
  {
    id: 1,
    date: '2026-04-12',
    menu: 'インテリア',
    odometer: '45200',
    nextDate: '',
    nextOdometer: '',
    productName: '車内収納トレー',
    location: 'DIY',
    price: '3500',
    memo: '車内の小物を追加',
  },
  {
    id: 2,
    date: '2026-04-05',
    menu: 'パーツ交換',
    odometer: '44800',
    nextDate: '',
    nextOdometer: '',
    productName: 'ワイパー',
    location: 'カー用品店',
    price: '2800',
    memo: 'ワイパー交換',
  },
];

function normalizeMenu(menu?: string): MaintenanceMenu {
  if (menu === 'インテリア追加') return 'インテリア';
  if (menu === 'エクステリア追加') return 'エクステリア';
  if (MENU_OPTIONS.includes(menu as MaintenanceMenu)) {
    return menu as MaintenanceMenu;
  }
  return 'インテリア';
}

function normalizeLocation(location?: string): MaintenanceLocation {
  if (LOCATION_OPTIONS.includes(location as MaintenanceLocation)) {
    return location as MaintenanceLocation;
  }
  return 'DIY';
}

function normalizeLocalRecord(record: OldMaintenanceRecord): MaintenanceRecord {
  return {
    id: record.id,
    date: record.date ?? '',
    menu: normalizeMenu(record.menu),
    odometer: record.odometer ?? '',
    nextDate: record.nextDate ?? '',
    nextOdometer: record.nextOdometer ?? '',
    productName: record.productName ?? '',
    location: normalizeLocation(record.location),
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
    menu: normalizeMenu(record.menu),
    odometer: record.odometer ?? '',
    nextDate: record.nextDate ?? '',
    nextOdometer: record.nextOdometer ?? '',
    productName: record.productName ?? '',
    location: normalizeLocation(record.location),
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

export default function MaintenancePage() {
  const [date, setDate] = useState('');
  const [menu, setMenu] = useState<MaintenanceMenu>('インテリア');
  const [odometer, setOdometer] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextOdometer, setNextOdometer] = useState('');
  const [productName, setProductName] = useState('');
  const [location, setLocation] = useState<MaintenanceLocation>('DIY');
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

    if (odometer && Number(odometer) < 0) {
      newErrors.odometer = '0以上の値にしてください';
    }

    if (nextOdometer && Number(nextOdometer) < 0) {
      newErrors.nextOdometer = '0以上の値にしてください';
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
          odometer,
          nextDate,
          nextOdometer,
          productName,
          location,
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
                  odometer,
                  nextDate,
                  nextOdometer,
                  productName,
                  location,
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
          odometer,
          nextDate,
          nextOdometer,
          productName,
          location,
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
      setMenu('インテリア');
      setOdometer('');
      setNextDate('');
      setNextOdometer('');
      setProductName('');
      setLocation('DIY');
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
    setOdometer(record.odometer);
    setNextDate(record.nextDate);
    setNextOdometer(record.nextOdometer);
    setProductName(record.productName);
    setLocation(record.location);
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
        setMenu('インテリア');
        setOdometer('');
        setNextDate('');
        setNextOdometer('');
        setProductName('');
        setLocation('DIY');
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
    setMenu('インテリア');
    setOdometer('');
    setNextDate('');
    setNextOdometer('');
    setProductName('');
    setLocation('DIY');
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
          'radial-gradient(circle at top left, rgba(34,211,238,0.20) 0%, rgba(59,130,246,0.13) 26%, transparent 48%), radial-gradient(circle at bottom right, rgba(16,185,129,0.14) 0%, transparent 36%), linear-gradient(180deg, #111827 0%, #0f172a 48%, #111827 100%)',
        color: '#f8fafc',
        padding: '24px 24px 112px',
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
          description="交換履歴・走行距離・次回目安・使用部品をまとめて管理"
        />

        <SectionCard>
          <p
            style={{
              margin: '0 0 8px 0',
              color: '#94a3b8',
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
              <label style={labelStyle()}>走行距離 (km)</label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => {
                  setOdometer(e.target.value);
                  setErrors((prev) => ({ ...prev, odometer: undefined }));
                }}
                min="0"
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
              <label style={labelStyle()}>製品名・部品名</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="例: Mobil 1 0W-20、PIAA ワイパー"
                style={inputStyle(false)}
              />
            </div>

            <div>
              <label style={labelStyle()}>実施場所</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as MaintenanceLocation)}
                style={inputStyle(false)}
              >
                {LOCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
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

            <DateInputWithPicker
              label="次回目安日"
              value={nextDate}
              onChange={setNextDate}
            />

            <div>
              <label style={labelStyle()}>次回目安距離 (km)</label>
              <input
                type="number"
                value={nextOdometer}
                onChange={(e) => {
                  setNextOdometer(e.target.value);
                  setErrors((prev) => ({ ...prev, nextOdometer: undefined }));
                }}
                min="0"
                placeholder="例: 50200"
                style={inputStyle(!!errors.nextOdometer)}
              />
              {errors.nextOdometer ? (
                <p
                  style={{
                    color: '#f87171',
                    fontSize: '14px',
                    marginTop: '8px',
                    marginBottom: 0,
                  }}
                >
                  {errors.nextOdometer}
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
                background: 'linear-gradient(135deg, #22d3ee 0%, #2563eb 58%, #7c3aed 100%)',
                color: '#ffffff',
                boxShadow: '0 14px 30px rgba(37,99,235,0.28)',
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
                  border: '1px solid rgba(226,232,240,0.18)',
                  background: 'transparent',
                  color: '#f8fafc',
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
              color: '#94a3b8',
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
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
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
                    background: 'rgba(15,23,42,0.62)',
                    padding: '16px',
                  }}
                >
                  <p style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700 }}>
                    {record.date}
                  </p>

                  <p style={{ margin: '0 0 8px 0', color: '#a1a1aa', fontSize: '14px' }}>
                    {record.menu}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '8px',
                      marginBottom: '10px',
                    }}
                  >
                    {record.odometer ? (
                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>
                        距離: {Number(record.odometer).toLocaleString()}km
                      </p>
                    ) : null}

                    {record.productName ? (
                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>
                        製品: {record.productName}
                      </p>
                    ) : null}

                    <p style={{ margin: 0, color: '#cbd5e1', fontSize: '14px' }}>
                      場所: {record.location}
                    </p>
                  </div>

                  <p style={{ margin: '0 0 8px 0', color: '#d4d4d8', fontSize: '14px' }}>
                    {Number(record.price).toLocaleString()}円
                  </p>

                  {record.nextDate || record.nextOdometer ? (
                    <p style={{ margin: '0 0 8px 0', color: '#bfdbfe', fontSize: '14px' }}>
                      次回目安:
                      {record.nextDate ? ` ${record.nextDate}` : ''}
                      {record.nextOdometer
                        ? ` / ${Number(record.nextOdometer).toLocaleString()}km`
                        : ''}
                    </p>
                  ) : null}

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
                        background: 'rgba(14,165,233,0.18)',
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
      <AppBottomNav active="records" />
    </main>
  );
}
