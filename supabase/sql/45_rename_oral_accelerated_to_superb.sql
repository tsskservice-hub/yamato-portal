-- =====================================================================
-- 45_rename_oral_accelerated_to_superb.sql
-- ページの名前を「EOY Oral Accelerated」から「EOY Oral Superb」に変える（Supabase の kl_app の中身）
-- 理由: 「accelerated」は learning pace の名前（steady / normal / accelerated）と同じで紛らわしいため
--
-- 変えるもの:
--   ・ページの ID とリンク:  eoy-oral-accelerated  →  eoy-oral-superb（LP・VCE ページのカード、ヤマトの設定など、どの行でも）
--   ・名前:                   EOY Oral Accelerated  →  EOY Oral Superb（料金表など）
--   ・カード（CONTENT_VCE_SPEAKING）の中の「Accelerated」→「Superb」（このページのカードの中だけ）
-- learning pace の「accelerated」は変えない。
-- 古い URL（/vce/speaking/eoy-oral-accelerated）は、新しい URL に自動で移る（portal 側）。
-- 実行するのは portal をデプロイしたあと（新しい URL のページができてから）。
-- =====================================================================

-- (0) 実行する前の確認: どの行に古い名前があるか
select key,
       (length(data::text) - length(replace(data::text, 'eoy-oral-accelerated', ''))) / length('eoy-oral-accelerated') as id_or_link_count,
       (length(data::text) - length(replace(data::text, 'EOY Oral Accelerated', ''))) / length('EOY Oral Accelerated') as name_count
from public.kl_app
where data::text like '%eoy-oral-accelerated%' or data::text like '%EOY Oral Accelerated%'
order by key;

begin;

-- (1) バックアップ（kl_app_backup は SQL 34 / 38 / 44 で作ったもの。無ければ作る）
create table if not exists public.kl_app_backup (
  id           bigint generated always as identity primary key,
  key          text not null,
  data         jsonb,
  backed_up_at timestamptz not null default now()
);
alter table public.kl_app_backup enable row level security;
revoke all on public.kl_app_backup from anon, authenticated;

insert into public.kl_app_backup (key, data)
select key, data from public.kl_app
where data::text like '%eoy-oral-accelerated%' or data::text like '%EOY Oral Accelerated%';

-- (2) ID・リンク・名前を変える（どの行でも）
update public.kl_app
set data = replace(replace(data::text, 'eoy-oral-accelerated', 'eoy-oral-superb'), 'EOY Oral Accelerated', 'EOY Oral Superb')::jsonb,
    updated_at = now()
where data::text like '%eoy-oral-accelerated%' or data::text like '%EOY Oral Accelerated%';

-- (3) VCE Speaking のカードの中の「Accelerated」も「Superb」に（このページのカードだけ）
update public.kl_app
set data = (
      select jsonb_agg(
               case when e->>'id' = 'eoy-oral-superb' then replace(e::text, 'Accelerated', 'Superb')::jsonb else e end
               order by ord)
      from jsonb_array_elements(data) with ordinality as t(e, ord)
    ),
    updated_at = now()
where key = 'CONTENT_VCE_SPEAKING' and jsonb_typeof(data) = 'array';

commit;

-- (4) 確認: このページのカード（名前・リンクが Superb になっているか）
select e as superb_card
from public.kl_app, jsonb_array_elements(data) as e
where key = 'CONTENT_VCE_SPEAKING' and jsonb_typeof(data) = 'array' and e->>'id' = 'eoy-oral-superb';

-- 元に戻すとき（いちばん新しいバックアップに戻す。key ごとに）:
--   update public.kl_app k set data = b.data, updated_at = now()
--   from (select distinct on (key) key, data from public.kl_app_backup order by key, backed_up_at desc) b
--   where k.key = b.key and k.key in ('CONTENT_VCE_SPEAKING', 'PRICE_PLANS', 'PRICE_PLANS_SANDBOX');
