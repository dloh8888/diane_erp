'use client';

import { useMemo, useState } from 'react';
import { Card, EmptyState } from './ui';
import { fmtFull, fmtCompact, fmtNum } from '../../lib/dashboard/format';

const PAGE_SIZE = 20;

/** 상품 썸네일 — 이미지가 없으면 상품번호로 만들어 보고, 그것도 안 되면 글자 썸네일. */
function Thumb({ item, templates }) {
  const [idx, setIdx] = useState(0);

  const candidates = [];
  if (item.image) candidates.push(item.image);
  if (item.code) {
    for (const t of templates || []) candidates.push(t.replace('{code}', item.code));
  }

  const src = candidates[idx];
  const initials = (item.brand || item.name || '?').trim().slice(0, 2).toUpperCase();

  if (!src) {
    return (
      <div className="aspect-square bg-gray-50 flex items-center justify-center text-2xl font-bold text-gray-300">
        {initials}
      </div>
    );
  }

  return (
    <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
      {/* 외부 이미지라 next/image 대신 img 를 씁니다 (도메인 설정 없이 바로 뜨도록) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={item.name || item.code}
        className="w-full h-full object-cover"
        onError={() => setIdx(idx + 1)}
      />
    </div>
  );
}

export default function ItemPanel({ byItem, currency }) {
  const [cat, setCat] = useState('');
  const [country, setCountry] = useState('');
  const [kOnly, setKOnly] = useState('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const items = byItem?.items || [];
  const categories = byItem?.categories || [];
  const countries = byItem?.countries || [];

  const rows = useMemo(() => {
    let list = items.map((it) => {
      // 국가 필터가 걸리면 그 국가 값만, 아니면 전체 합계
      let gmv = 0, orders = 0, qty = 0;
      const entries = country
        ? [[country, it.byCountry[country]]].filter(([, v]) => v)
        : Object.entries(it.byCountry);
      for (const [, v] of entries) {
        gmv += v.g[0];
        orders += v.g[1];
        qty += v.g[2];
      }
      return { ...it, _gmv: gmv, _orders: orders, _qty: qty };
    });

    if (cat) list = list.filter((it) => it.cat === cat);
    if (kOnly === 'k') list = list.filter((it) => it.isK);
    if (kOnly === 'non') list = list.filter((it) => !it.isK);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (it) =>
          (it.name || '').toLowerCase().includes(needle) ||
          (it.brand || '').toLowerCase().includes(needle) ||
          (it.code || '').toLowerCase().includes(needle)
      );
    }

    return list.filter((it) => it._gmv > 0).sort((a, b) => b._gmv - a._gmv);
  }, [items, cat, country, kOnly, q]);

  if (!items.length) {
    return (
      <Card title="상품별">
        <EmptyState>
          상품 데이터가 없습니다. 구글시트 <b>일별실적</b> 탭에 &lsquo;상품(번호)&rsquo; 또는 &lsquo;상품명&rsquo; 칸이 있는지 확인해주세요.
        </EmptyState>
      </Card>
    );
  }

  const urlTemplate = byItem.productUrlTemplate;

  return (
    <Card
      title="상품 랭킹"
      note={
        'Gmarket Day 기간 기준 · GMV 큰 순' +
        (byItem.perCatLimit ? ' · 카테고리마다 상위 ' + byItem.perCatLimit + '개까지만 계산' : '')
      }
    >
      {/* 카테고리 세부 탭 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => { setCat(''); setLimit(PAGE_SIZE); }}
          className={
            'text-[12.5px] px-3 py-1.5 rounded-full border ' +
            (cat === '' ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
          }
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            onClick={() => { setCat(c.name); setLimit(PAGE_SIZE); }}
            className={
              'text-[12.5px] px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 ' +
              (cat === c.name ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
            }
          >
            {c.name}
            <span className="text-[11px] opacity-65 tabular-nums">{c.total}</span>
          </button>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          국가
          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setLimit(PAGE_SIZE); }}
            className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[150px]"
          >
            <option value="">전체</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
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
          검색
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(PAGE_SIZE); }}
            placeholder="상품명 · 브랜드 · 상품번호"
            className="text-[13px] px-2 py-1.5 rounded-lg border border-gray-200 bg-white min-w-[190px]"
          />
        </div>
        <div className="text-xs text-gray-400 ml-auto pb-1.5">
          {rows.length.toLocaleString('ko-KR')}개
        </div>
      </div>

      {/* 상품 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {rows.slice(0, limit).map((it, i) => {
          const href = it.link || (it.code && urlTemplate ? urlTemplate.replace('{code}', it.code) : '');
          const inner = (
            <>
              <div className="relative">
                <Thumb item={it} templates={byItem.imageTemplates} />
                <span className="absolute top-2 left-2 min-w-[22px] h-[22px] px-1.5 rounded-md bg-gray-900 text-white text-xs font-bold inline-flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="px-3 pt-2.5 pb-3">
                {it.cat && (
                  <span className="inline-block text-[10.5px] font-semibold text-gray-600 bg-gray-100 rounded px-1.5 mb-1.5 max-w-full truncate">
                    {it.cat}
                  </span>
                )}
                <div className="text-xs text-gray-500 mb-0.5 truncate">
                  {it.brand || '—'}
                  {it.isK && <span className="ml-1 text-[9.5px] font-bold bg-blue-100 text-blue-900 rounded-full px-1.5">K</span>}
                </div>
                <div className="text-[13px] font-semibold leading-snug mb-2 line-clamp-2 min-h-[2.7em] break-words">
                  {it.name || it.code}
                </div>
                <dl className="grid gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[11px] text-gray-400">GMV</dt>
                    <dd className="text-sm font-bold tabular-nums">{fmtCompact(it._gmv, currency)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[11px] text-gray-400">주문</dt>
                    <dd className="text-xs tabular-nums">{fmtNum(it._orders)}건</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[11px] text-gray-400">수량</dt>
                    <dd className="text-xs tabular-nums">{fmtNum(it._qty)}개</dd>
                  </div>
                </dl>
              </div>
            </>
          );

          return (
            <div key={it.code + i} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-gray-300">
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="block text-inherit no-underline">
                  {inner}
                </a>
              ) : inner}
            </div>
          );
        })}
      </div>

      {rows.length === 0 && <EmptyState>조건에 맞는 상품이 없습니다.</EmptyState>}

      {rows.length > limit && (
        <button
          onClick={() => setLimit(limit + PAGE_SIZE)}
          className="mt-4 text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
        >
          더 보기 ({(rows.length - limit).toLocaleString('ko-KR')}개 남음)
        </button>
      )}
    </Card>
  );
}
