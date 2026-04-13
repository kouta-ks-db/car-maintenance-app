'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AppHeaderCard from '@/components/AppHeaderCard';
import SectionCard from '@/components/SectionCard';

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

const quickRatios = [10, 20, 50, 100];

export default function DilutionPage() {
  const [totalAmount, setTotalAmount] = useState('500');
  const [ratio, setRatio] = useState('20');

  const total = Number(totalAmount);
  const dilutionRatio = Number(ratio);

  const hasError =
    !totalAmount ||
    !ratio ||
    Number.isNaN(total) ||
    Number.isNaN(dilutionRatio) ||
    total <= 0 ||
    dilutionRatio <= 0;

  const result = useMemo(() => {
    if (hasError) {
      return {
        concentrate: 0,
        water: 0,
      };
    }

    const concentrate = total / dilutionRatio;
    const water = total - concentrate;

    return {
      concentrate,
      water,
    };
  }, [hasError, total, dilutionRatio]);

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
          icon="🧪"
          englishLabel="Dilution Calculator"
          title="希釈計算機"
          description="洗剤やケミカルの希釈倍率から、必要な原液量と水量を計算"
        />

        <SectionCard>
          <h2 style={{ fontSize: '20px', margin: '0 0 18px 0' }}>
            希釈条件を入力
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={labelStyle()}>作りたい総量 (ml)</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="例: 500"
                style={inputStyle(hasError && (!totalAmount || total <= 0))}
              />
            </div>

            <div>
              <label style={labelStyle()}>希釈倍率</label>
              <input
                type="number"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                placeholder="例: 20"
                style={inputStyle(hasError && (!ratio || dilutionRatio <= 0))}
              />
              <p
                style={{
                  margin: '8px 0 0 0',
                  color: '#71717a',
                  fontSize: '13px',
                }}
              >
                例: 20倍なら「20」を入力
              </p>
            </div>
          </div>

          <div style={{ marginTop: '18px' }}>
            <p style={labelStyle()}>よく使う倍率</p>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {quickRatios.map((item) => {
                const active = Number(ratio) === item;

                return (
                  <button
                    key={item}
                    onClick={() => setRatio(String(item))}
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
                    {item}倍
                  </button>
                );
              })}
            </div>
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
            Calculation Result
          </p>

          {hasError ? (
            <p style={{ margin: 0, color: '#fca5a5' }}>
              総量と希釈倍率に 0 より大きい数値を入力してください
            </p>
          ) : (
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
                  borderRadius: '16px',
                  border: '1px solid #27272a',
                  background: '#09090b',
                }}
              >
                <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                  原液
                </p>
                <p style={{ margin: 0, fontSize: '30px', fontWeight: 800 }}>
                  {result.concentrate.toFixed(1)}
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '14px',
                      color: '#a1a1aa',
                    }}
                  >
                    ml
                  </span>
                </p>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #27272a',
                  background: '#09090b',
                }}
              >
                <p style={{ margin: '0 0 8px 0', color: '#71717a', fontSize: '12px' }}>
                  水
                </p>
                <p style={{ margin: 0, fontSize: '30px', fontWeight: 800 }}>
                  {result.water.toFixed(1)}
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '14px',
                      color: '#a1a1aa',
                    }}
                  >
                    ml
                  </span>
                </p>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard marginBottom="0">
          <p
            style={{
              margin: '0 0 10px 0',
              color: '#71717a',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Example
          </p>

          <div
            style={{
              borderRadius: '16px',
              border: '1px solid #27272a',
              background: '#09090b',
              padding: '16px',
            }}
          >
            <p style={{ margin: '0 0 8px 0', color: '#e4e4e7' }}>
              たとえば 500ml を 20倍希釈で作る場合
            </p>
            <p style={{ margin: '0 0 4px 0', color: '#a1a1aa' }}>
              原液: 25.0ml
            </p>
            <p style={{ margin: 0, color: '#a1a1aa' }}>
              水: 475.0ml
            </p>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}