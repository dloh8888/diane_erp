// 원래 Apps Script(Code.gs)에 있던 설정값을 그대로 옮긴 파일입니다.
// 회사에서 쓰는 표기가 달라지면 여기만 고치면 됩니다.

export const CURRENCY = '₩';
export const TYPE_GD = 'Gmarket Day';
export const TYPE_BAU = 'BAU';

// '브랜드유형' 칸에 이 중 하나가 적혀 있으면 K브랜드로 봅니다. (대소문자/띄어쓰기 무시)
export const K_BRAND_VALUES = [
  'k브랜드', 'k-브랜드', 'kbrand', 'k brand', 'korea', 'korean', 'kr',
  '한국', '한국브랜드', 'k뷰티', 'kbeauty',
];

// 이 카테고리(대대분류)면 브랜드와 상관없이 K-pop 으로 보고 K브랜드 실적에 포함합니다.
export const K_CATEGORY_VALUES = ['travel/books/others'];

// 구분 칸 별칭 — 'GD', '지마켓데이', 'gmarket day' 는 전부 Gmarket Day 로 인식
export const GD_ALIASES = [
  'gmarketday', 'gmarket', 'gd', '지마켓데이', '지마켓', '지마켓day', 'g마켓데이', 'g마켓',
];
export const BAU_ALIASES = [
  'bau', '평상시', '평시', '상시', '일반', '기본', 'normal', 'business as usual',
];

// By Item 탭의 세부 분류 (시트의 '카테고리대대분류' 값과 느슨하게 맞춥니다)
export const ITEM_CATEGORIES = [
  'Digital/Elec.', 'Living/Leisure', 'Fashion', 'Food/Mart', 'Baby/Kids', 'Travel/books/others',
];

// 상품 상세 페이지 / 썸네일 주소. {code} 자리에 '상품(G)' 값이 들어갑니다.
export const PRODUCT_URL_TEMPLATE = 'https://item.gmarket.co.kr/Item?goodscode={code}';
export const IMAGE_URL_TEMPLATES = [
  'https://gdimg.gmarket.co.kr/{code}/still/300',
  'https://gdimg.gmarket.co.kr/{code}/still/280',
  'https://gdimg.gmarket.co.kr/{code}/still/600',
];

// 시트마다 칸 제목이 조금씩 달라도 값을 찾아내기 위한 후보 목록입니다.
export const BRAND_HEADER_NAMES = ['브랜드', '브랜드명', 'brand', '셀러', '셀러명'];
export const BRANDTYPE_HEADER_NAMES = ['브랜드유형', '브랜드구분', '브랜드타입', 'brandtype'];
export const CATEGORY_HEADER_NAMES = ['카테고리대대분류', '대대분류', '카테고리', '대분류', 'category'];
export const PRODUCT_HEADER_NAMES = ['상품', '상품번호', '상품코드', '상품id', 'sku', '상품명', 'product'];
export const MIDCAT_HEADER_NAMES = ['카테고리대분류', '대분류', '중분류', 'midcategory', 'subcategory'];
export const BRAND_EN_HEADER_NAMES = ['브랜드영문', '영문브랜드', '영문브랜드명', 'branden', 'brandname', 'brandeng'];
export const MIDCAT_EN_HEADER_NAMES = ['카테고리대분류영문', '대분류영문', 'categoryen', 'midcategoryen'];
export const PRODUCTNAME_HEADER_NAMES = ['상품명', '제품명', 'productname', 'itemname', 'title'];
export const IMAGE_HEADER_NAMES = ['상품이미지', '이미지', '이미지url', '이미지링크', '썸네일', 'image', 'imageurl', 'thumbnail'];
export const LINK_HEADER_NAMES = ['상품url', '상품링크', '링크', 'url', 'link', 'producturl'];

// K브랜드목록 시트의 칸 찾기
export const KBRAND_NAME_HEADERS = [
  '브랜드', '브랜드명', '국문명', '국문브랜드명', '한글명', '한글브랜드명',
  'brand', 'brandname', 'name', '브랜드국문',
];
export const KBRAND_EN_HEADERS = [
  '영문명', '영문', '영문브랜드명', '영문브랜드', '브랜드영문', '브랜드영문명',
  '브랜드명영문', '영문표기', 'englishname', 'english', 'eng', 'en',
  'branden', 'brandeng', 'brandenglish', 'brandname', 'nameen', 'enname',
];
export const KBRAND_NOTE_HEADERS = [
  '비고', '메모', '참고', '구분', '제외', '제외여부',
  'note', 'notes', 'remark', 'remarks', 'comment', 'memo',
];
export const KBRAND_NOTE_WORDS = [
  'x', 'n', 'no', 'exclude', '제외', '아님', '비k', '非k',
  '포함', '앞말', 'prefix', '시작', 'y', 'o', 'ok',
];

// 구글시트 탭 이름 ↔ 우리 테이블
export const SHEET_DAILY = '일별실적';
export const SHEET_CALENDAR = '프로모션캘린더';
export const SHEET_BUDGET = '예산';
export const SHEET_BRAND = '브랜드실적';
export const SHEET_KBRAND = 'K브랜드목록';

export const UNCLASSIFIED = '(미분류)';
