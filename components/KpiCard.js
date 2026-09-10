// 대시보드 맨 위에 나오는 숫자 카드 하나. label(제목), value(큰 숫자),
// hint(작은 보조 설명)만 넘기면 알아서 카드 모양으로 그려줍니다.
export default function KpiCard({ label, value, hint, hintColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {hint && (
        <div className={'text-xs mt-2 ' + (hintColor || 'text-gray-400')}>{hint}</div>
      )}
    </div>
  );
}
