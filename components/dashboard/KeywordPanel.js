'use client';

import { useMemo, useState } from 'react';
import { Card, Delta, EmptyState } from './ui';
import { useLang } from './LangContext';
import Insight from './Insight';
import { insightKeyword } from '../../lib/dashboard/insights';
import { fmtNum, fmtCompact, fmtSignedPct } from '../../lib/dashboard/format';

/** 작은 꺾은선 (원본 spark 대응) — 주차별 검색지수 흐름 */
function Spark({ series, width = 96, height = 24 }) {
  const pts = (series || []).filter((v) => v !== null && v !== undefined);
  if (pts.length < 2) return <span className="text-gray-300 text-[11px]">—</span>;

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const step = width / (series.length - 1);

  let d = '';
  series.forEach((v, i) => {
    if (v === null || v === undefined) return;
    const x = i * step;
    const y = height - ((v - min) / span) * height;
    d += (d ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
  });

  const last = pts[pts.length - 1];
  const first = pts[0];
  const up = last >= first;

  return (
    <svg width={width} height={height} className="block" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? '#1baf7a' : '#d03b3b'} strokeWidth="1.5" />
    </svg>
  );
}

/* ── 검색트렌드 (구글 트렌드) ──────────────────────────────── */
function SearchTrendSection({ trend }) {
  const { t } = useLang();
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [onlyUntapped, setOnlyUntapped] = useState(false);

  const rows = useMemo(() => {
    let list = (trend.keywords || []).filter((k) => !k.isAnchor);
    if (country) list = list.filter((k) => k.country === country);
    if (category) list = list.filter((k) => k.category === category);
    if (onlyUntapped) list = list.filter((k) => k.untapped);
    return list.sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [trend, country, category, onlyUntapped]);

  if (!trend.keywords || !trend.keywords.length) {
    return (
      <Card title={t('검색 트렌드')}>
        <EmptyState>
          구글시트 <b>검색트렌드</b> 탭에 데이터가 없습니다.
        </EmptyState>
      </Card>
    );
  }

  const th = 'py-2 px-2 text-right font-medium text-gray-400 text-[11px] align-bottom';
  const td = 'py-2 px-2 text-right tabular-nums border-b border-gray-100 whitespace-nowrap';

  return (
    <Card
      title={t('검색 트렌드 (구글 트렌드)')}
      note={
        t('최신 주차') + ' ' + (trend.latestWeek || '—') +
        t('기준 · 지수는 그룹마다 기준이 달라서 공통 키워드(앵커)로 맞춰 비교합니다') +
        t('· 「기회」는 검색 순위보다 우리 매출 순위가 뒤쳐진 정도입니다')
      }
    >
      <div className="flex flex-wrap items-end gap-3 mb-3.5">
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {t('국가')}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[130px]"
          >
            <option value="">{t('전체')}</option>
            {trend.countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {t('카테고리')}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[130px]"
          >
            <option value="">{t('전체')}</option>
            {trend.categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          onClick={() => setOnlyUntapped(!onlyUntapped)}
          className={
            'text-[12.5px] px-3 py-1.5 rounded-full border ' +
            (onlyUntapped
              ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
          }
        >
          {t('아직 안 파는 브랜드만')}
        </button>
        <div className="text-xs text-gray-400 ml-auto pb-1.5">{rows.length}{t('개')}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[820px]">
          <thead>
            <tr>
              <th className={th + ' text-center'}>{t('검색순위')}</th>
              <th className={th + ' text-left'}>{t('키워드')}</th>
              <th className={th + ' text-center'}>{t('국가')}</th>
              <th className={th + ' text-left'}>{t('흐름')}</th>
              <th className={th}>{t('지수')}</th>
              <th className={th}>{t('전주 대비')}</th>
              <th className={th}>{t('4주평균 대비')}</th>
              <th className={th + ' text-left'}>{t('우리 브랜드')}</th>
              <th className={th}>{t('기회')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k, i) => (
              <tr key={k.country + k.category + k.keyword + i}>
                <td className={td + ' text-center'}>{k.searchRank || '—'}</td>
                <td className="py-2 px-2 text-left border-b border-gray-100">
                  <span className="font-semibold">{k.keyword}</span>
                  {k.type && <span className="block text-[11px] text-gray-400">{k.type}</span>}
                </td>
                <td className={td + ' text-center'}>{k.country}</td>
                <td className="py-2 px-2 border-b border-gray-100"><Spark series={k.series} /></td>
                <td className={td}>{k.value === null ? '—' : k.value}</td>
                <td className={td}><Delta pct={k.wowPct} /></td>
                <td className={td}><Delta pct={k.vsAvg4Pct} /></td>
                <td className="py-2 px-2 text-left border-b border-gray-100">
                  {k.sold ? (
                    <>
                      <span>{k.brand}</span>
                      {k.brandRank && <span className="block text-[11px] text-gray-400">{t('매출')} {k.brandRank}</span>}
                    </>
                  ) : k.untapped ? (
                    <span className="text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 rounded-full px-2 py-0.5">
                      {t('아직 안 팜')}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className={td}>
                  {k.opportunity === null || k.opportunity === undefined ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <span className={k.opportunity > 0 ? 'text-emerald-700 font-semibold' : 'text-gray-400'}>
                      {k.opportunity > 0 ? '+' + k.opportunity : k.opportunity}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ── 급상승 검색어 ─────────────────────────────────────────── */
function RisingSection({ rising }) {
  const { t } = useLang();
  if (!rising || !rising.length) return null;
  return (
    <Card title={t('급상승 검색어')} note={t("구글 트렌드의 '급상승 검색어' — 소싱 아이디어를 찾을 때 보는 자리입니다")}>
      <ul className="grid gap-2">
        {rising.map((r, i) => (
          <li key={r.query + i} className="flex items-baseline gap-2.5 flex-wrap px-2.5 py-2 rounded-lg bg-gray-50">
            <span className="font-semibold">{r.query}</span>
            {r.growth && (
              <span className="text-[11px] font-semibold bg-orange-100 text-orange-900 border border-orange-200 rounded-full px-2">
                {r.growth}
              </span>
            )}
            <span className="text-xs text-gray-400">{r.country} · {r.category}</span>
            {r.note && <span className="text-xs text-gray-500">— {r.note}</span>}
            <span className="text-[11px] text-gray-300 ml-auto">{r.collected}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── 키워드트렌드 (쇼피/라자다 상품) ───────────────────────── */
function MarketplaceSection({ keyword, currency }) {
  const { t } = useLang();
  const periods = Object.keys(keyword.periods || {});
  const [period, setPeriod] = useState(periods[0] || '');
  const [platform, setPlatform] = useState('');
  const [country, setCountry] = useState('');

  const bucket = keyword.byPeriod ? keyword.byPeriod[period] : null;

  const rows = useMemo(() => {
    let list = bucket ? bucket.rows.slice() : [];
    if (platform) list = list.filter((r) => r.platform === platform);
    if (country) list = list.filter((r) => r.country === country);
    return list;
  }, [bucket, platform, country]);

  if (!periods.length) {
    return (
      <Card title={t('쇼피 · 라자다 상품 순위')}>
        <EmptyState>
          구글시트 <b>키워드트렌드</b> 탭에 데이터가 없습니다.
        </EmptyState>
      </Card>
    );
  }

  const th = 'py-2 px-2 text-right font-medium text-gray-400 text-[11px] align-bottom';
  const td = 'py-2 px-2 text-right tabular-nums border-b border-gray-100 whitespace-nowrap';

  return (
    <Card
      title={t('쇼피 · 라자다 상품 순위')}
      note={
        (bucket ? bucket.date + ' 기준' : '') +
        (bucket && bucket.prevDate ? ' · 직전 ' + bucket.prevDate + ' 과 비교' : '') +
        ' · 플랫폼×국가 안에서 누적판매량 순'
      }
    >
      <div className="flex flex-wrap items-end gap-3 mb-3.5">
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {t('기간')}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[110px]"
          >
            {periods.map((p) => <option key={p} value={p}>{p}별</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {t('플랫폼')}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[130px]"
          >
            <option value="">{t('전체')}</option>
            {keyword.platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          {t('국가')}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[110px]"
          >
            <option value="">{t('전체')}</option>
            {keyword.countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="text-xs text-gray-400 ml-auto pb-1.5">{rows.length}{t('개')}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[820px]">
          <thead>
            <tr>
              <th className={th + ' text-center'}>{t('순위')}</th>
              <th className={th + ' text-center'}>{t('변동')}</th>
              <th className={th + ' text-left'}>{t('상품')}</th>
              <th className={th + ' text-left'}>{t('브랜드')}</th>
              <th className={th + ' text-center'}>{t('플랫폼 / 국가')}</th>
              <th className={th}>{t('누적판매량')}</th>
              <th className={th}>{t('증감')}</th>
              <th className={th}>ASP</th>
              <th className={th}>{t('ASP 증감')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.platform + r.country + r.product + i}>
                <td className={td + ' text-center'}>{r.rank}</td>
                <td className={td + ' text-center'}>
                  {r.rankDelta === null ? (
                    <span className="text-gray-400 text-[11px]">{t('신규')}</span>
                  ) : r.rankDelta === 0 ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <span className={r.rankDelta > 0 ? 'text-green-700 font-semibold' : 'text-red-500 font-semibold'}>
                      {r.rankDelta > 0 ? '▲' : '▼'}{Math.abs(r.rankDelta)}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-left border-b border-gray-100 max-w-[260px]">
                  <span className="block truncate" title={r.product}>{r.product}</span>
                  {r.category && <span className="block text-[11px] text-gray-400">{r.category}</span>}
                </td>
                <td className="py-2 px-2 text-left border-b border-gray-100">
                  {r.brand || '—'}
                  {r.isK && <span className="ml-1 text-[9.5px] font-bold bg-blue-100 text-blue-900 rounded-full px-1.5">K</span>}
                </td>
                <td className={td + ' text-center'}>{r.platform} / {r.country}</td>
                <td className={td}>{fmtNum(r.sold)}</td>
                <td className={td}>
                  {r.soldDelta === null ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <span className={r.soldDelta >= 0 ? 'text-green-700' : 'text-red-500'}>
                      {r.soldDelta >= 0 ? '+' : ''}{fmtNum(r.soldDelta)}
                    </span>
                  )}
                </td>
                <td className={td}>{fmtCompact(r.asp, currency)}</td>
                <td className={td}><Delta pct={r.aspGrowthPct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function KeywordPanel({ keyword, trend, rising, currency }) {
  const { t, lang } = useLang();
  const hasAny =
    (keyword && keyword.rowCount) || (trend && trend.rowCount) || (rising && rising.length);

  if (!hasAny) {
    return (
      <Card title="Keyword Trend">
        <EmptyState>
          구글시트의 <b>키워드트렌드 · 검색트렌드 · 급상승</b> 탭에 데이터가 없습니다.
          시트를 채운 뒤 다시 업로드하시면 이 자리에 나옵니다.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Insight data={insightKeyword(trend, rising, keyword, lang)} />
      <SearchTrendSection trend={trend} />
      <RisingSection rising={rising} />
      <MarketplaceSection keyword={keyword} currency={currency} />
    </div>
  );
}
