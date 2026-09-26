import Link from 'next/link';
import { getDashboardData } from '../../lib/dashboard/data';
import DashboardView from '../../components/dashboard/DashboardView';

// 매번 새로 읽어옵니다 (캐시 안 씀)
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
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

  if (data.isEmpty) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
          <div className="font-semibold text-gray-900 mb-2">아직 데이터가 없습니다</div>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            구글시트에서 <b>[파일 &gt; 다운로드 &gt; Microsoft Excel(.xlsx)]</b> 로 시트를 통째로 받아
            올려주시면 대시보드가 바로 만들어집니다.
          </p>
          <Link
            href="/dashboard/import"
            className="inline-block text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            엑셀시트 올리기
          </Link>
        </div>
      </main>
    );
  }

  return <DashboardView data={data} />;
}
