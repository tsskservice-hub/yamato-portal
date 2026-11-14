-- =====================================================================
-- 24: サーバー（service_role）に public の表を読み書きする権限を戻す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
--
-- 分かったこと（2026-11-14）: edu_classes / edu_class_join_requests / edu_live_games などで、
-- service_role に SELECT・INSERT・UPDATE・DELETE が無かった（REFERENCES・TRIGGER・TRUNCATE だけ）。
-- ポータルのサーバーと api は service_role で読み書きするので、教師ダッシュボードのクラス一覧が空になり、
-- クラス作成・参加申請・ライブゲームなども失敗していた。
--
-- service_role はサーバーだけが持つ鍵（ブラウザには出さない）。Supabase の本来の設定どおり、全部の表を扱えるようにする。
-- これからこのスキーマに作る表も、同じ権限が自動で付くようにする。
-- anon / authenticated（ブラウザ）の権限は、この SQL では一切変えない。何度実行しても安全。
-- =====================================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

notify pgrst, 'reload schema';

-- 確認用（SQL Editor は最後の SELECT しか表示しない）:
-- service_role_can_select / service_role_can_insert がすべて true なら成功。
-- browser_can_insert と rls も一緒に出す（ブラウザから直接書ける表で rls が false なら危ない）
select c.relname as table_name,
       has_table_privilege('service_role', c.oid, 'SELECT') as service_role_can_select,
       has_table_privilege('service_role', c.oid, 'INSERT') as service_role_can_insert,
       (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('authenticated', c.oid, 'INSERT')) as browser_can_insert,
       c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'edu\_%'
order by c.relname;
