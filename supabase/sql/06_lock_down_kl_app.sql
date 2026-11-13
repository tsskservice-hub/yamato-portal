-- =====================================================================
-- 06: kl_app（料金プラン・クイズ・AI ヤマトの知識など）を、だれでも書き換えられる状態を止める
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: すぐ（ほかの作業と順番の関係はない）
--
-- 事前確認済み（2026-11-13）:
--   - ポリシー "Allow insert and update on app_knowledge" が ALL / public / true（ログインなしでも書き込み可）
--   - 正規の書き込みは api の /api/sync-knowledge（管理者キー）と Supabase 管理画面だけ → 影響なし
--   - ポータルの app/data/*.ts の upsert 関数はどこからも呼ばれていない
--   - scripts/seed-oral-questions.ts（ブラウザ用の鍵）は今後動かなくなる → 使うときは管理者キーで実行する
-- =====================================================================

-- 書き込みポリシーを削除（読み取り用の "Allow public read access to app_knowledge" は残す）
drop policy if exists "Allow insert and update on app_knowledge" on public.kl_app;

-- 念のため、権限そのものも外す（読み取りはそのまま）
revoke insert, update, delete, truncate on public.kl_app from anon, authenticated;

-- 確認用 1: kl_app のポリシーが SELECT だけ、書き込み権限が false なら成功
select 'kl_app policy: ' || policyname as item, cmd as detail
  from pg_policies where schemaname = 'public' and tablename = 'kl_app'
union all
select 'anon can update kl_app (expect false)', has_table_privilege('anon', 'public.kl_app', 'UPDATE')::text
union all
select 'authenticated can update kl_app (expect false)', has_table_privilege('authenticated', 'public.kl_app', 'UPDATE')::text
union all
-- 確認用 2: ほかのテーブルにも「だれでも書き込める」ポリシーが残っていないか（あれば一覧に出る）
select 'OPEN WRITE POLICY: ' || tablename || ' / ' || policyname,
       cmd || ' / roles=' || roles::text || ' / using=' || coalesce(qual, '') || ' / check=' || coalesce(with_check, '')
  from pg_policies
 where schemaname = 'public'
   and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
   and (coalesce(qual, 'true') = 'true' and coalesce(with_check, 'true') = 'true');
