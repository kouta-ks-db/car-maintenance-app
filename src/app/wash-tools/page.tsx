'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppBottomNav from '@/components/AppBottomNav';
import AppHeaderCard from '@/components/AppHeaderCard';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import SectionCard from '@/components/SectionCard';

type WashToolCategory =
  | 'シャンプー'
  | 'コーティング剤'
  | 'コンパウンド'
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
  imageBucket?: string;
  imagePath?: string;
  imageUrl?: string;
  image?: string;
};

type FirestoreWashTool = {
  id?: number;
  name?: string;
  category?: string;
  brand?: string;
  purchaseDate?: string;
  price?: string;
  memo?: string;
  imageBucket?: string;
  imagePath?: string;
  imageUrl?: string;
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
  'コンパウンド',
  'タオル・クロス',
  'スポンジ・ミット',
  'ブラシ',
  'フォームガン',
  'バケツ',
  '高圧洗浄機',
  'その他',
];

function normalizeCategory(category?: string): WashToolCategory {
  if (category === 'クリーナー') return 'コンパウンド';
  if (CATEGORY_OPTIONS.includes(category as WashToolCategory)) {
    return category as WashToolCategory;
  }
  return 'その他';
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

type UploadedWashToolImage = {
  imageBucket: string;
  imagePath: string;
  imageUrl: string;
};

async function uploadWashToolImage(
  docId: string,
  file: File
): Promise<UploadedWashToolImage> {
  const formData = new FormData();
  formData.append('docId', docId);
  formData.append('file', file);

  const response = await fetch('/api/wash-tool-image', {
    method: 'POST',
    body: formData,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json?.error ?? 'Google Drive画像アップロード失敗');
  }

  return json as UploadedWashToolImage;
}

async function getWashToolImageUrl(
  imagePath: string,
  imageBucket?: string,
  imageUrl?: string
): Promise<string | undefined> {
  if (imageUrl) return imageUrl;

  if (imageBucket === 'google-drive') {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
      imagePath
    )}&sz=w1200`;
  }

  const bucket =
    imageBucket ||
    (imagePath.includes('appspot.com')
      ? 'car-maintenance-app-f120a.appspot.com'
      : 'car-maintenance-app-f120a.firebasestorage.app');

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    imagePath
  )}?alt=media`;
}

async function deleteWashToolStorageImage(
  imagePath?: string,
  imageBucket?: string
): Promise<void> {
  if (!imagePath) return;

  try {
    await fetch('/api/wash-tool-image', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBucket, imagePath }),
    });
  } catch (error) {
    console.error('クラウド画像の削除に失敗しました:', error);
  }
}

async function hydrateImages(records: WashTool[]): Promise<WashTool[]> {
  return Promise.all(
    records.map(async (record) => {
      if (record.imagePath) {
        const cloudImage = await getWashToolImageUrl(
          record.imagePath,
          record.imageBucket,
          record.imageUrl
        );

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
    category: normalizeCategory(record.category),
    brand: record.brand ?? '',
    purchaseDate: record.purchaseDate ?? '',
    price: record.price ?? '',
    memo: record.memo ?? '',
    imageBucket: record.imageBucket ?? '',
    imagePath: record.imagePath ?? '',
    imageUrl: record.imageUrl ?? '',
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

  const toolStats = useMemo(() => {
    const categories = new Set(
      tools.filter((tool) => tool.name).map((tool) => tool.category)
    );
    const totalPrice = tools.reduce((sum, tool) => {
      const priceValue = Number(tool.price);
      return Number.isFinite(priceValue) ? sum + priceValue : sum;
    }, 0);

    return {
      categoryCount: categories.size,
      totalPrice,
    };
  }, [tools]);

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

        let nextImageBucket = targetTool.imageBucket ?? '';
        let nextImagePath = targetTool.imagePath ?? '';
        let nextImageUrl = targetTool.imageUrl ?? '';

        if (imageFile) {
          const uploadedImage = await uploadWashToolImage(targetTool.docId, imageFile);
          nextImageBucket = uploadedImage.imageBucket;
          nextImagePath = uploadedImage.imagePath;
          nextImageUrl = uploadedImage.imageUrl;
          await deleteWashToolStorageImage(
            targetTool.imagePath,
            targetTool.imageBucket
          );
          await setWashToolImage(targetTool.docId, null);
        } else if (!image && targetTool.imagePath) {
          await deleteWashToolStorageImage(
            targetTool.imagePath,
            targetTool.imageBucket
          );
          nextImageBucket = '';
          nextImagePath = '';
          nextImageUrl = '';
        }

        await updateDoc(doc(db, 'washTools', targetTool.docId), {
          name: name.trim(),
          category,
          brand,
          purchaseDate,
          price,
          memo,
          imageBucket: nextImageBucket,
          imagePath: nextImagePath,
          imageUrl: nextImageUrl,
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
                  imageBucket: nextImageBucket,
                  imagePath: nextImagePath,
                  imageUrl: nextImageUrl,
                  image: nextImageUrl || image || undefined,
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
          imageBucket: '',
          imagePath: '',
          imageUrl: '',
          createdAt: new Date().toISOString(),
        });

        const uploadedImage = imageFile
          ? await uploadWashToolImage(docRef.id, imageFile)
          : null;

        if (uploadedImage) {
          await updateDoc(doc(db, 'washTools', docRef.id), {
            imageBucket: uploadedImage.imageBucket,
            imagePath: uploadedImage.imagePath,
            imageUrl: uploadedImage.imageUrl,
            updatedAt: new Date().toISOString(),
          });
        }

        const newTool: WashTool = {
          ...newToolBase,
          docId: docRef.id,
          imageBucket: uploadedImage?.imageBucket ?? '',
          imagePath: uploadedImage?.imagePath ?? '',
          imageUrl: uploadedImage?.imageUrl ?? '',
          image: uploadedImage?.imageUrl ?? image ?? undefined,
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
        await deleteWashToolStorageImage(targetTool.imagePath, targetTool.imageBucket);
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
          icon="🧰"
          englishLabel="Wash Tools"
          title="洗車道具"
          description="持っている洗車道具・ケミカル・写真をまとめて管理"
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              border: '1px solid rgba(113,113,122,0.22)',
              borderRadius: '16px',
              padding: '14px',
              background: 'rgba(9,9,11,0.78)',
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '12px' }}>
              道具
            </p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
              {isLoaded ? tools.length : '-'}
              <span style={{ color: '#a1a1aa', fontSize: '13px', marginLeft: '4px' }}>
                件
              </span>
            </p>
          </div>

          <div
            style={{
              border: '1px solid rgba(113,113,122,0.22)',
              borderRadius: '16px',
              padding: '14px',
              background: 'rgba(9,9,11,0.78)',
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '12px' }}>
              カテゴリ
            </p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
              {isLoaded ? toolStats.categoryCount : '-'}
              <span style={{ color: '#a1a1aa', fontSize: '13px', marginLeft: '4px' }}>
                種
              </span>
            </p>
          </div>

          <div
            style={{
              border: '1px solid rgba(113,113,122,0.22)',
              borderRadius: '16px',
              padding: '14px',
              background: 'rgba(9,9,11,0.78)',
            }}
          >
            <p style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '12px' }}>
              登録金額
            </p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
              {isLoaded ? toolStats.totalPrice.toLocaleString() : '-'}
              <span style={{ color: '#a1a1aa', fontSize: '13px', marginLeft: '4px' }}>
                円
              </span>
            </p>
          </div>
        </div>

        <SectionCard>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div>
              <p
                style={{
                  margin: '0 0 6px 0',
                  color: '#94a3b8',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Category View
              </p>
              <p style={{ margin: 0, color: '#e4e4e7', fontSize: '14px' }}>
                写真と道具名をカテゴリごとに確認
              </p>
            </div>
            <Link
              href="/wash-tools/categories"
              style={{
                padding: '10px 13px',
                borderRadius: '12px',
                border: '1px solid rgba(226,232,240,0.18)',
                background: 'rgba(30,41,59,0.72)',
                color: '#f8fafc',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              一覧を見る
            </Link>
          </div>
        </SectionCard>

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
            <label style={labelStyle()}>写真（Googleドライブに保存）</label>
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                border: '1px solid rgba(226,232,240,0.18)',
                background: 'rgba(15,23,42,0.62)',
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  width: '100%',
                  color: '#f8fafc',
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
                      height: '220px',
                      marginTop: '14px',
                      borderRadius: '14px',
                      border: '1px solid #27272a',
                      background: 'rgba(15,23,42,0.72)',
                      objectFit: 'contain',
                      objectPosition: 'center',
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
                      border: '1px solid rgba(226,232,240,0.18)',
                      background: 'transparent',
                      color: '#f8fafc',
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
                    color: '#94a3b8',
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>洗車道具一覧</h2>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
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
                    background: 'rgba(15,23,42,0.62)',
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
                        height: '180px',
                        borderRadius: '14px',
                        border: '1px solid #27272a',
                        marginBottom: '12px',
                        background: 'rgba(15,23,42,0.72)',
                        objectFit: 'contain',
                        objectPosition: 'center',
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
      <AppBottomNav active="tools" />
    </main>
  );
}
