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
  docId?: string;
  date: string;
  menus: WashMenu[];
  memo: string;
  products?: string;
  image?: string;
};

type FirestoreWashRecord = {
  id?: number;
  date?: string;
  menus?: WashMenu[];
  memo?: string;
  products?: string;
  createdAt?: string;
  updatedAt?: string;
};

type WashErrors = {
  date?: string;
  menus?: string;
};

type WashImageMap = Record<string, string>;

const TEXT_STORAGE_KEY = 'wash-records-text';
const IMAGE_STORAGE_KEY = 'wash-record-images';

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

function getImageMap(): WashImageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(IMAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WashImageMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveImageMap(map: WashImageMap) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(IMAGE_STORAGE_KEY, JSON.stringify(map));
}

function setImageForRecordKey(recordKey: string, image: string | null) {
  const map = getImageMap();

  if (image) {
    map[recordKey] = image;
  } else {
    delete map[recordKey];
  }

  saveImageMap(map);
}

function removeImageForRecordKey(recordKey: string) {
  const map = getImageMap();
  delete map[recordKey];
  saveImageMap(map);
}

function getRecordKey(record: { docId?: string; id: number }) {
  return record.docId ?? `local-${record.id}`;
}

function normalizeFirestoreRecord(
  docId: string,
  record: FirestoreWashRecord,
  fallbackId: number,
  imageMap: WashImageMap
): WashRecord {
  const id = typeof record.id === 'number' ? record.id : fallbackId;
  const recordKey = docId;

  return {
    id,
    docId,
    date: record.date ?? '',
    menus: Array.isArray(record.menus) ? record.menus : [],
    memo: record.memo ?? '',
    products: record.products ?? '',
    image: imageMap[recordKey],
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
        const imageMap = getImageMap();
        const { db, collection, getDocs } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, 'washRecords'));

        if (!snapshot.empty) {
          const firestoreRecords = snapshot.docs
            .map((docItem, index) =>
              normalizeFirestoreRecord(
                docItem.id,
                docItem.data() as FirestoreWashRecord,
                Date.now() + index,
                imageMap
              )
            )
            .filter((record) => record.date && record.menus.length > 0)
            .sort((a, b) => {
              const aTime = new Date(a.date).getTime();
              const bTime = new Date(b.date).getTime();
              return bTime - aTime;
            });

          setRecords(firestoreRecords);

          const textOnlyRecords = firestoreRecords.map(
            ({ image: _image, ...rest }) => rest
          );
          window.localStorage.setItem(
            TEXT_STORAGE_KEY,
            JSON.stringify(textOnlyRecords)
          );

          setSavedMessage('Firebaseから洗車記録を読み込みました');
          setIsLoaded(true);
          return;
        }

        const savedTextRecords = window.localStorage.getItem(TEXT_STORAGE_KEY);
        if (savedTextRecords) {
          const parsed = JSON.parse(savedTextRecords) as Omit<WashRecord, 'image'>[];
          const imageMapLocal = getImageMap();

          const mergedRecords: WashRecord[] = parsed.map((record) => ({
            ...record,
            image: imageMapLocal[getRecordKey(record)],
          }));

          setRecords(mergedRecords);
          setSavedMessage('localStorageから洗車記録を読み込みました');
        } else {
          setRecords([]);
          setSavedMessage('記録がありません');
        }
      } catch (error) {
        console.error('Firestoreからの読み込みに失敗しました:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'unknown error';

        const savedTextRecords = window.localStorage.getItem(TEXT_STORAGE_KEY);
        if (savedTextRecords) {
          try {
            const parsed = JSON.parse(savedTextRecords) as Omit<WashRecord, 'image'>[];
            const imageMapLocal = getImageMap();

            const mergedRecords: WashRecord[] = parsed.map((record) => ({
              ...record,
              image: imageMapLocal[getRecordKey(record)],
            }));

            setRecords(mergedRecords);
            setSavedMessage(
              `Firebase読み込み失敗: ${errorMessage} / localStorageを表示しています`
            );
          } catch {
            setRecords([]);
            setSavedMessage(
              `Firebase読み込み失敗: ${errorMessage} / 記録がありません`
            );
          }
        } else {
          setRecords([]);
          setSavedMessage(
            `Firebase読み込み失敗: ${errorMessage} / 記録がありません`
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

    const textOnlyRecords = records.map(({ image: _image, ...rest }) => rest);
    window.localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(textOnlyRecords));
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
      const { db, collection, addDoc, doc, updateDoc } =
        await getFirebaseModules();

      if (editingId !== null) {
        const targetRecord = records.find((record) => record.id === editingId);

        if (!targetRecord?.docId) {
          setSavedMessage('更新対象のFirebaseデータが見つかりませんでした');
          return;
        }

        // Firestoreには image を送らない
        await updateDoc(doc(db, 'washRecords', targetRecord.docId), {
          date,
          menus: selectedMenus,
          memo,
          products,
          updatedAt: new Date().toISOString(),
        });

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

        setImageForRecordKey(targetRecord.docId, image ?? null);

        setRecords(updatedRecords);
        setSavedMessage('洗車記録を更新しました');
        setEditingId(null);
      } else {
        const newRecordBase = {
          id: Date.now(),
          date,
          menus: selectedMenus,
          memo,
          products,
        };

        // Firestoreには image を送らない
        const docRef = await addDoc(collection(db, 'washRecords'), {
          ...newRecordBase,
          createdAt: new Date().toISOString(),
        });

        const newRecord: WashRecord = {
          ...newRecordBase,
          docId: docRef.id,
          image: image ?? undefined,
        };

        setImageForRecordKey(docRef.id, image ?? null);

        setRecords((prev) => [newRecord, ...prev]);
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
        `Firebase保存失敗: ${errorMessage} / 画像はローカル保存のみです`
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

  async function handleDelete(id: number) {
    const targetRecord = records.find((record) => record.id === id);
    if (!targetRecord) return;

    const ok = window.confirm(
      `${targetRecord.date} / ${targetRecord.menus.join('、')} を削除しますか？`
    );
    if (!ok) return;

    try {
      if (targetRecord.docId) {
        const { db, doc, deleteDoc } = await getFirebaseModules();
        await deleteDoc(doc(db, 'washRecords', targetRecord.docId));
        removeImageForRecordKey(targetRecord.docId);
      } else {
        removeImageForRecordKey(getRecordKey(targetRecord));
      }

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
            <label style={labelStyle()}>写真（この端末のみに保存）</label>
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