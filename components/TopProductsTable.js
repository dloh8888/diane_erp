import { formatKrw } from '../lib/sales';

// 매출 상위 상품 목록을 표로 보여줍니다.
export default function TopProductsTable({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-sm text-gray-500 mb-4">매출 상위 상품 TOP {data.length}</div>
      {data.length === 0 ? (
        <div className="text-sm text-gray-400">아직 데이터가 없습니다.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="pb-2 font-normal">상품명</th>
              <th className="pb-2 font-normal text-right">판매수량</th>
              <th className="pb-2 font-normal text-right">매출</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.product_name} className="border-b border-gray-50 last:border-0">
                <td className="py-2 text-gray-800">{p.product_name}</td>
                <td className="py-2 text-right text-gray-500">{p.quantity.toLocaleString('ko-KR')}</td>
                <td className="py-2 text-right font-medium text-gray-800">{formatKrw(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
