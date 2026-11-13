-- =====================================================================
-- 05: Stripe sandbox（テスト）用のプラン一覧 PRICE_PLANS_SANDBOX を作る
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 使われる場所: プレビュー（*.pages.dev）と localhost だけ。本番サイトは PRICE_PLANS のまま。
--
-- 手順:
--   1. Stripe の sandbox で starter / standard / pro と同じ商品を作り、Price ID（price_...）を控える
--   2. 下の 3 か所の 'price_SANDBOX_...' を、控えた sandbox の Price ID に書き換える
--   3. ファイル全体を実行する（何度実行しても同じ結果になる）
-- ※ 価格・クレジット数・説明文は PRICE_PLANS（公開用）からそのままコピーされる
-- =====================================================================

insert into public.kl_app (key, data)
select 'PRICE_PLANS_SANDBOX', data
from public.kl_app
where key = 'PRICE_PLANS'
on conflict (key) do update set data = excluded.data;

update public.kl_app
   set data = jsonb_set(jsonb_set(jsonb_set(data::jsonb,
         '{pricePlans,starter,id}',  to_jsonb('price_SANDBOX_STARTER'::text)),
         '{pricePlans,standard,id}', to_jsonb('price_SANDBOX_STANDARD'::text)),
         '{pricePlans,pro,id}',      to_jsonb('price_SANDBOX_PRO'::text))
 where key = 'PRICE_PLANS_SANDBOX';

-- 確認用: 公開用と sandbox 用の Price ID が並んで表示される
select key,
       data->'pricePlans'->'starter'->>'id'  as starter,
       data->'pricePlans'->'standard'->>'id' as standard,
       data->'pricePlans'->'pro'->>'id'      as pro
from public.kl_app
where key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
order by key;
