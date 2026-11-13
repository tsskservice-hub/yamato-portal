-- =====================================================================
-- 13: 生徒 1 人ずつの使い捨て招待コード（学校が Google を使っていない生徒のため）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 10・12 のあと、この機能を含むポータルを公開する「前」
--
-- 先生がダッシュボードで生徒の人数分のコードを作り、教室で手渡す。
-- 生徒がコードを入れると参加申請になり、先生が承認するとクラスに入る（学校アカウントでの申請と同じ）。
-- コードは 1 回使うと無効。期限は作ってから 14 日（ポータルの teacher-config.ts の INVITE_CODE_DAYS）。
-- =====================================================================

-- 1. 招待コード
--    label: 先生が付けるメモ（生徒の名前など）。先生にだけ見える
--    used_by / used_at: コードを使った生徒と日時（使われるまで null）
create table if not exists public.edu_class_invites (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.edu_classes (id) on delete cascade,
  code text not null unique,
  label text check (label is null or char_length(label) <= 60),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create index if not exists edu_class_invites_class_idx on public.edu_class_invites (class_id, created_at);

-- 2. 参加申請は「確認済みの学校メール」か「招待コード」のどちらかで出す
--    招待コードを先生が取り消したら、そのコードでの申請も消える（on delete cascade）
alter table public.edu_class_join_requests alter column school_email drop not null;
alter table public.edu_class_join_requests
  add column if not exists invite_id uuid references public.edu_class_invites (id) on delete cascade;
alter table public.edu_class_join_requests drop constraint if exists edu_class_join_requests_proof_check;
alter table public.edu_class_join_requests add constraint edu_class_join_requests_proof_check
  check (school_email is not null or invite_id is not null);

-- 3. 招待コードで入った生徒は学校メールがないので、先生が付けたメモを残して一覧に出す
alter table public.edu_class_members add column if not exists invite_label text;

-- ブラウザからは触れないようにする（読み書きはポータルのサーバーが先生・生徒を確認してから行う）
alter table public.edu_class_invites enable row level security;
revoke all on public.edu_class_invites from anon, authenticated;

-- 4. プライバシーポリシーの「5. Teachers and Classes」に招待コードの説明を 1 文足す（二重には足さない）
update public.kl_app
set data = jsonb_set(
      data,
      array[
        'privacy', 'sections',
        (
          select (s.ord - 1)::text
          from jsonb_array_elements(data #> '{privacy,sections}') with ordinality as s(sec, ord)
          where s.sec ->> 'heading' = '5. Teachers and Classes'
        ),
        'content'
      ],
      to_jsonb(
        (
          select s.sec ->> 'content'
          from jsonb_array_elements(data #> '{privacy,sections}') as s(sec)
          where s.sec ->> 'heading' = '5. Teachers and Classes'
        ) || $t$ If a school does not use Google accounts, the teacher can instead give each student a single-use invite code in class. The teacher may add a name or note to each code; only that teacher can see it, and it is shown to the teacher in place of a school email address.$t$
      )
    ),
    updated_at = now()
where key = 'LEGAL_CONTENTS'
  and exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '5. Teachers and Classes'
      and position('single-use invite code' in s ->> 'content') = 0
  );

-- 確認用: invite_id / invite_label の列があり、プライバシーポリシーに 1 文入っていれば成功
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'edu_class_join_requests' and column_name in ('school_email', 'invite_id'))
    or (table_name = 'edu_class_members' and column_name = 'invite_label'));

select position('single-use invite code' in s ->> 'content') > 0 as privacy_updated
from public.kl_app, jsonb_array_elements(data #> '{privacy,sections}') s
where key = 'LEGAL_CONTENTS' and s ->> 'heading' = '5. Teachers and Classes';
