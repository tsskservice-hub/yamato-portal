-- =====================================================================
-- 52: クレジットパックの名前を変える（料金ページの「Top-up credits」）
--   Starter → Top Up Chotto（ちょっと）／ Standard → Top Up Ippai（いっぱい）／ Pro Intensivist → Top Up Meccha（めっちゃ）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: いつでもよい（料金ページと AI ヤマトの説明が、この名前を読む）
--
-- 本番用（PRICE_PLANS）とテスト用（PRICE_PLANS_SANDBOX）の両方を変える。値段・クレジット数・Price ID は変えない。
-- ボタンの文（ctaText）も「Buy Top Up …」にする。
-- Stripe の支払い画面に出る名前は、Stripe の商品名なので、Stripe の管理画面で別に変える。
-- 何度実行しても安全。
-- =====================================================================

update public.kl_app
set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(
      data,
      '{pricePlans,starter,name}', '"Top Up Chotto"'),
      '{pricePlans,starter,ctaText}', '"Buy Top Up Chotto"'),
      '{pricePlans,standard,name}', '"Top Up Ippai"'),
      '{pricePlans,standard,ctaText}', '"Buy Top Up Ippai"'),
      '{pricePlans,pro,name}', '"Top Up Meccha"'),
      '{pricePlans,pro,ctaText}', '"Buy Top Up Meccha"'),
    updated_at = now()
where key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
  and data #> '{pricePlans,starter}' is not null
  and data #> '{pricePlans,standard}' is not null
  and data #> '{pricePlans,pro}' is not null;

-- 確認用: 名前が変わっていること。あわせて、説明文（description・badge・features）に
-- 「期限がない」などの古い説明が残っていないかを見る（パックのクレジットは購入から 1 年で切れるようになった）
select p.key,
       pack.k as pack,
       pack.v ->> 'name' as name,
       pack.v ->> 'price' as price,
       pack.v ->> 'badge' as badge,
       pack.v ->> 'description' as description,
       pack.v -> 'features' as features
from public.kl_app p,
     jsonb_each(p.data -> 'pricePlans') as pack(k, v)
where p.key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
order by p.key, pack.k;
