-- 15. 文化タスク（task_key = 'culture'）を追加する
--    全レッスンのタスクが 6 つ（vocabulary / listening / reading / speaking / writing / culture）になる。
--    何度実行しても同じ結果になる。

-- 1. 宿題で culture も出せるようにする（edu_homework.task_keys の制約を作り直す）
do $$
declare
  c text;
begin
  if to_regclass('public.edu_homework') is null then
    raise notice 'edu_homework does not exist; skipped';
    return;
  end if;

  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.edu_homework'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%task_keys%'
  loop
    execute format('alter table public.edu_homework drop constraint %I', c);
  end loop;

  alter table public.edu_homework
    add constraint edu_homework_task_keys_check check (
      cardinality(task_keys) > 0
      and task_keys <@ array['vocabulary', 'listening', 'reading', 'speaking', 'writing', 'culture']
    );
end $$;

-- 2. 確認：edu_student_progress に task_key の値を制限する制約が無いか
--    （行が返ってきて、その中に 'culture' が含まれていなければ、文化タスクの完了が保存できない）
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.edu_student_progress'::regclass
  and contype = 'c';
