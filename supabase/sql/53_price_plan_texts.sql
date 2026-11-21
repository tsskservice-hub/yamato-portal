-- =====================================================================
-- 53: 料金ページの説明文を、新しい決まりに合わせる（Free と Top-up の 4 枚）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 52 のあと（いつでもよい）
--
-- 直すところ（2026-11-18 に 52 の確認画面で見つけた）:
--   ・Top Up Meccha「Standard unexpired credits.」→ パックのクレジットは購入から 1 年で切れるようになった（49）
--   ・Top Up Ippai「Our most popular choice.」→ まだ購入がないので「いちばん人気」とは言えない（消費者法の誤解を招く表示）
--   ・Free の「Daily Quiz & Login Credits」→ ログインでもらえるクレジットはない。毎日クイズのクレジットは
--     AI 体験かプランのあとで AI に使える（51）
-- 本番用（PRICE_PLANS）とテスト用（PRICE_PLANS_SANDBOX）の両方を変える。値段・クレジット数・Price ID は変えない。
-- 何度実行しても安全。
-- =====================================================================

update public.kl_app
set data = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(
      data,
      '{pricePlans,free,description}',
      to_jsonb('Answer the daily Japanese quiz correctly to earn 2 credits a day (each valid for 7 days). You can use them on AI features after the AI Trial or with a plan.'::text)),
      '{pricePlans,free,features}',
      '["Daily Quiz Credits", "Games, Culture & Reference Pages", "Genkoyoshi Editor & Basic Tools"]'::jsonb),
      '{pricePlans,starter,description}',
      to_jsonb('A small top-up — enough for a few essay corrections or voice roleplay sessions. Credits can be used for 1 year.'::text)),
      '{pricePlans,standard,description}',
      to_jsonb('A mid-size top-up for regular study and test preparation. Credits can be used for 1 year.'::text)),
      '{pricePlans,pro,description}',
      to_jsonb('For heavy users and intensive drills. Credits can be used for 1 year.'::text)),
    updated_at = now()
where key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
  and data #> '{pricePlans,free}' is not null
  and data #> '{pricePlans,starter}' is not null
  and data #> '{pricePlans,standard}' is not null
  and data #> '{pricePlans,pro}' is not null;

-- 確認用: 8 行（本番用・テスト用 × 4 枚）の説明文が新しくなっていれば成功
select p.key, pack.k as pack, pack.v ->> 'name' as name, pack.v ->> 'description' as description, pack.v -> 'features' as features
from public.kl_app p,
     jsonb_each(p.data -> 'pricePlans') as pack(k, v)
where p.key in ('PRICE_PLANS', 'PRICE_PLANS_SANDBOX')
order by p.key, pack.k;
