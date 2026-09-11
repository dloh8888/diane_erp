import Link from 'next/link';
import { fetchPromotions, buildMonthGrid, monthLabel } from '../../lib/promotions';
import PromotionCalendar from '../../components/PromotionCalendar';
import PromotionList from '../../components/PromotionList';

export const dynamic = 'force-dynamic';

export default async function PromotionsPage({ searchParams }) {
  const now = new Date();
  const year = parseInt(searchParams?.y, 10) || now.getFullYear();
  const monthIndex0 = searchParams?.m ? parseInt(searchParams.m, 10) - 1 : now.getMonth();
  const todayStr = now.toISOString().slice(0, 10);

  let promotions = [];
  let loadError = null;

  try {
    promotions = await fetchPromotions();
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

  const weeks = buildMonthGrid(year, monthIndex0);
  const prev = new Date(year, monthIndex0 - 1, 1);
  const next = new Date(year, monthIndex0 + 1, 1);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-xl font-bold text-gray-900">프로모션 캘린더</h1>
          <Link
            href="/promotions/import"
            className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
          >
            엑셀로 가져오기
          </Link>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          promotions 테이블 기준 · 등록된 프로모션 {promotions.length}건
        </p>

        <div className="flex items-center justify-between mb-4">
          <Link
            href={'/promotions?y=' + prev.getFullYear() + '&m=' + (prev.getMonth() + 1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            ← 이전 달
          </Link>
          <div className="font-semibold text-gray-800">{monthLabel(year, monthIndex0)}</div>
          <Link
            href={'/promotions?y=' + next.getFullYear() + '&m=' + (next.getMonth() + 1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            다음 달 →
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Gmarket
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Lazada
          </span>
        </div>

        <div className="mb-4">
          <PromotionCalendar weeks={weeks} promotions={promotions} todayStr={todayStr} />
        </div>

        <PromotionList promotions={promotions} todayStr={todayStr} />

        <p className="text-xs text-gray-400 mt-8">
          프로모션을 추가하려면 Supabase 대시보드 &gt; Table Editor &gt; promotions 테이블에서
          바로 행을 추가하면 이 화면에 자동으로 반영됩니다.
        </p>
      </div>
    </main>
  );
}
