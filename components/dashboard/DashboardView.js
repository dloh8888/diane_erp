'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tile, Delta } from './ui';
import PromoCalendar from './PromoCalendar';
import CountryPanel from './CountryPanel';
import CategoryPanel from './CategoryPanel';
import BrandPanel from './BrandPanel';
import ItemPanel from './ItemPanel';
import KeywordPanel from './KeywordPanel';
import Insight from './Insight';
import { LangProvider, LangToggle, useLang } from './LangContext';
import { fmtCompact, fmtFull, fmtNum, fmtUpdated } from '../../lib/dashboard/format';
import { insightOverview, insightCountry, insightCategory } from '../../lib/dashboard/insights';

// 데이터가 실제로 있는 탭만 둡니다.
// (원본에 있던 By Traffic / SNS MKT 는 각각 방문자수 데이터와 SNS API 연동이
//  준비되면 다시 넣습니다 — 빈 화면을 띄워두지 않기 위해 지금은 뺐습니다)
const TABS = [
  { id: 'overview', label: 'Overview', dot: 'bg-blue-600', active: 'border-blue-600 bg-blue-50/70' },
  { id: 'country', label: 'By Country', dot: 'bg-orange-500', active: 'border-orange-500 bg-orange-50/70' },
  { id: 'category', label: 'By Category', dot: 'bg-emerald-600', active: 'border-emerald-600 bg-emerald-50/70' },
  { id: 'brand', label: 'By Brand', dot: 'bg-amber-500', active: 'border-amber-500 bg-amber-50/70' },
  { id: 'item', label: 'By Item', dot: 'bg-pink-500', active: 'border-pink-500 bg-pink-50/70' },
  { id: 'keyword', label: 'Keyword Trend', dot: 'bg-red-500', active: 'border-red-500 bg-red-50/70' },
];

/** 데이터 기준일 띠 — 원본 renderAsOf 대응 */
function AsOfBar({ period, lastImport }) {
  const { t, lang } = useLang();
  const en = lang === 'en';
  const remaining = period.remainingDays;

  return (
    <div className="flex items-center gap-x-6 gap-y-2.5 flex-wrap px-4 py-3 mb-4 rounded-xl border border-blue-200 bg-blue-50/50 text-[13px]">
      <span className="inline-flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">{t('데이터 기준일')}</span>
        <span className="font-bold tabular-nums">{period.dataLast || '—'}</span>
      </span>
      <span className="inline-flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">{t('Gmarket Day 기간')}</span>
        <span className="font-bold tabular-nums">
          {period.calStart || period.gdFirst || '—'} ~ {period.calEnd || period.gdLast || '—'}
        </span>
      </span>
      <span className="inline-flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-gray-600 whitespace-nowrap">{t('진행')}</span>
        <span className="text-[11.5px] text-gray-500 tabular-nums">
          {en
            ? period.gdDoneDays + ' of ' + period.gdPlannedDays + ' days'
            : period.gdDoneDays + '일 / 계획 ' + period.gdPlannedDays + '일'}
        </span>
      </span>
      <span
        className={
          'inline-flex items-baseline gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ' +
          (remaining > 0
            ? 'bg-blue-100 text-blue-900 border-blue-300'
            : 'bg-white text-gray-400 border-gray-200')
        }
      >
        {remaining > 0
          ? en ? remaining + ' days left' : '잔여 ' + remaining + '일'
          : t('기간 종료')}
      </span>
      {lastImport && (
        <span className="text-[11.5px] text-gray-400 ml-auto whitespace-nowrap">
          {en
            ? 'uploaded ' + fmtUpdated(lastImport.at).replace(' 기준', '')
            : fmtUpdated(lastImport.at) + ' 업로드'}
        </span>
      )}
    </div>
  );
}

/** K브랜드 껐다켰다 (By Country / By Category 에서 씁니다) */
function KToggle({ value, onChange }) {
  const { t } = useLang();
  const opts = [
    { id: 'all', label: '전체' },
    { id: 'k', label: 'K브랜드만' },
    { id: 'non', label: 'K브랜드 아닌 것만' },
  ];
  return (
    <div className="flex items-center gap-2 mb-3.5 flex-wrap">
      <span className="text-xs text-gray-400 mr-0.5">{t('보기')}</span>
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={
            'text-[12.5px] px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 ' +
            (value === o.id
              ? 'bg-blue-100 border-blue-300 text-blue-900 font-semibold'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300')
          }
        >
          <span
            className={
              'w-2 h-2 rounded-full border ' +
              (value === o.id ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300')
            }
          />
          {t(o.label)}
        </button>
      ))}
    </div>
  );
}

function DashboardInner({ data }) {
  const { t, lang } = useLang();
  const en = lang === 'en';
  const [tab, setTab] = useState('overview');
  const [kScope, setKScope] = useState('all');

  const s = data.summary;
  const currency = s.currency;
  const nCountries = data.byCountry.length;
  const money = (n) => fmtCompact(n, currency, lang);
  const moneyFull = (n) => fmtFull(n, currency, lang);
  const count = (n) => fmtNum(n, lang);
  const unit = (n, ko, enWord) => (en ? count(n) + ' ' + enWord : count(n) + ko);

  // K브랜드 필터가 걸리면 그 화면용으로 미리 계산해둔 값을 씁니다 (원본 kviews 와 같습니다)
  const kview = kScope === 'k' ? data.kviews.k : kScope === 'non' ? data.kviews.non : null;
  const countryRows = kview ? kview.byCountry : data.byCountry;
  const countrySummary = kview ? kview.summary : data.summary;
  const categoryRows = kview ? kview.byCategory : data.byCategory;
  const scopeNote =
    kScope === 'k' ? t('· K브랜드만') : kScope === 'non' ? t('· K브랜드 아닌 것만') : '';

  const sumOfDaily = (bau) =>
    en
      ? nCountries + ' countries, sum of daily avgs · BAU ' + bau
      : nCountries + '개국 일평균 합 · BAU ' + bau;

  return (
    <main className="min-h-screen p-6 md:p-10 bg-[#f9f9f7]">
      <div className="max-w-[1240px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('프로모션 대시보드')}</h1>
            <div className="text-[13px] text-gray-500 mt-0.5">
              {data.period.dataFirst} ~ {data.period.dataLast} ·{' '}
              {en ? nCountries + ' countries' : nCountries + '개국'} ·{' '}
              {en
                ? count(data.diagnostics.sheetRowCount) + ' daily rows'
                : '일별실적 ' + count(data.diagnostics.sheetRowCount) + '줄'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-gray-400">created by DALIM OH <span className="opacity-75">(Gmarket)</span></div>
            <div className="flex items-center gap-2">
              <LangToggle />
              <Link
                href="/dashboard/import"
                className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
              >
                {t('엑셀시트 올리기')}
              </Link>
            </div>
          </div>
        </div>

        <AsOfBar period={data.period} lastImport={data.lastImport} />

        {/* 탭 */}
        <div className="flex gap-0.5 mb-4 overflow-x-auto border-b border-gray-200">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={
                'text-[13px] whitespace-nowrap px-3.5 py-2.5 border-b-[3px] -mb-px rounded-t-lg inline-flex items-center gap-2 ' +
                (tab === tb.id
                  ? 'font-semibold text-gray-900 ' + tb.active
                  : 'font-medium text-gray-500 border-transparent hover:text-gray-900 hover:bg-white')
              }
            >
              <span className={'w-[7px] h-[7px] rounded-full ' + tb.dot + (tab === tb.id ? '' : ' opacity-45')} />
              {tb.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-3">
            <Insight data={insightOverview(data, lang)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <Tile
                hero
                colorIndex={0}
                label={t('Gmarket Day 총 GMV')}
                value={money(s.gdTotalGmv)}
                sub={
                  moneyFull(s.gdTotalGmv) + ' · ' + t('· 국가별 진행일수 합계').replace('· ', '') + ' ' +
                  (en ? count(s.gdCountryDays) : count(s.gdCountryDays) + '일')
                }
                delta={<Delta pct={s.gmvGrowthPct} note={t('BAU 대비')} />}
              />
              <Tile
                colorIndex={1}
                label={t('Gmarket Day 일평균 GMV')}
                value={money(s.gdDailyGmv)}
                sub={sumOfDaily(money(s.bauDailyGmv))}
                delta={<Delta pct={s.gmvGrowthPct} note={t('BAU 대비')} />}
              />
              <Tile
                colorIndex={2}
                label={t('Gmarket Day 일평균 주문건수')}
                value={unit(s.gdDailyOrders, '건', 'orders')}
                sub={sumOfDaily(unit(s.bauDailyOrders, '건', 'orders'))}
                delta={<Delta pct={s.ordersGrowthPct} note={t('BAU 대비')} />}
              />
              <Tile
                colorIndex={3}
                label={t('Gmarket Day 일평균 판매수량')}
                value={unit(s.gdDailyQty, '개', 'units')}
                sub={sumOfDaily(unit(s.bauDailyQty, '개', 'units'))}
                delta={<Delta pct={s.qtyGrowthPct} note={t('BAU 대비')} />}
              />
              <Tile
                colorIndex={4}
                label={t('Gmarket Day 일평균 판매 아이템수')}
                value={unit(s.gdDailyItems, '개', 'items')}
                sub={sumOfDaily(unit(s.bauDailyItems, '개', 'items'))}
                delta={<Delta pct={s.itemsGrowthPct} note={t('BAU 대비')} />}
              />
              <Tile
                colorIndex={5}
                label={t('Gmarket Day AOV (객단가)')}
                value={s.gdAov === null ? '—' : moneyFull(s.gdAov)}
                sub={t('총 GMV ÷ 총 주문건수 · BAU') + ' ' + (s.bauAov === null ? '—' : moneyFull(s.bauAov))}
                delta={<Delta pct={s.aovGrowthPct} note={t('BAU 대비')} />}
              />
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              {en ? (
                <>
                  ※ All changes compare <b className="text-gray-600">per-country daily averages</b>. Daily
                  figures are the sum of each country&rsquo;s daily average (one day across all {nCountries}{' '}
                  countries), so countries with different campaign lengths compare fairly.
                </>
              ) : (
                <>
                  ※ 증감율은 모두 <b className="text-gray-600">국가별 일평균 기준</b>으로 비교합니다.
                  일평균 지표는 각 국가의 일평균을 모두 더한 값(= {nCountries}개국 합산 하루치)이며,
                  국가마다 프로모션 진행일수가 달라도 공정하게 비교됩니다.
                </>
              )}
            </p>

            <PromoCalendar promotions={data.promotions} focusMonth={data.focusMonth} />
          </div>
        )}

        {/* ── By Country ── */}
        {tab === 'country' && (
          <>
            <KToggle value={kScope} onChange={setKScope} />
            <Insight data={insightCountry({ ...data, byCountry: countryRows, summary: countrySummary }, lang)} />
            <CountryPanel
              rows={countryRows}
              summary={countrySummary}
              diagnostics={data.diagnostics}
              currency={currency}
              scopeNote={scopeNote}
              showConversion={data.hasVisitorData}
              showBudget={data.hasBudgetData}
            />
          </>
        )}

        {/* ── By Category ── */}
        {tab === 'category' && (
          <>
            <KToggle value={kScope} onChange={setKScope} />
            <Insight data={insightCategory(categoryRows, lang)} />
            <CategoryPanel
              rows={categoryRows}
              countries={kview ? kview.countries : data.countries}
              currency={currency}
              scopeNote={scopeNote}
            />
          </>
        )}

        {/* ── By Brand ── */}
        {tab === 'brand' && (
          <BrandPanel
            byBrand={data.byBrand}
            byMidCategory={data.byMidCategory}
            brandCats={data.brandCats}
            currency={currency}
          />
        )}

        {/* ── By Item ── */}
        {tab === 'item' && <ItemPanel byItem={data.byItem} currency={currency} />}

        {/* ── Keyword Trend ── */}
        {tab === 'keyword' && (
          <KeywordPanel
            keyword={data.keyword}
            trend={data.trend}
            rising={data.rising}
            currency={currency}
          />
        )}

        <p className="text-xs text-gray-400 mt-8 leading-relaxed">
          {en ? 'To change the data, edit the Google Sheet, download it with [File > Download > Microsoft Excel], and ' : '데이터를 바꾸려면 구글시트에서 수정한 뒤 [파일 > 다운로드 > Microsoft Excel] 로 받아 '}
          <Link href="/dashboard/import" className="underline mx-1">{t('엑셀시트 올리기')}</Link>
          {en ? 'upload it again.' : '에서 다시 올리면 됩니다.'}
        </p>
      </div>
    </main>
  );
}

export default function DashboardView({ data }) {
  return (
    <LangProvider>
      <DashboardInner data={data} />
    </LangProvider>
  );
}
