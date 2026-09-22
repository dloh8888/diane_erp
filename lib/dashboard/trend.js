// Keyword Trend 탭 계산 — Apps Script 의 buildKeywordTrend_ / buildSearchTrend_ 를 옮긴 것입니다.
//
// 두 가지를 다룹니다.
//  1) 키워드트렌드: 쇼피/라자다 상품 데이터. 최신 기준일을 '이번', 그 직전을 '전기간' 으로
//     잡아 순위 변동을 냅니다.
//  2) 검색트렌드: 구글 트렌드 지수. Trends 숫자는 그 차트 안에서의 0~100 상대값이라
//     그룹이 다르면 그대로 비교할 수 없습니다. 그래서 모든 그룹에 공통으로 들어가는
//     '앵커' 키워드를 찾아 그 값으로 나눠 스케일을 맞춥니다.

import { normBrand, matchKBrandEntry, isExcludedBrand } from './match';

export function normPlatform(v) {
  const t = String(v || '').trim().toLowerCase().replace(/\s/g, '');
  if (!t) return '';
  if (t.indexOf('shopee') !== -1 || t.indexOf('쇼피') !== -1) return 'Shopee';
  if (t.indexOf('lazada') !== -1 || t.indexOf('라자다') !== -1) return 'Lazada';
  return String(v).trim();
}

export function normPeriod(v) {
  const t = String(v || '').trim().toLowerCase().replace(/\s/g, '');
  if (!t) return '';
  if (['일', 'day', 'daily', '일별'].indexOf(t) !== -1) return '일';
  if (['주', 'week', 'weekly', '주간', '주별'].indexOf(t) !== -1) return '주';
  if (['월', 'month', 'monthly', '월간', '월별'].indexOf(t) !== -1) return '월';
  return String(v).trim();
}

/** 한국 브랜드 판별 — 목록에 있거나, 브랜드명에 한글이 들어 있으면 K로 봅니다. */
export function isKoreanBrand(brand, kbrandList, excludeList) {
  const b = String(brand || '').trim();
  if (!b) return false;
  if (isExcludedBrand(b, excludeList)) return false;
  if (matchKBrandEntry(b, kbrandList)) return true;
  return /[가-힣]/.test(b); // 한글 표기는 약한 근거 — 아니면 목록에 '제외' 로 적어주세요
}

/* ── 키워드트렌드 (쇼피/라자다 상품) ───────────────────────── */

export function buildKeywordTrend(rows, kbrandList, kbrandExclude) {
  const out = {
    periods: {}, byPeriod: {},
    platforms: [], countries: [], categories: [],
    rowCount: rows.length,
  };
  if (!rows.length) return out;

  const dateSet = {};
  for (const r of rows) {
    if (!r.period || !r.date) continue;
    if (!dateSet[r.period]) dateSet[r.period] = {};
    dateSet[r.period][r.date] = true;
    if (r.platform && out.platforms.indexOf(r.platform) === -1) out.platforms.push(r.platform);
    if (r.country && out.countries.indexOf(r.country) === -1) out.countries.push(r.country);
    if (r.category && out.categories.indexOf(r.category) === -1) out.categories.push(r.category);
  }
  out.platforms.sort();
  out.countries.sort();
  out.categories.sort();

  for (const pd of ['일', '주', '월']) {
    if (!dateSet[pd]) continue;
    const dates = Object.keys(dateSet[pd]).sort().reverse(); // 최신이 앞
    out.periods[pd] = dates;

    const cur = dates[0];
    const prev = dates[1] || '';
    const curRows = rows.filter((r) => r.period === pd && r.date === cur);
    const prevRows = rows.filter((r) => r.period === pd && r.date === prev);

    const prevIdx = {};
    for (const r of prevRows) prevIdx[r.key] = r;

    // 플랫폼×국가 안에서 누적판매량 순으로 순위
    const groups = {}, prevGroups = {};
    for (const r of curRows) {
      const g = r.platform + '|' + r.country;
      (groups[g] || (groups[g] = [])).push(r);
    }
    for (const r of prevRows) {
      const g = r.platform + '|' + r.country;
      (prevGroups[g] || (prevGroups[g] = [])).push(r);
    }
    for (const g of Object.keys(prevGroups)) {
      prevGroups[g].sort((a, b) => b.sold - a.sold);
      prevGroups[g].forEach((r, i) => { r.rank = i + 1; });
    }

    const list = [];
    for (const gk of Object.keys(groups)) {
      groups[gk].sort((a, b) => b.sold - a.sold);
      groups[gk].forEach((r, i) => {
        const pv = prevIdx[r.key];
        list.push({
          rank: i + 1,
          prevRank: pv ? pv.rank : null,
          rankDelta: pv ? pv.rank - (i + 1) : null,
          platform: r.platform, country: r.country, category: r.category,
          product: r.product, brand: r.brand,
          isK: isKoreanBrand(r.brand, kbrandList, kbrandExclude),
          sold: r.sold,
          prevSold: pv ? pv.sold : null,
          soldDelta: pv ? r.sold - pv.sold : null,
          asp: r.asp,
          prevAsp: pv ? pv.asp : null,
          aspGrowthPct: pv && pv.asp ? ((r.asp - pv.asp) / pv.asp) * 100 : null,
          revenue: r.sold * r.asp,
        });
      });
    }
    list.sort((a, b) => b.sold - a.sold);

    out.byPeriod[pd] = { date: cur, prevDate: prev, rows: list };
  }

  return out;
}

/* ── 브랜드 색인 (검색 키워드 ↔ 우리가 파는 브랜드 맞추기) ──── */

/** 두 이름이 같은 브랜드인가 — 통째로 같거나, 한쪽이 다른 쪽으로 시작(3글자 이상) */
function nameMatches(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.length >= 3 && a.indexOf(b) === 0) return true;
  if (a.length >= 3 && b.indexOf(a) === 0) return true;
  return false;
}

export function buildBrandIndex(byBrand, aliases) {
  const rows = (byBrand && byBrand.rows) || [];
  const idx = { exact: {}, list: [] };

  function add(key, entry, via) {
    if (!key) return;
    if (!idx.exact[key]) idx.exact[key] = entry;
    idx.list.push({ key, entry, via });
  }

  for (const b of rows) {
    const entry = { brand: b.name, brandEn: b.nameEn || '', gmv: b.dailyGmv, rank: b.rank };
    const ko = normBrand(b.name);
    const en = normBrand(b.nameEn);
    add(ko, entry, 'ko');
    if (en && en !== ko) add(en, entry, 'en');

    // K브랜드목록의 국문↔영문 짝으로 반대쪽 이름도 붙여둡니다
    // (실적에는 국문만 있고 검색 키워드는 영문인 경우가 대부분입니다)
    for (const a of aliases || []) {
      if (!a.ko || !a.en) continue;
      const hitKo = nameMatches(ko, a.ko) || (en && nameMatches(en, a.ko));
      const hitEn = nameMatches(ko, a.en) || (en && nameMatches(en, a.en));
      if (hitKo && a.en !== en) add(a.en, entry, 'alias-en');
      if (hitEn && a.ko !== ko) add(a.ko, entry, 'alias-ko');
    }
  }

  // 긴 이름부터 보게 정렬해 두면 '삼양' 보다 '삼양식품' 이 먼저 잡힙니다
  idx.list.sort((x, y) => y.key.length - x.key.length);
  return idx;
}

function withHow(entry, how, key) {
  return { brand: entry.brand, brandEn: entry.brandEn, gmv: entry.gmv, rank: entry.rank, how, matchedKey: key };
}

export function matchBrandForKeyword(keyword, brandIndex) {
  const raw = String(keyword == null ? '' : keyword);
  const k = normBrand(raw);
  if (!k || !brandIndex || !brandIndex.list) return null;

  if (brandIndex.exact[k]) return withHow(brandIndex.exact[k], 'exact', k);

  const tokens = raw
    .toLowerCase()
    .split(/[\s\-_.,'"()[\]·&/]+/)
    .map((t) => normBrand(t))
    .filter((t) => t && t.length >= 2);
  for (const t of tokens) {
    if (brandIndex.exact[t]) return withHow(brandIndex.exact[t], 'token', t);
  }

  // 앞말이 같음 — 가장 긴 이름으로 맞춘 것을 고릅니다
  let best = null;
  for (const it of brandIndex.list) {
    const key = it.key;
    let hit = 0;
    if (key.length >= 3 && k.indexOf(key) === 0) hit = key.length;
    else if (k.length >= 3 && key.indexOf(k) === 0) hit = k.length;
    else {
      for (const t of tokens) {
        if (key.length >= 3 && t.indexOf(key) === 0) { hit = key.length; break; }
        if (t.length >= 3 && key.indexOf(t) === 0) { hit = t.length; break; }
      }
    }
    if (hit && (!best || hit > best.hit)) best = { hit, it };
  }
  if (best) return withHow(best.it.entry, 'prefix', best.it.key);
  return null;
}

/* ── 검색트렌드 (구글 트렌드) ──────────────────────────────── */

/** 앵커 찾기 — 같은 (국가, 카테고리) 안에서 두 그룹 이상에 나오는 키워드가 앵커입니다. */
function findAnchors(rows) {
  const seen = {}; // 국가|카테고리|키워드 -> {그룹들}
  for (const r of rows) {
    const k = r.country + '|' + r.category + '|' + r.keyword;
    (seen[k] || (seen[k] = {}))[r.group] = true;
  }
  const anchors = {};
  for (const k of Object.keys(seen)) {
    const groups = Object.keys(seen[k]).length;
    if (groups < 2) continue;
    const parts = k.split('|');
    const ck = parts[0] + '|' + parts[1];
    if (!anchors[ck] || groups > anchors[ck].n) {
      anchors[ck] = { kw: parts.slice(2).join('|'), n: groups };
    }
  }
  const out = {};
  for (const ck of Object.keys(anchors)) out[ck] = anchors[ck].kw;
  return out;
}

export function buildSearchTrend(rows, brandIndex) {
  const out = {
    weeks: [], countries: [], categories: [], types: [],
    keywords: [], rowCount: rows.length, anchored: 0, anchors: {},
  };
  if (!rows.length) return out;

  const anchors = findAnchors(rows);
  out.anchors = anchors;

  // 그룹·주차별 앵커 지수 (스케일 보정용 분모)
  const anchorVal = {};
  for (const r of rows) {
    const a = anchors[r.country + '|' + r.category];
    if (a && r.keyword === a) anchorVal[r.group + '|' + r.week] = r.value;
  }

  const map = {}, weekSet = {};
  for (const r of rows) {
    if (!r.keyword || !r.week) continue;
    weekSet[r.week] = true;
    if (r.country && out.countries.indexOf(r.country) === -1) out.countries.push(r.country);
    if (r.category && out.categories.indexOf(r.category) === -1) out.categories.push(r.category);
    if (r.type && out.types.indexOf(r.type) === -1) out.types.push(r.type);

    const key = r.country + '|' + r.category + '|' + r.keyword;
    let e = map[key];
    if (!e) {
      e = map[key] = {
        country: r.country, category: r.category, type: r.type,
        keyword: r.keyword, group: r.group,
        isAnchor: anchors[r.country + '|' + r.category] === r.keyword,
        series: {},
      };
    }
    // 앵커로 나눠 100 기준으로 맞춥니다 (앵커를 못 찾으면 원래 값 그대로)
    const av = anchorVal[r.group + '|' + r.week];
    const v = av && av > 0 ? (r.value / av) * 100 : r.value;
    if (av && av > 0) out.anchored++;
    const prev = e.series[r.week];
    e.series[r.week] = prev === undefined ? v : (prev + v) / 2;
  }

  const weeks = Object.keys(weekSet).sort();
  out.weeks = weeks;
  const last = weeks[weeks.length - 1];
  const prevW = weeks[weeks.length - 2];

  out.keywords = Object.keys(map).map((k) => {
    const e = map[k];
    const seriesArr = weeks.map((w) => {
      const v = e.series[w];
      return v === undefined ? null : Math.round(v * 10) / 10;
    });
    const cur = e.series[last];
    const pre = e.series[prevW];
    const recent = seriesArr.slice(-4).filter((v) => v !== null);
    const avg4 = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;

    const brand = brandIndex ? matchBrandForKeyword(e.keyword, brandIndex) : null;

    return {
      country: e.country, category: e.category, type: e.type,
      keyword: e.keyword, isAnchor: e.isAnchor,
      series: seriesArr,
      value: cur === undefined ? null : Math.round(cur * 10) / 10,
      prevValue: pre === undefined ? null : Math.round(pre * 10) / 10,
      wowPct: cur !== undefined && pre ? ((cur - pre) / pre) * 100 : null,
      vsAvg4Pct: cur !== undefined && avg4 ? ((cur - avg4) / avg4) * 100 : null,
      brand: brand ? brand.brand : '',
      brandEn: brand ? brand.brandEn || '' : '',
      brandGmv: brand ? brand.gmv : null,
      brandRank: brand ? brand.rank : null,
      sold: !!brand,
      matchedBy: brand ? brand.how : '',
      matchedName: brand ? brand.matchedKey : '',
    };
  });

  // 국가·카테고리 안에서 검색 순위를 매깁니다
  const byCC = {};
  for (const k of out.keywords) {
    if (k.isAnchor) continue;
    (byCC[k.country + '|' + k.category] || (byCC[k.country + '|' + k.category] = [])).push(k);
  }
  for (const cc of Object.keys(byCC)) {
    byCC[cc].sort((a, b) => (b.value || 0) - (a.value || 0));
    byCC[cc].forEach((k, i) => {
      k.searchRank = i + 1;
      k.searchTotal = byCC[cc].length;
      // 기회 지수 — 검색은 앞선 순위인데 우리 매출 순위는 뒤쳐진 만큼이 기회입니다.
      // 아예 안 파는 브랜드는 가장 큰 기회로 봅니다.
      if (k.type === 'K브랜드' || k.type === '경쟁브랜드') {
        k.opportunity = k.sold ? k.brandRank - k.searchRank : byCC[cc].length - k.searchRank + 1;
        k.untapped = !k.sold;
      } else {
        k.opportunity = null;
        k.untapped = false;
      }
    });
  }

  // 이름을 못 붙인 브랜드 키워드 — 정말 안 파는 건지, 이름이 달라서 못 붙은 건지 확인용
  out.unmatched = out.keywords
    .filter((k) => !k.isAnchor && !k.sold && (k.type === 'K브랜드' || k.type === '경쟁브랜드'))
    .map((k) => ({ keyword: k.keyword, country: k.country, category: k.category, type: k.type, value: k.value }))
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  out.latestWeek = last || '';
  out.prevWeek = prevW || '';
  return out;
}
