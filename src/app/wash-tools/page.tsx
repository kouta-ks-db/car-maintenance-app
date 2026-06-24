'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type WashToolCategory =
  | 'シャンプー'
  | 'コーティング剤'
  | 'クリーナー'
  | 'タオル・クロス'
  | 'スポンジ・ミット'
  | 'ブラシ'
  | 'フォームガン'
  | 'バケツ'
  | '高圧洗浄機'
  | 'その他';

type WashTool = {
  id: number;
  docId?: string;
  name: string;
  category: WashToolCategory;
  brand: string;
  purchaseDate: string;
  price: string;
  memo: string;
  imagePath?: string;
  image?: string;
};

type FirestoreWashTool = {
  id?: number;
  name?: string;
  category?: WashToolCategory;
  brand?: string;
  purchaseDate?: string;
  price?: string;
  memo?: string;
  imagePath?: string;
  createdAt?: string;
  updatedAt?: string;
};

type WashToolErrors = {
  name?: string;
  category?: string;
  price?: string;
};

const TEXT_STORAGE_KEY = 'wash-tools-text';
const DB_NAME = 'car-maintenance-local-db';
const DB_VERSION = 2;
const IMAGE_STORE_NAME = 'wash-tool-images';

const CATEGORY_OPTIONS: WashToolCategory[] = [
  'シャンプー',
  'コーティング剤',
  'クリーナー',
  'タオル・クロス',
  'スポンジ・ミット',
  'ブラシ',
  'フォームガン',
  'バケツ',
  '高圧洗浄機',
  'その他',
];

async function getFirebaseModules() {
  const [{ db, storage }, firestore, storageApi] = await Promise.all([
    import('@/lib/firebase'),
    import('firebase/firestore/lite'),
    import('firebase/storage'),
  ]);

  return {
    db,
    storage,
    collection: firestore.collection,
    addDoc: firestore.addDoc,
    getDocs: firestore.getDocs,
    doc: firestore.doc,
    updateDoc: firestore.updateDoc,
    deleteDoc: firestore.deleteDoc,
    storageRef: storageApi.ref,
    uploadBytes: storageApi.uploadBytes,
    getDownloadURL: storageApi.getDownloadURL,
    deleteObject: storageApi.deleteObject,
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

function getRecordKey(record: { docId?: string; id: number }) {
  return record.docId ?? `local-${record.id}`;
}

function openWashToolImageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDBが利用できません'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('wash-images')) {
        db.createObjectStore('wash-images');
      }

      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDBのオープンに失敗しました'));
  });
}

async function getWashToolImage(recordKey: string): Promise<string | undefined> {
  const db = await openWashToolImageDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.get(recordKey);

    request.onsuccess = () => {
      resolve(typeof request.result === 'string' ? request.result : undefined);
    };

    request.onerror = () =>
      reject(request.error ?? new Error('画像の読み込みに失敗しました'));

    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function setWashToolImage(
  recordKey: string,
  image: string | null
): Promise<void> {
  const db = await openWashToolImageDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = image ? store.put(image, recordKey) : store.delete(recordKey);

    request.onerror = () =>
      reject(request.error ?? new Error('画像の保存に失敗しました'));

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('画像の保存トランザクションに失敗しました'));
    };
  });
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function uploadWashToolImage(docId: string, file: File): Promise<string> {
  const { storage, storageRef, uploadBytes } = await getFirebaseModules();
  const imagePath = `wash-tools/${docId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const fileRef = storageRef(storage, imagePath);

  await uploadBytes(fileRef, file);
  return imagePath;
}

async function getWashToolImageUrl(imagePath: string): Promise<string | undefined> {
  try {
    const { storage, storageRef, getDownloadURL } = await getFirebaseModules();
    return await getDownloadURL(storageRef(storage, imagePath));
  } catch (error) {
    console.error('Storage画像URLの取得に失敗しました:', error);
    return undefined;
  }
}

async function deleteWashToolStorageImage(imagePath?: string): Promise<void> {
  if (!imagePath) return;

  try {
    const { storage, storageRef, deleteObject } = await getFirebaseModules();
    await deleteObject(storageRef(storage, imagePath));
  } catch (error) {
    console.error('Storage画像の削除に失敗しました:', error);
  }
}

async function hydrateImages(records: WashTool[]): Promise<WashTool[]> {
  return Promise.all(
    records.map(async (record) => {
      if (record.imagePath) {
        const cloudImage = await getWashToolImageUrl(record.imagePath);

        if (cloudImage) {
          return { ...record, image: cloudImage };
        }
      }

      try {
        const image = await getWashToolImage(getRecordKey(record));
        return { ...record, image };
      } catch {
        return { ...record, image: undefined };
      }
    })
  );
}

function normalizeFirestoreRecord(
  docId: string,
  record: FirestoreWashTool,
  fallbackId: number
): WashTool {
  return {
    id: typeof record.id === 'number' ? record.id : fallbackId,
    docId,
    name: record.name ?? '',
    category: record.category ?? 'その他',
    brand: record.brand ?? '',
    purchaseDate: record.purchaseDate ?? '',
    price: record.price ?? '',
    memo: record.memo ?? '',
    imagePath: record.imagePath ?? '',
  };
}

function removeImage(tool: WashTool): Omit<WashTool, 'image'> {
  const textOnlyTool = { ...tool };
  delete textOnlyTool.image;
  return textOnlyTool;
}

export default function WashToolsPage() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WashToolCategory>('シャンプー');
  const [brand, setBrand] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [price, setPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [errors, setErrors] = useState<WashToolErrors>({});
  const [tools, setTools] = useState<WashTool[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadTools() {
      try {
        const { db, collection, getDocs } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, 'washTools'));

        if (!snapshot.empty) {
          const firestoreTools = snapshot.docs
            .map((docItem, index) =>
              normalizeFirestoreRecord(
                docItem.id,
                docItem.data() as FirestoreWashTool,
                Date.now() + index
              )
            )
            .filter((tool) => tool.name)
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

          const toolsWithImages = await hydrateImages(firestoreTools);
          setTools(toolsWithImages);
          window.localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(firestoreTools));
          setSavedMessage('Firebaseから洗車道具を読み込みました');
          setIsLoaded(true);
          return;
        }

        const savedTextTools = window.localStorage.getItem(TEXT_STORAGE_KEY);

        if (savedTextTools) {
          const parsed = JSON.parse(savedTextTools) as Omit<WashTool, 'image'>[];
          const toolsWithImages = await hydrateImages(parsed as WashTool[]);
          setTools(toolsWithImages);
          setSavedMessage('localStorageから洗車道具を読み込みました');
        } else {
          setTools([]);
          setSavedMessage('登録された道具がありません');
        }
      } catch (error) {
        console.error('Firestoreからの読み込みに失敗しました:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'unknown error';
        const savedTextTools = window.localStorage.getItem(TEXT_STORAGE_KEY);

        if (savedTextTools) {
          try {
            const parsed = JSON.parse(savedTextTools) as Omit<WashTool, 'image'>[];
            const toolsWithImages = await hydrateImages(parsed as WashTool[]);
            setTools(toolsWithImages);
            setSavedMessage(
              `Firebase読み込み失敗: ${errorMessage} / localStorageを表示しています`
            );
          } catch {
            setTools([]);
            setSavedMessage(
              `Firebase読み込み失敗: ${errorMessage} / 登録された道具がありません`
            );
          }
        } else {
          setTools([]);
          setSavedMessage(
            `Firebase読み込み失敗: ${errorMessage} / 登録された道具がありません`
          );
        }
      } finally {
        setIsLoaded(true);
      }
    }

    loadTools();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const textOnlyTools = tools.map(removeImage);
    window.localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(textOnlyTools));
  }, [tools, isLoaded]);

  function resetForm() {
    setName('');
    setCategory('シャンプー');
    setBrand('');
    setPurchaseDate('');
    setPrice('');
    setMemo('');
    setImage(null);
    setImageFile(null);
    setErrors({});
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setImageFile(file);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const newErrors: WashToolErrors = {};

    if (!name.trim()) {
      newErrors.name = '道具名を入れてください';
    }

    if (!category) {
      newErrors.category = 'カテゴリを選んでください';
    }

    if (price && Number(price) < 0) {
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
        const targetTool = tools.find((tool) => tool.id === editingId);

        if (!targetTool?.docId) {
          setSavedMessage('更新対象のFirebaseデータが見つかりませんでした');
          return;
        }

        let nextImagePath = targetTool.imagePath ?? '';

        if (imageFile) {
          nextImagePath = await uploadWashToolImage(targetTool.docId, imageFile);
          await deleteWashToolStorageImage(targetTool.imagePath);
          await setWashToolImage(targetTool.docId, null);
        } else if (!image && targetTool.imagePath) {
          await deleteWashToolStorageImage(targetTool.imagePath);
          nextImagePath = '';
        }

        await updateDoc(doc(db, 'washTools', targetTool.docId), {
          name: name.trim(),
          category,
          brand,
          purchaseDate,
          price,
          memo,
          imagePath: nextImagePath,
          updatedAt: new Date().toISOString(),
        });

        setTools((prev) =>
          prev.map((tool) =>
            tool.id === editingId
              ? {
                  ...tool,
                  name: name.trim(),
                  category,
                  brand,
                  purchaseDate,
                  price,
                  memo,
                  imagePath: nextImagePath,
                  image: image ?? undefined,
                }
              : tool
          )
        );
        setSavedMessage('洗車道具を更新しました');
        setEditingId(null);
      } else {
        const newToolBase = {
          id: Date.now(),
          name: name.trim(),
          category,
          brand,
          purchaseDate,
          price,
          memo,
        };

        const docRef = await addDoc(collection(db, 'washTools'), {
          ...newToolBase,
          imagePath: '',
          createdAt: new Date().toISOString(),
        });

        const imagePath = imageFile
          ? await uploadWashToolImage(docRef.id, imageFile)
          : '';

        if (imagePath) {
          await updateDoc(doc(db, 'washTools', docRef.id), {
            imagePath,
            updatedAt: new Date().toISOString(),
          });
        }

        const newTool: WashTool = {
          ...newToolBase,
          docId: docRef.id,
          imagePath,
          image: image ?? undefined,
        };

        setTools((prev) => [newTool, ...prev]);
        setSavedMessage('洗車道具を保存しました');
      }

      resetForm();
    } catch (error) {
      console.error('保存に失敗しました:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'unknown error';

      setSavedMessage(`保存失敗: ${errorMessage}`);
    }
  }

  function handleEdit(tool: WashTool) {
    setName(tool.name);
    setCategory(tool.category);
    setBrand(tool.brand);
    setPurchaseDate(tool.purchaseDate);
    setPrice(tool.price);
    setMemo(tool.memo);
    setImage(tool.image ?? null);
    setImageFile(null);
    setEditingId(tool.id);
    setErrors({});
    setSavedMessage(`編集中: ${tool.name}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: number) {
    const targetTool = tools.find((tool) => tool.id === id);
    if (!targetTool) return;

    const ok = window.confirm(`${targetTool.name} を削除しますか？`);
    if (!ok) return;

    try {
      if (targetTool.docId) {
        const { db, doc, deleteDoc } = await getFirebaseModules();
        await deleteDoc(doc(db, 'washTools', targetTool.docId));
        await deleteWashToolStorageImage(targetTool.imagePath);
        await setWashToolImage(targetTool.docId, null);
      } else {
        await setWashToolImage(getRecordKey(targetTool), null);
      }

      setTools((prev) => prev.filter((tool) => tool.id !== id));

      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }

      setSavedMessage('洗車道具を削除しました');
    } catch (error) {
      console.error('削除に失敗しました:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'unknown error';

      setSavedMessage(`削除失敗: ${errorMessage}`);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    resetForm();
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
          icon="🧰"
          englishLabel="Wash Tools"
          title="洗車道具"
          description="持っている洗車道具・ケミカル・写真をまとめて管理"
        />

        <SectionCard active={editingId !== null}>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            {editingId !== null ? '洗車道具を編集' : '洗車道具を登録'}
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>道具名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="例: カーシャンプー、マイクロファイバークロス"
              style={inputStyle(!!errors.name)}
            />
            {errors.name ? (
              <p style={{ color: '#f87171', fontSize: '14px', margin: '8px 0 0 0' }}>
                {errors.name}
              </p>
            ) : null}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>カテゴリ</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as WashToolCategory);
                setErrors((prev) => ({ ...prev, category: undefined }));
              }}
              style={inputStyle(!!errors.category)}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.category ? (
              <p style={{ color: '#f87171', fontSize: '14px', margin: '8px 0 0 0' }}>
                {errors.category}
              </p>
            ) : null}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>メーカー・ブランド</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="例: SONAX、SurLuster、Koch Chemie"
              style={inputStyle(false)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <DateInputWithPicker
              label="購入日"
              value={purchaseDate}
              onChange={setPurchaseDate}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>価格</label>
            <input
              type="number"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setErrors((prev) => ({ ...prev, price: undefined }));
              }}
              min="0"
              placeholder="例: 1980"
              style={inputStyle(!!errors.price)}
            />
            {errors.price ? (
              <p style={{ color: '#f87171', fontSize: '14px', margin: '8px 0 0 0' }}>
                {errors.price}
              </p>
            ) : null}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle()}>写真（Firebase Storageに保存）</label>
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
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt="洗車道具のプレビュー"
                    style={{
                      width: '100%',
                      marginTop: '14px',
                      borderRadius: '14px',
                      border: '1px solid #27272a',
                      objectFit: 'cover',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImageFile(null);
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '9px 13px',
                      borderRadius: '12px',
                      border: '1px solid #3f3f46',
                      background: 'transparent',
                      color: '#fafafa',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    写真を外す
                  </button>
                </>
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
              placeholder="例: ホイール用、濃い汚れ用、残量少なめ"
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>洗車道具一覧</h2>
            <span style={{ color: '#71717a', fontSize: '13px' }}>
              {isLoaded ? `${tools.length} 件` : '読み込み中...'}
            </span>
          </div>

          {!isLoaded ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>読み込み中...</p>
          ) : tools.length === 0 ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>登録された道具がありません</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  style={{
                    borderRadius: '16px',
                    border: '1px solid #27272a',
                    background: '#09090b',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      alignItems: 'flex-start',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700 }}>
                        {tool.name}
                      </p>
                      <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
                        {tool.category}
                        {tool.brand ? ` / ${tool.brand}` : ''}
                      </p>
                    </div>
                    {tool.price ? (
                      <span style={{ color: '#e4e4e7', fontSize: '14px', fontWeight: 700 }}>
                        {Number(tool.price).toLocaleString()}円
                      </span>
                    ) : null}
                  </div>

                  {tool.purchaseDate ? (
                    <p style={{ margin: '0 0 8px 0', color: '#d4d4d8', fontSize: '14px' }}>
                      購入日: {tool.purchaseDate}
                    </p>
                  ) : null}

                  {tool.memo ? (
                    <p style={{ margin: '0 0 12px 0', color: '#d4d4d8', fontSize: '14px' }}>
                      {tool.memo}
                    </p>
                  ) : null}

                  {tool.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tool.image}
                      alt="洗車道具の写真"
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
                      onClick={() => handleEdit(tool)}
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
                      onClick={() => handleDelete(tool.id)}
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
