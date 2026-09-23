import Link from 'next/link';
import { getDashboardData } from '../lib/dashboard/data';
import PromoCalendar from '../components/dashboard/PromoCalendar';
import PromoSummary from '../components/dashboard/PromoSummary';

// 이 페이지는 Next.js의 "서버 컴포넌트"입니다. 브라우저가 아니라 서버에서
// 미리 데이터를 읽어와서 완성된 HTML을 보내주기 때문에, 화면에서 API 키가
// 노출되지 않고 로딩 스피너 코드도 따로 안 짜도 됩니다.
export const dynamic = 'force-dynamic'; // 매번 새로 데이터를 읽어오게 함

export default async function HomePage() {
  let data = null;
  let loadError = null;

  try {
    data = await getDashboardData();
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

  const hasData = data && !data.isEmpty;

  return (
    <main className="min-h-screen p-6 md:p-10 bg-[#f9f9f7]">
      <div className="max-w-[1240px] mx-auto">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">프로모션 캘린더</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">
              {hasData
                ? '구글시트 프로모션캘린더 탭 기준 · 같은 프로모션은 하나로 묶고 진행 국가를 함께 보여줍니다'
                : '구글시트를 올리면 이 자리에 일정이 표시됩니다'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap"
            >
              대시보드 열기
            </Link>
            <Link
              href="/dashboard/import"
              className="text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap"
            >
              구글시트 올리기
            </Link>
          </div>
        </div>

        {hasData ? (
          <div className="space-y-3">
            <PromoCalendar promotions={data.promotions} focusMonth={data.focusMonth} />
            <PromoSummary data={data} />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="font-semibold text-gray-900 mb-2">아직 데이터가 없습니다</div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              구글시트에서 <b>[파일 &gt; 다운로드 &gt; Microsoft Excel(.xlsx)]</b> 로 시트를 통째로 받아
              올려주시면 캘린더와 실적 요약이 바로 만들어집니다.
            </p>
            <Link
              href="/dashboard/import"
              className="inline-block text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              구글시트 올리기
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
