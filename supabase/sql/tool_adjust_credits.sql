-- =====================================================================
-- 道具: クレジットを手動で増減する（履歴にも残高つきで記録する）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度でも使ってよい
-- 使い方: 下の params の 3 つの値だけを書き換えて実行する
--   email  … 対象ユーザーのメールアドレス
--   amount … 足すなら正の数（例 100）、引くなら負の数（例 -20）
--   note   … 履歴の Description に出る文（例 'Test credits'）
-- 結果:
--   ok が true → 成功（増減と、増減後の残高が表示される）
--   ok が false → 残高が足りないので引けなかった（何も変わっていない）
--   0 行（No rows returned）→ メールアドレスの間違い（何も変わっていない）
-- ※ 管理画面で profiles.credits を直接書き換えないこと（履歴・期限つきのクレジット（49）と残高がずれる）
-- 49 のあと: 足す分は「期限なし」のクレジット（adjustment）になる。引く分は期限の近いクレジットから減らす
-- =====================================================================

with params as (
  select 'preview2@jptutoraiyamato.com'::text as email,   -- ← 対象のメールアドレス
         100::integer                         as amount,  -- ← 増減（負の数で減らす）
         'Test credits'::text                 as note     -- ← 履歴に出る説明（足すときだけ使われる）
),
target as (
  select u.id, u.email, p.amount, p.note
  from params p
  join auth.users u on lower(u.email) = lower(p.email)
  where p.amount <> 0
),
done as (
  -- 関数が返す「増減後の残高」をそのまま表示する（同じ文の中では profiles を読み直しても古い値が見えるため）
  select t.email, t.amount,
         case
           when t.amount > 0 then
             public._add_credit_lot(t.id, 'adjustment', t.amount, null, 'manual_adjustment', t.note)::text::json
           else
             public.consume_credits(t.id, -t.amount, 'manual_adjustment')
         end as result
  from target t
)
select email, amount,
       case when json_typeof(result) = 'number' then result::text::int else (result ->> 'balance')::int end as balance_after,
       case when json_typeof(result) = 'number' then true else (result ->> 'ok')::boolean end as ok
from done;
