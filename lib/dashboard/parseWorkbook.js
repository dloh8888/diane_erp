// 구글시트를 통째로 내려받은 엑셀(.xlsx)을 읽어, 탭마다 우리 테이블 모양으로 바꿔줍니다.
//
// 칸 제목이 조금씩 달라도(띄어쓰기, 괄호, '브랜드(G)' 같은 표기) 알아서 찾습니다.
// 이건 원래 Apps Script 가 pick_() 으로 하던 일과 같습니다.

import * as XLSX from 'xlsx';
import {
  SHEET_DAILY, SHEET_BRAND, SHEET_CALENDAR, SHEET_BUDGET, SHEET_KBRAND,
  BRAND_HEADER_NAMES, BRANDTYPE_HEADER_NAMES, CATEGORY_HEADER_NAMES,
  PRODUCT_HEADER_NAMES, MIDCAT_HEADER_NAMES, BRAND_EN_HEADER_NAMES,
  MIDCAT_EN_HEADER_NAMES, PRODUCTNAME_HEADER_NAMES, IMAGE_HEADER_NAMES, LINK_HEADER_NAMES,
  KBRAND_NAME_HEADERS,
} from './constants';
import { pick, num, toDateString, normHeader, findKBrandColumns } from './match';

/** 탭 이름을 느슨하게 비교합니다 ('일별 실적', '일별실적 (2026)' 등도 같은 탭으로 봄) */
function sheetMatches(actual, wanted) {
  const a = String(actual || '').replace(/\s/g, '').toLowerCase();
  const w = String(wanted || '').replace(/\s/g, '').toLowerCase();
  return a === w || a.indexOf(w) === 0;
}

function findSheet(workbook, wanted) {
  for (const name of workbook.SheetNames) {
    if (sheetMatches(name, wanted)) return { name, sheet: workbook.Sheets[name] };
  }
  return null;
}

/** 시트 한 장을 {제목: 값} 객체 배열로. 빈 줄은 버립니다. */
function readRows(sheet) {
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
  return rows.filter((r) => Object.keys(r).some((k) => String(r[k]).trim() !== ''));
}

function text(row, names) {
  return String(pick(row, names) || '').trim();
}

/** 제목 후보 목록에 없는 이름이라도, 정확히 일치하는 칸이 있으면 그대로 읽습니다. */
function byExactHeader(row, header) {
  const target = normHeader(header);
  for (const k of Object.keys(row)) {
    if (normHeader(k) === target) return row[k];
  }
  return '';
}

/* ── 탭별 변환 ─────────────────────────────────────────────── */

function parseDaily(rows) {
  return rows.map((r) => ({
    date: toDateString(byExactHeader(r, '날짜')),
    country: String(byExactHeader(r, '국가') || '').trim(),
    type: String(byExactHeader(r, '구분') || '').trim(),
    gmv: num(byExactHeader(r, 'GMV')),
    orders: num(byExactHeader(r, '주문건수')),
    qty: num(byExactHeader(r, '판매수량')),
    kbrand_gmv: num(byExactHeader(r, 'K브랜드GMV')),
    visitors: num(byExactHeader(r, '방문자수')),
    spend: num(byExactHeader(r, '광고비')),
    brand: text(r, BRAND_HEADER_NAMES),
    brand_type: text(r, BRANDTYPE_HEADER_NAMES),
    brand_en: text(r, BRAND_EN_HEADER_NAMES),
    category: text(r, CATEGORY_HEADER_NAMES),
    mid_category: text(r, MIDCAT_HEADER_NAMES),
    mid_category_en: text(r, MIDCAT_EN_HEADER_NAMES),
    product: text(r, PRODUCT_HEADER_NAMES),
    product_name: text(r, PRODUCTNAME_HEADER_NAMES),
    image: text(r, IMAGE_HEADER_NAMES),
    link: text(r, LINK_HEADER_NAMES),
  })).filter((r) => r.date && r.country);
}

function parseBrand(rows) {
  return rows.map((r) => ({
    date: toDateString(byExactHeader(r, '날짜')) || null,
    country: String(byExactHeader(r, '국가') || '').trim(),
    type: String(byExactHeader(r, '구분') || '').trim(),
    brand: text(r, BRAND_HEADER_NAMES),
    brand_type: text(r, BRANDTYPE_HEADER_NAMES),
    brand_en: text(r, BRAND_EN_HEADER_NAMES),
    category: text(r, CATEGORY_HEADER_NAMES),
    mid_category: text(r, MIDCAT_HEADER_NAMES),
    mid_category_en: text(r, MIDCAT_EN_HEADER_NAMES),
    product: text(r, PRODUCT_HEADER_NAMES),
    gmv: num(byExactHeader(r, 'GMV')),
    orders: num(byExactHeader(r, '주문건수')),
    qty: num(byExactHeader(r, '판매수량')),
  })).filter((r) => r.country);
}

function parseCalendar(rows) {
  return rows.map((r) => {
    const start = toDateString(byExactHeader(r, '시작일'));
    return {
      promotion_name: String(byExactHeader(r, '프로모션명') || '').trim(),
      type: String(byExactHeader(r, '구분') || '').trim(),
      country: String(byExactHeader(r, '국가') || '').trim(),
      start_date: start,
      end_date: toDateString(byExactHeader(r, '종료일')) || start,
    };
  }).filter((r) => r.promotion_name && r.start_date);
}

function parseBudget(rows) {
  return rows.map((r) => ({
    country: String(byExactHeader(r, '국가') || '').trim(),
    type: String(byExactHeader(r, '구분') || '').trim(),
    budget: num(byExactHeader(r, '예산')),
  })).filter((r) => r.country);
}

function parseKBrand(rows) {
  // K브랜드목록은 회사마다 칸 제목이 달라서, 값을 보고 영문명 칸을 추정하기도 합니다.
  const cols = findKBrandColumns(rows);
  return rows.map((r) => ({
    brand: String((cols.name ? r[cols.name] : pick(r, KBRAND_NAME_HEADERS)) || '').trim(),
    note: String((cols.note ? r[cols.note] : '') || '').trim(),
    brand_en: String((cols.en ? r[cols.en] : '') || '').trim(),
  })).filter((r) => r.brand);
}

/* ── 전체 워크북 읽기 ───────────────────────────────────────── */

export const SHEET_PLAN = [
  { sheet: SHEET_DAILY, table: 'daily_performance', parse: parseDaily, required: true },
  { sheet: SHEET_BRAND, table: 'brand_performance', parse: parseBrand, required: false },
  { sheet: SHEET_CALENDAR, table: 'promo_calendar', parse: parseCalendar, required: false },
  { sheet: SHEET_BUDGET, table: 'budget', parse: parseBudget, required: false },
  { sheet: SHEET_KBRAND, table: 'kbrand_list', parse: parseKBrand, required: false },
];

/**
 * 엑셀 파일(ArrayBuffer)을 읽어 탭별 결과를 돌려줍니다.
 * 반환: [{ sheet, table, found, sheetName, rows, rawCount, required }, ...]
 */
export function parseWorkbook(arrayBuffer) {
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

  const results = SHEET_PLAN.map((plan) => {
    const found = findSheet(workbook, plan.sheet);
    const raw = found ? readRows(found.sheet) : [];
    return {
      sheet: plan.sheet,
      table: plan.table,
      required: plan.required,
      found: !!found,
      sheetName: found ? found.name : '',
      rawCount: raw.length,
      rows: found ? plan.parse(raw) : [],
    };
  });

  return { results, sheetNames: workbook.SheetNames };
}
