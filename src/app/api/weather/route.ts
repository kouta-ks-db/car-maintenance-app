import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'latitude と longitude が必要です' },
        { status: 400 }
      );
    }

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
      `&forecast_days=14&timezone=Asia%2FTokyo`;

    const airUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
      `&hourly=dust&forecast_days=5&timezone=Asia%2FTokyo`;

    const geocodeUrl =
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=ja`;

    const [weatherRes, airRes, geoRes] = await Promise.all([
      fetch(weatherUrl, { cache: 'no-store' }),
      fetch(airUrl, { cache: 'no-store' }),
      fetch(geocodeUrl, { cache: 'no-store' }),
    ]);

    if (!weatherRes.ok) {
      return NextResponse.json(
        { error: '天気情報の取得に失敗しました' },
        { status: 502 }
      );
    }

    if (!airRes.ok) {
      return NextResponse.json(
        { error: '大気情報の取得に失敗しました' },
        { status: 502 }
      );
    }

    const weatherJson = await weatherRes.json();
    const airJson = await airRes.json();

    let locationLabel = '現在地';

    if (geoRes.ok) {
      const geoJson = await geoRes.json();
      const first = geoJson?.results?.[0];

      if (first) {
        locationLabel =
          [first.name, first.admin1].filter(Boolean).join(' / ') || '現在地';
      }
    }

    return NextResponse.json({
      locationLabel,
      weather: weatherJson,
      air: airJson,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unknown error';

    return NextResponse.json(
      { error: `weather api route failed: ${message}` },
      { status: 500 }
    );
  }
}