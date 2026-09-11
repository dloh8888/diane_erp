import { platformColor, statusOf } from '../lib/promotions';

export default function PromotionList({ promotions, todayStr }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-sm text-gray-500 mb-4">전체 프로모션 목록</div>
      {promotions.length === 0 ? (
        <div className="text-sm text-gray-400">아직 등록된 프로모션이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-normal">프로모션명</th>
                <th className="py-2 font-normal">플랫폼</th>
                <th className="py-2 font-normal">국가</th>
                <th className="py-2 font-normal">기간</th>
                <th className="py-2 font-normal">상태</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => {
                const status = statusOf(p, todayStr);
                return (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-800">{p.promotion_name}</td>
                    <td className="py-2">
                      <span className={'text-xs px-2 py-0.5 rounded-full ' + platformColor(p.platform).chip}>
                        {p.platform}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{p.country || '-'}</td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">{p.start_date} ~ {p.end_date}</td>
                    <td className="py-2">
                      <span className={'text-xs px-2 py-0.5 rounded-full ' + status.cls}>{status.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
