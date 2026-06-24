'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
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
  imageBucket?: string;
  imagePath?: string;
  imageUrl?: string;
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
  imageBucket?: string;
  imagePath?: string;
  imageUrl?: string;
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
  const [{ db }, firestore] = await Promise.all([
    import('@/lib/firebase'),
    import('firebase/firestore/lite'),
  ]);

  return {
    db,
    collection: firestore.collection,
    getDocs: firestore.getDocs,
  };
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
    category: record.category ?? 'その他',
    brand: record.brand ?? '',
    purchaseDate: record.purchaseDate ?? '',
    price: record.price ?? '',
    memo: record.memo ?? '',
    imageBucket: record.imageBucket ?? '',
    imagePath: record.imagePath ?? '',
    imageUrl: record.imageUrl ?? '',
  };
}

function toolCardStyle() {
  return {
    minWidth: 0,
    borderRadius: '14px',
    border: '1px solid #27272a',
    background: '#09090b',
    overflow: 'hidden',
  } as const;
}

export default function WashToolCategoriesPage() {
  const [tools, setTools] = useState<WashTool[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [savedMessage, setSavedMessage] = useState('読み込み中...');

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
          return;
        }

        const savedTextTools = window.localStorage.getItem(TEXT_STORAGE_KEY);

        if (savedTextTools) {
          const parsed = JSON.parse(savedTextTools) as WashTool[];
          const toolsWithImages = await hydrateImages(parsed);
          setTools(toolsWithImages);
          setSavedMessage('localStorageから洗車道具を読み込みました');
        } else {
          setTools([]);
          setSavedMessage('登録された道具がありません');
        }
      } catch (error) {
        console.error('洗車道具の読み込みに失敗しました:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'unknown error';
        const savedTextTools = window.localStorage.getItem(TEXT_STORAGE_KEY);

        if (savedTextTools) {
          try {
            const parsed = JSON.parse(savedTextTools) as WashTool[];
            const toolsWithImages = await hydrateImages(parsed);
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

  const groupedTools = useMemo(() => {
    return CATEGORY_OPTIONS.map((category) => ({
      category,
      tools: tools.filter((tool) => tool.category === category),
    }));
  }, [tools]);

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
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <Link
            href="/wash-tools"
            style={{
              color: '#a1a1aa',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← 洗車道具に戻る
          </Link>

          <Link
            href="/"
            style={{
              color: '#71717a',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ホーム
          </Link>
        </div>

        <AppHeaderCard
          icon="🗂️"
          englishLabel="Category View"
          title="カテゴリ別一覧"
          description="登録した洗車道具をカテゴリごとに写真と名前で確認"
        />

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
                  margin: '0 0 8px 0',
                  color: '#71717a',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Status
              </p>
              <p style={{ margin: 0, color: '#e4e4e7' }}>{savedMessage}</p>
            </div>
            <p
              style={{
                margin: 0,
                color: '#fafafa',
                fontSize: '28px',
                fontWeight: 800,
              }}
            >
              {isLoaded ? tools.length : '-'}
              <span
                style={{
                  color: '#a1a1aa',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginLeft: '6px',
                }}
              >
                件
              </span>
            </p>
          </div>
        </SectionCard>

        <div style={{ display: 'grid', gap: '18px' }}>
          {groupedTools.map(({ category, tools: categoryTools }) => (
            <SectionCard key={category} marginBottom="0">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <h2 style={{ fontSize: '19px', margin: 0 }}>{category}</h2>
                <span
                  style={{
                    color: '#a1a1aa',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {categoryTools.length} 件
                </span>
              </div>

              {categoryTools.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(138px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {categoryTools.map((tool) => (
                    <div key={tool.docId ?? tool.id} style={toolCardStyle()}>
                      <div
                        style={{
                          aspectRatio: '1 / 1',
                          background: '#18181b',
                          borderBottom: '1px solid #27272a',
                        }}
                      >
                        {tool.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tool.image}
                            alt={tool.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              height: '100%',
                              display: 'grid',
                              placeItems: 'center',
                              color: '#52525b',
                              fontSize: '12px',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                            }}
                          >
                            NO IMAGE
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '11px' }}>
                        <p
                          style={{
                            margin: 0,
                            color: '#fafafa',
                            fontSize: '14px',
                            fontWeight: 700,
                            lineHeight: 1.35,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {tool.name}
                        </p>
                        {tool.brand ? (
                          <p
                            style={{
                              margin: '5px 0 0 0',
                              color: '#a1a1aa',
                              fontSize: '12px',
                              lineHeight: 1.35,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {tool.brand}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#71717a', fontSize: '14px' }}>
                  このカテゴリの道具はまだありません
                </p>
              )}
            </SectionCard>
          ))}
        </div>
      </div>
    </main>
  );
}
