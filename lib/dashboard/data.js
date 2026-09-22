// Supabase 테이블 → 계산 엔진이 먹는 형태로 바꿔주는 부분입니다.
// 원래 Apps Script 의 getDashboardData() 가 하던 일(시트 읽기 + K브랜드 판별)을
// 그대로 옮겼습니다. 다른 점은 데이터를 구글시트가 아니라 DB에서 읽는다는 것뿐입니다.

import { supabase, supabaseConfigError } from '../supabaseClient';
import { CURRENCY } from './constants';
import {
  normalizeType, isKBrand, isKCategory, isExcludedBrand,
  matchKBrandEntry, buildKBrandLists, lookupBrandEn, toDateString,
} from './match';
import { computeDashboard } from './compute';

// Supabase는 기본적으로 1000줄만 돌려주기 때문에, 나눠서 전부 가져옵니다.
const PAGE = 1000;

async function fetchAll(table, orderBy) {
  let out = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select('*').range(from, from + PAGE - 1);
    if (orderBy) q = q.order(orderBy, { ascending: true });
    const { data, error } = await q;
    if (error) {
      if (error.message && error.message.indexOf('does not exist') !== -1) {
        throw new Error(
          table + ' 테이블을 아직 찾을 수 없습니다. supabase/dashboard_schema.sql 을 ' +
          'Supabase 대시보드 > SQL Editor 에서 한 번 실행했는지 확인해주세요. (원본 에러: ' + error.message + ')'
        );
      }
      throw new Error(table + ' 데이터를 가져오지 못했습니다: ' + error.message);
    }
    out = out.concat(data || []);
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** 대시보드 한 판에 필요한 모든 데이터를 읽어서 계산까지 끝낸 결과를 돌려줍니다. */
export async function getDashboardData() {
  if (supabaseConfigError) throw new Error(supabaseConfigError);

  const [daily, brand, calendar, budget, kbrand, imports] = await Promise.all([
    fetchAll('daily_performance', 'date'),
    fetchAll('brand_performance', 'date'),
    fetchAll('promo_calendar', 'start_date'),
    fetchAll('budget'),
    fetchAll('kbrand_list'),
    fetchAll('import_log'),
  ]);

  // K브랜드 목록 (포함/제외/영문명)
  const kb = buildKBrandLists(
    kbrand.map((r) => ({ 브랜드: r.brand, 비고: r.note, 영문명: r.brand_en }))
  );

  // 한 줄을 분류해서 isK 를 붙이는 공통 로직
  function classify(row) {
    const brandName = String(row.brand || '').trim();
    const brandType = String(row.brand_type || '').trim();
    const category = String(row.category || '').trim();

    const excluded = isExcludedBrand(brandName, kb.exclude);
    const hit = excluded ? '' : matchKBrandEntry(brandName, kb.list);
    const byList = !!hit;
    const byType = !excluded && isKBrand(brandType);
    const byCat = !excluded && isKCategory(category);

    return {
      brand: brandName,
      brandType,
      category,
      excluded,
      matchedEntry: hit,
      isK: byList || byType || byCat,
      isKByCategory: byCat,
      matchedBy: byList ? 'list' : byType ? 'type' : byCat ? 'category' : '',
      hit,
    };
  }

  let dailyRows = daily.map((r) => {
    const c = classify(r);
    return {
      date: toDateString(r.date),
      country: String(r.country || '').trim(),
      type: normalizeType(r.type),
      rawType: String(r.type || '').trim(),
      brand: c.brand,
      brandType: c.brandType,
      category: c.category,
      midCategory: String(r.mid_category || '').trim(),
      brandEn: String(r.brand_en || lookupBrandEn(c.brand, kb.enMap, c.hit) || '').trim(),
      midCategoryEn: String(r.mid_category_en || '').trim(),
      product: String(r.product || '').trim(),
      productName: String(r.product_name || '').trim(),
      image: String(r.image || '').trim(),
      link: String(r.link || '').trim(),
      isK: c.isK,
      isKByCategory: c.isKByCategory,
      excluded: c.excluded,
      matchedEntry: c.matchedEntry,
      matchedBy: c.matchedBy,
      gmv: Number(r.gmv) || 0,
      orders: Number(r.orders) || 0,
      qty: Number(r.qty) || 0,
      kbrandGmv: Number(r.kbrand_gmv) || 0,
      visitors: Number(r.visitors) || 0,
      spend: Number(r.spend) || 0,
    };
  });

  // 날짜나 국가를 못 읽은 줄은 계산에서 빠지므로, 몇 줄이 빠졌는지 세어둡니다.
  const droppedNoDate = dailyRows.filter((r) => !r.date).length;
  const droppedNoCountry = dailyRows.filter((r) => r.date && !r.country).length;
  dailyRows = dailyRows.filter((r) => r.date && r.country);

  const brandRows = brand.map((r) => {
    const c = classify(r);
    return {
      date: toDateString(r.date),
      country: String(r.country || '').trim(),
      type: normalizeType(r.type),
      brand: c.brand,
      brandType: c.brandType,
      category: c.category,
      midCategory: String(r.mid_category || '').trim(),
      brandEn: String(r.brand_en || '').trim(),
      midCategoryEn: String(r.mid_category_en || '').trim(),
      product: String(r.product || '').trim(),
      isK: c.isK,
      isKByCategory: c.isKByCategory,
      excluded: c.excluded,
      matchedEntry: c.matchedEntry,
      matchedBy: c.matchedBy,
      gmv: Number(r.gmv) || 0,
      orders: Number(r.orders) || 0,
      qty: Number(r.qty) || 0,
    };
  }).filter((r) => r.country);

  const promoRows = calendar.map((r) => ({
    name: String(r.promotion_name || '').trim(),
    type: String(r.type || '').trim(),
    country: String(r.country || '').trim(),
    start: toDateString(r.start_date),
    end: toDateString(r.end_date) || toDateString(r.start_date),
  })).filter((r) => r.name && r.start);

  const budgetRows = budget.map((r) => ({
    country: String(r.country || '').trim(),
    type: String(r.type || '').trim(),
    budget: Number(r.budget) || 0,
  })).filter((r) => r.country);

  const result = computeDashboard(dailyRows, promoRows, budgetRows, brandRows, CURRENCY);

  result.diagnostics.droppedNoDate = droppedNoDate;
  result.diagnostics.droppedNoCountry = droppedNoCountry;
  result.diagnostics.sheetRowCount = daily.length;
  result.diagnostics.kbrandListCount = kb.list.length;
  result.diagnostics.kbrandExcludeCount = kb.exclude.length;
  result.diagnostics.kbrandEnCount = Object.keys(kb.enMap).length;
  result.diagnostics.brandSheetExists = brand.length > 0;
  result.diagnostics.kbrandSheetExists = kbrand.length > 0;

  // 마지막 업로드 정보 (화면 상단에 '언제 기준 데이터인지' 보여주기 위함)
  const lastImport = imports.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  result.lastImport = lastImport
    ? { fileName: lastImport.file_name, at: lastImport.created_at, counts: lastImport.sheet_counts }
    : null;

  result.isEmpty = daily.length === 0;

  return result;
}
