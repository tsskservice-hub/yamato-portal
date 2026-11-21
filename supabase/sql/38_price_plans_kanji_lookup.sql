-- =====================================================================
-- 38: 公開している料金表（kl_app の PRICE_PLANS）に「漢字AI検索」の行を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
--
-- 足す行（Credit Consumption Guide の最後）:
--   Kanji AI Lookup (🔍 Kanji button) … Free 20 / day, then 1 credit / lookup
-- 本番用（PRICE_PLANS）と Stripe sandbox 用（PRICE_PLANS_SANDBOX）の両方に足す。
-- すでに「Kanji AI Lookup」の行があるときは、何もしない（2 回実行しても行は 1 つ）。
-- 料金を変えたときは、app/data/credit-costs.ts・api/src/credit-rules.ts と一緒に、ここの文も直す。
--
-- 元に戻すとき（いちばん新しいバックアップに戻す）:
--   update public.kl_app set data = (select data from public.kl_app_backup where key = 'PRICE_PLANS'
--                                     order by backed_up_at desc limit 1),
--          updated_at = now() where key = 'PRICE_PLANS';
-- =====================================================================

begin;

-- (1) バックアップ（kl_app_backup は SQL 34 で作ったもの。無ければここで作る）
create table if not exists public.kl_app_backup (
  id           bigint generated always as identity primary key,
  key          text not null,
  data         jsonb,
  backed_up_at timestamptz not null default now()
);
alter table public.kl_app_backup enable row level security;
revoke all on public.kl_app_backup from anon, authenticated;

insert into public.kl_app_backup (key, data)
select key, data from public.kl_app where key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX');

-- (2) 行を足す（creditConsumptionGuide が無ければ、新しく作る）
update public.kl_app
set data = jsonb_set(
      data,
      '{creditConsumptionGuide}',
      coalesce(data->'creditConsumptionGuide', '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
             'item', 'Kanji AI Lookup (🔍 Kanji button)',
             'cost', 'Free 20 / day, then 1 credit / lookup'
           )),
      true
    ),
    updated_at = now()
where key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
  and not exists (
    select 1
    from jsonb_array_elements(coalesce(data->'creditConsumptionGuide', '[]'::jsonb)) g
    where g->>'item' ilike 'Kanji AI Lookup%'
  );

commit;

-- (3) 確認: 料金表の行（最後が Kanji AI Lookup になっているはず）
select k.key, g.ord, g.value->>'item' as item, g.value->>'cost' as cost
from public.kl_app k,
     jsonb_array_elements(k.data->'creditConsumptionGuide') with ordinality as g(value, ord)
where k.key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
order by k.key, g.ord;
