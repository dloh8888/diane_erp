-- ============================================================
-- 프로모션 대시보드 — 구글시트 8개 탭에 대응하는 테이블
--
-- 원래 Apps Script 대시보드가 읽던 구글시트 탭들을 그대로 옮긴 것입니다.
--   일별실적       -> daily_performance
--   브랜드실적     -> brand_performance
--   프로모션캘린더 -> promo_calendar
--   예산           -> budget
--   K브랜드목록    -> kbrand_list
--   (키워드트렌드 / 검색트렌드 / 급상승 은 다음 단계에서 추가)
--
-- 시트가 늘 원본이기 때문에, 업로드할 때마다 해당 테이블을 통째로
-- 비우고 다시 채웁니다. 그래서 delete 권한 정책도 함께 둡니다.
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run.
--         여러 번 실행해도 안전합니다.
-- ============================================================

-- ── 일별실적 ─────────────────────────────────────────────────
-- 필수: 날짜 / 국가 / 구분 / GMV ...
-- 나머지(브랜드·카테고리·상품)는 시트에 칸이 있으면 채워지고, 없으면 비어 있어도 됩니다.
create table if not exists daily_performance (
  id bigint generated always as identity primary key,
  date date not null,
  country text not null,
  type text,                    -- 원문 그대로 ('GD', '지마켓데이', 'BAU' ...). 해석은 앱에서 합니다.
  gmv numeric not null default 0,
  orders numeric not null default 0,
  qty numeric not null default 0,
  kbrand_gmv numeric not null default 0,
  visitors numeric not null default 0,
  spend numeric not null default 0,
  brand text,
  brand_type text,
  brand_en text,
  category text,                -- 카테고리 대대분류
  mid_category text,            -- 카테고리 대분류
  mid_category_en text,
  product text,                 -- 상품번호(코드)
  product_name text,
  image text,
  link text,
  created_at timestamptz not null default now()
);
create index if not exists daily_performance_date_idx on daily_performance (date);
create index if not exists daily_performance_country_idx on daily_performance (country);

-- ── 브랜드실적 ───────────────────────────────────────────────
-- 일별실적에 브랜드 칸이 없을 때 K브랜드 판별에 쓰는 보조 시트입니다.
create table if not exists brand_performance (
  id bigint generated always as identity primary key,
  date date,
  country text not null,
  type text,
  brand text,
  brand_type text,
  brand_en text,
  category text,
  mid_category text,
  mid_category_en text,
  product text,
  gmv numeric not null default 0,
  orders numeric not null default 0,
  qty numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists brand_performance_country_idx on brand_performance (country);

-- ── 프로모션캘린더 ───────────────────────────────────────────
create table if not exists promo_calendar (
  id bigint generated always as identity primary key,
  promotion_name text not null,
  type text,                    -- 구분 (Gmarket Day / MEGA / A+ 등)
  country text,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);
create index if not exists promo_calendar_start_idx on promo_calendar (start_date);

-- ── 예산 ─────────────────────────────────────────────────────
create table if not exists budget (
  id bigint generated always as identity primary key,
  country text not null,
  type text,
  budget numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ── K브랜드목록 ──────────────────────────────────────────────
-- 비고 칸에 '제외/아님/X/N' 이라고 적으면 K브랜드에서 빼고,
-- '포함/앞말/prefix/시작' 이라고 적으면 두 글자 이름도 앞말 매칭을 허용합니다.
create table if not exists kbrand_list (
  id bigint generated always as identity primary key,
  brand text not null,
  note text,
  brand_en text,
  created_at timestamptz not null default now()
);

-- ── 업로드 이력 (마지막으로 언제 무엇을 올렸는지 화면에 보여주기 위함) ──
create table if not exists import_log (
  id bigint generated always as identity primary key,
  file_name text,
  sheet_counts jsonb,           -- {"일별실적": 120, "예산": 5, ...}
  created_at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────
-- sales / promotions 테이블과 같은 방식 (개인용 대시보드 기준).
do $$
declare t text;
begin
  foreach t in array array[
    'daily_performance', 'brand_performance', 'promo_calendar',
    'budget', 'kbrand_list', 'import_log'
  ] loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists "%s_anon_select" on %I', t, t);
    execute format('create policy "%s_anon_select" on %I for select using (true)', t, t);

    execute format('drop policy if exists "%s_anon_insert" on %I', t, t);
    execute format('create policy "%s_anon_insert" on %I for insert with check (true)', t, t);

    execute format('drop policy if exists "%s_anon_update" on %I', t, t);
    execute format('create policy "%s_anon_update" on %I for update using (true) with check (true)', t, t);

    -- 업로드할 때 기존 내용을 통째로 갈아끼우기 위해 필요합니다
    execute format('drop policy if exists "%s_anon_delete" on %I', t, t);
    execute format('create policy "%s_anon_delete" on %I for delete using (true)', t, t);
  end loop;
end $$;
