'use client';

import { useState } from 'react';
import Link from 'next/link';
import { parseWorkbook } from '../../../lib/dashboard/parseWorkbook';
import { supabase, supabaseConfigError } from '../../../lib/supabaseClient';

const CHUNK = 500;

export default function DashboardImportPage() {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [parseError, setParseError] = useState('');
  const [state, setState] = useState('idle'); // idle | importing | done | error
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setParsed(null);
    setSheetNames([]);
    setState('idle');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const { results, sheetNames } = parseWorkbook(evt.target.result);
        setSheetNames(sheetNames);

        const daily = results.find((r) => r.table === 'daily_performance');
        if (!daily.found) {
          setParseError(
            "'일별실적' 탭을 찾지 못했어요. 구글시트를 [파일 > 다운로드 > Microsoft Excel(.xlsx)] 로 " +
            '통째로 받아서 올려주세요. (이 파일에 있는 탭: ' + sheetNames.join(', ') + ')'
          );
          return;
        }
        if (daily.rows.length === 0) {
          setParseError(
            "'일별실적' 탭은 찾았는데 읽을 수 있는 줄이 없어요. 날짜·국가 칸이 채워져 있는지 확인해주세요. " +
            '(원본 ' + daily.rawCount + '줄)'
          );
          return;
        }
        setParsed(results);
      } catch (err) {
        setParseError('파일을 읽는 중 문제가 생겼어요: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function replaceTable(table, rows) {
    // 시트가 늘 원본이므로, 기존 내용을 비우고 새로 채웁니다.
    const { error: delError } = await supabase.from(table).delete().gte('id', 0);
    if (delError) throw new Error(table + ' 기존 데이터 삭제 실패: ' + delError.message);

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from(table).insert(chunk);
      if (error) throw new Error(table + ' 저장 실패: ' + error.message);
    }
  }

  async function handleImport() {
    if (supabaseConfigError) {
      setState('error');
      setResult({ error: supabaseConfigError });
      return;
    }
    setState('importing');
    try {
      const counts = {};
      for (const r of parsed) {
        if (!r.found) continue;
        setProgress(r.sheet + ' 올리는 중… (' + r.rows.length + '줄)');
        await replaceTable(r.table, r.rows);
        counts[r.sheet] = r.rows.length;
      }

      setProgress('마무리 중…');
      await supabase.from('import_log').insert([{ file_name: fileName, sheet_counts: counts }]);

      setState('done');
      setResult({ counts });
      setProgress('');
    } catch (err) {
      setState('error');
      setResult({ error: err.message });
      setProgress('');
    }
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← 대시보드로</Link>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">구글시트 데이터 올리기</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          지금처럼 구글시트에 데이터를 입력하신 뒤,
          시트에서 <b className="text-gray-700">[파일 &gt; 다운로드 &gt; Microsoft Excel(.xlsx)]</b> 로
          통째로 내려받아 이 페이지에 올리시면 됩니다. 탭 8개를 알아서 찾아 읽습니다.
          <br />
          올릴 때마다 <b className="text-gray-700">시트 내용이 그대로 반영</b>되도록 기존 내용을 교체합니다
          (시트가 원본이니까요).
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
          <label className="block text-sm text-gray-600 mb-2">엑셀 파일 선택</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {fileName && <div className="text-xs text-gray-400 mt-2">선택한 파일: {fileName}</div>}
        </div>

        {parseError && (
          <div className="bg-white border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600 whitespace-pre-wrap">
            {parseError}
          </div>
        )}

        {parsed && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="text-sm text-gray-700">읽어낸 내용</div>
                <button
                  onClick={handleImport}
                  disabled={state === 'importing'}
                  className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {state === 'importing' ? '올리는 중…' : '이 내용으로 반영하기'}
                </button>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="py-2 font-normal">시트 탭</th>
                    <th className="py-2 font-normal">찾음</th>
                    <th className="py-2 font-normal text-right">읽은 줄</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r) => (
                    <tr key={r.table} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 text-gray-800">
                        {r.sheet}
                        {r.required && <span className="text-xs text-gray-400 ml-1">(필수)</span>}
                      </td>
                      <td className="py-2">
                        {r.found ? (
                          <span className="text-emerald-600 text-xs">✓ {r.sheetName}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">없음 — 건너뜁니다</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-600 tabular-nums">
                        {r.found ? r.rows.length.toLocaleString('ko-KR') : '—'}
                        {r.found && r.rawCount !== r.rows.length && (
                          <span className="text-xs text-gray-400"> / {r.rawCount}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sheetNames.length > 0 && (
                <div className="text-xs text-gray-400 mt-3">
                  파일에 들어있는 탭: {sheetNames.join(', ')}
                </div>
              )}
              {progress && <div className="text-xs text-indigo-600 mt-3">{progress}</div>}
            </div>

            {state === 'done' && result && (
              <div className="bg-white border border-emerald-200 rounded-xl p-4 mb-4 text-sm text-emerald-700">
                반영 완료했어요.{' '}
                {Object.entries(result.counts).map(([k, v]) => k + ' ' + v + '줄').join(' · ')}
                {'  '}
                <Link href="/dashboard" className="underline">대시보드에서 확인하기 →</Link>
              </div>
            )}
            {state === 'error' && result && (
              <div className="bg-white border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600 whitespace-pre-wrap">
                실패: {result.error}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
