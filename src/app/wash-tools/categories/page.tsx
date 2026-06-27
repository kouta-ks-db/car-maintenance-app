'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppBottomNav from '@/components/AppBottomNav';
import AppHeaderCard from '@/components/AppHeaderCard';
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
  brand?: string;
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
    getDocs: firestore.getDocs,
  };
}

function getRecordKey(record: { docId?: string; id: number }) {
  return record.docId ?? `local-${record.id}`;
}

function getCloudImageUrl(tool: WashTool) {
  if (tool.imageUrl) return tool.imageUrl;

  if (tool.imageBucket === 'google-drive' && tool.imagePath) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
      tool.imagePath
    )}&sz=w1200`;
  }

  return '';
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

async function getLocalImage(recordKey: string): Promise<string | undefined> {
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

async function hydrateLocalImages(tools: WashTool[]) {
  return Promise.all(
    tools.map(async (tool) => {
      const cloudImage = getCloudImageUrl(tool);

      if (cloudImage) {
        return { ...tool, image: cloudImage };
      }

      try {
        return { ...tool, image: await getLocalImage(getRecordKey(tool)) };
      } catch {
        return { ...tool, image: undefined };
      }
    })
  );
}

function toolCardStyle() {
  return {
    minWidth: 0,
    borderRadius: '15px',
    border: '1px solid rgba(113,113,122,0.22)',
    background: 'rgba(9,9,11,0.82)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
    overflow: 'hidden',
  } as const;
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
    imageBucket: record.imageBucket ?? '',
    imagePath: record.imagePath ?? '',
    imageUrl: record.imageUrl ?? '',
  };
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
          const toolsWithImages = await hydrateLocalImages(firestoreTools);

          setTools(toolsWithImages);
          window.localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(firestoreTools));
          setSavedMessage('Firebaseから洗車道具を読み込みました');
          setIsLoaded(true);
          return;
        }
      } catch (error) {
        console.error('Firestoreからの読み込みに失敗しました:', error);
      }

      const savedTextTools = window.localStorage.getItem(TEXT_STORAGE_KEY);

      if (!savedTextTools) {
        setTools([]);
        setSavedMessage('洗車道具ページで読み込むと一覧に反映されます');
        setIsLoaded(true);
        return;
      }

      try {
        const parsed = JSON.parse(savedTextTools) as WashTool[];
        const normalized = parsed
          .filter((tool) => tool.name)
          .map((tool) => ({
            ...tool,
            category: normalizeCategory(tool.category),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        const toolsWithImages = await hydrateLocalImages(normalized);

        setTools(toolsWithImages);
        setSavedMessage('保存済みの洗車道具を読み込みました');
      } catch (error) {
        console.error('洗車道具の読み込みに失敗しました:', error);
        setTools([]);
        setSavedMessage('洗車道具の読み込みに失敗しました');
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
          'radial-gradient(circle at top left, rgba(34,211,238,0.20) 0%, rgba(59,130,246,0.13) 26%, transparent 48%), radial-gradient(circle at bottom right, rgba(16,185,129,0.14) 0%, transparent 36%), linear-gradient(180deg, #111827 0%, #0f172a 48%, #111827 100%)',
        color: '#f8fafc',
        padding: '24px 24px 112px',
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
              color: '#94a3b8',
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
                  color: '#94a3b8',
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
                color: '#f8fafc',
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
                          background:
                            'linear-gradient(145deg, rgba(24,24,27,0.92), rgba(9,9,11,0.98))',
                          borderBottom: '1px solid rgba(113,113,122,0.18)',
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
                            color: '#f8fafc',
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
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
                  このカテゴリの道具はまだありません
                </p>
              )}
            </SectionCard>
          ))}
        </div>
      </div>
      <AppBottomNav active="tools" />
    </main>
  );
}
