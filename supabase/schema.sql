-- ============================================================
-- 개인 ERP 초기 스키마 — sales 테이블
-- 사용법: Supabase 대시보드 > SQL Editor 에서 이 파일 전체를
-- 붙여넣고 Run 버튼을 누르면 테이블 생성 + 샘플 데이터 입력까지
-- 한 번에 끝납니다.
-- ============================================================

create table if not exists sales (
  id bigint generated always as identity primary key,
  sale_date date not null,
  platform text not null,           -- 'Gmarket' | 'Lazada' 등
  country text,                     -- Lazada처럼 국가별 판매인 경우만 채움 (Gmarket 국내는 NULL)
  product_name text not null,
  sku text,
  quantity integer not null default 0,
  revenue_krw numeric not null default 0,  -- 원화 환산 매출 (집계를 단순하게 하기 위해 항상 KRW로 통일)
  currency text,                    -- 참고용: 실제 결제 통화
  created_at timestamptz not null default now()
);

create index if not exists sales_sale_date_idx on sales (sale_date);

-- ------------------------------------------------------------
-- RLS(Row Level Security): 지금은 로그인 화면 없이 혼자 쓰는
-- 개인용 대시보드이기 때문에, anon key로 읽기/쓰기를 허용하는
-- 가장 단순한 정책을 둡니다. 나중에 로그인을 붙이게 되면 이
-- 정책을 "본인 데이터만" 보이도록 좁히는 걸 추천합니다.
-- ------------------------------------------------------------
alter table sales enable row level security;

drop policy if exists "sales_anon_select" on sales;
create policy "sales_anon_select" on sales for select using (true);

drop policy if exists "sales_anon_insert" on sales;
create policy "sales_anon_insert" on sales for insert with check (true);

-- ------------------------------------------------------------
-- 샘플 데이터 (대시보드가 바로 작동하는지 눈으로 확인하기 위한
-- 더미 데이터입니다. 실제 데이터가 쌓이기 시작하면 아래 delete문으로
-- 지우고 진짜 데이터로 채우면 됩니다.)
-- ------------------------------------------------------------
delete from sales where sku like '%-%' and product_name in (
  '이니스프리 그린티 세럼 50ml','라네즈 워터뱅크 크림','코스알엑스 스네일 에센스',
  '메디힐 마스크팩 10매입','에뛰드 립틴트 세트','삼양 불닭볶음면 5입',
  '농심 신라면 멀티팩','CJ 비비고 만두 세트'
);

insert into sales (sale_date, platform, country, product_name, sku, quantity, revenue_krw, currency) values
('2026-08-21', 'Gmarket', NULL, '메디힐 마스크팩 10매입', 'MDH-MP-010', 15, 257160, 'KRW'),
('2026-08-22', 'Gmarket', NULL, '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 2, 28280, 'KRW'),
('2026-08-08', 'Lazada', 'Singapore', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 36, 757116, 'SGD'),
('2026-06-27', 'Lazada', 'Philippines', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 38, 996778, 'PHP'),
('2026-09-04', 'Lazada', 'Thailand', '삼양 불닭볶음면 5입', 'SY-BDBM-05', 18, 327402, 'THB'),
('2026-08-08', 'Lazada', 'Vietnam', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 25, 358450, 'VND'),
('2026-07-21', 'Lazada', 'Singapore', '에뛰드 립틴트 세트', 'ETD-LT-SET', 3, 114324, 'SGD'),
('2026-06-28', 'Gmarket', NULL, '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 36, 979668, 'KRW'),
('2026-07-20', 'Lazada', 'Vietnam', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 15, 404475, 'VND'),
('2026-08-25', 'Lazada', 'Vietnam', '농심 신라면 멀티팩', 'NS-SRM-MP', 18, 678852, 'VND'),
('2026-07-20', 'Lazada', 'Malaysia', '삼양 불닭볶음면 5입', 'SY-BDBM-05', 14, 356944, 'MYR'),
('2026-08-26', 'Lazada', 'Singapore', '메디힐 마스크팩 10매입', 'MDH-MP-010', 11, 421234, 'SGD'),
('2026-07-18', 'Lazada', 'Singapore', '메디힐 마스크팩 10매입', 'MDH-MP-010', 21, 244965, 'SGD'),
('2026-08-06', 'Gmarket', NULL, '농심 신라면 멀티팩', 'NS-SRM-MP', 18, 222066, 'KRW'),
('2026-08-08', 'Lazada', 'Philippines', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 26, 989846, 'PHP'),
('2026-08-17', 'Lazada', 'Philippines', '메디힐 마스크팩 10매입', 'MDH-MP-010', 36, 1559592, 'PHP'),
('2026-08-02', 'Lazada', 'Singapore', '농심 신라면 멀티팩', 'NS-SRM-MP', 24, 536952, 'SGD'),
('2026-08-18', 'Lazada', 'Vietnam', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 8, 144128, 'VND'),
('2026-08-15', 'Lazada', 'Singapore', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 25, 825225, 'SGD'),
('2026-07-07', 'Lazada', 'Singapore', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 8, 345520, 'SGD'),
('2026-08-01', 'Lazada', 'Vietnam', '에뛰드 립틴트 세트', 'ETD-LT-SET', 28, 514220, 'VND'),
('2026-07-08', 'Gmarket', NULL, '코스알엑스 스네일 에센스', 'CSX-SNL-100', 33, 494109, 'KRW'),
('2026-07-28', 'Lazada', 'Philippines', '삼양 불닭볶음면 5입', 'SY-BDBM-05', 11, 476828, 'PHP'),
('2026-06-29', 'Gmarket', NULL, 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 2, 30662, 'KRW'),
('2026-07-20', 'Lazada', 'Philippines', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 16, 210576, 'PHP'),
('2026-08-25', 'Lazada', 'Vietnam', '코스알엑스 스네일 에센스', 'CSX-SNL-100', 9, 352332, 'VND'),
('2026-06-26', 'Lazada', 'Malaysia', '농심 신라면 멀티팩', 'NS-SRM-MP', 14, 606802, 'MYR'),
('2026-08-10', 'Lazada', 'Thailand', '삼양 불닭볶음면 5입', 'SY-BDBM-05', 29, 1215651, 'THB'),
('2026-07-09', 'Gmarket', NULL, '메디힐 마스크팩 10매입', 'MDH-MP-010', 5, 150780, 'KRW'),
('2026-09-02', 'Lazada', 'Singapore', '메디힐 마스크팩 10매입', 'MDH-MP-010', 1, 12652, 'SGD'),
('2026-08-28', 'Lazada', 'Vietnam', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 22, 278146, 'VND'),
('2026-07-01', 'Lazada', 'Malaysia', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 14, 606746, 'MYR'),
('2026-08-19', 'Lazada', 'Philippines', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 27, 552906, 'PHP'),
('2026-08-23', 'Gmarket', NULL, '삼양 불닭볶음면 5입', 'SY-BDBM-05', 28, 978348, 'KRW'),
('2026-07-07', 'Gmarket', NULL, '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 26, 786136, 'KRW'),
('2026-08-22', 'Lazada', 'Philippines', '메디힐 마스크팩 10매입', 'MDH-MP-010', 35, 1309000, 'PHP'),
('2026-08-18', 'Lazada', 'Philippines', '에뛰드 립틴트 세트', 'ETD-LT-SET', 30, 731130, 'PHP'),
('2026-08-26', 'Lazada', 'Singapore', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 4, 173708, 'SGD'),
('2026-09-03', 'Gmarket', NULL, '코스알엑스 스네일 에센스', 'CSX-SNL-100', 27, 1075302, 'KRW'),
('2026-07-05', 'Lazada', 'Thailand', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 11, 361196, 'THB'),
('2026-09-04', 'Lazada', 'Malaysia', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 19, 678718, 'MYR'),
('2026-06-25', 'Lazada', 'Philippines', '메디힐 마스크팩 10매입', 'MDH-MP-010', 19, 423073, 'PHP'),
('2026-08-28', 'Gmarket', NULL, '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 4, 156984, 'KRW'),
('2026-07-02', 'Lazada', 'Vietnam', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 12, 149880, 'VND'),
('2026-08-27', 'Lazada', 'Thailand', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 37, 892995, 'THB'),
('2026-06-22', 'Gmarket', NULL, '농심 신라면 멀티팩', 'NS-SRM-MP', 38, 1605918, 'KRW'),
('2026-07-26', 'Lazada', 'Philippines', '삼양 불닭볶음면 5입', 'SY-BDBM-05', 16, 406512, 'PHP'),
('2026-07-16', 'Lazada', 'Malaysia', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 21, 267834, 'MYR'),
('2026-09-03', 'Lazada', 'Singapore', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 5, 216170, 'SGD'),
('2026-08-08', 'Lazada', 'Philippines', '삼양 불닭볶음면 5입', 'SY-BDBM-05', 5, 120045, 'PHP'),
('2026-07-19', 'Lazada', 'Philippines', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 35, 973875, 'PHP'),
('2026-06-29', 'Gmarket', NULL, '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 9, 227988, 'KRW'),
('2026-08-21', 'Gmarket', NULL, '에뛰드 립틴트 세트', 'ETD-LT-SET', 19, 414257, 'KRW'),
('2026-07-23', 'Lazada', 'Malaysia', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 17, 192593, 'MYR'),
('2026-08-24', 'Lazada', 'Malaysia', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 1, 29859, 'MYR'),
('2026-08-19', 'Lazada', 'Philippines', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 36, 1297008, 'PHP'),
('2026-06-25', 'Gmarket', NULL, '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 10, 437550, 'KRW'),
('2026-08-31', 'Lazada', 'Singapore', '코스알엑스 스네일 에센스', 'CSX-SNL-100', 28, 457856, 'SGD'),
('2026-08-30', 'Lazada', 'Malaysia', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 23, 500641, 'MYR'),
('2026-08-04', 'Gmarket', NULL, '농심 신라면 멀티팩', 'NS-SRM-MP', 40, 725120, 'KRW'),
('2026-08-05', 'Lazada', 'Philippines', '농심 신라면 멀티팩', 'NS-SRM-MP', 2, 39508, 'PHP'),
('2026-07-24', 'Lazada', 'Philippines', '에뛰드 립틴트 세트', 'ETD-LT-SET', 11, 165924, 'PHP'),
('2026-07-18', 'Gmarket', NULL, '메디힐 마스크팩 10매입', 'MDH-MP-010', 13, 496158, 'KRW'),
('2026-07-22', 'Lazada', 'Philippines', '메디힐 마스크팩 10매입', 'MDH-MP-010', 2, 41312, 'PHP'),
('2026-07-15', 'Lazada', 'Malaysia', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 18, 558216, 'MYR'),
('2026-07-01', 'Lazada', 'Singapore', '삼양 불닭볶음면 5입', 'SY-BDBM-05', 2, 31118, 'SGD'),
('2026-08-02', 'Lazada', 'Singapore', '에뛰드 립틴트 세트', 'ETD-LT-SET', 3, 45312, 'SGD'),
('2026-07-11', 'Lazada', 'Malaysia', '농심 신라면 멀티팩', 'NS-SRM-MP', 39, 1619124, 'MYR'),
('2026-08-21', 'Lazada', 'Singapore', '메디힐 마스크팩 10매입', 'MDH-MP-010', 17, 185436, 'SGD'),
('2026-07-11', 'Gmarket', NULL, '삼양 불닭볶음면 5입', 'SY-BDBM-05', 28, 352380, 'KRW'),
('2026-07-24', 'Lazada', 'Vietnam', '에뛰드 립틴트 세트', 'ETD-LT-SET', 33, 932877, 'VND'),
('2026-07-14', 'Lazada', 'Thailand', '에뛰드 립틴트 세트', 'ETD-LT-SET', 36, 588276, 'THB'),
('2026-08-11', 'Lazada', 'Thailand', '코스알엑스 스네일 에센스', 'CSX-SNL-100', 40, 1108920, 'THB'),
('2026-07-15', 'Gmarket', NULL, '에뛰드 립틴트 세트', 'ETD-LT-SET', 14, 506422, 'KRW'),
('2026-06-22', 'Lazada', 'Thailand', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 29, 638145, 'THB'),
('2026-07-01', 'Lazada', 'Philippines', '라네즈 워터뱅크 크림', 'LNG-WB-CRM', 19, 793820, 'PHP'),
('2026-07-24', 'Gmarket', NULL, '에뛰드 립틴트 세트', 'ETD-LT-SET', 15, 315750, 'KRW'),
('2026-08-17', 'Gmarket', NULL, '메디힐 마스크팩 10매입', 'MDH-MP-010', 31, 395932, 'KRW'),
('2026-07-08', 'Lazada', 'Singapore', '메디힐 마스크팩 10매입', 'MDH-MP-010', 25, 1009975, 'SGD'),
('2026-07-15', 'Lazada', 'Philippines', '이니스프리 그린티 세럼 50ml', 'INN-GT-050', 7, 251034, 'PHP'),
('2026-08-07', 'Lazada', 'Singapore', 'CJ 비비고 만두 세트', 'CJ-BBG-DPL', 4, 178120, 'SGD'),
('2026-08-04', 'Gmarket', NULL, '코스알엑스 스네일 에센스', 'CSX-SNL-100', 30, 1284240, 'KRW'),
('2026-06-25', 'Lazada', 'Thailand', '농심 신라면 멀티팩', 'NS-SRM-MP', 36, 1340028, 'THB'),
('2026-08-15', 'Lazada', 'Thailand', '에뛰드 립틴트 세트', 'ETD-LT-SET', 16, 418768, 'THB'),
('2026-06-30', 'Lazada', 'Philippines', '에뛰드 립틴트 세트', 'ETD-LT-SET', 29, 379233, 'PHP');
