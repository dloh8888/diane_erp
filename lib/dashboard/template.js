// 업로드 양식(.xlsx) 정의 — 화면 안내와 다운로드 파일이 같은 정의를 쓰기 때문에
// 여기만 고치면 둘 다 같이 바뀝니다. (파서가 읽는 칸 이름과 어긋나지 않도록 하기 위함)

import * as XLSX from 'xlsx';

/**
 * 시트별 칸 정의.
 *  key      : 칸 제목 (시트 1행에 들어갈 글자 — 이 이름으로 읽습니다)
 *  required : 꼭 있어야 하는 칸
 *  hint     : 화면 안내에 보여줄 설명
 *  sample   : 양식 파일에 넣어둘 예시 값
 */
export const SHEET_SPECS = [
  {
    sheet: '일별실적',
    required: true,
    about: '매일의 실적. 이 탭 하나만 있어도 대시보드가 만들어집니다.',
    columns: [
      { key: '날짜', required: true, hint: '2026-09-01 형식', sample: '2026-09-01' },
      { key: '국가', required: true, hint: 'PH·TH·MY·VN·SG 또는 한글 국가명', sample: 'PH' },
      { key: '구분', required: true, hint: 'Gmarket Day 또는 BAU', sample: 'Gmarket Day' },
      { key: 'GMV', required: true, hint: '금액(숫자)', sample: 5180 },
      { key: '주문건수', hint: '숫자', sample: 1 },
      { key: '판매수량', hint: '숫자', sample: 1 },
      { key: '방문자수', hint: '있으면 전환율이 계산됩니다', sample: 0 },
      { key: '광고비', hint: '있으면 예산 사용율이 계산됩니다', sample: 0 },
      { key: '카테고리대대분류', hint: 'By Category 탭에 쓰입니다', sample: 'Baby/Kids' },
      { key: '카테고리대분류', hint: 'By Brand 의 상위 분류', sample: '출산/육아' },
      { key: '브랜드', hint: 'K브랜드 판별에 쓰입니다', sample: '릿첼' },
      { key: '상품번호', hint: 'By Item 탭 · 상품 이미지/링크에 쓰입니다', sample: '4108956125' },
      { key: '상품명', hint: 'By Item 탭에 표시됩니다', sample: '릿첼 AQ 스텝업컵용 교체용빨대' },
    ],
  },
  {
    sheet: '프로모션캘린더',
    about: '캘린더에 표시할 프로모션 일정.',
    columns: [
      { key: '프로모션명', required: true, hint: '캘린더에 표시될 이름', sample: '9월 Gmarket Day' },
      { key: '구분', hint: 'Gmarket Day / Mega / A+ (색이 달라집니다)', sample: 'Gmarket Day' },
      { key: '국가', hint: '국가별로 한 줄씩 적으면 묶어서 보여줍니다', sample: 'PH' },
      { key: '시작일', required: true, hint: '2026-09-14', sample: '2026-09-14' },
      { key: '종료일', hint: '비우면 시작일과 같은 날로 봅니다', sample: '2026-09-18' },
    ],
  },
  {
    sheet: '예산',
    about: '국가별 광고 예산. 광고비와 함께 있으면 예산 사용율이 나옵니다.',
    columns: [
      { key: '국가', required: true, hint: 'PH·TH·MY·VN·SG', sample: 'PH' },
      { key: '구분', hint: '비우면 Gmarket Day 기준', sample: 'Gmarket Day' },
      { key: '예산', required: true, hint: '금액(숫자)', sample: 4500000 },
    ],
  },
  {
    sheet: 'K브랜드목록',
    about: 'K브랜드 판별 기준表. 일별실적의 브랜드명과 맞춰봅니다.',
    columns: [
      { key: '브랜드', required: true, hint: '국문 브랜드명', sample: '이니스프리' },
      { key: '영문브랜드', hint: '있으면 화면에 함께 표시되고 검색에도 잡힙니다', sample: 'innisfree' },
      { key: '비고', hint: "'제외'라고 적으면 K브랜드에서 빼고, '포함'이면 두 글자 이름도 앞말로 잡습니다", sample: '' },
    ],
  },
  {
    sheet: '브랜드실적',
    about: '일별실적에 브랜드 칸이 없을 때만 쓰는 보조 탭. 브랜드 칸이 있으면 비워두셔도 됩니다.',
    columns: [
      { key: '날짜', hint: '2026-09-08', sample: '2026-09-08' },
      { key: '국가', required: true, hint: 'PH·TH·MY·VN·SG', sample: 'PH' },
      { key: '구분', hint: 'Gmarket Day 또는 BAU', sample: 'Gmarket Day' },
      { key: '브랜드', hint: '브랜드명', sample: '이니스프리' },
      { key: '브랜드유형', hint: "'K브랜드'라고 적으면 K로 계산합니다", sample: 'K브랜드' },
      { key: 'GMV', hint: '금액(숫자)', sample: 9200000 },
      { key: '주문건수', hint: '숫자', sample: 210 },
      { key: '판매수량', hint: '숫자', sample: 315 },
      { key: '카테고리', hint: '카테고리명', sample: 'Beauty' },
    ],
  },
  {
    sheet: '키워드트렌드',
    about: 'Keyword Trend 탭 · 쇼피/라자다 상품 순위.',
    columns: [
      { key: '기간구분', required: true, hint: '일 / 주 / 월', sample: '주' },
      { key: '기준일', required: true, hint: '2026-09-14', sample: '2026-09-14' },
      { key: '플랫폼', required: true, hint: 'Shopee / Lazada', sample: 'Shopee' },
      { key: '국가', hint: 'SG·PH 등', sample: 'SG' },
      { key: '카테고리', hint: '카테고리명', sample: '뷰티' },
      { key: '상품명', required: true, hint: '상품 이름', sample: 'Glow Serum 30ml' },
      { key: '브랜드', hint: '브랜드명', sample: '이니스프리' },
      { key: '누적판매량', hint: '숫자 — 이 값으로 순위를 매깁니다', sample: 12400 },
      { key: 'ASP', hint: '평균 판매가(숫자)', sample: 18500 },
    ],
  },
  {
    sheet: '검색트렌드',
    about: 'Keyword Trend 탭 · 구글 트렌드 지수를 붙여넣는 곳.',
    columns: [
      { key: '수집일', hint: '2026-09-15', sample: '2026-09-15' },
      { key: '국가', hint: 'TH·VN 등', sample: 'TH' },
      { key: '카테고리', hint: '카테고리명', sample: '헬스뷰티' },
      { key: '유형', hint: "'K브랜드' / '경쟁브랜드' 로 적으면 기회 지수가 계산됩니다", sample: '카테고리' },
      { key: '그룹', required: true, hint: '같은 트렌드 차트에서 뽑은 것끼리 같은 그룹명', sample: 'TH-헬스뷰티-카테고리-1' },
      { key: '키워드', required: true, hint: '검색어', sample: 'สกินแคร์เกาหลี' },
      { key: '주차', required: true, hint: '주 시작일 (2026-08-24)', sample: '2026-08-24' },
      { key: '지수', hint: '0~100 숫자', sample: 88 },
    ],
  },
  {
    sheet: '급상승',
    about: 'Keyword Trend 탭 · 구글 트렌드의 급상승 검색어.',
    columns: [
      { key: '수집일', hint: '2026-09-15', sample: '2026-09-15' },
      { key: '국가', hint: 'VN·TH 등', sample: 'VN' },
      { key: '카테고리', hint: '카테고리명', sample: '헬스뷰티' },
      { key: '급상승 검색어', required: true, hint: '검색어', sample: 'kem chống nắng Anua' },
      { key: '증가율', hint: "'+450%' 또는 'Breakout'", sample: 'Breakout' },
      { key: '메모', hint: '자유 메모', sample: '아누아 선크림 — 소싱 검토' },
    ],
  },
];

/** 맨 앞에 넣어둘 안내 시트 내용 */
function guideRows() {
  const rows = [
    ['프로모션 대시보드 업로드 양식'],
    [],
    ['· 이 파일의 탭 이름과 1행(칸 제목)은 그대로 두세요. 그 이름으로 읽습니다.'],
    ['· 2행부터 실제 데이터를 채우면 됩니다. 예시로 한 줄씩 넣어두었으니 지우고 쓰세요.'],
    ['· 필요 없는 탭은 비워두거나 지워도 됩니다. (일별실적 탭만 있으면 대시보드가 만들어집니다)'],
    ['· 구글시트에서 쓰시는 경우: [파일 > 다운로드 > Microsoft Excel(.xlsx)] 로 받아서 올리면 됩니다.'],
    ['· 올릴 때마다 시트 내용으로 통째로 교체됩니다 (시트가 원본).'],
    [],
    ['탭', '필수', '설명'],
  ];
  for (const spec of SHEET_SPECS) {
    rows.push([spec.sheet, spec.required ? '필수' : '선택', spec.about]);
  }
  rows.push([]);
  rows.push(['칸 설명']);
  rows.push(['탭', '칸 제목', '필수', '설명']);
  for (const spec of SHEET_SPECS) {
    for (const col of spec.columns) {
      rows.push([spec.sheet, col.key, col.required ? '필수' : '', col.hint || '']);
    }
  }
  return rows;
}

/** 양식 파일을 만들어 내려받습니다 (브라우저에서만 호출). */
export function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  const guide = XLSX.utils.aoa_to_sheet(guideRows());
  guide['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 8 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, guide, '읽어주세요');

  for (const spec of SHEET_SPECS) {
    const header = spec.columns.map((c) => c.key);
    const sample = spec.columns.map((c) => (c.sample === undefined ? '' : c.sample));
    const ws = XLSX.utils.aoa_to_sheet([header, sample]);
    ws['!cols'] = spec.columns.map((c) => ({ wch: Math.max(10, Math.min(28, c.key.length * 2 + 6)) }));
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, spec.sheet);
  }

  XLSX.writeFile(wb, '프로모션 대시보드 양식.xlsx');
}
