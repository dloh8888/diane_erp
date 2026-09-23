'use client';

import { Card, Delta, EmptyState } from './ui';
import { useLang } from './LangContext';
import { fmtFull, fmtCompact, fmtNum, fmtPct } from '../../lib/dashboard/format';

const SERIES = ['bg-blue-600', 'bg-orange-500', 'bg-emerald-600', 'bg-amber-500', 'bg-pink-500'];

/** 카테고리별 상세 표 (원본 renderCategorySection 의 표) */
function CategoryTable({ rows, currency }) {
  const { t } = useLang();
  const th = 'py-2.5 px-1.5 text-right font-medium text-gray-400 text-[11px] leading-tight break-keep align-bottom';
  const td = 'py-2.5 px-1.5 text-right tabular-nums border-b border-gray-100 whitespace-nowrap';

  const totalDaily = rows.reduce((s, r) => s + r.dailyGmv, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[900px]">
        <thead>
          <tr>
            <th className={th + ' text-left'}>{t('카테고리')}</th>
            <th className={th}>{t('일평균 GMV')}</th>
            <th className={th}>{t('BAU 일평균')}</th>
            <th className={th}>{t('증감율')}</th>
            <th className={th}>{t('비중')}</th>
            <th className={th}>{t('일평균 주문')}</th>
            <th className={th}>{t('증감율')}</th>
            <th className={th}>{t('일평균 수량')}</th>
            <th className={th}>{t('일평균 아이템수')}</th>
            <th className={th}>AOV</th>
            <th className={th}>{t('증감율')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <td className={td + ' text-left break-keep'}>{t(r.category)}</td>
              <td className={td}>{fmtFull(r.dailyGmv, currency)}</td>
              <td className={td}>{fmtFull(r.bauDailyGmv, currency)}</td>
              <td className={td}><Delta pct={r.growthPct} /></td>
              <td className={td}>{fmtPct(totalDaily ? (r.dailyGmv / totalDaily) * 100 : null)}</td>
              <td className={td}>{fmtNum(r.dailyOrders)}건</td>
              <td className={td}><Delta pct={r.ordersGrowthPct} /></td>
              <td className={td}>{fmtNum(r.dailyQty)}개</td>
              <td className={td}>{fmtNum(r.dailyItems)}개</td>
              <td className={td}>{r.aov === null ? '—' : fmtFull(r.aov, currency)}</td>
              <td className={td}><Delta pct={r.aovGrowthPct} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 카테고리 안에서의 국가별 비중 (100% 누적 가로 바) — 원본 renderCategoryCountryShare */
function CountryShare({ rows, countries, currency }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {countries.slice(0, 5).map((c, i) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className={'w-2.5 h-2.5 rounded-sm ' + SERIES[i % SERIES.length]} />
            {c}
          </span>
        ))}
        {countries.length > 5 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-400" />그 외
          </span>
        )}
      </div>

      {rows.map((r) => {
        const total = countries.reduce((s, c) => s + ((r.byCountryDaily[c] || {}).gmv || 0), 0);
        const segs = countries.map((c, i) => ({
          country: c,
          gmv: (r.byCountryDaily[c] || {}).gmv || 0,
          color: i < 5 ? SERIES[i] : 'bg-gray-400',
        })).filter((s) => s.gmv > 0);

        return (
          <div key={r.category}>
            <div className="flex items-baseline justify-between gap-2.5 mb-1.5">
              <div className="text-[13px] font-semibold break-keep">{r.category}</div>
              <div className="text-xs text-gray-400 tabular-nums">{fmtCompact(r.dailyGmv, currency)} / 일</div>
            </div>
            <div className="flex h-3.5 rounded overflow-hidden bg-gray-100">
              {segs.map((s, i) => (
                <span
                  key={s.country}
                  className={s.color + (i < segs.length - 1 ? ' border-r-2 border-white' : '')}
                  style={{ width: total ? (s.gmv / total) * 100 + '%' : '0%' }}
                  title={s.country + ' ' + fmtCompact(s.gmv, currency) + ' (' + (total ? ((s.gmv / total) * 100).toFixed(1) : 0) + '%)'}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-1.5 text-[11px] text-gray-400">
              {segs.map((s) => (
                <span key={s.country}>
                  {s.country} <b className="text-gray-600 tabular-nums">
                    {total ? ((s.gmv / total) * 100).toFixed(1) : '0.0'}%
                  </b>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CategoryPanel({ rows, countries, currency, scopeNote }) {
  const { t } = useLang();
  if (!rows || !rows.length) {
    return (
      <Card title={t('카테고리별')}>
        <EmptyState>
          카테고리 데이터가 없습니다. 구글시트 <b>일별실적</b> 탭에 &lsquo;카테고리(대대분류)&rsquo; 칸이 있는지 확인해주세요.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        title={t('카테고리별 상세')}
        note={t('Gmarket Day 기간 기준 · 일평균 GMV 큰 순 · 증감율은 모두 BAU 일평균 대비') + (scopeNote || '')}
      >
        <CategoryTable rows={rows} currency={currency} />
      </Card>

      <Card
        title={t('카테고리 안에서의 국가별 비중')}
        note={t('각 국가의 하루 평균 GMV와 그 카테고리 안에서의 비중 · 국가는 GMV 큰 순')}
      >
        <CountryShare rows={rows} countries={countries} currency={currency} />
      </Card>
    </div>
  );
}
