'use client';

import { Card, Delta, Meter } from './ui';
import { fmtFull, fmtCompact, fmtPct, fmtSignedPct } from '../../lib/dashboard/format';

/** 국가별 일평균 GMV 비교 막대 (Gmarket Day vs BAU) — 원본 renderChart 대응 */
function CountryChart({ rows, currency }) {
  const max = Math.max(...rows.map((r) => Math.max(r.gdDailyGmv || 0, r.bauDailyGmv || 0)), 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex items-end gap-2 h-[240px] border-b border-gray-300 pt-6">
          {rows.map((r) => {
            const up = r.growthPct !== null && r.growthPct >= 0;
            return (
              <div key={r.country} className="flex-1 h-full flex flex-col justify-end items-center relative">
                <div
                  className={
                    'absolute top-0 left-0 right-0 text-center text-[11px] font-semibold whitespace-nowrap ' +
                    (r.growthPct === null ? 'text-gray-400 font-normal' : up ? 'text-green-700' : 'text-red-500')
                  }
                >
                  {r.growthPct === null ? '—' : (up ? '▲ ' : '▼ ') + fmtSignedPct(r.growthPct)}
                </div>
                <div className="flex items-end justify-center gap-0.5 w-full h-full">
                  <div
                    className="w-6 rounded-t bg-blue-600"
                    style={{ height: ((r.gdDailyGmv || 0) / max) * 100 + '%' }}
                    title={'Gmarket Day 일평균 ' + fmtFull(r.gdDailyGmv, currency)}
                  />
                  <div
                    className="w-6 rounded-t bg-orange-500"
                    style={{ height: ((r.bauDailyGmv || 0) / max) * 100 + '%' }}
                    title={'BAU 일평균 ' + fmtFull(r.bauDailyGmv, currency)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 pt-2">
          {rows.map((r) => (
            <div key={r.country} className="flex-1 text-center text-xs text-gray-600">
              {r.country}
              <div className="text-[10px] text-gray-400 tabular-nums">{fmtCompact(r.gdDailyGmv, currency)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 국가별 상세 표 — 원본 renderTable 의 칸 구성을 그대로 유지했습니다.
 * 다만 방문자수·예산이 아직 시트에 없으면 그 칸은 숨깁니다 ('—' 만 줄줄이 나오지 않도록).
 */
function CountryTable({ rows, summary, currency, showConversion, showBudget }) {
  const totalGd = rows.reduce((s, r) => s + r.gdGmv, 0);
  const totalK = rows.reduce((s, r) => s + r.kbrandGmv, 0);
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
  const totalVisitors = rows.reduce((s, r) => s + r.visitors, 0);
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);

  const th = 'py-2.5 px-2.5 text-right font-medium text-gray-400 text-xs whitespace-nowrap';
  const td = 'py-2.5 px-2.5 text-right tabular-nums border-b border-gray-100 whitespace-nowrap';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] min-w-[860px]">
        <thead>
          <tr>
            <th className={th + ' text-left'}>국가</th>
            <th className={th}>Gmarket Day 일평균 GMV</th>
            <th className={th}>BAU 일평균 GMV</th>
            <th className={th}>증감율</th>
            <th className={th}>Gmarket Day GMV</th>
            <th className={th}>K브랜드 GMV</th>
            <th className={th}>K브랜드 비중</th>
            {showConversion && <th className={th}>전환율</th>}
            {showBudget && <th className={th}>예산 사용율</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.country}>
              <td className={td + ' text-left'}>{r.country}</td>
              <td className={td}>{fmtFull(r.gdDailyGmv, currency)}</td>
              <td className={td}>{fmtFull(r.bauDailyGmv, currency)}</td>
              <td className={td}><Delta pct={r.growthPct} /></td>
              <td className={td}>{fmtFull(r.gdGmv, currency)}</td>
              <td className={td}>{fmtFull(r.kbrandGmv, currency)}</td>
              <td className={td}>{fmtPct(r.kbrandShare)}</td>
              {showConversion && <td className={td}>{fmtPct(r.conversionPct, 2)}</td>}
              {showBudget && <td className={td}><Meter pct={r.budgetUsedPct} /></td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold border-t border-gray-300">
            <td className="py-2.5 px-2.5 text-left">합계</td>
            <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtFull(summary.gdDailyGmv, currency)}</td>
            <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtFull(summary.bauDailyGmv, currency)}</td>
            <td className="py-2.5 px-2.5 text-right"><Delta pct={summary.growthPct} /></td>
            <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtFull(totalGd, currency)}</td>
            <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtFull(totalK, currency)}</td>
            <td className="py-2.5 px-2.5 text-right tabular-nums">{fmtPct(totalGd ? (totalK / totalGd) * 100 : null)}</td>
            {showConversion && (
              <td className="py-2.5 px-2.5 text-right tabular-nums">
                {fmtPct(totalVisitors ? (totalOrders / totalVisitors) * 100 : null, 2)}
              </td>
            )}
            {showBudget && (
              <td className="py-2.5 px-2.5 text-right tabular-nums">
                {fmtPct(totalBudget ? (totalSpend / totalBudget) * 100 : null)}
              </td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** K브랜드 분류가 제대로 됐는지 확인하는 접이식 목록 (원본 renderBrandAudit) */
function BrandAudit({ diagnostics, currency }) {
  const brands = diagnostics?.brands || [];
  if (!brands.length) return null;
  const kBrands = brands.filter((b) => b.isK);
  const others = brands.filter((b) => !b.isK);

  const HOW = { list: 'K브랜드목록', type: '브랜드유형', category: '카테고리' };

  return (
    <details className="mt-4 pt-3 border-t border-gray-100">
      <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-800">
        브랜드 분류 확인 — K브랜드 {kBrands.length}개 / 그 외 {others.length}개
      </summary>
      <div className="grid md:grid-cols-2 gap-5 mt-3">
        <div>
          <div className="text-xs text-gray-400 mb-1.5">K브랜드로 계산된 브랜드</div>
          <ul className="text-xs">
            {kBrands.slice(0, 40).map((b) => (
              <li key={b.brand} className="flex justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
                <span className="truncate">
                  {b.brand}
                  {b.matchedBy && (
                    <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1 ml-1">
                      {HOW[b.matchedBy] || b.matchedBy}
                    </span>
                  )}
                </span>
                <span className="text-gray-400 tabular-nums whitespace-nowrap">{fmtCompact(b.gmv, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1.5">K브랜드가 아닌 것으로 계산된 브랜드</div>
          <ul className="text-xs">
            {others.slice(0, 40).map((b) => (
              <li
                key={b.brand}
                className={
                  'flex justify-between gap-3 py-1 border-b border-gray-100 last:border-0 ' +
                  (b.excluded ? 'bg-orange-50' : '')
                }
              >
                <span className="truncate">
                  {b.brand}
                  {b.excluded && <span className="text-[10px] text-orange-600 ml-1">제외 표시됨</span>}
                </span>
                <span className="text-gray-400 tabular-nums whitespace-nowrap">{fmtCompact(b.gmv, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3 leading-relaxed">
        분류가 잘못된 브랜드가 있으면 구글시트의 <b>K브랜드목록</b> 탭에서 고친 뒤 다시 올리면 됩니다.
        비고 칸에 &lsquo;제외&rsquo;라고 적으면 K브랜드에서 빠지고, &lsquo;포함&rsquo;이라고 적으면 두 글자 이름도 앞말로 잡습니다.
      </p>
    </details>
  );
}

export default function CountryPanel({
  rows, summary, diagnostics, currency, scopeNote,
  showConversion = true, showBudget = true,
}) {
  return (
    <div className="space-y-3">
      <Card
        title="국가별 일 GMV"
        note={'Gmarket Day 기간과 BAU 기간의 하루 평균 GMV 비교 · 막대 위 숫자는 BAU 대비 증감율' + (scopeNote || '')}
      >
        <div className="flex gap-3.5 flex-wrap text-xs text-gray-600 mb-2">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />Gmarket Day
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />BAU
          </span>
        </div>
        <CountryChart rows={rows} currency={currency} />
      </Card>

      <Card
        title="국가별 상세"
        note={'Gmarket Day 기간 기준 · 증감율은 BAU 일평균 GMV 대비' + (scopeNote || '')}
      >
        <CountryTable
          rows={rows}
          summary={summary}
          currency={currency}
          showConversion={showConversion}
          showBudget={showBudget}
        />
        {(!showConversion || !showBudget) && (
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            {!showConversion && '· 전환율은 구글시트 일별실적 탭의 「방문자수」 칸이 채워지면 자동으로 나옵니다. '}
            {!showBudget && '· 예산 사용율은 「광고비」 칸이 채워지면 자동으로 나옵니다.'}
          </p>
        )}
        <BrandAudit diagnostics={diagnostics} currency={currency} />
      </Card>
    </div>
  );
}
