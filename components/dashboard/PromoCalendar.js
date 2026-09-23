'use client';

import { useState } from 'react';
import { useLang } from './LangContext';
import { tierChipClass } from '../../lib/dashboard/format';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function buildGrid(year, month /* 1~12 */) {
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());
  const weeks = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: cursor.getFullYear() + '-' + pad2(cursor.getMonth() + 1) + '-' + pad2(cursor.getDate()),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month - 1,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * 프로모션 캘린더.
 * 처음 보여주는 달은 프로모션이 가장 많은 달(focusMonth)입니다 — 원본과 같습니다.
 */
export default function PromoCalendar({ promotions, focusMonth }) {
  const { t, lang } = useLang();
  const [year, setYear] = useState(focusMonth.year);
  const [month, setMonth] = useState(focusMonth.month);

  const weeks = buildGrid(year, month);
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + pad2(today.getMonth() + 1) + '-' + pad2(today.getDate());

  function move(delta) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  /**
   * 그 날 진행 중인 프로모션.
   * 같은 프로모션이 국가마다 한 줄씩 들어있어서 그대로 두면 하루에 칩이 다섯 개씩 쌓입니다.
   * 그래서 이름이 같으면 하나로 묶고, 국가는 옆에 모아서 보여줍니다.
   */
  function onDate(dateStr) {
    const active = promotions.filter((p) => p.start <= dateStr && (p.end || p.start) >= dateStr);
    const byName = new Map();
    for (const p of active) {
      const found = byName.get(p.name);
      if (found) {
        if (p.country && found.countries.indexOf(p.country) === -1) found.countries.push(p.country);
      } else {
        byName.set(p.name, {
          name: p.name,
          tier: p.tier,
          countries: p.country ? [p.country] : [],
        });
      }
    }
    return [...byName.values()];
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="text-[13px] font-semibold text-gray-600 mb-1.5">{t('프로모션 캘린더')}</div>
          <div className="flex gap-3.5 flex-wrap text-xs text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />Gmarket Day
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />MEGA
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />A+
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => move(-1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            {lang === 'en' ? '← Prev' : '← 이전'}
          </button>
          <div className="font-semibold min-w-[108px] text-center">{lang === 'en' ? MONTHS_EN[month - 1] + ' ' + year : year + '년 ' + month + '월'}</div>
          <button
            onClick={() => move(1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
          >
            {lang === 'en' ? 'Next →' : '다음 →'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[660px]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-xs text-gray-400 text-center pb-2">{t(w)}</div>
          ))}
          {weeks.flat().map((cell) => {
            const active = onDate(cell.date);
            const isToday = cell.date === todayStr;
            return (
              <div
                key={cell.date}
                className={'border-t border-gray-100 min-h-[86px] p-1.5 ' + (cell.inMonth ? '' : 'bg-gray-50/60')}
              >
                <div
                  className={
                    'text-xs mb-1 inline-flex items-center justify-center w-5 h-5 rounded-full ' +
                    (isToday
                      ? 'bg-blue-600 text-white font-bold'
                      : cell.inMonth ? 'text-gray-600' : 'text-gray-300')
                  }
                >
                  {cell.day}
                </div>
                <div className="space-y-[3px]">
                  {active.slice(0, 3).map((p, i) => (
                    <div
                      key={p.name + i}
                      className={'text-[11px] leading-tight px-1.5 py-0.5 rounded border ' + tierChipClass(p.tier)}
                      title={p.name + (p.countries.length ? ' (' + p.countries.join(', ') + ')' : '')}
                    >
                      <span className="block truncate">{p.name}</span>
                      {p.countries.length > 0 && (
                        <span className="block text-[9.5px] opacity-70 truncate">
                          {p.countries.join(' · ')}
                        </span>
                      )}
                    </div>
                  ))}
                  {active.length > 3 && (
                    <div className="text-[10px] text-gray-400 pl-1">+{active.length - 3}{t('개 더')}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
