import { promotionsOnDate, platformColor } from '../lib/promotions';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function PromotionCalendar({ weeks, promotions, todayStr }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm overflow-x-auto">
      <div className="grid grid-cols-7 min-w-[560px]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-xs text-gray-400 font-medium text-center pb-2">
            {label}
          </div>
        ))}
        {weeks.flat().map((cell) => {
          const active = promotionsOnDate(promotions, cell.date);
          const isToday = cell.date === todayStr;
          return (
            <div
              key={cell.date}
              className={
                'border-t border-gray-100 min-h-[92px] p-1.5 ' +
                (cell.inMonth ? '' : 'bg-gray-50/60')
              }
            >
              <div
                className={
                  'text-xs mb-1 inline-flex items-center justify-center w-5 h-5 rounded-full ' +
                  (isToday
                    ? 'bg-indigo-600 text-white font-semibold'
                    : cell.inMonth
                    ? 'text-gray-600'
                    : 'text-gray-300')
                }
              >
                {cell.day}
              </div>
              <div className="space-y-1">
                {active.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className={'text-[11px] leading-tight px-1.5 py-0.5 rounded truncate ' + platformColor(p.platform).chip}
                    title={p.promotion_name + ' (' + p.platform + (p.country ? ' · ' + p.country : '') + ')'}
                  >
                    {p.promotion_name}
                  </div>
                ))}
                {active.length > 3 && (
                  <div className="text-[10px] text-gray-400 pl-1">+{active.length - 3}개 더</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
