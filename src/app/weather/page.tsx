'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import SectionCard from '@/components/SectionCard';

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

type LocationMode = 'current' | 'favorite';

type WeatherPageState = {
  locationLabel: string;
  weatherDays: DailyWeather[];
  dustDays: AirDay[];
  error: string;
  loading: boolean;
};

const FAVORITES_STORAGE_KEY = 'weather-favorite-locations';

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

function getWindLabel(speed: number) {
  if (speed >= 10) return '強い';
  if (speed >= 6) return 'やや強い';
  if (speed >= 3) return 'ふつう';
  return '弱い';
}

function getDustLabel(dust: number | null) {
  if (dust === null) return 'データなし';
  if (dust >= 80) return '多い';
  if (dust >= 40) return 'やや多い';
  if (dust >= 20) return '少なめ';
  return '少ない';
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

function inputStyle() {
  return {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid #3f3f46',
    background: '#09090b',
    color: '#fafafa',
    outline: 'none',
    fontSize: '15px',
  } as const;
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

function saveFavorites(favorites: FavoriteLocation[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
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

export default function WeatherPage() {
  const [state, setState] = useState<WeatherPageState>({
    locationLabel: '取得中...',
    weatherDays: [],
    dustDays: [],
    error: '',
    loading: true,
  });

  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [locationMode, setLocationMode] = useState<LocationMode>('current');
  const [selectedFavoriteId, setSelectedFavoriteId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');

  useEffect(() => {
    const saved = loadFavorites();
    setFavorites(saved);
    if (saved.length > 0) {
      setSelectedFavoriteId(saved[0].id);
    }
  }, []);

  useEffect(() => {
    async function loadWeather() {
      try {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));

        if (locationMode === 'favorite' && selectedFavoriteId) {
          const favorite = favorites.find((item) => item.id === selectedFavoriteId);

          if (!favorite) {
            throw new Error('お気に入り地点が見つかりません');
          }

          const result = await fetchWeatherByCoords(
            favorite.latitude,
            favorite.longitude
          );

          setState({
            locationLabel: favorite.label || result.locationLabel,
            weatherDays: result.weatherDays,
            dustDays: result.dustDays,
            error: '',
            loading: false,
          });

          return;
        }

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

        const result = await fetchWeatherByCoords(latitude, longitude);

        setState({
          locationLabel: result.locationLabel,
          weatherDays: result.weatherDays,
          dustDays: result.dustDays,
          error: '',
          loading: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        setState((prev) => ({
          ...prev,
          error: message,
          loading: false,
        }));
      }
    }

    loadWeather();
  }, [locationMode, selectedFavoriteId, favorites]);

  const today = useMemo(() => {
    if (!state.weatherDays.length) return null;
    const day = state.weatherDays[0];
    const dust = state.dustDays.find((item) => item.date === day.date)?.dustMax ?? null;
    const recommendation = getWashRecommendation(day, dust);

    return {
      ...day,
      dustMax: dust,
      recommendation,
    };
  }, [state.weatherDays, state.dustDays]);

  function handleSaveFavorite() {
    const label = newLabel.trim();
    const latitude = Number(newLatitude);
    const longitude = Number(newLongitude);

    if (!label) {
      setFavoriteMessage('地点名を入れてください');
      return;
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setFavoriteMessage('緯度・経度を正しく入れてください');
      return;
    }

    const next: FavoriteLocation[] = [
      {
        id: String(Date.now()),
        label,
        latitude,
        longitude,
      },
      ...favorites,
    ];

    setFavorites(next);
    saveFavorites(next);
    setSelectedFavoriteId(next[0].id);
    setLocationMode('favorite');
    setNewLabel('');
    setNewLatitude('');
    setNewLongitude('');
    setFavoriteMessage('お気に入り地点を保存しました');
  }

  function handleDeleteFavorite(id: string) {
    const target = favorites.find((item) => item.id === id);
    if (!target) return;

    const ok = window.confirm(`${target.label} を削除しますか？`);
    if (!ok) return;

    const next = favorites.filter((item) => item.id !== id);
    setFavorites(next);
    saveFavorites(next);

    if (selectedFavoriteId === id) {
      setSelectedFavoriteId(next[0]?.id ?? '');
      setLocationMode(next.length > 0 ? 'favorite' : 'current');
    }

    setFavoriteMessage('お気に入り地点を削除しました');
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
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
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
          icon="☀️"
          englishLabel="Weather & Wash Guide"
          title="天気・洗車ガイド"
          description="現在地とお気に入り地点を切り替えて、天気と洗車おすすめ度を確認"
        />

        <SectionCard>
          <p style={sectionLabelStyle()}>Location Switch</p>
          <div style={accentLineStyle()} />

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
            <button
              onClick={() => setLocationMode('current')}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                border:
                  locationMode === 'current'
                    ? '1px solid #60a5fa'
                    : '1px solid #3f3f46',
                background: locationMode === 'current' ? '#172554' : '#09090b',
                color: locationMode === 'current' ? '#eff6ff' : '#fafafa',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              現在地
            </button>

            {favorites.map((favorite) => {
              const active =
                locationMode === 'favorite' && selectedFavoriteId === favorite.id;

              return (
                <div
                  key={favorite.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedFavoriteId(favorite.id);
                      setLocationMode('favorite');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: active ? '1px solid #60a5fa' : '1px solid #3f3f46',
                      background: active ? '#172554' : '#09090b',
                      color: active ? '#eff6ff' : '#fafafa',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    {favorite.label}
                  </button>

                  <button
                    onClick={() => handleDeleteFavorite(favorite.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #7f1d1d',
                      background: '#450a0a',
                      color: '#fecaca',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="地点名 例: 自宅 / 洗車場 / 会社"
              style={inputStyle()}
            />
            <input
              value={newLatitude}
              onChange={(e) => setNewLatitude(e.target.value)}
              placeholder="緯度 例: 38.3193"
              style={inputStyle()}
            />
            <input
              value={newLongitude}
              onChange={(e) => setNewLongitude(e.target.value)}
              placeholder="経度 例: 140.8811"
              style={inputStyle()}
            />

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleSaveFavorite}
                style={{
                  padding: '12px 16px',
                  borderRadius: '14px',
                  border: 'none',
                  background: '#fafafa',
                  color: '#09090b',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                お気に入り地点を追加
              </button>
            </div>

            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '13px' }}>
              例: 仙台市泉区付近なら 緯度 38.3193 / 経度 140.8811 あたり
            </p>

            {favoriteMessage ? (
              <p style={{ margin: 0, color: '#d4d4d8', fontSize: '14px' }}>
                {favoriteMessage}
              </p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard>
          <p style={sectionLabelStyle()}>Target Area</p>
          <div style={accentLineStyle()} />

          {state.loading ? (
            <p style={{ margin: '16px 0 0 0', color: '#a1a1aa' }}>
              取得地域を確認中...
            </p>
          ) : state.error ? (
            <p style={{ margin: '16px 0 0 0', color: '#fca5a5' }}>
              取得地域の表示に失敗しました
            </p>
          ) : (
            <>
              <p style={{ margin: '16px 0 0 0', fontSize: '20px', fontWeight: 700 }}>
                取得地域: {state.locationLabel}
              </p>
              <p style={{ margin: '8px 0 0 0', color: '#a1a1aa' }}>
                {locationMode === 'current'
                  ? '現在地ベースで天気情報を取得しています'
                  : 'お気に入り地点ベースで天気情報を取得しています'}
              </p>
            </>
          )}
        </SectionCard>

        <SectionCard>
          <p style={sectionLabelStyle()}>Today&apos;s Wash Score</p>
          <div style={accentLineStyle()} />

          {state.loading ? (
            <p style={{ marginTop: '16px', color: '#a1a1aa' }}>読み込み中...</p>
          ) : state.error ? (
            <p style={{ marginTop: '16px', color: '#fca5a5' }}>
              天気の取得に失敗しました: {state.error}
            </p>
          ) : today ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '14px',
                marginTop: '16px',
              }}
            >
              <div style={cardStyle()}>
                <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                  今日のおすすめ度
                </p>

                <div
                  style={{
                    display: 'inline-block',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${getRecommendationStyle(today.recommendation.level).border}`,
                    background: getRecommendationStyle(today.recommendation.level).background,
                    color: getRecommendationStyle(today.recommendation.level).text,
                    fontSize: '28px',
                    fontWeight: 800,
                    marginBottom: '10px',
                  }}
                >
                  {today.recommendation.label}
                </div>

                <p style={{ margin: '0', color: '#a1a1aa' }}>
                  {today.recommendation.reason}
                </p>
              </div>

              <div style={cardStyle()}>
                <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                  今日の条件
                </p>
                <p style={{ margin: '0 0 6px 0' }}>
                  天気: {getWeatherIcon(today.weatherCode)} {getWeatherLabel(today.weatherCode)}
                </p>
                <p style={{ margin: '0 0 6px 0' }}>
                  降水確率: {today.precipitationProbabilityMax}%
                </p>
                <p style={{ margin: '0 0 6px 0' }}>
                  風: {today.windSpeedMax} m/s（{getWindLabel(today.windSpeedMax)}）
                </p>
                <p style={{ margin: 0 }}>
                  黄砂参考: {getDustLabel(today.dustMax)}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ marginTop: '16px', color: '#a1a1aa' }}>データがありません</p>
          )}
        </SectionCard>

        <SectionCard marginBottom="0">
          <p style={sectionLabelStyle()}>14-Day Forecast</p>
          <div style={accentLineStyle()} />

          {state.loading ? (
            <p style={{ marginTop: '16px', color: '#a1a1aa' }}>読み込み中...</p>
          ) : state.error ? (
            <p style={{ marginTop: '16px', color: '#fca5a5' }}>
              天気の取得に失敗しました: {state.error}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
              {state.weatherDays.map((day) => {
                const dust =
                  state.dustDays.find((item) => item.date === day.date)?.dustMax ?? null;
                const recommendation = getWashRecommendation(day, dust);
                const recommendationStyle = getRecommendationStyle(recommendation.level);

                return (
                  <div
                    key={day.date}
                    style={{
                      ...cardStyle(),
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1fr 1fr',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <p style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 700 }}>
                          {getWeatherIcon(day.weatherCode)} {day.date}
                        </p>
                        <p style={{ margin: 0, color: '#a1a1aa', fontSize: '16px' }}>
                          {getWeatherIcon(day.weatherCode)} {getWeatherLabel(day.weatherCode)}
                        </p>
                      </div>

                      <div>
                        <p style={{ margin: '0 0 6px 0', color: '#71717a', fontSize: '12px' }}>
                          気温 / 降水
                        </p>
                        <p style={{ margin: '0 0 4px 0' }}>
                          {day.tempMax}° / {day.tempMin}°
                        </p>
                        <p style={{ margin: 0, color: '#a1a1aa' }}>
                          {day.precipitationProbabilityMax}%
                        </p>
                      </div>

                      <div>
                        <p style={{ margin: '0 0 6px 0', color: '#71717a', fontSize: '12px' }}>
                          風 / 黄砂 / 洗車
                        </p>
                        <p style={{ margin: '0 0 4px 0' }}>
                          {day.windSpeedMax} m/s（{getWindLabel(day.windSpeedMax)}）
                        </p>
                        <p style={{ margin: '0 0 8px 0', color: '#a1a1aa' }}>
                          黄砂参考: {getDustLabel(dust)}
                        </p>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '6px 10px',
                            borderRadius: '12px',
                            border: `1px solid ${recommendationStyle.border}`,
                            background: recommendationStyle.background,
                            color: recommendationStyle.text,
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          {recommendation.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}