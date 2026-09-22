// 대시보드 계산 엔진 — Apps Script(Code.gs)의 computeDashboard 및 관련 함수를
// 그대로 옮긴 것입니다. 숫자가 예전 대시보드와 똑같이 나와야 하므로
// 계산 방식(특히 '일평균'의 분모)을 바꾸지 않았습니다.
//
// 핵심 규칙 두 가지만 기억하면 됩니다.
//  1) 일평균 = 그 국가가 '실제로 진행한 날 수' 로 나눕니다.
//     (국가마다 프로모션 진행일이 다르기 때문에 전체 날짜로 나누면 왜곡됩니다)
//  2) 카테고리·브랜드의 일평균도 분모는 '그 국가의 진행일수' 로 통일합니다.
//     그래야 전부 더했을 때 국가 합계와 정확히 맞아떨어집니다.

import { TYPE_GD, TYPE_BAU, UNCLASSIFIED, PRODUCT_URL_TEMPLATE, IMAGE_URL_TEMPLATES, ITEM_CATEGORIES } from './constants';
import { canonItemCat, normalizeType, isKBrand, promoTier, daysBetween, addDays } from './match';

/* ── 작은 계산 도우미 ───────────────────────────────────────── */

export function sum(rows, key) {
  let total = 0;
  for (const r of rows) total += r[key] || 0;
  return total;
}
const sumBy = sum;

export function pctChange(now, base) {
  if (!base) return null;
  return ((now - base) / base) * 100;
}

export function uniqueDates(rows) {
  const seen = {};
  const out = [];
  for (const r of rows) {
    if (r.date && !seen[r.date]) {
      seen[r.date] = true;
      out.push(r.date);
    }
  }
  return out;
}

/**
 * 하루 평균 '판매 아이템수' — 날짜별로 서로 다른 상품번호를 세어 평균냅니다.
 * 같은 상품이 하루에 여러 줄로 나뉘어 있어도 1개로 봅니다.
 */
export function dailyDistinctItems(rows, dayCount) {
  if (!dayCount) return 0;
  const byDate = {};
  for (const r of rows) {
    if (!r.product) continue;
    if (!byDate[r.date]) byDate[r.date] = {};
    byDate[r.date][r.product] = true;
  }
  let total = 0;
  for (const date of Object.keys(byDate)) total += Object.keys(byDate[date]).length;
  return total / dayCount;
}

export function pickFocusMonth(promotions) {
  if (!promotions.length) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const counts = {};
  for (const p of promotions) {
    const key = p.start.slice(0, 7);
    counts[key] = (counts[key] || 0) + 1;
  }
  let best = null;
  for (const k of Object.keys(counts)) {
    if (!best || counts[k] > counts[best]) best = k;
  }
  return { year: Number(best.slice(0, 4)), month: Number(best.slice(5, 7)) };
}

/* ── 데이터 기준일자 ─────────────────────────────────────────── */

/**
 * 실적에 값이 들어온 마지막 날이 '데이터 기준일'입니다.
 * 잔여일수는 캘린더의 Gmarket Day 날짜 중 아직 안 지난 날의 수입니다.
 * (행사가 9/8~9/9, 9/20~9/21 처럼 띄엄띄엄이면 사이의 평일은 세지 않습니다)
 */
export function buildPeriod(gdRows, bauRows, allRows, promotions) {
  function span(rows) {
    let first = '', last = '';
    for (const r of rows || []) {
      if (!r.date) continue;
      if (!first || r.date < first) first = r.date;
      if (!last || r.date > last) last = r.date;
    }
    return { first, last };
  }

  const gdSpan = span(gdRows), bauSpan = span(bauRows), allSpan = span(allRows);

  let calStart = '', calEnd = '';
  for (const p of promotions || []) {
    if (p.type !== TYPE_GD) continue;
    if (p.start && (!calStart || p.start < calStart)) calStart = p.start;
    if (p.end && (!calEnd || p.end > calEnd)) calEnd = p.end;
  }

  const dataLast = gdSpan.last || allSpan.last || '';

  // 캘린더에 적힌 Gmarket Day 날짜를 전부 펼칩니다 (국가가 달라도 같은 날은 하루로)
  const gdDateSet = {};
  for (const p of promotions || []) {
    if (p.type !== TYPE_GD || !p.start) continue;
    const end = p.end || p.start;
    const n = daysBetween(p.start, end);
    if (n < 0 || n > 400) continue; // 날짜가 뒤집혔거나 터무니없이 길면 건너뜀
    for (let i = 0; i <= n; i++) gdDateSet[addDays(p.start, i)] = true;
  }
  const gdPlanned = Object.keys(gdDateSet).sort();

  const remainingDates = dataLast
    ? gdPlanned.filter((d) => d > dataLast)
    : gdPlanned.slice();

  return {
    gdFirst: gdSpan.first, gdLast: gdSpan.last,
    bauFirst: bauSpan.first, bauLast: bauSpan.last,
    dataFirst: allSpan.first, dataLast,
    calStart, calEnd,
    remainingDays: remainingDates.length,
    remainingFirst: remainingDates.length ? remainingDates[0] : '',
    remainingLast: remainingDates.length ? remainingDates[remainingDates.length - 1] : '',
    gdPlannedDays: gdPlanned.length,
    gdDoneDays: gdPlanned.filter((d) => dataLast && d <= dataLast).length,
    gdDayCount: uniqueDates(gdRows).length,
    calDayCount: calStart && calEnd ? daysBetween(calStart, calEnd) + 1 : 0,
  };
}

/* ── 카테고리(대대분류)별 ───────────────────────────────────── */

export function buildCategoryStats(rows, countries, gdDaysByCountry, bauDaysByCountry) {
  if (!rows || !rows.length) return [];

  let names = [];
  let hasAnyCategory = false;
  for (const r of rows) {
    const c = (r.category || '').trim();
    if (c) hasAnyCategory = true;
    const key = c || UNCLASSIFIED;
    if (names.indexOf(key) === -1) names.push(key);
  }
  if (!hasAnyCategory) return []; // 카테고리 칸 자체가 없으면 섹션을 만들지 않습니다
  if (names.length > 40) names = names.slice(0, 40);

  return names.map((name) => {
    const catRows = rows.filter((r) => ((r.category || '').trim() || UNCLASSIFIED) === name);
    const gd = catRows.filter((r) => r.type === TYPE_GD);
    const bau = catRows.filter((r) => r.type === TYPE_BAU);

    let dailyGmv = 0, dailyOrders = 0, dailyQty = 0, dailyItems = 0;
    let bauDailyGmv = 0, bauDailyOrders = 0, bauDailyQty = 0, bauDailyItems = 0;
    const byCountryDaily = {};

    for (const country of countries) {
      const gdDays = gdDaysByCountry[country] || 0;
      const bauDays = bauDaysByCountry[country] || 0;

      const gdC = gd.filter((r) => r.country === country);
      const bauC = bau.filter((r) => r.country === country);

      const cDailyGmv = gdDays ? sum(gdC, 'gmv') / gdDays : 0;
      const cDailyOrders = gdDays ? sum(gdC, 'orders') / gdDays : 0;
      const cDailyQty = gdDays ? sum(gdC, 'qty') / gdDays : 0;
      const cDailyItems = dailyDistinctItems(gdC, gdDays);

      byCountryDaily[country] = { gmv: cDailyGmv, orders: cDailyOrders, qty: cDailyQty, items: cDailyItems };
      dailyGmv += cDailyGmv;
      dailyOrders += cDailyOrders;
      dailyQty += cDailyQty;
      dailyItems += cDailyItems;
      bauDailyGmv += bauDays ? sum(bauC, 'gmv') / bauDays : 0;
      bauDailyOrders += bauDays ? sum(bauC, 'orders') / bauDays : 0;
      bauDailyQty += bauDays ? sum(bauC, 'qty') / bauDays : 0;
      bauDailyItems += dailyDistinctItems(bauC, bauDays);
    }

    const totalGmv = sum(gd, 'gmv');
    const totalOrders = sum(gd, 'orders');
    const bauGmvTotal = sum(bau, 'gmv');
    const bauOrdersTotal = sum(bau, 'orders');
    const aovVal = totalOrders ? totalGmv / totalOrders : null;
    const bauAovVal = bauOrdersTotal ? bauGmvTotal / bauOrdersTotal : null;

    return {
      category: name,
      gmv: totalGmv,
      orders: totalOrders,
      qty: sum(gd, 'qty'),
      dailyGmv, dailyOrders, dailyQty,
      bauDailyGmv, bauDailyOrders, bauDailyQty,
      qtyGrowthPct: pctChange(dailyQty, bauDailyQty),
      dailyItems, bauDailyItems,
      itemsGrowthPct: pctChange(dailyItems, bauDailyItems),
      aov: aovVal,
      bauAov: bauAovVal,
      aovGrowthPct: aovVal !== null && bauAovVal ? ((aovVal - bauAovVal) / bauAovVal) * 100 : null,
      growthPct: pctChange(dailyGmv, bauDailyGmv),
      ordersGrowthPct: pctChange(dailyOrders, bauDailyOrders),
      byCountryDaily,
    };
  }).sort((a, b) => b.dailyGmv - a.dailyGmv);
}

/* ── 랭킹 집계 (대분류별 / 브랜드별) ────────────────────────── */

export function buildRankedStats(rows, keyOf, countries, gdDaysByCountry, bauDaysByCountry, opts = {}) {
  const map = {};
  const order = [];

  for (const r of rows) {
    const side = r.type === TYPE_GD ? 'gd' : r.type === TYPE_BAU ? 'bau' : '';
    if (!side) continue;

    const key = String(keyOf(r) || '').trim() || UNCLASSIFIED;
    let e = map[key];
    if (!e) {
      e = map[key] = {
        name: key, nameEn: '', parent: '', isK: false,
        topCat: '', topTally: {},
        gd: { gmv: 0, orders: 0, qty: 0 },
        bau: { gmv: 0, orders: 0, qty: 0 },
        byCountry: {},
        parentTally: {},
      };
      order.push(key);
    }

    e[side].gmv += r.gmv || 0;
    e[side].orders += r.orders || 0;
    e[side].qty += r.qty || 0;

    let bc = e.byCountry[r.country];
    if (!bc) bc = e.byCountry[r.country] = { gd: { gmv: 0, orders: 0 }, bau: { gmv: 0, orders: 0 } };
    bc[side].gmv += r.gmv || 0;
    bc[side].orders += r.orders || 0;

    if (side === 'gd') {
      if (r.isK) e.isK = true;
      if (!e.nameEn && opts.nameEnOf) e.nameEn = String(opts.nameEnOf(r) || '').trim();
      if (opts.parentOf) {
        const pk = String(opts.parentOf(r) || '').trim() || UNCLASSIFIED;
        e.parentTally[pk] = (e.parentTally[pk] || 0) + (r.gmv || 0);
      }
      if (opts.topOf) {
        const tk = canonItemCat(opts.topOf(r));
        e.topTally[tk] = (e.topTally[tk] || 0) + (r.gmv || 0);
      }
    }
  }

  // 총액 → 일평균 (분모는 그 국가의 진행일수)
  const list = order.map((key) => {
    const e = map[key];
    let dailyGmv = 0, bauDailyGmv = 0;
    const byCountry = {};

    for (const c of countries) {
      const bc = e.byCountry[c];
      const gdD = gdDaysByCountry[c] || 0;
      const bauD = bauDaysByCountry[c] || 0;
      const g = bc && gdD ? bc.gd.gmv / gdD : 0;
      const b = bc && bauD ? bc.bau.gmv / bauD : 0;
      byCountry[c] = { gmv: g, bauGmv: b, growthPct: pctChange(g, b) };
      dailyGmv += g;
      bauDailyGmv += b;
    }

    let parent = '', best = -1;
    for (const pk of Object.keys(e.parentTally)) {
      if (e.parentTally[pk] > best) { best = e.parentTally[pk]; parent = pk; }
    }
    let topCat = '', tBest = -1;
    for (const tk of Object.keys(e.topTally)) {
      if (e.topTally[tk] > tBest) { tBest = e.topTally[tk]; topCat = tk; }
    }

    const aov = e.gd.orders ? e.gd.gmv / e.gd.orders : null;
    const bauAov = e.bau.orders ? e.bau.gmv / e.bau.orders : null;

    return {
      name: e.name, nameEn: e.nameEn, parent, topCat, isK: e.isK,
      gmv: e.gd.gmv, orders: e.gd.orders, qty: e.gd.qty,
      bauGmv: e.bau.gmv,
      dailyGmv, bauDailyGmv,
      growthPct: pctChange(dailyGmv, bauDailyGmv),
      aov, bauAov,
      aovGrowthPct: aov !== null && bauAov ? ((aov - bauAov) / bauAov) * 100 : null,
      byCountry,
    };
  });

  // 랭킹: GD 일평균 GMV 기준 / BAU 일평균 GMV 기준 각각
  let gdRank = list.slice().sort((a, b) => b.dailyGmv - a.dailyGmv);
  const bauRank = list.slice().sort((a, b) => b.bauDailyGmv - a.bauDailyGmv);
  const bauPos = {};
  bauRank.forEach((x, i) => { bauPos[x.name] = i + 1; });

  gdRank.forEach((x, i) => {
    x.rank = i + 1;
    x.bauRank = x.bauDailyGmv > 0 ? bauPos[x.name] : null;
    x.rankDelta = x.bauRank === null ? null : x.bauRank - x.rank; // 양수 = 순위 상승
  });

  let totalDaily = 0;
  for (const x of gdRank) totalDaily += x.dailyGmv;
  for (const x of gdRank) x.sharePct = totalDaily ? (x.dailyGmv / totalDaily) * 100 : null;

  const total = gdRank.length;
  if (opts.limit && total > opts.limit) gdRank = gdRank.slice(0, opts.limit);
  return { rows: gdRank, total, shown: gdRank.length };
}

/** 브랜드가 자기 대분류 안에서 차지하는 비중 (GD / BAU) 을 붙입니다. */
export function attachParentShare(brands, mids) {
  const gdByParent = {}, bauByParent = {};
  for (const m of mids) {
    gdByParent[m.name] = m.dailyGmv;
    bauByParent[m.name] = m.bauDailyGmv;
  }
  for (const b of brands) {
    const g = gdByParent[b.parent] || 0;
    const ba = bauByParent[b.parent] || 0;
    b.parentSharePct = g ? (b.dailyGmv / g) * 100 : null;
    b.bauParentSharePct = ba ? (b.bauDailyGmv / ba) * 100 : null;
    // 비중이라 %p 로 비교합니다 (비율의 비율은 읽기 어렵습니다)
    b.parentShareDeltaPp =
      b.parentSharePct === null || b.bauParentSharePct === null
        ? null
        : b.parentSharePct - b.bauParentSharePct;
  }
}

/* ── By Item — 상품 단위 집계 ──────────────────────────────── */

export function buildItemStats(rows, countries, gdDaysByCountry, bauDaysByCountry, perCatLimit) {
  const map = {};
  const order = [];

  for (const r of rows) {
    const side = r.type === TYPE_GD ? 'g' : r.type === TYPE_BAU ? 'b' : '';
    if (!side) continue;
    const code = String(r.product || r.productName || '').trim();
    if (!code) continue;

    let e = map[code];
    if (!e) {
      e = map[code] = {
        code: r.product || '',
        name: r.productName || r.product || '',
        brand: r.brand || '', cat: '', mid: r.midCategory || '',
        image: '', link: '', isK: false,
        catTally: {}, byCountry: {},
      };
      order.push(code);
    }
    if (!e.name && r.productName) e.name = r.productName;
    if (!e.brand && r.brand) e.brand = r.brand;
    if (!e.mid && r.midCategory) e.mid = r.midCategory;
    if (!e.image && r.image) e.image = r.image;
    if (!e.link && r.link) e.link = r.link;
    if (side === 'g' && r.isK) e.isK = true;
    if (side === 'g') {
      const ck = canonItemCat(r.category);
      e.catTally[ck] = (e.catTally[ck] || 0) + (r.gmv || 0);
    }

    let bc = e.byCountry[r.country];
    if (!bc) bc = e.byCountry[r.country] = { g: [0, 0, 0], b: [0, 0, 0] };
    bc[side][0] += r.gmv || 0;
    bc[side][1] += r.orders || 0;
    bc[side][2] += r.qty || 0;
  }

  // 대표 대대분류 + 총계
  const list = order.map((k) => {
    const e = map[k];
    let best = '', bv = -1;
    for (const c of Object.keys(e.catTally)) {
      if (e.catTally[c] > bv) { bv = e.catTally[c]; best = c; }
    }
    e.cat = best || UNCLASSIFIED;
    let g = 0;
    for (const cc of Object.keys(e.byCountry)) g += e.byCountry[cc].g[0];
    e.gdGmv = g;
    delete e.catTally;
    return e;
  });

  // 대대분류별 상위 N개만 남깁니다 (전송량이 커지지 않도록)
  const byCat = {};
  for (const e of list) (byCat[e.cat] || (byCat[e.cat] = [])).push(e);

  let kept = [];
  const catInfo = [];
  for (const cat of Object.keys(byCat)) {
    let arr = byCat[cat].sort((a, b) => b.gdGmv - a.gdGmv);
    const total = arr.length;
    if (perCatLimit && total > perCatLimit) arr = arr.slice(0, perCatLimit);
    kept = kept.concat(arr);
    catInfo.push({
      name: cat, total, shown: arr.length,
      gmv: byCat[cat].reduce((s, x) => s + x.gdGmv, 0),
    });
  }

  // 탭 순서: 정해둔 목록 먼저, 나머지는 GMV 큰 순
  const known = [], unknown = [];
  for (const c of catInfo) (ITEM_CATEGORIES.indexOf(c.name) !== -1 ? known : unknown).push(c);
  known.sort((a, b) => ITEM_CATEGORIES.indexOf(a.name) - ITEM_CATEGORIES.indexOf(b.name));
  unknown.sort((a, b) => b.gmv - a.gmv);

  const days = {};
  for (const c of countries) {
    days[c] = { gd: gdDaysByCountry[c] || 0, bau: bauDaysByCountry[c] || 0 };
  }

  return {
    items: kept,
    categories: known.concat(unknown),
    countries,
    days,
    perCatLimit: perCatLimit || 0,
    imageTemplates: IMAGE_URL_TEMPLATES,
    productUrlTemplate: PRODUCT_URL_TEMPLATE,
  };
}

/* ── K브랜드 / 非K브랜드 로 나눠 본 화면 ────────────────────── */

export function buildKView(rows, countries, gdDaysByCountry, bauDaysByCountry, baseByCountry) {
  const baseMap = {};
  for (const c of baseByCountry || []) baseMap[c.country] = c;

  const byCountry = countries.map((c) => {
    const gd = rows.filter((r) => r.type === TYPE_GD && r.country === c);
    const bau = rows.filter((r) => r.type === TYPE_BAU && r.country === c);
    const gdDays = gdDaysByCountry[c] || 0;
    const bauDays = bauDaysByCountry[c] || 0;

    const gdGmv = sum(gd, 'gmv'), bauGmv = sum(bau, 'gmv');
    const gdDailyGmv = gdDays ? gdGmv / gdDays : 0;
    const bauDailyGmv = bauDays ? bauGmv / bauDays : 0;
    const gdOrders = sum(gd, 'orders');
    const bauOrders = sum(bau, 'orders');
    const kGmv = sum(gd.filter((r) => r.isK), 'gmv');
    const base = baseMap[c] || {};

    return {
      country: c,
      gdDays, bauDays,
      gdGmv, bauGmv,
      gdDailyGmv, bauDailyGmv,
      growthPct: pctChange(gdDailyGmv, bauDailyGmv),
      orders: gdOrders, bauOrders,
      gdDailyOrders: gdDays ? gdOrders / gdDays : 0,
      bauDailyOrders: bauDays ? bauOrders / bauDays : 0,
      qty: sum(gd, 'qty'),
      kbrandGmv: kGmv,
      kbrandShare: gdGmv ? (kGmv / gdGmv) * 100 : null,
      // 아래 셋은 브랜드로 쪼갤 수 없는 값이라 전체 기준 그대로입니다
      visitors: base.visitors || 0,
      conversionPct: base.conversionPct === undefined ? null : base.conversionPct,
      spend: base.spend || 0,
      budget: base.budget || 0,
      budgetUsedPct: base.budgetUsedPct === undefined ? null : base.budgetUsedPct,
    };
  }).sort((a, b) => {
    const d = (b.gdDailyGmv || 0) - (a.gdDailyGmv || 0);
    return d !== 0 ? d : a.country < b.country ? -1 : a.country > b.country ? 1 : 0;
  });

  const order = byCountry.map((c) => c.country);

  return {
    byCountry,
    countries: order,
    byCategory: buildCategoryStats(rows, order, gdDaysByCountry, bauDaysByCountry),
    byMidCategory: buildRankedStats(rows, (r) => r.midCategory, order, gdDaysByCountry, bauDaysByCountry, {
      parentOf: (r) => r.category,
      nameEnOf: (r) => r.midCategoryEn,
      limit: 200,
    }),
    summary: (() => {
      const gdDaily = sumBy(byCountry, 'gdDailyGmv');
      const bauDaily = sumBy(byCountry, 'bauDailyGmv');
      return {
        gdDailyGmv: gdDaily,
        bauDailyGmv: bauDaily,
        growthPct: pctChange(gdDaily, bauDaily),
        gdTotalGmv: sumBy(byCountry, 'gdGmv'),
      };
    })(),
  };
}

/* ── 진단 (숫자가 0으로 나올 때 원인을 화면에서 바로 알 수 있게) ── */

export function buildDiagnostics(dailyRows, classifiedRows, byCountry, kbrandSource) {
  const brandRows = classifiedRows || [];
  byCountry = byCountry || [];

  const brandTypeCounts = {};
  for (const r of brandRows) {
    const key = (r.brandType || '').trim() || '(빈칸)';
    brandTypeCounts[key] = (brandTypeCounts[key] || 0) + 1;
  }
  const brandTypes = Object.keys(brandTypeCounts)
    .map((k) => ({ value: k, count: brandTypeCounts[k], matched: isKBrand(k) }))
    .sort((a, b) => b.count - a.count);

  const brandAgg = {};
  for (const r of brandRows) {
    if (!r.brand) continue;
    if (!brandAgg[r.brand]) {
      brandAgg[r.brand] = {
        brand: r.brand, isK: false, matchedBy: '', matchedEntry: '',
        excluded: !!r.excluded, gmv: 0,
      };
    }
    brandAgg[r.brand].gmv += r.gmv || 0;
    if (r.excluded) brandAgg[r.brand].excluded = true;
    if (r.isK) {
      brandAgg[r.brand].isK = true;
      brandAgg[r.brand].matchedBy = r.matchedBy || 'type';
      if (r.matchedEntry) brandAgg[r.brand].matchedEntry = r.matchedEntry;
    }
  }
  const brands = Object.keys(brandAgg).map((k) => brandAgg[k]).sort((a, b) => b.gmv - a.gmv);

  const counts = {};
  for (const r of dailyRows) {
    const key = (r.rawType || r.type || '').trim() || '(빈칸)';
    counts[key] = (counts[key] || 0) + 1;
  }
  const types = Object.keys(counts).map((k) => {
    const normalized = normalizeType(k);
    const matched = normalized === TYPE_GD || normalized === TYPE_BAU;
    return { value: k, count: counts[k], matched, matchedAs: matched ? normalized : '' };
  }).sort((a, b) => b.count - a.count);

  return {
    rowCount: dailyRows.length,
    types,
    noDateRows: dailyRows.filter((r) => !r.date).length,
    zeroGmvRows: dailyRows.filter((r) => !r.gmv).length,
    kbrandSource: kbrandSource || 'column',
    brandRowCount: brandRows.length,
    brandTypes,
    brands,
    brandGdRowCount: brandRows.filter((r) => r.type === TYPE_GD).length,
    categoryKRowCount: brandRows.filter((r) => r.isKByCategory).length,
    categoryKGmv: brandRows
      .filter((r) => r.isKByCategory && r.type === TYPE_GD)
      .reduce((s, r) => s + (r.gmv || 0), 0),
    kbrandTotal: byCountry.reduce((s, c) => s + (c.kbrandGmv || 0), 0),
    brandSheetTotal: byCountry.reduce((s, c) => s + (c.brandSheetGmv || 0), 0),
    dailySheetGdTotal: byCountry.reduce((s, c) => s + (c.gdGmv || 0), 0),
  };
}

/* ── 메인 ──────────────────────────────────────────────────── */

export function computeDashboard(dailyRows, promoRows, budgetRows, brandRows, currency) {
  brandRows = brandRows || [];

  // K브랜드를 어디서 판별할지:
  //  1순위 일별실적에 브랜드/카테고리 칸이 있으면 거기서 (별도 시트 불필요)
  //  2순위 브랜드실적 시트가 따로 있으면 거기서
  //  3순위 둘 다 없으면 일별실적의 'K브랜드GMV' 칸을 그대로 사용
  const dailyHasBrandInfo = dailyRows.some((r) => r.brand || r.category);
  const classifiedRows = dailyHasBrandInfo ? dailyRows : brandRows;
  const kbrandSource = dailyHasBrandInfo ? 'daily' : brandRows.length ? 'brandSheet' : 'column';

  const gd = dailyRows.filter((r) => r.type === TYPE_GD);
  const bau = dailyRows.filter((r) => r.type === TYPE_BAU);

  let countries = [];
  for (const r of dailyRows) {
    if (countries.indexOf(r.country) === -1) countries.push(r.country);
  }
  countries.sort();

  // ── 국가별 ──
  let byCountry = countries.map((c) => {
    const gdC = gd.filter((r) => r.country === c);
    const bauC = bau.filter((r) => r.country === c);

    const gdDayCount = uniqueDates(gdC).length;
    const bauDayCount = uniqueDates(bauC).length;

    const gdGmv = sum(gdC, 'gmv');
    const bauGmv = sum(bauC, 'gmv');
    const gdOrders = sum(gdC, 'orders');
    const bauOrders = sum(bauC, 'orders');
    const gdQty = sum(gdC, 'qty');
    const bauQty = sum(bauC, 'qty');

    const gdDailyGmv = gdDayCount ? gdGmv / gdDayCount : 0;
    const bauDailyGmv = bauDayCount ? bauGmv / bauDayCount : 0;
    const gdDailyOrders = gdDayCount ? gdOrders / gdDayCount : 0;
    const bauDailyOrders = bauDayCount ? bauOrders / bauDayCount : 0;
    const gdDailyQty = gdDayCount ? gdQty / gdDayCount : 0;
    const bauDailyQty = bauDayCount ? bauQty / bauDayCount : 0;

    const gdDailyItems = dailyDistinctItems(gdC, gdDayCount);
    const bauDailyItems = dailyDistinctItems(bauC, bauDayCount);

    const gdVisitors = sum(gdC, 'visitors');
    const gdSpend = sum(gdC, 'spend');

    const clsGdC = classifiedRows.filter((r) => r.type === TYPE_GD && r.country === c);
    const gdKbrand = kbrandSource === 'column'
      ? sum(gdC, 'kbrandGmv')
      : sum(clsGdC.filter((r) => r.isK), 'gmv');
    const brandSheetGmv = clsGdC.length ? sum(clsGdC, 'gmv') : null;

    const budgetRow = budgetRows.filter((b) => b.country === c && (!b.type || b.type === TYPE_GD))[0];
    const budgetAmount = budgetRow ? budgetRow.budget : 0;

    return {
      country: c,
      gdDays: gdDayCount, bauDays: bauDayCount,
      gdGmv, bauGmv,
      gdDailyGmv, bauDailyGmv,
      growthPct: bauDailyGmv ? ((gdDailyGmv - bauDailyGmv) / bauDailyGmv) * 100 : null,
      orders: gdOrders, bauOrders,
      gdDailyOrders, bauDailyOrders,
      ordersGrowthPct: bauDailyOrders ? ((gdDailyOrders - bauDailyOrders) / bauDailyOrders) * 100 : null,

      // AOV(객단가) = GMV ÷ 주문건수. 비율이라 국가별로 더하지 않고 각각 나눠서 구합니다.
      aov: gdOrders ? gdGmv / gdOrders : null,
      bauAov: bauOrders ? bauGmv / bauOrders : null,
      aovGrowthPct: bauOrders && gdOrders && bauGmv
        ? ((gdGmv / gdOrders - bauGmv / bauOrders) / (bauGmv / bauOrders)) * 100
        : null,
      gdDailyItems, bauDailyItems,
      itemsGrowthPct: pctChange(gdDailyItems, bauDailyItems),

      qty: gdQty, bauQty,
      gdDailyQty, bauDailyQty,
      qtyGrowthPct: bauDailyQty ? ((gdDailyQty - bauDailyQty) / bauDailyQty) * 100 : null,
      kbrandGmv: gdKbrand,
      kbrandShare: gdGmv ? (gdKbrand / gdGmv) * 100 : null,
      brandSheetGmv,
      visitors: gdVisitors,
      conversionPct: gdVisitors ? (gdOrders / gdVisitors) * 100 : null,
      spend: gdSpend,
      budget: budgetAmount,
      budgetUsedPct: budgetAmount ? (gdSpend / budgetAmount) * 100 : null,
    };
  });

  // 화면에 보이는 값(일평균 GMV) 기준으로 국가를 큰 순서대로 재배치합니다.
  byCountry.sort((a, b) => {
    const d = (b.gdDailyGmv || 0) - (a.gdDailyGmv || 0);
    return d !== 0 ? d : a.country < b.country ? -1 : a.country > b.country ? 1 : 0;
  });
  countries = byCountry.map((c) => c.country);

  const gdDaysByCountry = {}, bauDaysByCountry = {};
  for (const c of byCountry) {
    gdDaysByCountry[c.country] = c.gdDays;
    bauDaysByCountry[c.country] = c.bauDays;
  }

  const byCategory = buildCategoryStats(classifiedRows, countries, gdDaysByCountry, bauDaysByCountry);

  const byMidCategory = buildRankedStats(classifiedRows, (r) => r.midCategory, countries, gdDaysByCountry, bauDaysByCountry, {
    parentOf: (r) => r.category,
    nameEnOf: (r) => r.midCategoryEn,
    limit: 200,
  });

  const byBrand = buildRankedStats(classifiedRows, (r) => r.brand, countries, gdDaysByCountry, bauDaysByCountry, {
    parentOf: (r) => r.midCategory,
    topOf: (r) => r.category,
    nameEnOf: (r) => r.brandEn,
    limit: 300,
  });
  attachParentShare(byBrand.rows, byMidCategory.rows);

  const byItem = buildItemStats(classifiedRows, countries, gdDaysByCountry, bauDaysByCountry, 150);

  const kRows = classifiedRows.filter((r) => r.isK);
  const nonKRows = classifiedRows.filter((r) => !r.isK);
  const kviews = {
    k: buildKView(kRows, countries, gdDaysByCountry, bauDaysByCountry, byCountry),
    non: buildKView(nonKRows, countries, gdDaysByCountry, bauDaysByCountry, byCountry),
  };

  const brandCats = byItem.categories.map((c) => c.name);

  // ── 전체 요약 ──
  // 일평균 지표는 "각 국가의 일평균을 모두 더한 값" 입니다 (5개국 합산 하루치).
  const summary = {
    currency: currency || '₩',
    gdTotalGmv: sumBy(byCountry, 'gdGmv'),
    bauTotalGmv: sumBy(byCountry, 'bauGmv'),
    gdCountryDays: sumBy(byCountry, 'gdDays'),
    bauCountryDays: sumBy(byCountry, 'bauDays'),
    gdDateCount: uniqueDates(gd).length,
    bauDateCount: uniqueDates(bau).length,
    gdDailyGmv: sumBy(byCountry, 'gdDailyGmv'),
    bauDailyGmv: sumBy(byCountry, 'bauDailyGmv'),
    gdTotalOrders: sumBy(byCountry, 'orders'),
    bauTotalOrders: sumBy(byCountry, 'bauOrders'),
    gdDailyOrders: sumBy(byCountry, 'gdDailyOrders'),
    bauDailyOrders: sumBy(byCountry, 'bauDailyOrders'),
    gdDailyItems: sumBy(byCountry, 'gdDailyItems'),
    bauDailyItems: sumBy(byCountry, 'bauDailyItems'),
    gdTotalQty: sumBy(byCountry, 'qty'),
    bauTotalQty: sumBy(byCountry, 'bauQty'),
    gdDailyQty: sumBy(byCountry, 'gdDailyQty'),
    bauDailyQty: sumBy(byCountry, 'bauDailyQty'),
  };

  summary.gmvGrowthPct = pctChange(summary.gdDailyGmv, summary.bauDailyGmv);
  summary.ordersGrowthPct = pctChange(summary.gdDailyOrders, summary.bauDailyOrders);
  summary.qtyGrowthPct = pctChange(summary.gdDailyQty, summary.bauDailyQty);
  summary.itemsGrowthPct = pctChange(summary.gdDailyItems, summary.bauDailyItems);

  summary.gdAov = summary.gdTotalOrders ? summary.gdTotalGmv / summary.gdTotalOrders : null;
  summary.bauAov = summary.bauTotalOrders ? summary.bauTotalGmv / summary.bauTotalOrders : null;
  summary.aovGrowthPct = summary.gdAov !== null && summary.bauAov
    ? ((summary.gdAov - summary.bauAov) / summary.bauAov) * 100
    : null;
  summary.growthPct = summary.gmvGrowthPct;
  summary.gdDays = summary.gdCountryDays;
  summary.bauDays = summary.bauCountryDays;

  const promotions = promoRows.map((p) => ({
    name: p.name,
    type: p.type,
    tier: promoTier(p.name, p.type),
    country: p.country,
    start: p.start,
    end: p.end,
  })).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  return {
    summary,
    period: buildPeriod(gd, bau, dailyRows, promotions),
    byCountry,
    byCategory,
    byMidCategory,
    byBrand,
    byItem,
    kviews,
    brandCats,
    countries,
    promotions,
    focusMonth: pickFocusMonth(promotions),
    diagnostics: buildDiagnostics(dailyRows, classifiedRows, byCountry, kbrandSource),
    generatedAt: new Date().toISOString(),
  };
}
