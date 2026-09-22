'use client';

import { useMemo, useState } from 'react';
import { Card, Delta, EmptyState } from './ui';
import { fmtFull, fmtCompact, fmtNum, fmtPct, fmtSignedPct } from '../../lib/dashboard/format';

const PAGE_SIZE = 30;

/** 랭킹 변동 표시 (▲3 = 세 계단 상승). 원본과 같은 규칙입니다. */
function RankDelta({ delta }) {
  if (delta === null || delta === undefined) return <span className="text-gray-400 text-xs">신규</span>;
  if (delta === 0) return <span className="text-gray-400 text-xs">—</span>;
  const up = delta > 0;
  return (
    <span className={(up ? 'text-green-700' : 'text-red-500') + ' text-xs font-semibold'}>
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

export default function BrandPanel({ byBrand, byMidCategory, brandCats, currency }) {
  const [kind, setKind] = useState('brand'); // brand | mid
  const [cat, setCat] = useState('');        // 대대분류 세부 탭
  const [kOnly, setKOnly] = useState('all'); // all | k | non
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('dailyGmv');
  const [sortDir, setSortDir] = useState('desc');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const source = kind === 'brand' ? byBrand : byMidCategory;

  const rows = useMemo(() => {
    let list = (source?.rows || []).slice();

    if (kind === 'brand' && cat) list = list.filter((r) => r.topCat === cat);
    if (kOnly === 'k') list = list.filter((r) => r.isK);
    if (kOnly === 'non') list = list.filter((r) => !r.isK);

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.nameEn || '').toLowerCase().includes(needle)
      );
    }

    list.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const an = av === null || av === undefined || isNaN(av) ? -Infinity : av;
      const bn = bv === null || bv === undefined || isNaN(bv) ? -Infinity : bv;
      return sortDir === 'desc' ? bn - an : an - bn;
    });

    return list;
  }, [source, kind, cat, kOnly, q, sortKey, sortDir]);

  function sortBy(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setLimit(PAGE_SIZE);
  }

  if (!source || !source.rows.length) {
    return (
      <Card title="브랜드별">
        <EmptyState>
          브랜드 데이터가 없습니다. 구글시트 <b>일별실적</b> 탭에 &lsquo;브랜드&rsquo; 칸이 있는지,
          또는 <b>브랜드실적</b> 탭이 채워져 있는지 확인해주세요.
        </EmptyState>
      </Card>
    );
  }

  const Th = ({ label, sub, k, className = '' }) => (
    <th
      onClick={k ? () => sortBy(k) : undefined}
      className={
        'py-2 px-2 text-right font-medium text-[11px] leading-tight break-keep align-bottom ' +
        (k ? 'cursor-pointer select-none hover:text-gray-900 ' : '') +
        (sortKey === k ? 'text-gray-900 font-semibold ' : 'text-gray-400 ') +
        className
      }
    >
      {label}
      {sub && <span className="font-normal opacity-70 block">{sub}</span>}
      {sortKey === k && <span className="text-[9px] ml-0.5">{sortDir === 'desc' ? '▼' : '▲'}</span>}
    </th>
  );

  const td = 'py-2 px-2 text-right tabular-nums border-b border-gray-100 whitespace-nowrap';

  return (
    <div className="space-y-3">
      <Card
        title={kind === 'brand' ? '브랜드 랭킹' : '카테고리 대분류 랭킹'}
        note="Gmarket Day 기간 기준 · 랭킹은 일평균 GMV 순 · 랭킹 변동은 BAU 순위 대비 (▲ = 올라감) · 증감율은 BAU 일평균 대비"
      >
        {/* 필터 */}
        <div className="flex flex-wrap items-end gap-3 mb-3.5">
          <div className="flex flex-col gap-1 text-xs text-gray-400">
            기준
            <select
              value={kind}
              onChange={(e) => { setKind(e.target.value); setCat(''); setLimit(PAGE_SIZE); }}
              className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[150px]"
            >
              <option value="brand">브랜드</option>
              <option value="mid">카테고리 대분류</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 text-xs text-gray-400">
            K브랜드
            <select
              value={kOnly}
              onChange={(e) => { setKOnly(e.target.value); setLimit(PAGE_SIZE); }}
              className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[150px]"
            >
              <option value="all">전체</option>
              <option value="k">K브랜드만</option>
              <option value="non">K브랜드 아닌 것만</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 text-xs text-gray-400">
            검색 (국문·영문 모두)
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setLimit(PAGE_SIZE); }}
              placeholder="브랜드명"
              className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[190px]"
            />
          </div>

          <div className="text-xs text-gray-400 ml-auto pb-1.5">
            {rows.length.toLocaleString('ko-KR')}개
            {source.total > source.shown && (
              <span className="text-gray-300"> (원본 {source.total.toLocaleString('ko-KR')}개 중 상위 {source.shown}개만 계산)</span>
            )}
          </div>
        </div>

        {/* 대대분류 세부 탭 (브랜드 기준일 때만) */}
        {kind === 'brand' && brandCats && brandCats.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            <button
              onClick={() => { setCat(''); setLimit(PAGE_SIZE); }}
              className={
                'text-[12.5px] px-3 py-1.5 rounded-full border ' +
                (cat === '' ? 'bg-blue-100 border-blue-300 text-blue-900 font-semibold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
              }
            >
              전체
            </button>
            {brandCats.map((c) => (
              <button
                key={c}
                onClick={() => { setCat(c); setLimit(PAGE_SIZE); }}
                className={
                  'text-[12.5px] px-3 py-1.5 rounded-full border ' +
                  (cat === c ? 'bg-blue-100 border-blue-300 text-blue-900 font-semibold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
                }
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr>
                <th className="py-2 px-2 text-center font-medium text-gray-400 text-[11px] align-bottom">순위</th>
                <th className="py-2 px-2 text-left font-medium text-gray-400 text-[11px] align-bottom">
                  {kind === 'brand' ? '브랜드' : '카테고리 대분류'}
                </th>
                <th className="py-2 px-2 text-center font-medium text-gray-400 text-[11px] align-bottom">변동</th>
                <th className="py-2 px-2 text-center font-medium text-gray-400 text-[11px] align-bottom">K</th>
                <Th label="일평균 GMV" k="dailyGmv" />
                <Th label="BAU 일평균" k="bauDailyGmv" />
                <Th label="증감율" k="growthPct" />
                <Th label="비중" k="sharePct" />
                {kind === 'brand' && <Th label="대분류 내 비중" sub="(BAU 대비 %p)" k="parentSharePct" />}
                <Th label="총 GMV" k="gmv" />
                <Th label="주문" k="orders" />
                <Th label="AOV" k="aov" />
                <Th label="증감율" k="aovGrowthPct" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((r) => (
                <tr key={r.name}>
                  <td className={td + ' text-center'}>{r.rank}</td>
                  <td className="py-2 px-2 text-left border-b border-gray-100">
                    <span className="block">{r.name}</span>
                    {r.nameEn && <span className="block text-[11px] text-gray-400">{r.nameEn}</span>}
                    {kind === 'brand' && r.parent && (
                      <span className="block text-[10px] text-gray-300">{r.parent}</span>
                    )}
                  </td>
                  <td className={td + ' text-center'}><RankDelta delta={r.rankDelta} /></td>
                  <td className={td + ' text-center'}>
                    {r.isK ? (
                      <span className="text-[11px] font-bold bg-blue-50 rounded px-1.5 py-0.5">K</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={td}>{fmtFull(r.dailyGmv, currency)}</td>
                  <td className={td}>{fmtFull(r.bauDailyGmv, currency)}</td>
                  <td className={td}><Delta pct={r.growthPct} /></td>
                  <td className={td}>{fmtPct(r.sharePct)}</td>
                  {kind === 'brand' && (
                    <td className={td}>
                      {fmtPct(r.parentSharePct)}
                      {r.parentShareDeltaPp !== null && r.parentShareDeltaPp !== undefined && (
                        <span className={'block text-[10px] ' + (r.parentShareDeltaPp >= 0 ? 'text-green-700' : 'text-red-500')}>
                          {fmtSignedPct(r.parentShareDeltaPp)}p
                        </span>
                      )}
                    </td>
                  )}
                  <td className={td}>{fmtCompact(r.gmv, currency)}</td>
                  <td className={td}>{fmtNum(r.orders)}</td>
                  <td className={td}>{r.aov === null ? '—' : fmtFull(r.aov, currency)}</td>
                  <td className={td}><Delta pct={r.aovGrowthPct} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className="text-center text-gray-400 py-8">
                    조건에 맞는 항목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length > limit && (
          <button
            onClick={() => setLimit(limit + PAGE_SIZE)}
            className="mt-3 text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            더 보기 ({(rows.length - limit).toLocaleString('ko-KR')}개 남음)
          </button>
        )}
      </Card>
    </div>
  );
}
