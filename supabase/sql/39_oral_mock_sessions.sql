-- =====================================================================
-- 39_oral_mock_sessions.sql
-- EOY Oral Mock（模擬試験）の 1 回分を記録する
--
-- ・試験を始めるときに 1 回だけクレジットを引き（Section 1: 15 / Section 2: 15 / 通し: 25）、ここに 1 行作る
-- ・試験官 AI の 1 回ごとの返事は、この行で「本人の・始めて 60 分以内の・回数の上限内の」試験か確かめる
--   （クレジットを 1 回払えば、試験官 AI を何百回も呼べる、ということにならないように）
-- ・最後のフィードバックも、この行で確かめる（1 回の試験で 3 回まで。失敗したときにやり直せるように）
-- ・会話の中身（生徒の答え）は保存しない
--
-- 実行するのは api をデプロイする「前」。
-- テーブルと関数は api（service role）だけが使う。ブラウザからは読めない・書けない。
-- =====================================================================

create table if not exists public.oral_mock_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_section text not null check (exam_section in ('section1', 'section2', 'both')),
  difficulty text not null check (difficulty in ('steady', 'normal', 'accelerated')),
  include_before_after boolean not null default true,
  credits_used integer not null default 0,
  turns_used integer not null default 0,
  feedback_count integer not null default 0,
  created_at timestamptz not null default now(),
  feedback_at timestamptz
);

create index if not exists oral_mock_sessions_user_idx on public.oral_mock_sessions (user_id, created_at desc);

-- RLS を有効にして、ポリシーは作らない（= ブラウザからは一切さわれない。api の service role だけ）
alter table public.oral_mock_sessions enable row level security;

-- ---------------------------------------------------------------------
-- 試験官 AI の返事 1 回分を使う。使えたら試験の設定を返す（使えなければ null）
-- ---------------------------------------------------------------------
create or replace function public.use_oral_mock_turn(
  p_session_id uuid,
  p_user_id uuid,
  p_max_turns integer default 80
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.oral_mock_sessions%rowtype;
begin
  update public.oral_mock_sessions
     set turns_used = turns_used + 1
   where id = p_session_id
     and user_id = p_user_id
     and feedback_at is null
     and turns_used < p_max_turns
     and created_at > now() - interval '60 minutes'
  returning * into v_row;

  if not found then
    return null;
  end if;
  return json_build_object('exam_section', v_row.exam_section, 'difficulty', v_row.difficulty,
                           'turns_used', v_row.turns_used);
end;
$$;

-- ---------------------------------------------------------------------
-- 最後のフィードバックを 1 回分使う（試験を始めてから 3 時間以内・3 回まで）
-- ---------------------------------------------------------------------
create or replace function public.use_oral_mock_feedback(
  p_session_id uuid,
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.oral_mock_sessions%rowtype;
begin
  update public.oral_mock_sessions
     set feedback_count = feedback_count + 1,
         feedback_at = coalesce(feedback_at, now())
   where id = p_session_id
     and user_id = p_user_id
     and feedback_count < 3
     and created_at > now() - interval '3 hours'
  returning * into v_row;

  if not found then
    return null;
  end if;
  return json_build_object('exam_section', v_row.exam_section, 'difficulty', v_row.difficulty,
                           'include_before_after', v_row.include_before_after);
end;
$$;

revoke all on function public.use_oral_mock_turn(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.use_oral_mock_feedback(uuid, uuid) from public, anon, authenticated;
grant execute on function public.use_oral_mock_turn(uuid, uuid, integer) to service_role;
grant execute on function public.use_oral_mock_feedback(uuid, uuid) to service_role;
