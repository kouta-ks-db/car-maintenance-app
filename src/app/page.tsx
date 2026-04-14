'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type FuelRecord = {
  id: number;
  docId?: string;
  date: string;
  odometer?: string;
  liters?: string;
  price?: string;
};

type WashRecord = {
  id: number;
  docId?: string;
  date: string;
  menu?: string;
  menus?: string[];
  memo?: string;
  image?: string;
  products?: string;
};

type MaintenanceRecord = {
  id: number;
  docId?: string;
  date: string;
  menu?: string;
  price?: string;
  memo?: string;
};

type MileageRecord = {
  id: number;
  docId?: string;
  date: string;
  distance?: string;
  memo?: string;
};

type RecentActivity = {
  id: string;
  date: string;
  category: 'fuel' | 'wash' | 'maintenance';
  title: string;
  subtitle: string;
  icon: string;
};

type FirestoreFuelRecord = {
  id?: number;
  date?: string;
  odometer?: string;
  liters?: string;
  price?: string;
};

type FirestoreWashRecord = {
  id?: number;
  date?: string;
  menu?: string;
  menus?: string[];
  memo?: string;
  image?: string | null;
  products?: string;
};

type FirestoreMaintenanceRecord = {
  id?: number;
  date?: string;
  menu?: string;
  price?: string;
  memo?: string;
};

type FirestoreMileageRecord = {
  id?: number;
  date?: string;
  distance?: string;
  memo?: string;
};

type DailyWeather = {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
};

type AirDay = {
  date: string;
  dustMax: number | null;
};

type RecommendationLevel = 'great' | 'good' | 'caution' | 'bad';

type WashRecommendation = {
  label: string;
  reason: string;
  level: RecommendationLevel;
};

type FavoriteLocation = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

type SelectedLocationState =
  | 'current'
  | {
      mode: 'favorite';
      id: string;
    };

type WeatherDashboardState = {
  locationLabel: string;
  today: (DailyWeather & {
    dustMax: number | null;
    recommendation: WashRecommendation;
  }) | null;
  bestDay: (DailyWeather & {
    dustMax: number | null;
    recommendation: WashRecommendation;
  }) | null;
  loading: boolean;
  error: string;
};

const FAVORITES_STORAGE_KEY = 'weather-favorite-locations';
const SELECTED_LOCATION_KEY = 'weather-selected-location';

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

function getWeatherLabel(code: number) {
  if (code === 0) return '快晴';
  if ([1].includes(code)) return '晴れ';
  if ([2].includes(code)) return '晴れ時々くもり';
  if ([3].includes(code)) return 'くもり';
  if ([45, 48].includes(code)) return '霧';
  if ([51, 53, 55, 56, 57].includes(code)) return '霧雨';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '雨';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天気不明';
}

function getWeatherIcon(code: number) {
  if (code === 0) return '☀️';
  if ([1].includes(code)) return '🌤️';
  if ([2].includes(code)) return '⛅';
  if ([3].includes(code)) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '❓';
}

function getWashRecommendation(day: DailyWeather, dustMax: number | null): WashRecommendation {
  const rain = day.precipitationProbabilityMax ?? 0;
  const wind = day.windSpeedMax ?? 0;
  const dust = dustMax ?? 0;

  if (rain >= 60 || wind >= 10 || dust >= 80) {
    return {
      label: '× 見送り推奨',
      reason: '雨・強風・粉じんのいずれかが強め',
      level: 'bad',
    };
  }

  if (rain >= 40 || wind >= 7 || dust >= 40) {
    return {
      label: '△ 条件つき',
      reason: '少し様子見したい条件',
      level: 'caution',
    };
  }

  if (rain <= 20 && wind <= 4 && dust < 20) {
    return {
      label: '◎ かなりおすすめ',
      reason: '乾きやすく、汚れ戻りもしにくい',
      level: 'great',
    };
  }

  return {
    label: '○ おすすめ',
    reason: '大きな問題はなさそう',
    level: 'good',
  };
}

function getRecommendationStyle(level: RecommendationLevel) {
  if (level === 'great') {
    return {
      text: '#bfdbfe',
      border: '#1d4ed8',
      background: '#172554',
    };
  }

  if (level === 'good') {
    return {
      text: '#f4f4f5',
      border: '#3f3f46',
      background: '#18181b',
    };
  }

  if (level === 'caution') {
    return {
      text: '#fde68a',
      border: '#a16207',
      background: '#422006',
    };
  }

  return {
    text: '#fecaca',
    border: '#991b1b',
    background: '#450a0a',
  };
}

function getRecommendationScore(day: DailyWeather, dustMax: number | null) {
  const rain = day.precipitationProbabilityMax ?? 0;
  const wind = day.windSpeedMax ?? 0;
  const dust = dustMax ?? 0;

  let score = 100;
  score -= rain * 0.8;
  score -= wind * 5;
  score -= dust * 0.4;

  return score;
}

function loadFavorites(): FavoriteLocation[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteLocation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadSelectedLocation(): SelectedLocationState {
  if (typeof window === 'undefined') return 'current';

  try {
    const raw = window.localStorage.getItem(SELECTED_LOCATION_KEY);
    if (!raw || raw === 'current') return 'current';

    const parsed = JSON.parse(raw) as { mode?: string; id?: string };

    if (parsed?.mode === 'favorite' && typeof parsed.id === 'string') {
      return {
        mode: 'favorite',
        id: parsed.id,
      };
    }

    return 'current';
  } catch {
    return 'current';
  }
}

async function fetchWeatherByCoords(latitude: number, longitude: number): Promise<{
  locationLabel: string;
  weatherDays: DailyWeather[];
  dustDays: AirDay[];
}> {
  const res = await fetch(
    `/api/weather?latitude=${latitude}&longitude=${longitude}`,
    { cache: 'no-store' }
  );

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error ?? '天気情報の取得に失敗しました');
  }

  const weatherJson = json.weather;
  const airJson = json.air;
  const locationLabel = json.locationLabel ?? '現在地';

  const weatherDays: DailyWeather[] = (weatherJson.daily.time as string[]).map(
    (date: string, index: number) => ({
      date,
      weatherCode: weatherJson.daily.weather_code[index],
      tempMax: weatherJson.daily.temperature_2m_max[index],
      tempMin: weatherJson.daily.temperature_2m_min[index],
      precipitationProbabilityMax:
        weatherJson.daily.precipitation_probability_max[index],
      windSpeedMax: weatherJson.daily.wind_speed_10m_max[index],
    })
  );

  const dustByDay = new Map<string, number | null>();
  const hourlyTimes: string[] = airJson?.hourly?.time ?? [];
  const hourlyDust: (number | null)[] = airJson?.hourly?.dust ?? [];

  hourlyTimes.forEach((time, index) => {
    const day = time.slice(0, 10);
    const dust = hourlyDust[index];

    if (dust == null) {
      if (!dustByDay.has(day)) {
        dustByDay.set(day, null);
      }
      return;
    }

    const current = dustByDay.get(day);
    if (current == null || dust > current) {
      dustByDay.set(day, dust);
    }
  });

  const dustDays: AirDay[] = weatherDays.map((day) => ({
    date: day.date,
    dustMax: dustByDay.get(day.date) ?? null,
  }));

  return {
    locationLabel,
    weatherDays,
    dustDays,
  };
}

export default function HomePage() {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [washRecords, setWashRecords] = useState<WashRecord[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [mileageRecords, setMileageRecords] = useState<MileageRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [weatherDashboard, setWeatherDashboard] = useState<WeatherDashboardState>({
    locationLabel: '取得中...',
    today: null,
    bestDay: null,
    loading: true,
    error: '',
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const { db, collection, getDocs } = await getFirebaseModules();

        const [fuelSnapshot, washSnapshot, maintenanceSnapshot, mileageSnapshot] =
          await Promise.all([
            getDocs(collection(db, 'fuelRecords')),
            getDocs(collection(db, 'washRecords')),
            getDocs(collection(db, 'maintenanceRecords')),
            getDocs(collection(db, 'mileageRecords')),
          ]);

        const loadedFuelRecords: FuelRecord[] = !fuelSnapshot.empty
          ? fuelSnapshot.docs
              .map((docItem, index) => {
                const data = docItem.data() as FirestoreFuelRecord;
                return {
                  id: typeof data.id === 'number' ? data.id : Date.now() + index,
                  docId: docItem.id,
                  date: data.date ?? '',
                  odometer: data.odometer ?? '',
                  liters: data.liters ?? '',
                  price: data.price ?? '',
                };
              })
              .filter((record) => record.date)
          : DEFAULT_FUEL_RECORDS;

        const loadedWashRecords: WashRecord[] = !washSnapshot.empty
          ? washSnapshot.docs
              .map((docItem, index) => {
                const data = docItem.data() as FirestoreWashRecord;
                return {
                  id: typeof data.id === 'number' ? data.id : Date.now() + index + 1000,
                  docId: docItem.id,
                  date: data.date ?? '',
                  menu: data.menu ?? '',
                  menus: Array.isArray(data.menus) ? data.menus : [],
                  memo: data.memo ?? '',
                  image: data.image ?? undefined,
                  products: data.products ?? '',
                };
              })
              .filter((record) => record.date)
          : DEFAULT_WASH_RECORDS;

        const loadedMaintenanceRecords: MaintenanceRecord[] = !maintenanceSnapshot.empty
          ? maintenanceSnapshot.docs
              .map((docItem, index) => {
                const data = docItem.data() as FirestoreMaintenanceRecord;
                return {
                  id: typeof data.id === 'number' ? data.id : Date.now() + index + 2000,
                  docId: docItem.id,
                  date: data.date ?? '',
                  menu: data.menu ?? '',
                  price: data.price ?? '',
                  memo: data.memo ?? '',
                };
              })
              .filter((record) => record.date)
          : DEFAULT_MAINTENANCE_RECORDS;

        const loadedMileageRecords: MileageRecord[] = !mileageSnapshot.empty
          ? mileageSnapshot.docs
              .map((docItem, index) => {
                const data = docItem.data() as FirestoreMileageRecord;
                return {
                  id: typeof data.id === 'number' ? data.id : Date.now() + index + 3000,
                  docId: docItem.id,
                  date: data.date ?? '',
                  distance: data.distance ?? '',
                  memo: data.memo ?? '',
                };
              })
              .filter((record) => record.date)
          : DEFAULT_MILEAGE_RECORDS;

        setFuelRecords(loadedFuelRecords);
        setWashRecords(loadedWashRecords);
        setMaintenanceRecords(loadedMaintenanceRecords);
        setMileageRecords(loadedMileageRecords);
      } catch (error) {
        console.error('ダッシュボードのFirebase読み込みに失敗しました:', error);
        setFuelRecords(DEFAULT_FUEL_RECORDS);
        setWashRecords(DEFAULT_WASH_RECORDS);
        setMaintenanceRecords(DEFAULT_MAINTENANCE_RECORDS);
        setMileageRecords(DEFAULT_MILEAGE_RECORDS);
      } finally {
        setIsLoaded(true);
      }
    }

    loadDashboardData();
  }, []);

  useEffect(() => {
    async function loadWeatherDashboard() {
      try {
        const selected = loadSelectedLocation();

        let result: Awaited<ReturnType<typeof fetchWeatherByCoords>> | null = null;
        let displayLabel = '現在地';

        if (selected !== 'current') {
          const favorites = loadFavorites();
          const favorite = favorites.find((item) => item.id === selected.id);

          if (favorite) {
            result = await fetchWeatherByCoords(favorite.latitude, favorite.longitude);
            displayLabel = favorite.label || result.locationLabel;
          }
        }

        if (!result) {
          if (!navigator.geolocation) {
            throw new Error('位置情報が使えません');
          }

          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 1000 * 60 * 10,
            });
          });

          const { latitude, longitude } = position.coords;
          result = await fetchWeatherByCoords(latitude, longitude);
          displayLabel = result.locationLabel;
        }

        const mergedDays = result.weatherDays.map((day) => {
          const dust = result!.dustDays.find((item) => item.date === day.date)?.dustMax ?? null;
          const recommendation = getWashRecommendation(day, dust);

          return {
            ...day,
            dustMax: dust,
            recommendation,
          };
        });

        const today = mergedDays[0] ?? null;
        const bestDay =
          [...mergedDays].sort(
            (a, b) => getRecommendationScore(b, b.dustMax) - getRecommendationScore(a, a.dustMax)
          )[0] ?? null;

        setWeatherDashboard({
          locationLabel: displayLabel,
          today,
          bestDay,
          loading: false,
          error: '',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';

        setWeatherDashboard({
          locationLabel: '取得失敗',
          today: null,
          bestDay: null,
          loading: false,
          error: message,
        });
      }
    }

    loadWeatherDashboard();

    const onFocus = () => {
      loadWeatherDashboard();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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
          <p style={sectionLabelStyle()}>☀️ Wash Weather Dashboard</p>
          <div style={accentLineStyle()} />

          {weatherDashboard.loading ? (
            <p style={{ marginTop: '16px', color: '#a1a1aa' }}>天気情報を取得中...</p>
          ) : weatherDashboard.error ? (
            <p style={{ marginTop: '16px', color: '#fca5a5' }}>
              天気取得に失敗しました: {weatherDashboard.error}
            </p>
          ) : (
            <div style={{ marginTop: '16px', display: 'grid', gap: '14px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '18px',
                  border: '1px solid #27272a',
                  background: '#09090b',
                }}
              >
                <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                  取得地域
                </p>
                <p style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
                  📍 {weatherDashboard.locationLabel}
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '18px',
                    border: `1px solid ${
                      weatherDashboard.today
                        ? getRecommendationStyle(weatherDashboard.today.recommendation.level).border
                        : '#27272a'
                    }`,
                    background: weatherDashboard.today
                      ? getRecommendationStyle(weatherDashboard.today.recommendation.level).background
                      : '#09090b',
                  }}
                >
                  <p style={{ margin: '0 0 8px 0', color: '#a1a1aa', fontSize: '12px' }}>
                    今日の洗車おすすめ度
                  </p>

                  {weatherDashboard.today ? (
                    <>
                      <p
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '26px',
                          fontWeight: 800,
                          color: getRecommendationStyle(
                            weatherDashboard.today.recommendation.level
                          ).text,
                        }}
                      >
                        {weatherDashboard.today.recommendation.label}
                      </p>
                      <p style={{ margin: '0 0 6px 0', color: '#e4e4e7' }}>
                        {getWeatherIcon(weatherDashboard.today.weatherCode)}{' '}
                        {getWeatherLabel(weatherDashboard.today.weatherCode)}
                      </p>
                      <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
                        {weatherDashboard.today.recommendation.reason}
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: 0, color: '#a1a1aa' }}>データがありません</p>
                  )}
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '18px',
                    border: '1px solid #27272a',
                    background: '#09090b',
                  }}
                >
                  <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                    次の洗車向き日
                  </p>

                  {weatherDashboard.bestDay ? (
                    <>
                      <p style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800 }}>
                        {weatherDashboard.bestDay.date}
                      </p>
                      <p style={{ margin: '0 0 6px 0', color: '#e4e4e7' }}>
                        {getWeatherIcon(weatherDashboard.bestDay.weatherCode)}{' '}
                        {getWeatherLabel(weatherDashboard.bestDay.weatherCode)}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          color: getRecommendationStyle(
                            weatherDashboard.bestDay.recommendation.level
                          ).text,
                          fontWeight: 700,
                        }}
                      >
                        {weatherDashboard.bestDay.recommendation.label}
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: 0, color: '#a1a1aa' }}>データがありません</p>
                  )}
                </div>
              </div>

              <div>
                <Link
                  href="/weather"
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
                  天気ガイドを見る
                </Link>
              </div>
            </div>
          )}
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

          <Link
            href="/weather"
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
              ☀️
            </div>
            <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
              天気ガイド
            </p>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
              2週間天気・風・黄砂・洗車おすすめ度
            </p>
          </Link>

          <Link
            href="/dilution"
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
              🧪
            </div>
            <p style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
              希釈計算機
            </p>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '14px' }}>
              洗剤やケミカルの希釈量をすぐ計算
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}