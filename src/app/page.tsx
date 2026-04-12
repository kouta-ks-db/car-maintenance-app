'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

<p style={{ color: 'red', fontWeight: 'bold' }}>DEPLOY TEST 123</p>

type FuelRecord = {
  id: number;
  date: string;
  odometer?: string;
  liters?: string;
  price?: string;
};

type WashRecord = {
  id: number;
  date: string;
  menu?: string;
  menus?: string[];
  memo?: string;
  image?: string;
};

type MaintenanceRecord = {
  id: number;
  date: string;
  menu?: string;
  price?: string;
  memo?: string;
};

type MileageRecord = {
  id: number;
  date: string;
  distance?: string;
};

type RecentActivity = {
  id: string;
  date: string;
  category: 'fuel' | 'wash' | 'maintenance';
  title: string;
  subtitle: string;
  icon: string;
};

const DEFAULT_FUEL_RECORDS: FuelRecord[] = [
  { id: 1, date: '2026-04-12', odometer: '45200', liters: '24.5', price: '4200' },
  { id: 2, date: '2026-03-30', odometer: '44800', liters: '26.1', price: '4520' },
];

const DEFAULT_WASH_RECORDS: WashRecord[] = [
  {
    id: 1,
    date: '2026-04-12',
    menus: ['手洗い洗車', 'タイヤ洗車'],
    memo: 'ボディ中心に洗車',
  },
  {
    id: 2,
    date: '2026-04-05',
    menus: ['簡易コーティング', '窓コーティング'],
    memo: '窓も軽く施工',
  },
];

const DEFAULT_MAINTENANCE_RECORDS: MaintenanceRecord[] = [
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

const DEFAULT_MILEAGE_RECORDS: MileageRecord[] = [
  {
    id: 1,
    date: '2026-04-12',
    distance: '45200',
  },
  {
    id: 2,
    date: '2026-04-01',
    distance: '44800',
  },
];

function getLatestByDate<T extends { date?: string }>(records: T[]) {
  if (!records.length) return null;

  return [...records].sort((a, b) => {
    const aTime = new Date(a.date ?? '').getTime();
    const bTime = new Date(b.date ?? '').getTime();
    return bTime - aTime;
  })[0] ?? null;
}

function getLatestMileage(records: MileageRecord[]) {
  if (!records.length) return 0;
  return Math.max(...records.map((record) => Number(record.distance ?? 0)));
}

function getWashLabel(record: WashRecord | null) {
  if (!record) return '-';

  if (Array.isArray(record.menus) && record.menus.length > 0) {
    return record.menus.join('、');
  }

  if (record.menu) {
    return record.menu;
  }

  return '-';
}

function isThisMonth(dateString?: string) {
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function calculateFuelEconomy(current: FuelRecord, previous?: FuelRecord) {
  if (!previous) return null;

  const currentOdometer = Number(current.odometer);
  const previousOdometer = Number(previous.odometer);
  const liters = Number(current.liters);

  if (
    !current.odometer ||
    !previous.odometer ||
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

function cardStyle() {
  return {
    border: '1px solid #27272a',
    borderRadius: '22px',
    padding: '18px',
    background:
      'linear-gradient(180deg, rgba(39,39,42,0.94) 0%, rgba(24,24,27,0.98) 100%)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.28)',
  } as const;
}

function sectionLabelStyle() {
  return {
    color: '#71717a',
    fontSize: '12px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    margin: 0,
  };
}

function accentLineStyle() {
  return {
    width: '42px',
    height: '3px',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #fafafa 0%, #71717a 100%)',
    marginTop: '10px',
  } as const;
}

export default function HomePage() {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [washRecords, setWashRecords] = useState<WashRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [mileageRecords, setMileageRecords] = useState<MileageRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedFuel = window.localStorage.getItem('fuel-records');
      const savedWash = window.localStorage.getItem('wash-records');
      const savedMaintenance = window.localStorage.getItem('maintenance-records');
      const savedMileage = window.localStorage.getItem('mileage-records');

      setFuelRecords(
        savedFuel ? (JSON.parse(savedFuel) as FuelRecord[]) : DEFAULT_FUEL_RECORDS
      );
      setWashRecords(
        savedWash ? (JSON.parse(savedWash) as WashRecord[]) : DEFAULT_WASH_RECORDS
      );
      setMaintenanceRecords(
        savedMaintenance
          ? (JSON.parse(savedMaintenance) as MaintenanceRecord[])
          : DEFAULT_MAINTENANCE_RECORDS
      );
      setMileageRecords(
        savedMileage
          ? (JSON.parse(savedMileage) as MileageRecord[])
          : DEFAULT_MILEAGE_RECORDS
      );
    } catch {
      setFuelRecords(DEFAULT_FUEL_RECORDS);
      setWashRecords(DEFAULT_WASH_RECORDS);
      setMaintenanceRecords(DEFAULT_MAINTENANCE_RECORDS);
      setMileageRecords(DEFAULT_MILEAGE_RECORDS);
    }

    setIsLoaded(true);
  }, []);

  const latestFuel = useMemo(() => getLatestByDate(fuelRecords), [fuelRecords]);
  const latestWash = useMemo(() => getLatestByDate(washRecords), [washRecords]);
  const latestMaintenance = useMemo(
    () => getLatestByDate(maintenanceRecords),
    [maintenanceRecords]
  );
  const latestMileage = useMemo(() => getLatestMileage(mileageRecords), [mileageRecords]);

  const fuelCountThisMonth = useMemo(
    () => fuelRecords.filter((record) => isThisMonth(record.date)).length,
    [fuelRecords]
  );

  const washCountThisMonth = useMemo(
    () => washRecords.filter((record) => isThisMonth(record.date)).length,
    [washRecords]
  );

  const maintenanceCostThisMonth = useMemo(() => {
    return maintenanceRecords
      .filter((record) => isThisMonth(record.date))
      .reduce((sum, record) => sum + Number(record.price ?? 0), 0);
  }, [maintenanceRecords]);

  const averageFuelEconomy = useMemo(() => {
    const sortedFuelRecords = [...fuelRecords].sort(
      (a, b) => Number(b.odometer ?? 0) - Number(a.odometer ?? 0)
    );

    const validEconomies: number[] = [];

    sortedFuelRecords.forEach((record, index) => {
      const previousRecord = sortedFuelRecords[index + 1];
      const fuelEconomy = calculateFuelEconomy(record, previousRecord);

      if (fuelEconomy !== null) {
        validEconomies.push(fuelEconomy);
      }
    });

    if (validEconomies.length === 0) return null;

    const total = validEconomies.reduce((sum, value) => sum + value, 0);
    return total / validEconomies.length;
  }, [fuelRecords]);

  const recentActivities = useMemo<RecentActivity[]>(() => {
    const fuelActivities: RecentActivity[] = fuelRecords.map((record) => ({
      id: `fuel-${record.id}`,
      date: record.date ?? '',
      category: 'fuel',
      title: '給油記録',
      subtitle: `${record.liters ?? '-'}L / ${
        record.price ? `${Number(record.price).toLocaleString()}円` : '-'
      }`,
      icon: '⛽',
    }));

    const washActivities: RecentActivity[] = washRecords.map((record) => ({
      id: `wash-${record.id}`,
      date: record.date ?? '',
      category: 'wash',
      title: '洗車記録',
      subtitle:
        Array.isArray(record.menus) && record.menus.length > 0
          ? record.menus.join('、')
          : record.menu ?? '-',
      icon: '🧼',
    }));

    const maintenanceActivities: RecentActivity[] = maintenanceRecords.map((record) => ({
      id: `maintenance-${record.id}`,
      date: record.date ?? '',
      category: 'maintenance',
      title: 'メンテ記録',
      subtitle: `${record.menu ?? '-'}${
        record.price ? ` / ${Number(record.price).toLocaleString()}円` : ''
      }`,
      icon: '🔧',
    }));

    return [...fuelActivities, ...washActivities, ...maintenanceActivities]
      .sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return bTime - aTime;
      })
      .slice(0, 3);
  }, [fuelRecords, washRecords, maintenanceRecords]);

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
        <section
          style={{
            ...cardStyle(),
            marginBottom: '18px',
            position: 'relative',
            overflow: 'hidden',
            padding: '24px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-30px',
              width: '140px',
              height: '140px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.06)',
              filter: 'blur(8px)',
            }}
          />

          <p style={sectionLabelStyle()}>Garage Dashboard</p>
          <div style={accentLineStyle()} />

          <div style={{ marginTop: '18px' }}>
            <h1
              style={{
                fontSize: '34px',
                margin: 0,
                marginBottom: '10px',
                lineHeight: 1.15,
              }}
            >
              カーメンテナンスアプリ
            </h1>

            <p style={{ color: '#a1a1aa', margin: 0, fontSize: '15px' }}>
              給油・洗車・メンテ・走行距離を、ひとつのガレージ画面で管理
            </p>
          </div>
        </section>

        <section
          style={{
            ...cardStyle(),
            marginBottom: '18px',
            padding: '20px',
          }}
        >
          <p style={sectionLabelStyle()}>📍 Current Mileage</p>
          <div style={accentLineStyle()} />

          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '38px',
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {isLoaded ? latestMileage.toLocaleString() : '...'}
              </p>
              <p style={{ color: '#a1a1aa', margin: '8px 0 0 0' }}>km</p>
            </div>

            <Link
              href="/mileage"
              style={{
                display: 'inline-block',
                padding: '12px 16px',
                borderRadius: '14px',
                textDecoration: 'none',
                background: '#fafafa',
                color: '#09090b',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              走行距離を見る
            </Link>
          </div>
        </section>

        <section style={{ marginBottom: '14px' }}>
          <p style={sectionLabelStyle()}>Monthly Summary</p>
          <div style={accentLineStyle()} />
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            marginBottom: '24px',
          }}
        >
          <section style={cardStyle()}>
            <p style={{ margin: '0 0 8px 0', fontSize: '24px' }}>⛽</p>
            <p style={{ color: '#71717a', margin: '0 0 6px 0', fontSize: '12px' }}>
              今月の給油
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              {isLoaded ? fuelCountThisMonth : '...'}
            </p>
            <p style={{ color: '#a1a1aa', margin: '6px 0 0 0', fontSize: '13px' }}>回</p>
          </section>

          <section style={cardStyle()}>
            <p style={{ margin: '0 0 8px 0', fontSize: '24px' }}>🧼</p>
            <p style={{ color: '#71717a', margin: '0 0 6px 0', fontSize: '12px' }}>
              今月の洗車
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              {isLoaded ? washCountThisMonth : '...'}
            </p>
            <p style={{ color: '#a1a1aa', margin: '6px 0 0 0', fontSize: '13px' }}>回</p>
          </section>

          <section style={cardStyle()}>
            <p style={{ margin: '0 0 8px 0', fontSize: '24px' }}>🔧</p>
            <p style={{ color: '#71717a', margin: '0 0 6px 0', fontSize: '12px' }}>
              今月のメンテ費用
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              {isLoaded ? maintenanceCostThisMonth.toLocaleString() : '...'}
            </p>
            <p style={{ color: '#a1a1aa', margin: '6px 0 0 0', fontSize: '13px' }}>円</p>
          </section>

          <section style={cardStyle()}>
            <p style={{ margin: '0 0 8px 0', fontSize: '24px' }}>📈</p>
            <p style={{ color: '#71717a', margin: '0 0 6px 0', fontSize: '12px' }}>
              平均燃費
            </p>
            <p style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>
              {isLoaded
                ? averageFuelEconomy !== null
                  ? averageFuelEconomy.toFixed(1)
                  : '-'
                : '...'}
            </p>
            <p style={{ color: '#a1a1aa', margin: '6px 0 0 0', fontSize: '13px' }}>
              km/L
            </p>
          </section>
        </div>

        <section style={{ marginBottom: '14px' }}>
          <p style={sectionLabelStyle()}>Latest Records</p>
          <div style={accentLineStyle()} />
        </section>

        <div
          style={{
            display: 'grid',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <section style={cardStyle()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: '#18181b',
                  border: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                ⛽
              </div>
              <div>
                <p style={sectionLabelStyle()}>Latest Fuel</p>
              </div>
            </div>

            {!isLoaded ? (
              <p style={{ color: '#a1a1aa', margin: 0 }}>読み込み中...</p>
            ) : latestFuel ? (
              <>
                <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
                  {latestFuel.date}
                </p>
                <p style={{ margin: '0 0 4px 0', color: '#e4e4e7' }}>
                  {latestFuel.odometer ?? '-'} km
                </p>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  {latestFuel.liters ?? '-'}L /{' '}
                  {latestFuel.price
                    ? `${Number(latestFuel.price).toLocaleString()}円`
                    : '-'}
                </p>
              </>
            ) : (
              <p style={{ color: '#a1a1aa', margin: 0 }}>記録がありません</p>
            )}
          </section>

          <section style={cardStyle()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: '#18181b',
                  border: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🧼
              </div>
              <div>
                <p style={sectionLabelStyle()}>Latest Wash</p>
              </div>
            </div>

            {!isLoaded ? (
              <p style={{ color: '#a1a1aa', margin: 0 }}>読み込み中...</p>
            ) : latestWash ? (
              <>
                <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
                  {latestWash.date}
                </p>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  {getWashLabel(latestWash)}
                </p>
              </>
            ) : (
              <p style={{ color: '#a1a1aa', margin: 0 }}>記録がありません</p>
            )}
          </section>

          <section style={cardStyle()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '14px',
                  background: '#18181b',
                  border: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🔧
              </div>
              <div>
                <p style={sectionLabelStyle()}>Latest Maintenance</p>
              </div>
            </div>

            {!isLoaded ? (
              <p style={{ color: '#a1a1aa', margin: 0 }}>読み込み中...</p>
            ) : latestMaintenance ? (
              <>
                <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
                  {latestMaintenance.date}
                </p>
                <p style={{ margin: '0 0 4px 0', color: '#e4e4e7' }}>
                  {latestMaintenance.menu ?? '-'}
                </p>
                <p style={{ margin: 0, color: '#a1a1aa' }}>
                  {latestMaintenance.price
                    ? `${Number(latestMaintenance.price).toLocaleString()}円`
                    : '価格未入力'}
                </p>
              </>
            ) : (
              <p style={{ color: '#a1a1aa', margin: 0 }}>記録がありません</p>
            )}
          </section>
        </div>

        <section style={{ marginBottom: '14px' }}>
          <p style={sectionLabelStyle()}>Recent Activity</p>
          <div style={accentLineStyle()} />
        </section>

        <section style={{ ...cardStyle(), marginBottom: '24px' }}>
          {!isLoaded ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>読み込み中...</p>
          ) : recentActivities.length === 0 ? (
            <p style={{ color: '#a1a1aa', margin: 0 }}>最近の記録がありません</p>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '16px',
                    border: '1px solid #27272a',
                    background: '#09090b',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: '#18181b',
                      border: '1px solid #27272a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                    }}
                  >
                    {activity.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700 }}>{activity.title}</p>
                    <p style={{ margin: '0 0 4px 0', color: '#a1a1aa', fontSize: '14px' }}>
                      {activity.subtitle}
                    </p>
                    <p style={{ margin: 0, color: '#71717a', fontSize: '13px' }}>
                      {activity.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ marginBottom: '14px' }}>
          <p style={sectionLabelStyle()}>Quick Access</p>
          <div style={accentLineStyle()} />
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}
        >
          <Link
            href="/fuel"
            style={{
              ...cardStyle(),
              textDecoration: 'none',
              color: '#fafafa',
              display: 'block',
              padding: '18px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: '#18181b',
                border: '1px solid #27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginBottom: '14px',
              }}
            >
              ⛽
            </div>
            <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
              給油記録
            </p>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
              給油量・価格・燃費
            </p>
          </Link>

          <Link
            href="/wash"
            style={{
              ...cardStyle(),
              textDecoration: 'none',
              color: '#fafafa',
              display: 'block',
              padding: '18px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: '#18181b',
                border: '1px solid #27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginBottom: '14px',
              }}
            >
              🧼
            </div>
            <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
              洗車記録
            </p>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
              洗車内容・施工メニュー
            </p>
          </Link>

          <Link
            href="/maintenance"
            style={{
              ...cardStyle(),
              textDecoration: 'none',
              color: '#fafafa',
              display: 'block',
              padding: '18px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: '#18181b',
                border: '1px solid #27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginBottom: '14px',
              }}
            >
              🔧
            </div>
            <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
              メンテ記録
            </p>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
              パーツ交換・費用管理
            </p>
          </Link>

          <Link
            href="/mileage"
            style={{
              ...cardStyle(),
              textDecoration: 'none',
              color: '#fafafa',
              display: 'block',
              padding: '18px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: '#18181b',
                border: '1px solid #27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                marginBottom: '14px',
              }}
            >
              📍
            </div>
            <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
              走行距離
            </p>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
              走行履歴・現在距離
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}