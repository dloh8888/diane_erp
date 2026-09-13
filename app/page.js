import Link from 'next/link';
import {
  fetchRecentSales,
  computeKpis,
  computeRevenueByPlatform,
  computeDailyRevenue,
  computeTopProducts,
  formatKrw,
} from '../lib/sales';
import { fetchPromotions, buildMonthGrid, monthLabel } from '../lib/promotions';
import KpiCard from '../components/KpiCard';
import DailyBarChart from '../components/DailyBarChart';
import PlatformBreakdown from '../components/PlatformBreakdown';
import TopProductsTable from '../components/TopProductsTable';
import PromotionCalendar from '../components/PromotionCalendar';

// 이 페이지는 Next.js의 "서버 컴포넌트"입니다. 브라우저가 아니라
// 서버(혹은 Vercel)에서 미리 Supabase 데이터를 읽어와서 완성된
// HTML을 보내주기 때문에, 화면에서 API 키가 그대로 노출되지 않고
// 로딩 스피너 코드도 따로 안 짜도 됩니다.
export const dynamic = 'force-dynamic'; // 매번 새로 데이터를 읽어오게 함 (캐시 안 씀)

export default async function DashboardPage({ searchParams }) {
  let rows = [];
  let loadError = null;

  try {
    rows = await fetchRecentSales();
  } catch (e) {
    loadError = e.message;
  }

  // 프로모션 캘린더는 부가 기능이라, 여기서 에러가 나도
  // 판매 성과 리포트 자체는 그대로 보여주도록 따로 처리합니다.
  let promotions = [];
  let promotionsError = null;
  try {
    promotions = await fetchPromotions();
  } catch (e) {
    promotionsError = e.message;
  }

  if (loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg bg-white border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="text-red-600 font-semibold mb-2">데이터를 불러오지 못했어요</div>
          <div className="text-sm text-gray-600 whitespace-pre-wrap">{loadError}</div>
        </div>
      </main>
    );
  }

  const kpis = computeKpis(rows);
  const byPlatform = computeRevenueByPlatform(rows);
  const daily = computeDailyRevenue(rows);
  const topProducts = computeTopProducts(rows, 5);

  const now = new Date();
  const year = parseInt(searchParams?.y, 10) || now.getFullYear();
  const monthIndex0 = searchParams?.m ? parseInt(searchParams.m, 10) - 1 : now.getMonth();
  const todayStr = now.toISOString().slice(0, 10);
  const weeks = buildMonthGrid(year, monthIndex0);
  const prevMonth = new Date(year, monthIndex0 - 1, 1);
  const nextMonth = new Date(year, monthIndex0 + 1, 1);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">판매 성과 리포트</h1>
        <p className="text-sm text-gray-500 mb-6">
          sales 테이블 기준 · 데이터 {rows.length}건 (최근 90일)
        </p>

        {/* 프로모션 캘린더: 엑셀 업로드로 채워지는 캘린더를 리포트 위쪽에 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">프로모션 캘린더</h2>
            <Link
              href="/promotions/import"
              className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
            >
              엑셀로 업로드
            </Link>
          </div>

          {promotionsError && (
            <div className="bg-white border border-amber-200 rounded-xl p-4 mb-3 text-sm text-amber-700 whitespace-pre-wrap">
              프로모션 캘린더를 아직 불러올 수 없어요: {promotionsError}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <Link
              href={'/?y=' + prevMonth.getFullYear() + '&m=' + (prevMonth.getMonth() + 1)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              ← 이전 달
            </Link>
            <div className="font-semibold text-gray-800">{monthLabel(year, monthIndex0)}</div>
            <Link
              href={'/?y=' + nextMonth.getFullYear() + '&m=' + (nextMonth.getMonth() + 1)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
            >
              다음 달 →
            </Link>
          </div>

          <PromotionCalendar weeks={weeks} promotions={promotions} todayStr={todayStr} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiCard
            label="이번 달 매출"
            value={formatKrw(kpis.thisMonthRevenue)}
            hint={
              kpis.momChangePct === null
                ? '전월 데이터 없음'
                : (kpis.momChangePct >= 0 ? '▲ ' : '▼ ') + Math.abs(kpis.momChangePct).toFixed(1) + '% (전월 대비)'
            }
            hintColor={
              kpis.momChangePct === null
                ? 'text-gray-400'
                : (kpis.momChangePct >= 0 ? 'text-green-600' : 'text-red-500')
            }
          />
          <KpiCard label="이번 달 주문 수" value={kpis.thisMonthOrders.toLocaleString('ko-KR') + '건'} />
          <KpiCard label="평균 객단가" value={formatKrw(kpis.avgOrderValue)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <DailyBarChart data={daily} />
          <PlatformBreakdown data={byPlatform} />
        </div>

        <TopProductsTable data={topProducts} />

        <p className="text-xs text-gray-400 mt-8">
          데이터를 더 추가하려면 Supabase 대시보드 &gt; Table Editor &gt; sales 테이블에서
          바로 행을 추가하면 이 화면에 자동으로 반영됩니다.
        </p>
      </div>
    </main>
  );
}
