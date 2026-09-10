// 대시보드에서 쓰는 숫자 계산(집계) 로직을 한 파일에 모아뒀습니다.
// 화면(app/page.js)은 이 함수들이 돌려주는 "이미 계산된 숫자"만
// 받아서 보여주기만 하면 되도록 분리했습니다.

import { supabase, supabaseConfigError } from './supabaseClient';

// Supabase의 sales 테이블에서 최근 90일치 데이터를 가져옵니다.
export async function fetchRecentSales() {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .gte('sale_date', fromDate)
    .order('sale_date', { ascending: false });

  if (error) {
    // 테이블을 아직 안 만들었을 때 Supabase가 주는 대표적인 에러 —
    // 초보자가 바로 원인을 알 수 있도록 메시지를 바꿔서 던집니다.
    if (error.message && error.message.indexOf('does not exist') !== -1) {
      throw new Error(
        'sales 테이블을 아직 찾을 수 없습니다. supabase/schema.sql 파일을 ' +
        'Supabase 대시보드 > SQL Editor 에서 한 번 실행했는지 확인해주세요. (원본 에러: ' + error.message + ')'
      );
    }
    throw new Error('Supabase에서 판매 데이터를 가져오는 데 실패했습니다: ' + error.message);
  }
  return data || [];
}

function isThisMonth(dateStr, ref) {
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function isLastMonth(dateStr, ref) {
  const lastMonthRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const d = new Date(dateStr);
  return d.getFullYear() === lastMonthRef.getFullYear() && d.getMonth() === lastMonthRef.getMonth();
}

// KPI 카드 4개(이번달 매출, 이번달 주문수, 평균 객단가, 전월 대비 증감률)를 계산
export function computeKpis(rows) {
  const now = new Date();
  const thisMonthRows = rows.filter((r) => isThisMonth(r.sale_date, now));
  const lastMonthRows = rows.filter((r) => isLastMonth(r.sale_date, now));

  const thisMonthRevenue = thisMonthRows.reduce((sum, r) => sum + Number(r.revenue_krw || 0), 0);
  const lastMonthRevenue = lastMonthRows.reduce((sum, r) => sum + Number(r.revenue_krw || 0), 0);
  const thisMonthOrders = thisMonthRows.length;
  const avgOrderValue = thisMonthOrders > 0 ? thisMonthRevenue / thisMonthOrders : 0;

  let momChangePct = null;
  if (lastMonthRevenue > 0) {
    momChangePct = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  }

  return { thisMonthRevenue, thisMonthOrders, avgOrderValue, momChangePct };
}

// 플랫폼별(Gmarket/Lazada 등) 매출 비중
export function computeRevenueByPlatform(rows) {
  const map = {};
  rows.forEach((r) => {
    const key = r.platform || '기타';
    map[key] = (map[key] || 0) + Number(r.revenue_krw || 0);
  });
  return Object.entries(map)
    .map(([platform, revenue]) => ({ platform, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

// 최근 30일 일별 매출 (막대그래프용)
export function computeDailyRevenue(rows) {
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const map = {};
  days.forEach((d) => { map[d] = 0; });
  rows.forEach((r) => {
    if (map[r.sale_date] !== undefined) {
      map[r.sale_date] += Number(r.revenue_krw || 0);
    }
  });
  return days.map((d) => ({ date: d, revenue: map[d] }));
}

// 매출 상위 상품 TOP N
export function computeTopProducts(rows, n = 5) {
  const map = {};
  rows.forEach((r) => {
    const key = r.product_name || '(상품명 없음)';
    if (!map[key]) {
      map[key] = { product_name: key, revenue: 0, quantity: 0 };
    }
    map[key].revenue += Number(r.revenue_krw || 0);
    map[key].quantity += Number(r.quantity || 0);
  });
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n);
}

export function formatKrw(n) {
  return '₩' + Math.round(n).toLocaleString('ko-KR');
}
