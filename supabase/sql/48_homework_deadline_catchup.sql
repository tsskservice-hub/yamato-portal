-- =====================================================================
-- 48: 宿題・課題の締切と追加期間（catch-up）。期限内に終えたかの記録を残す
-- （以前の名前: 45_homework_deadline_catchup.sql。口頭 Superb の 45 と番号が重なったため 48 に変更）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度実行しても安全。
-- 実行の順番: 42 → 43 → （ポータル・api を公開）→ 47 → 48。48 は 47 の後ならいつでもよい
--
-- これまで: 締切を過ぎても宿題は閉じず、いつ終えても「完了」。期限内かどうかは分からなかった。
-- これから:
--   * 締切（due_at）までに終えた = 期限内に完了
--   * 終えていない生徒は、追加期間（catchup_until）までに終えれば「遅れて完了」
--   * 追加期間が終わったら閉じる（その後に終えても宿題としては数えない。レッスンの自習の記録としては残る）
--   * いつ終えたかは edu_student_progress.completed_at（最初に完了した時刻。後から上書きされない）で判定する
-- =====================================================================

-- 1. 宿題・課題の追加期間（null = 追加期間なし。締切で閉じる）
alter table public.edu_homework add column if not exists catchup_until timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'edu_homework_catchup_check') then
    alter table public.edu_homework add constraint edu_homework_catchup_check
      check (catchup_until is null or catchup_until > due_at);
  end if;
end $$;

-- 2. レッスンのタスクを最初に完了した時刻（期限内かどうかの判定に使う）
alter table public.edu_student_progress add column if not exists completed_at timestamptz;

-- これまでの完了は updated_at（完了したときに書いた時刻）で埋める
update public.edu_student_progress
   set completed_at = coalesce(updated_at, now())
 where is_completed and completed_at is null;

-- 完了の時刻は、最初に完了したときだけ入れ、あとから上書きしない（ライティングの再提出などで遅くならないように）
create or replace function public.edu_student_progress_keep_completed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.is_completed and old.completed_at is not null then
    new.completed_at := old.completed_at;
  elsif new.is_completed and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists edu_student_progress_keep_completed_at on public.edu_student_progress;
create trigger edu_student_progress_keep_completed_at
  before insert or update on public.edu_student_progress
  for each row execute function public.edu_student_progress_keep_completed_at();

-- 3. 学校時間のブロック（47）を、追加期間中の宿題にも効くようにする（閉じた宿題には効かない）
create or replace function public.homework_task_lock(p_user_id uuid, p_lesson_id uuid, p_task text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_class uuid;
  v_until timestamptz;
begin
  select class_id into v_class from public.edu_class_members
   where user_id = p_user_id and role = 'student' limit 1;
  if v_class is null then return json_build_object('locked', false); end if;

  -- 同じタスクが、まだ開いている課題（授業内）にも出ていれば止めない
  if exists (
    select 1 from public.edu_homework h
     where h.class_id = v_class and h.kind = 'classwork' and h.item_type = 'lesson'
       and coalesce(h.catchup_until, h.due_at) >= now()
       and h.lesson_id = p_lesson_id and p_task = any (h.task_keys)
       and (h.assign_to = 'class' or exists (select 1 from public.edu_homework_students s where s.homework_id = h.id and s.user_id = p_user_id))
  ) then
    return json_build_object('locked', false);
  end if;

  -- 「授業中はしてはいけない」宿題で、まだ開いている（締切前か追加期間中の）ものに入っているタスクか
  if not exists (
    select 1 from public.edu_homework h
     where h.class_id = v_class and h.kind = 'homework' and h.item_type = 'lesson'
       and not h.allow_during_school
       and coalesce(h.catchup_until, h.due_at) >= now()
       and h.lesson_id = p_lesson_id and p_task = any (h.task_keys)
       and (h.assign_to = 'class' or exists (select 1 from public.edu_homework_students s where s.homework_id = h.id and s.user_id = p_user_id))
  ) then
    return json_build_object('locked', false);
  end if;

  v_until := public.school_hours_lock_until(v_class, p_user_id);
  if v_until is null then return json_build_object('locked', false); end if;
  return json_build_object('locked', true, 'until', v_until);
end;
$$;

revoke all on function public.homework_task_lock(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.homework_task_lock(uuid, uuid, text) to service_role;

notify pgrst, 'reload schema';

-- 確認用: catchup_column と completed_at_column が 1、trigger が 1、missing_completed_at が 0 なら成功
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'edu_homework' and column_name = 'catchup_until') as catchup_column,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'edu_student_progress' and column_name = 'completed_at') as completed_at_column,
  (select count(*) from pg_trigger where tgname = 'edu_student_progress_keep_completed_at') as trigger,
  (select count(*) from public.edu_student_progress where is_completed and completed_at is null) as missing_completed_at;
