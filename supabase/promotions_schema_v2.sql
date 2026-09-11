alter table promotions add column if not exists country text;
alter table promotions add column if not exists campaign_type text;

alter table promotions drop constraint if exists promotions_dedupe_key;
alter table promotions add constraint promotions_dedupe_key unique (promotion_name, start_date, country);
