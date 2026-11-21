-- =====================================================================
-- 55: 会話練習の空間（Yamato Town）の音声会話を、EOY Oral Superb と同じ表で管理できるようにする
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: api（/api/world/start）を公開する「前」
--
-- 音声会話（OpenAI Realtime）は oral_realtime_sessions（44）に 1 回 1 行で記録している。
-- 同じ表を使えば、「1 人 1 つまで」「時間が来たらサーバーが切る（毎分の定期処理）」がそのまま効く。
-- そのために、次の 2 つの制限を広げる:
--   ・minutes: 5 / 10 → 3 / 5 / 10（お店の会話は 3 分）
--   ・focus: free / sec1 / sec2 → それに加えて 'world:<場所の ID>'（例 world:burger-shop）
-- 会話の中身（声・文字）は、これまでどおり保存しない。何度実行しても安全。
-- =====================================================================

do $$
declare
  c record;
begin
  -- 今ある minutes・focus の制限を外す（名前が分からなくても、中身で探して外す）
  for c in
    select con.conname
      from pg_constraint con
     where con.conrelid = 'public.oral_realtime_sessions'::regclass
       and con.contype = 'c'
       and (pg_get_constraintdef(con.oid) ilike '%minutes%' or pg_get_constraintdef(con.oid) ilike '%focus%')
  loop
    execute format('alter table public.oral_realtime_sessions drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.oral_realtime_sessions
  add constraint oral_realtime_sessions_minutes_check check (minutes in (3, 5, 10)),
  add constraint oral_realtime_sessions_focus_check check (focus in ('free', 'sec1', 'sec2') or focus ~ '^world:[a-z0-9-]{1,40}$');

notify pgrst, 'reload schema';

-- 確認用: 2 行とも出れば成功（新しい制限の中身）
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.oral_realtime_sessions'::regclass
  and conname in ('oral_realtime_sessions_minutes_check', 'oral_realtime_sessions_focus_check');
