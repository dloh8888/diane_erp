// 숫자 표기 — 원래 Dashboard.html 의 fmt* 함수들을 그대로 옮겼습니다.
// (₩1.2억 / ₩3,400만 같은 축약 표기를 쓰던 방식 유지)

export const DEFAULT_CURRENCY = '₩';

export function fmtCompact(n, currency = DEFAULT_CURRENCY, lang = 'ko') {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const a = Math.abs(n);
  if (lang === 'en') {
    if (a >= 1e9) return currency + (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (a >= 1e6) return currency + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return currency + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return currency + Math.round(n).toLocaleString('en-US');
  }
  if (a >= 1e8) return currency + (n / 1e8).toFixed(1).replace(/\.0$/, '') + '억';
  if (a >= 1e4) return currency + Math.round(n / 1e4).toLocaleString('ko-KR') + '만';
  return currency + Math.round(n).toLocaleString('ko-KR');
}

export function fmtFull(n, currency = DEFAULT_CURRENCY, lang = 'ko') {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return currency + Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR');
}

export function fmtNum(n, lang = 'ko') {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR');
}

export function fmtPct(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toFixed(digits) + '%';
}

export function fmtSignedPct(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(digits) + '%';
}

/** 증감 방향 — 화면에서 ▲/▼ 와 색을 정하는 데 씁니다. */
export function deltaDir(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return 'none';
  return pct >= 0 ? 'up' : 'down';
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return String(iso);
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function fmtUpdated(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return (
      d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()) + ' ' +
      pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' 기준'
    );
  } catch (e) {
    return '';
  }
}

/** 프로모션 등급 → 캘린더 칩 색 (원본의 t1/t2/t3/t0 대응) */
export function tierChipClass(tier) {
  if (tier === 'Gmarket Day') return 'bg-blue-50 text-blue-900 border-blue-100';
  if (tier === 'MEGA') return 'bg-orange-50 text-orange-900 border-orange-100';
  if (tier === 'A+') return 'bg-emerald-50 text-emerald-900 border-emerald-100';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}
