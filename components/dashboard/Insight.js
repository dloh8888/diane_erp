'use client';

import { useLang } from './LangContext';

/**
 * 탭 맨 위에 붙는 "한눈에 보기" 상자.
 * 줄마다 [트렌드] [기회] [개선점] 같은 꼬리표가 붙고,
 * 숫자와 이름처럼 눈에 먼저 들어와야 하는 부분만 굵게 나옵니다.
 *
 * 왼쪽 세로선 색으로 전체 분위기를 표시합니다 (성장=초록, 역성장=빨강).
 */
export default function Insight({ data }) {
  const { t } = useLang();
  if (!data || !data.lines || !data.lines.length) return null;

  const edge =
    data.tone === 'good' ? 'border-l-emerald-600'
      : data.tone === 'bad' ? 'border-l-red-500'
        : 'border-l-gray-300';

  return (
    <section className={'bg-white border border-gray-200 border-l-[3px] ' + edge + ' rounded-xl px-5 py-4 mb-3'}>
      <div className="text-[11px] font-semibold tracking-wider uppercase text-gray-400 mb-2">
        {t('한눈에 보기')}
      </div>
      <ul className="list-disc pl-[18px] space-y-1">
        {data.lines.map((ln, i) => (
          <li key={i} className="text-[13.5px] leading-relaxed text-gray-900">
            <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 rounded px-1.5 py-0.5 mr-1.5 align-[1px]">
              {ln.tag}
            </span>
            {ln.segs.map((s, j) =>
              s.b
                ? <b key={j} className="font-semibold">{s.t}</b>
                : <span key={j}>{s.t}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
