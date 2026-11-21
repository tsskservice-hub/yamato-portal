-- =====================================================================
-- 23: edu_classes に school_domain を足す（10_teacher_accounts.sql で足りなかった分）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
--
-- 10 は edu_classes を「まだなければ作る」書き方だったが、本番には以前から edu_classes があったため
-- 作る処理が飛ばされ、school_domain（クラスを作った先生の、確認済みの学校メールのドメイン）が無かった。
-- 先生ダッシュボードでのクラス作成・クラス表示と、生徒の参加コードでの申し込みがこの列を使う。
-- 何度実行しても安全。
-- =====================================================================

alter table public.edu_classes add column if not exists school_domain text;

-- すでにあるクラスにドメインが入っていなければ NULL のまま（その件数を下の確認で出す）。
-- 空のクラスが 1 つもなければ、10 と同じく必須にする
do $$
begin
  if not exists (select 1 from public.edu_classes where school_domain is null) then
    alter table public.edu_classes alter column school_domain set not null;
  end if;
end $$;

-- 確認用: school_domain の行が出れば成功。classes_without_domain が 0 なら is_nullable は NO になる
select c.column_name, c.is_nullable,
       (select count(*) from public.edu_classes where school_domain is null) as classes_without_domain
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'edu_classes' and c.column_name = 'school_domain';
