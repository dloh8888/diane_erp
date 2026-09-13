// 프로모션 캘린더에서 쓰는 데이터 로딩 + 계산 로직을 모아둔 파일입니다.
// (lib/sales.js와 같은 패턴: 화면 컴포넌트는 여기서 만든 결과만 받아서 보여줍니다.)

import { supabase, supabaseConfigError } from './supabaseClient';

// Supabase의 promotions 테이블에서 전체 프로모션을 가져옵니다.
export async function fetchPromotions() {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    if (error.message && error.message.indexOf('does not exist') !== -1) {
      throw new Error(
        'promotions 테이블을 아직 찾을 수 없습니다. supabase/promotions_schema.sql 파일을 ' +
        'Supabase 대시보드 > SQL Editor 에서 한 번 실행했는지 확인해주세요. (원본 에러: ' + error.message + ')'
      );
    }
    throw new Error('Supabase에서 프로모션 데이터를 가져오는 데 실패했습니다: ' + error.message);
  }
  return data || [];
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toISODate(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

// 달력 렌더링용으로 한 달(앞뒤 빈 칸 포함, 6주 x 7일)을 만들어줍니다.
export function buildMonthGrid(year, monthIndex0) {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const gridStart = new Date(year, monthIndex0, 1 - firstOfMonth.getDay());

  const weeks = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: toISODate(cursor),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === monthIndex0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function monthLabel(year, monthIndex0) {
  return year + '년 ' + (monthIndex0 + 1) + '월';
}

// 특정 날짜(YYYY-MM-DD)에 걸쳐 있는 프로모션들을 반환
export function promotionsOnDate(promotions, dateStr) {
  return promotions.filter((p) => p.start_date <= dateStr && p.end_date >= dateStr);
}

export function platformColor(platform) {
  if (platform === 'Lazada') {
    return { chip: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' };
  }
  if (platform === 'Gmarket') {
    return { chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' };
  }
  return { chip: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
}

export function statusOf(promotion, todayStr) {
  if (todayStr < promotion.start_date) {
    return { label: '예정', cls: 'bg-blue-50 text-blue-600' };
  }
  if (todayStr > promotion.end_date) {
    return { label: '종료', cls: 'bg-gray-100 text-gray-400' };
  }
  return { label: '진행중', cls: 'bg-emerald-50 text-emerald-600' };
}
