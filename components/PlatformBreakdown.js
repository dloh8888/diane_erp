import { formatKrw } from '../lib/sales';

// 플랫폼(지마켓/라자다 등)별 매출 비중을 가로 막대 + 퍼센트로 보여줍니다.
export default function PlatformBreakdown({ data }) {
  const total = data.reduce((sum, d) => sum + d.revenue, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-sm text-gray-500 mb-4">플랫폼별 매출 비중 (최근 90일)</div>
      <div className="space-y-3">
        {data.length === 0 && (
          <div className="text-sm text-gray-400">아직 데이터가 없습니다.</div>
        )}
        {data.map((d) => {
          const pct = (d.revenue / total) * 100;
          return (
            <div key={d.platform}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{d.platform}</span>
                <span className="text-gray-500">{formatKrw(d.revenue)} ({pct.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full"
                  style={{ width: pct + '%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
