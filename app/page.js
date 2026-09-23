import { getDashboardData } from '../lib/dashboard/data';
import HomeView from '../components/dashboard/HomeView';

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

  return <HomeView data={data} />;
}
