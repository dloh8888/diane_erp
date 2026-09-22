// 브랜드명·구분값·날짜를 해석하는 함수들.
// Apps Script(Code.gs)의 판별 규칙을 그대로 옮겼습니다 — 이미 오래 다듬어진 규칙이라
// 동작을 바꾸지 않는 것이 중요합니다.

import {
  TYPE_GD, TYPE_BAU, GD_ALIASES, BAU_ALIASES,
  K_BRAND_VALUES, K_CATEGORY_VALUES, ITEM_CATEGORIES,
  KBRAND_NAME_HEADERS, KBRAND_EN_HEADERS, KBRAND_NOTE_HEADERS, KBRAND_NOTE_WORDS,
  UNCLASSIFIED,
} from './constants';

/** 숫자 칸을 숫자로. 쉼표·통화기호가 섞여 있어도 읽어냅니다. */
export function num(v) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function pad2(n) {
  return String(n).length < 2 ? '0' + n : String(n);
}

/** 날짜 칸을 'YYYY-MM-DD' 로. 서식이 제각각이어도 최대한 읽어냅니다. */
export function toDateString(v) {
  if (v === '' || v === null || v === undefined) return '';

  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    return v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
  }

  const s = String(v).trim();
  if (!s) return '';

  // 2026-09-08 / 2026.9.8 / 2026/09/08
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);

  // 2026년 9월 8일
  m = s.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);

  // 20260908
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];

  // 9/8/2026 또는 09-08-2026 (구글시트 기본 표기인 월/일/년으로 해석)
  m = s.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (m) return m[3] + '-' + pad2(m[1]) + '-' + pad2(m[2]);

  return '';
}

/**
 * '구분' 칸을 Gmarket Day / BAU 로 맞춥니다.
 * 목록에 없는 값이면 적힌 그대로 두고, 달력에만 표시됩니다.
 */
export function normalizeType(raw) {
  const original = String(raw == null ? '' : raw).trim();
  if (!original) return '';

  const key = original.toLowerCase().replace(/[\s_\-·./]/g, '');
  for (const alias of GD_ALIASES) {
    if (key.indexOf(alias) !== -1) return TYPE_GD;
  }
  for (const alias of BAU_ALIASES) {
    if (key.indexOf(alias) !== -1) return TYPE_BAU;
  }
  return original;
}

/** 브랜드명을 비교하기 좋게 다듬습니다 (대소문자·띄어쓰기·(주)·문장부호 무시). */
export function normBrand(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/\(주\)|㈜|주식회사/g, '')
    .replace(/[\s\-_.,'"()[\]·&/]/g, '');
}

/**
 * 브랜드명이 K브랜드목록에 있는지 확인하고, 맞으면 '어느 항목에 맞았는지' 를 돌려줍니다.
 * 이름 한가운데에 우연히 겹치는 것은 K로 보지 않습니다.
 *   1) 이름이 통째로 같음            '삼양식품' = '삼양식품'
 *   2) 띄어쓰기로 나뉜 조각과 같음   'CJ 비비고' 의 'CJ'
 *   3) 이름이 목록 항목으로 시작함   '이니스프리 공식스토어' ← '이니스프리'
 */
export function matchKBrandEntry(brandName, list) {
  const raw = String(brandName == null ? '' : brandName);
  const key = normBrand(raw);
  if (!key || !list || !list.length) return '';

  const tokens = raw
    .toLowerCase()
    .split(/[\s\-_.,'"()[\]·&/]+/)
    .map((t) => normBrand(t))
    .filter((t) => t);

  for (const item of list) {
    // 항목은 문자열이거나 { n: 이름, p: 앞말매칭 허용 } 입니다.
    const target = item && item.n !== undefined ? item.n : item;
    const allowShortPrefix = !!(item && item.p);
    if (!target) continue;

    if (key === target) return target; // 통째로 같음
    if (tokens.indexOf(target) !== -1) return target; // 조각이 정확히 같음

    // 앞에서부터 시작하는 경우만, 그리고 3글자 이상일 때만.
    //   '이니스프리' → '이니스프리 공식스토어'  (잡아야 함)
    //   '피지'      → '피지오겔'               (잡으면 안 됨)
    const minLen = allowShortPrefix ? 2 : 3;
    if (target.length >= minLen && key.indexOf(target) === 0) return target;
  }
  return '';
}

/** 목록에 '제외' 로 표시해 둔 브랜드인지 — 걸리면 무조건 K가 아닙니다. */
export function isExcludedBrand(brandName, excludeList) {
  if (!excludeList || !excludeList.length) return false;
  return !!matchKBrandEntry(brandName, excludeList);
}

/** '브랜드유형' 칸의 값이 K브랜드를 뜻하는지. */
export function isKBrand(v) {
  const key = String(v == null ? '' : v).toLowerCase().replace(/[\s_\-·./]/g, '');
  if (!key) return false;
  for (const raw of K_BRAND_VALUES) {
    const target = raw.toLowerCase().replace(/[\s_\-·./]/g, '');
    if (key === target) return true;
    // 'kr' 처럼 짧은 값은 통째로 같을 때만 인정 (KRAFT 같은 이름이 걸리지 않도록)
    if (target.length >= 3 && key.indexOf(target) !== -1) return true;
  }
  return false;
}

/** '카테고리' 칸이 K-pop 으로 볼 카테고리인지 (예: Travel/Books/Others). */
export function isKCategory(v) {
  const key = String(v == null ? '' : v).toLowerCase().replace(/[\s_\-·./&]/g, '');
  if (!key) return false;
  for (const raw of K_CATEGORY_VALUES) {
    const target = raw.toLowerCase().replace(/[\s_\-·./&]/g, '');
    if (target && key === target) return true;
  }
  return false;
}

/** 캘린더에서 프로모션을 색으로 구분하는 등급. */
export function promoTier(name, type) {
  const hay = String(type || '') + ' ' + String(name || '');
  const compact = hay.toLowerCase().replace(/[\s_\-·./【】[\]()]/g, '');

  if (
    compact.indexOf('gmarketday') !== -1 || compact.indexOf('지마켓데이') !== -1 ||
    compact.indexOf('gmarket') !== -1 || compact.indexOf('지마켓') !== -1 ||
    compact.indexOf('g마켓') !== -1
  ) return TYPE_GD;
  if (compact.indexOf('mega') !== -1 || compact.indexOf('메가') !== -1) return 'MEGA';
  if (compact.indexOf('a+') !== -1 || compact.indexOf('a플러스') !== -1) return 'A+';
  return '';
}

/** By Item 탭의 카테고리 이름을 정해둔 표기로 맞춥니다. */
export function canonItemCat(v) {
  const t = String(v || '').trim();
  if (!t) return UNCLASSIFIED;
  const n = t.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  for (const cat of ITEM_CATEGORIES) {
    if (cat.toLowerCase().replace(/[^a-z0-9가-힣]/g, '') === n) return cat;
  }
  return t;
}

/* ── 칸 제목 찾기 ────────────────────────────────────────────── */

/** 제목에 붙은 괄호와 띄어쓰기를 떼어내고 비교합니다. 예: '브랜드(G)' → '브랜드' */
export function normHeader(h) {
  return String(h == null ? '' : h)
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s/g, '')
    .toLowerCase();
}

/** 괄호까지 살려서 보는 느슨한 비교 — 'Brand (EN)' 의 EN 을 놓치지 않으려고 씁니다. */
function normHeaderLoose(h) {
  return String(h == null ? '' : h).replace(/[\s\-_()[\].,/]/g, '').toLowerCase();
}

/** 여러 후보 이름 중 실제로 시트에 쓰인 제목을 찾습니다. */
export function findHeader(keys, names) {
  for (const name of names) {
    const t1 = normHeader(name);
    const t2 = normHeaderLoose(name);
    for (const k of keys) {
      if (normHeader(k) === t1 || normHeaderLoose(k) === t2) return k;
    }
  }
  return '';
}

/** 시트 제목이 조금씩 달라도 값을 찾아옵니다 (앞에 적힌 이름이 우선). */
export function pick(row, names) {
  const keys = Object.keys(row);
  for (const name of names) {
    const target = normHeader(name);
    for (const k of keys) {
      if (normHeader(k) === target) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') return v;
      }
    }
  }
  return '';
}

/** pick 과 같은 방식으로 찾되, 값 대신 '실제로 쓰인 제목' 을 돌려줍니다. (진단용) */
export function pickKey(row, names) {
  const keys = Object.keys(row);
  for (const name of names) {
    const target = normHeader(name);
    for (const k of keys) {
      if (normHeader(k) === target) return k;
    }
  }
  return '';
}

/** 값이 대체로 영문인 칸을 찾습니다 (제목이 뭐라고 적혀 있든). */
function guessLatinColumn(rows, keys, skip) {
  let best = null;
  for (const k of keys) {
    if (skip.indexOf(k) !== -1) continue;
    let n = 0, latin = 0, noteish = 0, lenSum = 0;
    const seen = {};
    for (const r of rows) {
      const v = String(r[k] == null ? '' : r[k]).trim();
      if (!v) continue;
      n++;
      lenSum += v.length;
      seen[v.toLowerCase()] = true;
      if (/[A-Za-z]/.test(v) && !/[가-힣]/.test(v)) latin++;
      if (KBRAND_NOTE_WORDS.indexOf(v.toLowerCase().replace(/\s/g, '')) !== -1) noteish++;
    }
    if (n < 3) continue;                                      // 표본이 적으면 보류
    if (latin / n < 0.7) continue;                            // 대부분 영문이어야 함
    if (noteish / n > 0.3) continue;                          // 비고 칸으로 보이면 제외
    if (lenSum / n < 2.5) continue;                           // 한두 글자는 브랜드명이 아님
    if (Object.keys(seen).length < Math.max(3, n * 0.5)) continue; // 같은 값 반복이면 비고 칸
    const score = latin / n;
    if (!best || score > best.score) best = { key: k, score };
  }
  return best ? best.key : '';
}

/** K브랜드목록 시트에서 브랜드명·영문명·비고 칸이 각각 어느 것인지 찾아냅니다. */
export function findKBrandColumns(rows) {
  const out = { name: '', en: '', note: '', enGuessed: false };
  if (!rows.length) return out;
  const keys = Object.keys(rows[0]);
  out.name = findHeader(keys, KBRAND_NAME_HEADERS) || keys[0] || '';
  out.note = findHeader(keys, KBRAND_NOTE_HEADERS);
  out.en = findHeader(keys, KBRAND_EN_HEADERS);
  // '브랜드' 와 영문 후보가 같은 칸이면 영문은 비웁니다
  if (out.en && out.en === out.name) out.en = '';
  if (!out.en) {
    out.en = guessLatinColumn(rows, keys, [out.name, out.note]);
    out.enGuessed = !!out.en;
  }
  return out;
}

/**
 * K브랜드목록 행들을 '포함 목록 / 제외 목록 / 영문명 사전' 으로 정리합니다.
 * (Code.gs 의 getDashboardData 안에 있던 부분을 함수로 떼어냈습니다)
 */
export function buildKBrandLists(kbrandRows) {
  const cols = findKBrandColumns(kbrandRows);
  const list = [];
  const exclude = [];
  const enMap = {};
  const aliases = [];

  for (const r of kbrandRows) {
    const nm = normBrand(cols.name ? r[cols.name] : r['브랜드']);
    if (!nm) continue;

    const enName = String((cols.en ? r[cols.en] : '') || '').trim();
    if (enName) {
      enMap[nm] = enName;
      aliases.push({
        ko: nm,
        koRaw: String((cols.name ? r[cols.name] : '') || '').trim(),
        en: normBrand(enName),
        enRaw: enName,
      });
    }

    const note = String((cols.note ? r[cols.note] : '') || '')
      .trim().toLowerCase().replace(/\s/g, '');

    if (['제외', '아님', 'x', 'n', 'no', 'exclude', '비k', '非k'].indexOf(note) !== -1) {
      exclude.push(nm);
    } else if (['포함', '앞말', 'prefix', '시작'].indexOf(note) !== -1) {
      // 두 글자 이름도 '앞에 오면 같은 브랜드' 로 봐달라는 표시
      list.push({ n: nm, p: true });
    } else {
      list.push(nm);
    }
  }

  return { list, exclude, enMap, aliases, cols };
}

/** 브랜드 영문명 찾기 — 목록에 맞은 항목이 있으면 그 영문명을 씁니다. */
export function lookupBrandEn(brandName, enMap, listHit) {
  if (!brandName) return '';
  const key = normBrand(brandName);
  if (enMap[key]) return enMap[key];
  if (listHit && enMap[listHit]) return enMap[listHit];
  return '';
}

/* ── 날짜 계산 ───────────────────────────────────────────────── */

/** YYYY-MM-DD 에 며칠을 더합니다. */
export function addDays(d, n) {
  const p = String(d).split('-');
  if (p.length !== 3) return String(d);
  const t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
  return (
    t.getUTCFullYear() + '-' +
    ('0' + (t.getUTCMonth() + 1)).slice(-2) + '-' +
    ('0' + t.getUTCDate()).slice(-2)
  );
}

/** 두 날짜(YYYY-MM-DD) 사이의 날 수. */
export function daysBetween(a, b) {
  const pa = String(a).split('-');
  const pb = String(b).split('-');
  if (pa.length !== 3 || pb.length !== 3) return 0;
  const da = Date.UTC(+pa[0], +pa[1] - 1, +pa[2]);
  const db = Date.UTC(+pb[0], +pb[1] - 1, +pb[2]);
  return Math.round((db - da) / 86400000);
}
