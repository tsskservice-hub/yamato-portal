-- =====================================================================
-- 64: 本番サイト用の料金表（kl_app PRICE_PLANS）の Top Up パックに、Stripe live の Price ID を入れる
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 何度実行しても安全。PRICE_PLANS_SANDBOX（staging 用）は変えない。
--
-- Stripe live の Price ID（2026-11-21 にユーザーから）:
--   starter  = Top Up Chotto  (A$10) price_1Ue3H8JtfpDoC5FGQtWwvIGl
--   standard = Top Up Ippai   (A$25) price_1Ue3H5JtfpDoC5FGiiuSRyUI
--   pro      = Top Up Meccha  (A$50) price_1Ue3GyJtfpDoC5FG9xZOLf1i
-- 本番サイトはこの id を Stripe に渡し、webhook はこの id でクレジット数を決める（create-checkout-session.ts）
-- =====================================================================

update public.kl_app
set data = jsonb_set(jsonb_set(jsonb_set(
      data,
      '{pricePlans,starter,id}',  '"price_1Ue3H8JtfpDoC5FGQtWwvIGl"'),
      '{pricePlans,standard,id}', '"price_1Ue3H5JtfpDoC5FGiiuSRyUI"'),
      '{pricePlans,pro,id}',      '"price_1Ue3GyJtfpDoC5FG9xZOLf1i"'),
    updated_at = now()
where key = 'PRICE_PLANS'
  and data #> '{pricePlans,starter}' is not null
  and data #> '{pricePlans,standard}' is not null
  and data #> '{pricePlans,pro}' is not null;

-- 確認用: PRICE_PLANS の 3 行が上の live の ID になり、名前と値段が合っていること
--         （Chotto A$10 / Ippai A$25 / Meccha A$50）。sandbox の行は前と同じ ID のまま
select p.key,
       pack.k as pack,
       pack.v ->> 'name' as name,
       pack.v ->> 'price' as price,
       pack.v ->> 'id' as price_id
from public.kl_app p,
     jsonb_each(p.data -> 'pricePlans') as pack(k, v)
where p.key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
  and pack.k in ('starter', 'standard', 'pro')
order by p.key, pack.k;
