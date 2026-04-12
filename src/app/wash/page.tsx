'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type WashMenu =
  | '手洗い洗車'
  | 'ポリッシャー'
  | 'タイヤ洗車'
  | '簡易コーティング'
  | '本格コーティング'
  | 'タイヤコーティング'
  | '窓の油膜取り'
  | '窓コーティング';

type WashRecord = {
  id: number;
  date: string;
  menus: WashMenu[];
  memo: string;
  image?: string;
  products?: string;
};

type OldWashRecord = {
  id: number;
  date: string;
  menu?: string;
  menus?: WashMenu[];
  memo?: string;
  image?: string;
  products?: string;
};

type FirestoreWashRecord = {
  id?: number;
  date?: string;
  menus?: WashMenu[];
  memo?: string;
  image?: string | null;
  products?: string;
  createdAt?: string;
  mode?: 'create' | 'edit';
  originalId?: number;
};

type WashErrors = {
  date?: string;
  menus?: string;
};

const STORAGE_KEY = 'wash-records';

const WASH_MENU_OPTIONS: WashMenu[] = [
  '手洗い洗車',
  'ポリッシャー',
  'タイヤ洗車',
  '簡易コーティング',
  '本格コーティング',
  'タイヤコーティング',
  '窓の油膜取り',
  '窓コーティング',
];

const DEFAULT_RECORDS: WashRecord[] = [
  {
    id: 1,
    date: '2026-04-12',
    menus: ['手洗い洗車', 'タイヤ洗車'],
    memo: 'ボディ中心に洗車',
    products: 'カーシャンプー、タイヤクリーナー',
  },
  {
    id: 2,
    date: '2026-04-05',
    menus: ['簡易コーティング', '窓コーティング'],
    memo: '窓も軽く施工',
    products: '簡易コート剤、ガラスコート剤',
  },
];

function normalizeRecord(record: OldWashRecord): WashRecord {
  return {
    id: record.id,
    date: record.date ?? '',
    menus: Array.isArray(record.menus)
      ? record.menus
      : record.menu
        ? [record.menu as WashMenu]
        : [],
    memo: record.memo ?? '',
    image: record.image,
    products: record.products ?? '',
  };
}

function normalizeFirestoreRecord(
  record: FirestoreWashRecord,
  fallbackId: number
): WashRecord {
  return {
    id: typeof record.id === 'number' ? record.id : fallbackId,
    date: record.date ?? '',
    menus: Array.isArray(record.menus) ? record.menus : [],
    memo: record.memo ?? '',
    image: record.image ?? undefined,
    products: record.products ?? '',
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

export default function WashPage() {
  const [date, setDate] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<WashMenu[]>([]);
  const [memo, setMemo] = useState('');
  const [products, setProducts] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<WashErrors>({});
  const [records, setRecords] = useState<WashRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadRecords() {
      try {
        const { db, collection, getDocs } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, 'washRecords'));

        if (!snapshot.empty) {
          const firestoreDocs = snapshot.docs.map((doc, index) => {
            const data = doc.data() as FirestoreWashRecord;
            return {
              data,
              fallbackId: Date.now() + index,
            };
          });

          const createdOnly = firestoreDocs.filter(
            (item) => item.data.mode !== 'edit'
          );

          const firestoreRecords = createdOnly
            .map((item) =>
              normalizeFirestoreRecord(item.data, item.fallbackId)
            )
            .filter((record) => record.date && record.menus.length > 0)
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
          setSavedMessage('Firebaseから洗車記録を読み込みました');
          setIsLoaded(true);
          return;
        }

        const savedRecords = window.localStorage.getItem(STORAGE_KEY);

        if (savedRecords) {
          try {
            const parsed = JSON.parse(savedRecords) as OldWashRecord[];
            const normalized = Array.isArray(parsed)
              ? parsed.map(normalizeRecord)
              : DEFAULT_RECORDS;
            setRecords(normalized);
            setSavedMessage('localStorageから洗車記録を読み込みました');
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
            const parsed = JSON.parse(savedRecords) as OldWashRecord[];
            const normalized = Array.isArray(parsed)
              ? parsed.map(normalizeRecord)
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

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function toggleMenu(menu: WashMenu) {
    setSelectedMenus((prev) => {
      const exists = prev.includes(menu);
      return exists ? prev.filter((item) => item !== menu) : [...prev, menu];
    });

    setErrors((prev) => ({ ...prev, menus: undefined }));
  }

  async function handleSave() {
    const newErrors: WashErrors = {};

    if (!date) {
      newErrors.date = '洗車日を入れてください';
    }

    if (selectedMenus.length === 0) {
      newErrors.menus = '実施内容を1つ以上選んでください';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setSavedMessage('入力内容を確認してください');
      return;
    }

    try {
      const { db, collection, addDoc } = await getFirebaseModules();

      if (editingId !== null) {
        const updatedRecords = records.map((record) =>
          record.id === editingId
            ? {
                ...record,
                date,
                menus: selectedMenus,
                memo,
                products,
                image: image ?? undefined,
              }
            : record
        );

        setRecords(updatedRecords);

        await addDoc(collection(db, 'washRecords'), {
          mode: 'edit',
          originalId: editingId,
          date,
          menus: selectedMenus,
          memo,
          products,
          image: image ?? null,
          createdAt: new Date().toISOString(),
        });

        setSavedMessage('洗車記録を更新しました');
        setEditingId(null);
      } else {
        const newRecord: WashRecord = {
          id: Date.now(),
          date,
          menus: selectedMenus,
          memo,
          products,
          image: image ?? undefined,
        };

        setRecords((prev) => [newRecord, ...prev]);

        await addDoc(collection(db, 'washRecords'), {
          mode: 'create',
          id: newRecord.id,
          date,
          menus: selectedMenus,
          memo,
          products,
          image: image ?? null,
          createdAt: new Date().toISOString(),
        });

        setSavedMessage('洗車記録を保存しました');
      }

      setDate('');
      setSelectedMenus([]);
      setMemo('');
      setProducts('');
      setImage(null);
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

  function handleEdit(record: WashRecord) {
    setDate(record.date);
    setSelectedMenus(record.menus);
    setMemo(record.memo);
    setProducts(record.products ?? '');
    setImage(record.image ?? null);
    setEditingId(record.id);
    setErrors({});
    setSavedMessage(`編集中: ${record.date} の洗車記録`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id: number) {
    const targetRecord = records.find((record) => record.id === id);

    if (!targetRecord) return;

    const ok = window.confirm(
      `${targetRecord.date} / ${targetRecord.menus.join('、')} を削除しますか？`
    );

    if (!ok) return;

    const nextRecords = records.filter((record) => record.id !== id);
    setRecords(nextRecords);

    if (editingId === id) {
      setEditingId(null);
      setDate('');
      setSelectedMenus([]);
      setMemo('');
      setProducts('');
      setImage(null);
      setErrors({});
    }

    setSavedMessage('洗車記録を削除しました');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDate('');
    setSelectedMenus([]);
    setMemo('');
    setProducts('');
    setImage(null);
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
          icon="🧼"
          englishLabel="Wash Log"
          title="洗車記録"
          description="洗車メニュー・使用洗剤・施工メモ・写真をまとめて管理"
        />

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? '洗車記録を編集' : '洗車を入力'}
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <DateInputWithPicker
              label="洗車日"
              value={date}
              onChange={(value) => {
                setDate(value);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              error={errors.date}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <p style={{ ...labelStyle(), marginBottom: '10px' }}>実施内容</p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              {WASH_MENU_OPTIONS.map((menu) => {
                const checked = selectedMenus.includes(menu);

                return (
                  <label
                    key={menu}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '14px',
                      borderRadius: '14px',
                      border: checked ? '1px solid #60a5fa' : '1px solid #3f3f46',
                      background: checked ? '#172554' : '#09090b',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: checked ? '#eff6ff' : '#fafafa',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMenu(menu)}
                    />
                    <span>{menu}</span>
                  </label>
                );
              })}
            </div>

            {errors.menus ? (
              <p
                style={{
                  color: '#f87171',
                  fontSize: '14px',
                  marginTop: '8px',
                  marginBottom: 0,
                }}
              >
                {errors.menus}
              </p>
            ) : null}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>使用洗剤・ケミカル</label>
            <input
              type="text"
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              placeholder="例: カーシャンプー、簡易コート剤、ガラスクリーナー"
              style={inputStyle(false)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>写真</label>

            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid #3f3f46',
                background: '#09090b',
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  width: '100%',
                  color: '#fafafa',
                }}
              />

              {image ? (
                <img
                  src={image}
                  alt="洗車記録のプレビュー"
                  style={{
                    width: '100%',
                    marginTop: '14px',
                    borderRadius: '14px',
                    border: '1px solid #27272a',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <p
                  style={{
                    margin: '12px 0 0 0',
                    color: '#71717a',
                    fontSize: '14px',
                  }}
                >
                  まだ写真は選択されていません
                </p>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              placeholder="例: 花粉が多かった、窓も施工した"
              style={{ ...inputStyle(false), resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>洗車記録一覧</h2>
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
                    {record.menus.join('、')}
                  </p>

                  {record.products ? (
                    <p style={{ margin: '0 0 8px 0', color: '#d4d4d8', fontSize: '14px' }}>
                      🧴 {record.products}
                    </p>
                  ) : null}

                  {record.memo ? (
                    <p style={{ margin: '0 0 12px 0', color: '#d4d4d8', fontSize: '14px' }}>
                      {record.memo}
                    </p>
                  ) : null}

                  {record.image ? (
                    <img
                      src={record.image}
                      alt="洗車記録の写真"
                      style={{
                        width: '100%',
                        borderRadius: '14px',
                        border: '1px solid #27272a',
                        marginBottom: '12px',
                        objectFit: 'cover',
                      }}
                    />
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