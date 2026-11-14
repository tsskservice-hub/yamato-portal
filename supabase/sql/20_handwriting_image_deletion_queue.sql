-- =====================================================================
-- 20: 記録ごと消えた手書きの写真も、ファイルを確実に消す（削除待ちリスト）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: いつでもよい（api の毎日の処理がこのリストを読むので、api の公開と前後してもかまわない）
--
-- 期限切れの写真は api の毎日の処理（handwriting-cleanup.ts）が消す。ただし、それは
-- edu_writing_submissions の記録（image_delete_after）を見て消すので、記録ごと消えた写真は残ってしまう。
--   例: 生徒がアカウントを削除した / 管理画面からユーザーを消した / 課題が消えて記録も消えた
-- そこで、写真付きの記録が消えるときに、写真の場所を「削除待ちリスト」に入れる。api が毎日それも消す。
-- あわせて、今すでに記録がなくなっている写真（孤児）もリストに入れる。
-- =====================================================================

-- 1. 削除待ちリスト（ブラウザからは読み書きできない。api が管理者キーで使う）
create table if not exists public.edu_image_deletion_queue (
  path text primary key,                       -- バケット writing-submissions の中の場所
  queued_at timestamptz not null default now()
);
alter table public.edu_image_deletion_queue enable row level security;
revoke all on public.edu_image_deletion_queue from anon, authenticated;

-- 2. 写真付きの記録が消えたら、写真の場所をリストに入れる（どの方法で消えても動く）
create or replace function public.queue_writing_image_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.image_path is not null and old.image_deleted_at is null then
    insert into public.edu_image_deletion_queue (path) values (old.image_path)
    on conflict (path) do nothing;
  end if;
  return old;
end;
$$;
revoke all on function public.queue_writing_image_deletion() from public, anon, authenticated;

drop trigger if exists edu_writing_submissions_queue_image_deletion on public.edu_writing_submissions;
create trigger edu_writing_submissions_queue_image_deletion
  after delete on public.edu_writing_submissions
  for each row execute function public.queue_writing_image_deletion();

-- 3. 今すでに記録がなくなっている写真（孤児）をリストに入れる
insert into public.edu_image_deletion_queue (path)
select o.name
from storage.objects o
where o.bucket_id = 'writing-submissions'
  and not exists (
    select 1 from public.edu_writing_submissions s where s.image_path = o.name
  )
on conflict (path) do nothing;

-- 確認用: trigger_ok が true なら成功。queued は今リストに入っている写真の数（翌日の処理で 0 に戻る）
select
  exists (
    select 1 from pg_trigger
    where tgname = 'edu_writing_submissions_queue_image_deletion' and not tgisinternal
  ) as trigger_ok,
  (select count(*) from public.edu_image_deletion_queue) as queued;
