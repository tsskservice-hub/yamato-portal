-- =====================================================================
-- 50: 新規登録の 10 クレジット（ウェルカムボーナス）の説明を消す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 49_credit_lots.sql（10 クレジットを実際にやめる SQL）と同じとき
--
-- kl_app の CONTENT_OTHER に、次の 2 つが残っていた（2026-11-18 に確認）:
--   ・systemRules.welcomeBonusCredits = 10（AI ヤマトが「新規登録で 10 クレジット」と答えるもと）→ 0 にする
--   ・トップページの毎日クイズの文「…, or sign up now to receive 10 welcome credits!」→ その部分を消す
-- YAMATO_CONFIGS の「Welcome to …」はあいさつの文なので、そのまま。
-- 何度実行しても安全。
-- =====================================================================

update public.kl_app
set data = jsonb_set(
      replace(data::text, ', or sign up now to receive 10 welcome credits!', '!')::jsonb,
      '{systemRules,welcomeBonusCredits}',
      '0'::jsonb
    ),
    updated_at = now()
where key = 'CONTENT_OTHER'
  and data ? 'systemRules';

-- 確認用: welcome_bonus が 0、text_left が false なら成功
select data #>> '{systemRules,welcomeBonusCredits}' as welcome_bonus,
       data::text ilike '%welcome credits%' as text_left
from public.kl_app
where key = 'CONTENT_OTHER';
