// 외부 차트 라이브러리 없이 순수 div만으로 그린 막대그래프입니다.
// 라이브러리를 안 쓴 이유: 처음 배우는 단계에서는 "이 코드가 왜
// 이렇게 생겼는지" 눈으로 따라갈 수 있는 게 더 중요하다고 판단했습니다.
// 나중에 더 예쁜 차트가 필요해지면 recharts 같은 라이브러리로 바꿔도 됩니다.
export default function DailyBarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-sm text-gray-500 mb-4">최근 30일 일별 매출</div>
      <div className="flex items-end gap-1 h-40">
        {data.map((d) => {
          const heightPct = Math.max(2, (d.revenue / max) * 100);
          return (
            <div key={d.date} className="flex-1 h-full flex items-end group relative">
              <div
                className="w-full bg-blue-500 group-hover:bg-blue-600 rounded-t transition-colors"
                style={{ height: heightPct + '%' }}
                title={d.date + ' : ₩' + Math.round(d.revenue).toLocaleString('ko-KR')}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
