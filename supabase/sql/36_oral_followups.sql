-- =====================================================================
-- 36: elaborate の「つっこみ質問」の記録（1 回だけ使える無料の券）
--   api/src/services/oral-followup.ts が使う。
--   ・AI がつっこみ質問を作ったら 1 行入れ、その id を券として画面に返す
--   ・生徒がつっこみに答えるとき、本人の券・30 分以内・未使用なら used_at を入れて、その答えはクレジットを引かない
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: api をデプロイする「前」（テーブルがないと、つっこみ質問は出ないだけで、ほかは動く）
-- ブラウザからは読み書きできない（RLS あり・ポリシーなし）。api はサービスロールで使う
-- =====================================================================

create table if not exists public.oral_followups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  question    text not null check (char_length(question) <= 200),
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);

create index if not exists oral_followups_user_created_idx
  on public.oral_followups (user_id, created_at desc);

alter table public.oral_followups enable row level security;
revoke all on public.oral_followups from anon, authenticated;

-- 古い記録を消す（30 日より前のもの）。必要なときに手で実行してよい
-- delete from public.oral_followups where created_at < now() - interval '30 days';

-- 確認: テーブルがあり、RLS が有効なら成功
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname = 'oral_followups';
