-- ============================================================
-- Keyword Trend 탭용 테이블 (구글시트 3개 탭에 대응)
--   키워드트렌드 -> keyword_trend   (쇼피/라자다 상품 데이터)
--   검색트렌드   -> search_trend    (구글 트렌드 지수)
--   급상승       -> rising_search   (급상승 검색어)
-- 여러 번 실행해도 안전합니다.
-- ============================================================

create table if not exists keyword_trend (
  id bigint generated always as identity primary key,
  period text,            -- 기간구분: 일 / 주 / 월
  base_date date,         -- 기준일
  platform text,          -- Shopee / Lazada
  country text,
  category text,
  product_name text,
  brand text,
  sold numeric not null default 0,   -- 누적판매량
  asp numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists search_trend (
  id bigint generated always as identity primary key,
  collected_at date,      -- 수집일
  country text,
  category text,
  type text,              -- 유형 (카테고리 / K브랜드 / 경쟁브랜드 등)
  grp text,               -- 그룹 (Trends 차트 묶음)
  keyword text,
  week date,              -- 주차
  value numeric not null default 0,  -- 지수
  created_at timestamptz not null default now()
);

create table if not exists rising_search (
  id bigint generated always as identity primary key,
  collected_at date,
  country text,
  category text,
  query text,             -- 급상승 검색어
  growth text,            -- 증가율 (Breakout 같은 글자도 들어옵니다)
  note text,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['keyword_trend', 'search_trend', 'rising_search'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "%s_anon_select" on %I', t, t);
    execute format('create policy "%s_anon_select" on %I for select using (true)', t, t);
    execute format('drop policy if exists "%s_anon_insert" on %I', t, t);
    execute format('create policy "%s_anon_insert" on %I for insert with check (true)', t, t);
    execute format('drop policy if exists "%s_anon_delete" on %I', t, t);
    execute format('create policy "%s_anon_delete" on %I for delete using (true)', t, t);
  end loop;
end $$;
