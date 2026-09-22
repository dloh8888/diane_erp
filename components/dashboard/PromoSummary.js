'use client';

import Link from 'next/link';
import { Delta } from './ui';
import { fmtCompact, fmtFull, fmtNum, fmtSignedPct } from '../../lib/dashboard/format';

/**
 * 캘린더 아래에 붙는 프로모션 실적 요약.
 * 업로드한 실적 엑셀(일별실적)을 기준으로 계산합니다.
 *
 * 보여주는 것
 *   - Gmarket Day 총 GMV / BAU 총 GMV / BAU 대비 증감율 / Gmarket Day 총 주문건수
 *   - 국가별 일 GMV (Gmarket Day vs BAU)
 */

function SummaryTile({ label, value, sub, delta, accent }) {
  return (
    <div className={'relative overflow-hidden rounded-xl border p-4 ' + accent}>
      <div className="text-xs font-semibold text-gray-600 break-keep">{label}</div>
      <div className="text-2xl font-bold tracking-tight mt-1.5 whitespace-nowrap">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-1">{sub}</div>}
      {delta && <div className="text-xs mt-1.5">{delta}</div>}
    </div>
  );
}

/** 국가별 일 GMV — Gmarket Day 와 BAU 를 나란히 */
function CountryDailyGmv({ rows, currency }) {
  const max = Math.max(...rows.map((r) => Math.max(r.gdDailyGmv || 0, r.bauDailyGmv || 0)), 1);

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.country}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-[13px] font-semibold">{r.country}</span>
            <span className="text-xs text-gray-400">
              <span className="text-gray-700 font-semibold tabular-nums">{fmtCompact(r.gdDailyGmv, currency)}</span>
              <span className="mx-1.5 text-gray-300">vs</span>
              <span className="tabular-nums">{fmtCompact(r.bauDailyGmv, currency)}</span>
              <span className="ml-2">
                {r.growthPct === null || r.growthPct === undefined ? (
                  '—'
                ) : (
                  <span className={r.growthPct >= 0 ? 'text-green-700 font-semibold' : 'text-red-500 font-semibold'}>
                    {r.growthPct >= 0 ? '▲' : '▼'} {fmtSignedPct(r.growthPct)}
                  </span>
                )}
              </span>
            </span>
          </div>
          {/* 위: Gmarket Day, 아래: BAU */}
          <div className="space-y-1">
            <div className="h-2.5 rounded bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded bg-blue-600"
                style={{ width: ((r.gdDailyGmv || 0) / max) * 100 + '%' }}
                title={'Gmarket Day 일평균 ' + fmtFull(r.gdDailyGmv, currency)}
              />
            </div>
            <div className="h-2.5 rounded bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded bg-orange-400"
                style={{ width: ((r.bauDailyGmv || 0) / max) * 100 + '%' }}
                title={'BAU 일평균 ' + fmtFull(r.bauDailyGmv, currency)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PromoSummary({ data }) {
  // 아직 실적 엑셀을 안 올린 상태
  if (!data || data.isEmpty) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">프로모션 실적 요약</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              실적 엑셀을 올리면 이 자리에 Gmarket Day / BAU 비교와 국가별 일 GMV가 자동으로 나옵니다.
            </p>
          </div>
          <Link
            href="/dashboard/import"
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            실적 엑셀 업로드
          </Link>
        </div>
      </section>
    );
  }

  const s = data.summary;
  const currency = s.currency;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <div>
          <h2 className="text-base font-semibold text-gray-800">프로모션 실적 요약</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {data.period.dataFirst} ~ {data.period.dataLast} 기준 · {data.byCountry.length}개국 ·
            {' '}증감율은 <b className="text-gray-600 font-semibold">국가별 일평균</b> 기준 BAU 대비
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap"
          >
            자세히 보기
          </Link>
          <Link
            href="/dashboard/import"
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            실적 엑셀 업로드
          </Link>
        </div>
      </div>

      {/* 요약 4칸 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 mb-5">
        <SummaryTile
          label="Gmarket Day 총 GMV"
          value={fmtCompact(s.gdTotalGmv, currency)}
          sub={fmtFull(s.gdTotalGmv, currency)}
          accent="bg-blue-50/70 border-blue-200"
        />
        <SummaryTile
          label="BAU 총 GMV"
          value={fmtCompact(s.bauTotalGmv, currency)}
          sub={fmtFull(s.bauTotalGmv, currency)}
          accent="bg-orange-50/70 border-orange-200"
        />
        <SummaryTile
          label="BAU 대비 증감율"
          value={fmtSignedPct(s.gmvGrowthPct)}
          sub={
            '일평균 ' + fmtCompact(s.gdDailyGmv, currency) + ' vs ' + fmtCompact(s.bauDailyGmv, currency)
          }
          delta={<Delta pct={s.gmvGrowthPct} note="일평균 GMV 기준" />}
          accent={
            s.gmvGrowthPct === null || s.gmvGrowthPct === undefined
              ? 'bg-gray-50 border-gray-200'
              : s.gmvGrowthPct >= 0
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-red-50/70 border-red-200'
          }
        />
        <SummaryTile
          label="Gmarket Day 총 주문건수"
          value={fmtNum(s.gdTotalOrders) + '건'}
          sub={'BAU ' + fmtNum(s.bauTotalOrders) + '건'}
          delta={<Delta pct={s.ordersGrowthPct} note="BAU 대비" />}
          accent="bg-violet-50/70 border-violet-200"
        />
      </div>

      {/* 국가별 일 GMV */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <div className="text-[13px] font-semibold text-gray-700">국가별 일 GMV</div>
          <div className="flex gap-3.5 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />Gmarket Day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" />BAU
            </span>
          </div>
        </div>
        <CountryDailyGmv rows={data.byCountry} currency={currency} />
      </div>
    </section>
  );
}
