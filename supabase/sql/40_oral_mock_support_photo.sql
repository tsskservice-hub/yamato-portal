-- =====================================================================
-- 40_oral_mock_support_photo.sql
-- EOY Oral Mock: Section 2 で生徒が見せる写真（特別研究の資料・1 枚）を、AI の試験官が分かるようにする
--
-- ・写真そのものは保存しない。AI が写真を見て書いた「説明の文」だけを、試験の行に入れる
--   （試験官 AI は毎回この説明を読んで、写真について会話できる。毎回写真を送るより速くて安い）
-- ・SQL 39 の後に実行する（39 をまだ実行していなければ、39 → 40 の順に）。api をデプロイする「前」に実行する
-- =====================================================================

alter table public.oral_mock_sessions
  add column if not exists support_description text;

-- 試験官 AI の返事 1 回分を使う（SQL 39 と同じ。写真の説明も返すように変えた）
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
                           'turns_used', v_row.turns_used, 'support_description', v_row.support_description);
end;
$$;

-- 最後のフィードバックを 1 回分使う（SQL 39 と同じ。写真の説明も返すように変えた）
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
                           'include_before_after', v_row.include_before_after,
                           'support_description', v_row.support_description);
end;
$$;

revoke all on function public.use_oral_mock_turn(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.use_oral_mock_feedback(uuid, uuid) from public, anon, authenticated;
grant execute on function public.use_oral_mock_turn(uuid, uuid, integer) to service_role;
grant execute on function public.use_oral_mock_feedback(uuid, uuid) to service_role;

-- 確認: support_description の列ができているか
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'oral_mock_sessions'
order by ordinal_position;
