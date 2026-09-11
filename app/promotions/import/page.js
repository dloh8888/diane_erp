'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { supabase, supabaseConfigError } from '../../../lib/supabaseClient';

const MONTH_HEADER_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\.$/i;
const COUNTRY_CODES = ['PH', 'TH', 'MY', 'VN', 'SG'];
const SECTION2_MARKERS = ['营销节奏', 'campaign timeline'];

function pad2(n) {
  return String(n).padStart(2, '0');
}
function toISODate(d) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function parseLazadaCalendar(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const records = [];

  let active = false;
  let currentDatesByCol = {};
  let currentCampaignType = null;
  let currentCountry = null;

  const getCell = (r, c) => {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })];
    return cell ? cell.v : undefined;
  };

  for (let r = range.s.r; r <= range.e.r; r++) {
    const a = getCell(r, 0);
    const b = getCell(r, 1);

    if (typeof b === 'string' && SECTION2_MARKERS.indexOf(b.trim()) !== -1) {
      break;
    }

    if (typeof a === 'string' && MONTH_HEADER_RE.test(a.trim()) && (b === undefined || b === null || b === '')) {
      active = true;
      currentDatesByCol = {};
      currentCampaignType = null;
      currentCountry = null;
      continue;
    }

    if (typeof a === 'string' && a.trim().toLowerCase() === 'campaign type') {
      continue;
    }

    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = getCell(r, c);
      if (v instanceof Date) currentDatesByCol[c] = v;
    }

    if (!active) continue;

    if (typeof a === 'string' && a.trim() !== '') currentCampaignType = a.trim();
    if (typeof b === 'string' && COUNTRY_CODES.indexOf(b.trim()) !== -1) currentCountry = b.trim();

    for (let c = 2; c <= range.e.c; c++) {
      const v = getCell(r, c);
      if (typeof v === 'string' && v.trim().length > 0) {
        const date = currentDatesByCol[c];
        if (!date) continue;
        records.push({
          promotion_name: v.trim(),
          platform: 'Lazada',
          country: currentCountry || null,
          campaign_type: currentCampaignType || null,
          start_date: toISODate(date),
          end_date: toISODate(date),
        });
      }
    }
  }

  return records;
}

export default function ImportPromotionsPage() {
  const [fileName, setFileName] = useState('');
  const [records, setRecords] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importState, setImportState] = useState('idle');
  const [importResult, setImportResult] = useState(null);

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setRecords([]);
    setImportState('idle');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = parseLazadaCalendar(sheet);
        if (parsed.length === 0) {
          setParseError('프로모션을 하나도 찾지 못했어요. 파일 형식이 예상과 다를 수 있어요.');
        }
        setRecords(parsed);
      } catch (err) {
        setParseError('파일을 읽는 중 문제가 생겼어요: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (supabaseConfigError) {
      setImportState('error');
      setImportResult({ error: supabaseConfigError });
      return;
    }
    setImportState('importing');
    try {
      const chunkSize = 500;
      let inserted = 0;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('promotions')
          .upsert(chunk, { onConflict: 'promotion_name,start_date,country', ignoreDuplicates: true });
        if (error) throw error;
        inserted += chunk.length;
      }
      setImportState('done');
      setImportResult({ count: inserted });
    } catch (err) {
      setImportState('error');
      setImportResult({ error: err.message });
    }
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/promotions" className="text-sm text-gray-400 hover:text-gray-600">← 캘린더로</Link>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">라자다 엑셀로 프로모션 가져오기</h1>
        <p className="text-sm text-gray-500 mb-6">
          라자다에서 받는 캠페인 캘린더(.xlsx) 파일을 그대로 올리면, 자동으로 읽어서 프로모션 목록으로 정리해드려요.
          같은 파일을 다시 올려도 이미 등록된 항목은 중복으로 쌓이지 않아요.
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
          <div className="bg-white border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600">
            {parseError}
          </div>
        )}

        {records.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-700">
                  총 <span className="font-semibold text-gray-900">{records.length}개</span>의 프로모션을 찾았어요 (미리보기 20개만 표시)
                </div>
                <button
                  onClick={handleImport}
                  disabled={importState === 'importing'}
                  className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {importState === 'importing' ? '가져오는 중...' : 'promotions 테이블로 가져오기'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="py-2 font-normal">프로모션명</th>
                      <th className="py-2 font-normal">국가</th>
                      <th className="py-2 font-normal">유형</th>
                      <th className="py-2 font-normal">날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-800 max-w-[280px] truncate" title={r.promotion_name}>{r.promotion_name}</td>
                        <td className="py-2 text-gray-500">{r.country || '-'}</td>
                        <td className="py-2 text-gray-500">{r.campaign_type || '-'}</td>
                        <td className="py-2 text-gray-500 whitespace-nowrap">{r.start_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {importState === 'done' && importResult && (
              <div className="bg-white border border-emerald-200 rounded-xl p-4 mb-4 text-sm text-emerald-700">
                {importResult.count}개 프로모션을 성공적으로 가져왔어요.{' '}
                <Link href="/promotions" className="underline">캘린더에서 확인하기 →</Link>
              </div>
            )}
            {importState === 'error' && importResult && (
              <div className="bg-white border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-600 whitespace-pre-wrap">
                가져오기 실패: {importResult.error}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
