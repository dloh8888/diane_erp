'use client';

import { fmtSignedPct } from '../../lib/dashboard/format';

/** 증감율 표시 — ▲/▼ + 색. 원본 .delta 규칙 그대로입니다. */
export function Delta({ pct, note, className = '' }) {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return (
      <span className={'text-gray-400 font-normal ' + className}>
        — {note} (비교할 BAU 데이터 없음)
      </span>
    );
  }
  const up = pct >= 0;
  return (
    <span className={(up ? 'text-green-700' : 'text-red-500') + ' font-semibold ' + className}>
      {up ? '▲' : '▼'} {fmtSignedPct(pct)}
      {note && <span className="text-gray-400 font-normal ml-1">{note}</span>}
    </span>
  );
}

export function Card({ title, note, children, className = '' }) {
  return (
    <section className={'bg-white border border-gray-200 rounded-2xl p-5 ' + className}>
      {title && <div className="text-[13px] font-semibold text-gray-600">{title}</div>}
      {note && <div className="text-xs text-gray-400 mt-1 mb-4 leading-relaxed">{note}</div>}
      {!note && title && <div className="mb-4" />}
      {children}
    </section>
  );
}

/** 예산 사용율 막대 (원본 meter()) */
export function Meter({ pct }) {
  if (pct === null || pct === undefined || isNaN(pct)) return <span className="text-gray-400">—</span>;
  const over = pct > 100;
  const w = Math.max(0, Math.min(100, pct));
  return (
    <span className="inline-flex items-center gap-2 justify-end">
      <span className="inline-block w-14 h-1.5 rounded-full bg-blue-100 overflow-hidden">
        <span
          className={'block h-full rounded-full ' + (over ? 'bg-red-500' : 'bg-blue-600')}
          style={{ width: w + '%' }}
        />
      </span>
      <span className="tabular-nums">{pct.toFixed(1)}%</span>
    </span>
  );
}

const TILE_COLORS = [
  { bar: 'bg-blue-600', bg: 'bg-blue-50/70', border: 'border-blue-200' },
  { bar: 'bg-emerald-600', bg: 'bg-emerald-50/70', border: 'border-emerald-200' },
  { bar: 'bg-orange-500', bg: 'bg-orange-50/70', border: 'border-orange-200' },
  { bar: 'bg-violet-600', bg: 'bg-violet-50/70', border: 'border-violet-200' },
  { bar: 'bg-amber-500', bg: 'bg-amber-50/70', border: 'border-amber-200' },
  { bar: 'bg-pink-500', bg: 'bg-pink-50/70', border: 'border-pink-200' },
];

/** 상단 KPI 칸. hero 는 첫 칸(총 GMV)만 크게. */
export function Tile({ colorIndex = 0, label, value, sub, delta, hero = false }) {
  const c = TILE_COLORS[colorIndex % TILE_COLORS.length];
  return (
    <div className={'relative overflow-hidden rounded-2xl border p-5 ' + c.bg + ' ' + c.border}>
      <span className={'absolute left-0 top-0 bottom-0 w-1 ' + c.bar} />
      <div className="text-[13px] font-semibold text-gray-600 break-keep">{label}</div>
      <div className={'font-bold tracking-tight mt-1.5 whitespace-nowrap ' + (hero ? 'text-3xl' : 'text-[26px]')}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1.5">{sub}</div>}
      {delta !== undefined && <div className="text-[13px] mt-2">{delta}</div>}
    </div>
  );
}

/** 비어있을 때 안내 */
export function EmptyState({ children }) {
  return <div className="py-14 text-center text-gray-400 text-sm">{children}</div>;
}
