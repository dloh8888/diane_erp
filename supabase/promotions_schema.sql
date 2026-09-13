-- ============================================================
-- 프로모션 캘린더 — promotions 테이블 (기본 스키마)
-- 사용법: Supabase 대시보드 > SQL Editor 에서 이 파일 전체를
-- 붙여넣고 Run 버튼을 누르면 테이블 생성까지 끝납니다.
-- 이미 promotions_schema_v2.sql 을 실행한 적이 있어도 그대로
-- 다시 실행해도 안전합니다 (전부 if not exists / drop-then-add 방식).
-- ============================================================

create table if not exists promotions (
  id bigint generated always as identity primary key,
  promotion_name text not null,
  platform text not null,          -- 'Gmarket' | 'Lazada' 등
  country text,                    -- 국가별 프로모션인 경우만 채움
  campaign_type text,              -- 캠페인 유형 (예: 빅세일, 플래시세일 등)
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists promotions_start_date_idx on promotions (start_date);

-- 엑셀을 다시 업로드해도 같은 프로모션이 중복으로 쌓이지 않도록 하는 유니크 키
alter table promotions drop constraint if exists promotions_dedupe_key;
alter table promotions add constraint promotions_dedupe_key unique (promotion_name, start_date, country);

-- ------------------------------------------------------------
-- RLS: sales 테이블과 동일하게, 개인용 대시보드 기준으로
-- anon key 읽기/쓰기/수정을 허용하는 단순한 정책을 둡니다.
-- ------------------------------------------------------------
alter table promotions enable row level security;

drop policy if exists "promotions_anon_select" on promotions;
create policy "promotions_anon_select" on promotions for select using (true);

drop policy if exists "promotions_anon_insert" on promotions;
create policy "promotions_anon_insert" on promotions for insert with check (true);

drop policy if exists "promotions_anon_update" on promotions;
create policy "promotions_anon_update" on promotions for update using (true);
