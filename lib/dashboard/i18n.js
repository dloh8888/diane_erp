// 한글 → 영문 사전.
// 원래 Apps Script 대시보드가 쓰던 방식 그대로입니다 — 화면에는 한글을 적어두고,
// 영문 모드일 때만 이 표에서 찾아 바꿉니다. 여기에 없는 문구는 한글이 그대로 나옵니다.
// (원본 Dashboard.html 의 I18N 번역문을 최대한 그대로 가져왔습니다)

const EN = {
  /* 공통 */
  '프로모션 대시보드': 'Promotion Dashboard',
  '프로모션 캘린더': 'Promotion calendar',
  '프로모션 실적 요약': 'Promotion performance summary',
  '데이터를 불러오지 못했어요': 'Failed to load data',
  '아직 데이터가 없습니다': 'No data yet',
  '(미분류)': '(Uncategorised)',
  '· 원본': '· of',
  '개 중 상위': ' total, top',
  '개만 계산': ' calculated',
  '전체': 'All',
  '합계': 'Total',
  '국가': 'Country',
  '브랜드': 'Brand',
  '브랜드명': 'Brand name',
  '카테고리': 'Category',
  '상품': 'Product',
  '순위': 'Rank',
  '변동': 'Change',
  '비중': 'Share',
  '증감': 'Change',
  '증감율': 'vs BAU',
  '주문': 'Orders',
  '수량': 'Units',
  '개': '',
  '건': '',
  '기준': '',
  '진행': 'Progress',
  '잔여': 'Remaining',
  '기간 종료': 'Period ended',
  '보기': 'View',
  '검색': 'Search',
  '신규': 'New',
  '흐름': 'Trend',
  '지수': 'Index',
  '키워드': 'Keyword',
  '우리 브랜드': 'Our brand',
  '기회': 'Opportunity',
  '총 GMV': 'Total GMV',
  '일평균': 'Daily avg',
  '일평균 GMV': 'Daily avg GMV',
  '일평균 주문': 'Daily avg orders',
  '일평균 수량': 'Daily avg units',
  '일평균 아이템수': 'Daily avg items',
  '누적판매량': 'Units sold (cum.)',
  '플랫폼 / 국가': 'Platform / country',
  '제외 표시됨': 'marked excluded',
  '최신 주차': 'Latest week',
  '전주 대비': 'vs last week',
  '4주평균 대비': 'vs 4-week avg',
  'ASP 증감': 'ASP change',
  '검색순위': 'Search rank',
  '데이터 기준일': 'Data as of',
  'Gmarket Day 기간': 'Gmarket Day period',
  '구글시트 올리기': 'Upload sheet',
  '실적 엑셀 업로드': 'Upload performance file',
  '대시보드 열기': 'Open dashboard',
  '자세히 보기': 'See details',
  '일별실적': 'Daily performance',
  '브랜드실적': 'Brand performance',
  'K브랜드목록': 'K-brand list',
  '키워드트렌드': 'Keyword trend',
  '검색트렌드': 'Search trend',
  '키워드트렌드 · 검색트렌드 · 급상승': 'Keyword trend · Search trend · Breakout',

  /* 요일 */
  '일': 'Sun', '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat',

  /* 상단 타일 */
  'Gmarket Day 총 GMV': 'Gmarket Day total GMV',
  'BAU 총 GMV': 'BAU total GMV',
  'BAU 대비 증감율': 'Change vs BAU',
  'Gmarket Day 총 주문건수': 'Gmarket Day total orders',
  'Gmarket Day 일평균 GMV': 'Gmarket Day daily avg GMV',
  'Gmarket Day 일평균 주문건수': 'Gmarket Day daily avg orders',
  'Gmarket Day 일평균 판매수량': 'Gmarket Day daily avg units',
  'Gmarket Day 일평균 판매 아이템수': 'Gmarket Day daily avg distinct items',
  'Gmarket Day AOV (객단가)': 'Gmarket Day AOV',
  '· 국가별 진행일수 합계': '· campaign-days across countries',
  '개국 일평균 합 · BAU': ' countries, sum of daily avgs · BAU ',
  '총 GMV ÷ 총 주문건수 · BAU': 'Total GMV ÷ total orders · BAU ',
  'BAU 대비': 'vs BAU',
  '일평균 GMV 기준': 'on daily avg GMV',
  '(비교할 BAU 데이터 없음)': '(no BAU data to compare)',
  '개 더': ' more',

  /* 국가별 */
  '국가별 일 GMV': 'Daily GMV by country',
  '국가별 상세': 'Country detail',
  'Gmarket Day 일평균': 'Gmarket Day daily avg',
  'BAU 일평균': 'BAU daily avg',
  'BAU 일평균 GMV': 'BAU daily avg GMV',
  'Gmarket Day 일평균 GMV': 'Gmarket Day daily avg GMV',
  'K브랜드 GMV': 'K-brand GMV',
  'K브랜드 비중': 'K-brand share',
  '전환율': 'Conversion',
  '예산 사용율': 'Budget used',
  'K브랜드만': 'K-brands only',
  'K브랜드 아닌 것만': 'Non K-brands only',
  '· K브랜드만': ' · K-brands only',
  '· K브랜드 아닌 것만': ' · non K-brands only',
  'K브랜드로 계산된 브랜드': 'Counted as K-brands',
  'K브랜드가 아닌 것으로 계산된 브랜드': 'Not counted as K-brands',

  /* 카테고리 */
  '카테고리별': 'By category',
  '카테고리별 상세': 'Category detail',
  '카테고리 안에서의 국가별 비중': 'Country share within each category',
  '카테고리 대분류': 'Sub-category',
  '카테고리 대분류 랭킹': 'Sub-category ranking',
  '대분류 내 비중': 'Share within sub-category',

  /* 브랜드 · 상품 */
  '브랜드별': 'By brand',
  '브랜드 랭킹': 'Brand ranking',
  '상품별': 'By product',
  '상품 랭킹': 'Product ranking',
  '상품명 · 브랜드 · 상품번호': 'Product, brand or product no.',
  '조건에 맞는 상품이 없습니다.': 'No products match these filters.',
  '조건에 맞는 항목이 없습니다.': 'No rows match these filters.',
  '더 보기': 'Show more',
  '개 남음': ' left',
  '(BAU 대비 %p)': '(vs BAU, %p)',

  /* Keyword Trend */
  '검색 트렌드': 'Search trend',
  '검색 트렌드 (구글 트렌드)': 'Search trend (Google Trends)',
  '급상승 검색어': 'Breakout queries',
  '쇼피 · 라자다 상품 순위': 'Shopee · Lazada product ranking',
  '아직 안 파는 브랜드만': 'Untapped brands only',
  '아직 안 팜': 'Untapped',
  '기간': 'Period',
  '플랫폼': 'Platform',
  '· 직전': ' · previous ',
  '과 비교': ' for comparison',
  '· 플랫폼×국가 안에서 누적판매량 순': ' · ranked by cumulative units within each platform × country',
  '· 카테고리마다 상위': ' · top ',
  '개까지만 계산': ' per category only',
  '매출': 'sales rank',

  /* 설명줄 */
  'Gmarket Day 기간과 BAU 기간의 하루 평균 GMV 비교 · 막대 위 숫자는 BAU 대비 증감율':
    'Daily average GMV, Gmarket Day vs BAU · the number above each pair is the change vs BAU',
  'Gmarket Day 기간 기준 · 증감율은 BAU 일평균 GMV 대비':
    'Gmarket Day period · change vs BAU daily average GMV',
  'Gmarket Day 기간 기준 · 일평균 GMV 큰 순 · 증감율은 모두 BAU 일평균 대비':
    'Gmarket Day period · sorted by daily avg GMV · all changes vs BAU daily average',
  'Gmarket Day 기간 기준 · 랭킹은 일평균 GMV 순 · 랭킹 변동은 BAU 순위 대비 (▲ = 올라감) · 증감율은 BAU 일평균 대비':
    'Gmarket Day period · ranked by daily avg GMV · rank change vs BAU ranking (▲ = moved up) · change vs BAU daily average',
  'Gmarket Day 기간 기준 · GMV 큰 순':
    'Gmarket Day period · sorted by GMV',
  '각 국가의 하루 평균 GMV와 그 카테고리 안에서의 비중 · 국가는 GMV 큰 순':
    'Daily average GMV per country and its share within the category · countries ordered by GMV',
  '구글 트렌드의 \'급상승 검색어\' — 소싱 아이디어를 찾을 때 보는 자리입니다':
    'Breakout queries from Google Trends — a place to look for sourcing ideas',
  '기준 · 지수는 그룹마다 기준이 달라서 공통 키워드(앵커)로 맞춰 비교합니다':
    ' · the index is relative within each group, so a shared anchor keyword is used to make them comparable',
  '· 「기회」는 검색 순위보다 우리 매출 순위가 뒤쳐진 정도입니다':
    ' · "Opportunity" is how far our sales rank trails the search rank',
  '구글시트 프로모션캘린더 탭 기준 · 같은 프로모션은 하나로 묶고 진행 국가를 함께 보여줍니다':
    'From the 프로모션캘린더 sheet tab · one row per promotion, with the countries running it',
  '구글시트를 올리면 이 자리에 일정이 표시됩니다':
    'Upload the sheet and the schedule appears here',
  '실적 엑셀을 올리면 이 자리에 Gmarket Day / BAU 비교와 국가별 일 GMV가 자동으로 나옵니다.':
    'Upload the performance file and the Gmarket Day vs BAU comparison and per-country daily GMV appear here.',
  '· 전환율은 구글시트 일별실적 탭의 「방문자수」 칸이 채워지면 자동으로 나옵니다. ':
    '· Conversion appears once the 방문자수 (visitors) column in the daily performance sheet is filled. ',
  '· 예산 사용율은 「광고비」 칸이 채워지면 자동으로 나옵니다.':
    '· Budget used appears once the 광고비 (ad spend) column is filled.',
  '증감율은': 'Changes compare',
  '국가별 일평균': 'per-country daily averages',
  '기준 BAU 대비': ' vs BAU',
  '데이터를 바꾸려면 구글시트에서 수정한 뒤 [파일 > 다운로드 > Microsoft Excel] 로 받아':
    'To change the data, edit the Google Sheet, download it with [File > Download > Microsoft Excel], and',
  '에서 다시 올리면 됩니다.': ' upload it again.',
};

/** 영문 모드일 때 쓰는 번역 함수를 만들어 돌려줍니다. */
export function createT(lang) {
  if (lang !== 'en') return (s) => s;
  return (s) => {
    if (s === null || s === undefined) return s;
    const key = String(s);
    return Object.prototype.hasOwnProperty.call(EN, key) ? EN[key] : key;
  };
}
