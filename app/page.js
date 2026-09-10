import {
  fetchRecentSales,
  computeKpis,
  computeRevenueByPlatform,
  computeDailyRevenue,
  computeTopProducts,
  formatKrw,
} from '../lib/sales';
import KpiCard from '../components/KpiCard';
import DailyBarChart from '../components/DailyBarChart';
import PlatformBreakdown from '../components/PlatformBreakdown';
import TopProductsTable from '../components/TopProductsTable';

// 이 페이지는 Next.js의 "서버 컴포넌트"입니다. 브라우저가 아니라
// 서버(혹은 Vercel)에서 미리 Supabase 데이터를 읽어와서 완성된
// HTML을 보내주기 때문에, 화면에서 API 키가 그대로 노출되지 않고
// 로딩 스피너 코드도 따로 안 짜도 됩니다.
export const dynamic = 'force-dynamic'; // 매번 새로 데이터를 읽어오게 함 (캐시 안 씀)

export default async function DashboardPage() {
  let rows = [];
  let loadError = null;

  try {
    rows = await fetchRecentSales();
  } catch (e) {
    loadError = e.message;
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

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">판매 성과 리포트</h1>
        <p className="text-sm text-gray-500 mb-6">
          sales 테이블 기준 · 데이터 {rows.length}건 (최근 90일)
        </p>

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
