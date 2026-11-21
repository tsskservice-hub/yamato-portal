-- =====================================================================
-- 31: 先生がアップロードしたジグソーの写真を、記録が消えたときにファイルも消す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 25_class_jigsaw.sql と 20_handwriting_image_deletion_queue.sql のあと。api の公開と前後してもかまわない
--
-- 先生がアカウントを削除すると、edu_jigsaw_images の記録は消える（teacher_id の on delete cascade）が、
-- Storage（live-jigsaw バケット）のファイルは残ってしまう。
-- そこで、手書きの写真と同じ「削除待ちリスト」（20）に入れ、api の毎日の処理（handwriting-cleanup.ts）で消す。
--   ・リストに bucket 列を足す（今までの行は手書きの写真 writing-submissions）
--   ・edu_jigsaw_images の記録が消えたら、写真の場所をリストに入れる（先生が消したとき・アカウント削除のとき）
--   ・今すでに記録がなくなっている写真（孤児）もリストに入れる
-- 何度実行しても安全。
-- =====================================================================

-- 1. 削除待ちリストに「どのバケットか」を足す
alter table public.edu_image_deletion_queue
  add column if not exists bucket text not null default 'writing-submissions';

-- 2. ジグソーの写真の記録が消えたら、写真の場所をリストに入れる
create or replace function public.queue_jigsaw_image_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- '/live-game/jigsaw/...' はポータルに置いた写真集の絵（Storage にはない）ので対象外
  if old.storage_path is not null and left(old.storage_path, 1) <> '/' then
    insert into public.edu_image_deletion_queue (path, bucket) values (old.storage_path, 'live-jigsaw')
    on conflict (path) do nothing;
  end if;
  return old;
end;
$$;
revoke all on function public.queue_jigsaw_image_deletion() from public, anon, authenticated;

drop trigger if exists edu_jigsaw_images_queue_deletion on public.edu_jigsaw_images;
create trigger edu_jigsaw_images_queue_deletion
  after delete on public.edu_jigsaw_images
  for each row execute function public.queue_jigsaw_image_deletion();

-- 3. 今すでに記録がなくなっている写真（孤児）をリストに入れる
insert into public.edu_image_deletion_queue (path, bucket)
select o.name, 'live-jigsaw'
from storage.objects o
where o.bucket_id = 'live-jigsaw'
  and o.name like 'images/%'
  and not exists (
    select 1 from public.edu_jigsaw_images i where i.storage_path = o.name
  )
on conflict (path) do nothing;

grant select, insert, update, delete on public.edu_image_deletion_queue to service_role;
notify pgrst, 'reload schema';

-- 確認用: bucket_column と trigger_ok が true なら成功。
-- jigsaw_queued は今リストに入っているジグソーの写真の数（翌日の処理で 0 に戻る）
select
  exists (
    select 1 from information_schema.columns
    where table_name = 'edu_image_deletion_queue' and column_name = 'bucket'
  ) as bucket_column,
  exists (
    select 1 from pg_trigger
    where tgname = 'edu_jigsaw_images_queue_deletion' and not tgisinternal
  ) as trigger_ok,
  (select count(*) from public.edu_image_deletion_queue where bucket = 'live-jigsaw') as jigsaw_queued;
