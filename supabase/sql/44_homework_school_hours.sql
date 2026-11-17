-- =====================================================================
-- 44: 宿題は学校の時間中にはできない（初期設定）。抜け道がないよう、完了の記録をサーバーだけに限る
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。何度実行しても安全。
-- 実行の順番: 42 → 43 → **ポータルと api を公開したあとで** この 44。
--   （44 はブラウザからの完了の書き込みを止める。古いポータルのままだと、レッスンのタスクが完了にならなくなる）
--
-- 仕組み:
--   * クラスごとの学校時間（初期値 8:45〜15:15、月〜金、Australia/Melbourne）
--   * 宿題（kind = 'homework'）は、学校時間中は取り組めない。宿題ごとに「授業中もしてよい」（allow_during_school）にできる
--     課題（classwork）は授業中にやるものなので止めない。同じタスクが課題にも出ていれば止めない
--   * 休んだ生徒など: 先生が生徒ごとに「今日だけ」「〇日まで」解除できる（edu_class_homework_unlocks）
--   * 学校が休みの日（研修日・遠足など）: クラス全体の「今日はブロックしない」（edu_classes.homework_lock_off_date）
--   * 判定はこのファイルの関数 1 か所だけ（ポータルも api もこれを呼ぶ）
--   * レッスンのタスクの完了（edu_student_progress）は、ブラウザから書けないようにする。
--     ポータルのサーバー（/api/lesson-progress）と api（ライティング）が、判定してから書く
-- =====================================================================

-- 1. クラスの学校時間
alter table public.edu_classes add column if not exists school_timezone text not null default 'Australia/Melbourne';
alter table public.edu_classes add column if not exists school_start time not null default '08:45';
alter table public.edu_classes add column if not exists school_end time not null default '15:15';
-- ISO の曜日（1 = 月 … 7 = 日）
alter table public.edu_classes add column if not exists school_days smallint[] not null default '{1,2,3,4,5}';
-- この日（クラスの時間で）は、クラス全体でブロックしない
alter table public.edu_classes add column if not exists homework_lock_off_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'edu_classes_school_hours_check') then
    alter table public.edu_classes add constraint edu_classes_school_hours_check
      check (school_start < school_end and school_days <@ array[1,2,3,4,5,6,7]::smallint[]);
  end if;
end $$;

-- 2. 宿題ごとの「授業中もしてよい」（初期値: してはいけない）
alter table public.edu_homework add column if not exists allow_during_school boolean not null default false;

-- 3. 生徒ごとの解除（until_date の日まで。クラスの時間で数える）
create table if not exists public.edu_class_homework_unlocks (
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  until_date date not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (class_id, user_id)
);
alter table public.edu_class_homework_unlocks enable row level security;
revoke all on public.edu_class_homework_unlocks from anon, authenticated;
grant select, insert, update, delete on public.edu_class_homework_unlocks to service_role;

-- 4. 判定: このクラスのこの生徒は、今、学校時間のブロック中か。ブロック中なら終わる時刻、そうでなければ null
create or replace function public.school_hours_lock_until(p_class_id uuid, p_user_id uuid, p_now timestamptz default now())
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  local_ts timestamp;
  local_date date;
  local_time time;
begin
  select school_timezone, school_start, school_end, school_days, homework_lock_off_date
    into c from public.edu_classes where id = p_class_id;
  if not found then return null; end if;

  local_ts := p_now at time zone c.school_timezone;
  local_date := local_ts::date;
  local_time := local_ts::time;

  if not (extract(isodow from local_ts)::smallint = any (c.school_days)) then return null; end if;
  if local_time < c.school_start or local_time >= c.school_end then return null; end if;
  if c.homework_lock_off_date = local_date then return null; end if;
  if exists (select 1 from public.edu_class_homework_unlocks u
              where u.class_id = p_class_id and u.user_id = p_user_id and u.until_date >= local_date) then
    return null;
  end if;

  return (local_date + c.school_end) at time zone c.school_timezone;
end;
$$;

-- 5. 判定: レッスンのタスク（p_task）を、今この生徒が完了にしてよいか
--    結果: {locked: false} / {locked: true, until: 時刻}
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

  -- 同じタスクが、まだ締切前の課題（授業内）にも出ていれば止めない
  if exists (
    select 1 from public.edu_homework h
     where h.class_id = v_class and h.kind = 'classwork' and h.item_type = 'lesson'
       and h.due_at >= now()
       and h.lesson_id = p_lesson_id and p_task = any (h.task_keys)
       and (h.assign_to = 'class' or exists (select 1 from public.edu_homework_students s where s.homework_id = h.id and s.user_id = p_user_id))
  ) then
    return json_build_object('locked', false);
  end if;

  -- 「授業中はしてはいけない」宿題で、まだ締切前のものに入っているタスクか（締切を過ぎた宿題ではロックしない。45 で追加期間も見る）
  if not exists (
    select 1 from public.edu_homework h
     where h.class_id = v_class and h.kind = 'homework' and h.item_type = 'lesson'
       and not h.allow_during_school
       and h.due_at >= now()
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

-- 6. 判定: 語彙クイズの宿題（p_homework_id）を、今この生徒が解いてよいか
create or replace function public.homework_item_lock(p_user_id uuid, p_homework_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h record;
  v_until timestamptz;
begin
  select class_id, kind, allow_during_school into h from public.edu_homework where id = p_homework_id;
  if not found or h.kind <> 'homework' or h.allow_during_school then return json_build_object('locked', false); end if;
  v_until := public.school_hours_lock_until(h.class_id, p_user_id);
  if v_until is null then return json_build_object('locked', false); end if;
  return json_build_object('locked', true, 'until', v_until);
end;
$$;

-- 判定の関数はサーバー（service_role）だけが呼ぶ
revoke all on function public.school_hours_lock_until(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.homework_task_lock(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.homework_item_lock(uuid, uuid) from public, anon, authenticated;
grant execute on function public.school_hours_lock_until(uuid, uuid, timestamptz) to service_role;
grant execute on function public.homework_task_lock(uuid, uuid, text) to service_role;
grant execute on function public.homework_item_lock(uuid, uuid) to service_role;

-- 7. レッスンのタスクの完了は、ブラウザから書けないようにする（読むのは今まで通りできる）
revoke insert, update, delete on public.edu_student_progress from anon, authenticated;
grant select, insert, update, delete on public.edu_student_progress to service_role;

notify pgrst, 'reload schema';

-- 確認用: browser_can_write_progress が false、unlocks_rls が true、functions が 3 なら成功
select
  (has_table_privilege('authenticated', 'public.edu_student_progress', 'INSERT')
    or has_table_privilege('authenticated', 'public.edu_student_progress', 'UPDATE')) as browser_can_write_progress,
  (select relrowsecurity from pg_class where oid = 'public.edu_class_homework_unlocks'::regclass) as unlocks_rls,
  (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
     and proname in ('school_hours_lock_until', 'homework_task_lock', 'homework_item_lock')) as functions;
