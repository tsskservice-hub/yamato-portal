-- =====================================================================
-- 管理用: Yamato Town の「みんなで（Together）」モードの報告を見る・片づける（SQL 58 の表）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）。必要なときに、使う部分だけ実行する
--
-- 決まり: 7 日以内に、確認前（reviewed_at が空）の報告が 3 人以上から来た人は、自動で入れなくなる。
--   ・問題なし → その人への報告に reviewed_at を入れる（入れるようになる）
--   ・問題あり → world_plaza_bans に入れる（until が null ならずっと）。そのあと報告に reviewed_at を入れる
-- =====================================================================

-- (A) 確認前の報告（新しい順）。recent_actions = 報告されたときの、その人の最近の決まった文・スタンプ
-- select r.id, r.created_at, r.place, r.reason,
--        r.reported_id, rp.email as reported_email,
--        r.reporter_id, rr.email as reporter_email,
--        r.recent_actions
-- from public.world_plaza_reports r
-- left join auth.users rp on rp.id = r.reported_id
-- left join auth.users rr on rr.id = r.reporter_id
-- where r.reviewed_at is null
-- order by r.created_at desc
-- limit 100;

-- (B) 問題なし: その人への確認前の報告を、確認済みにする（'<reported_id>' を入れかえる）
-- update public.world_plaza_reports
-- set reviewed_at = now(), review_note = 'checked: no problem'
-- where reported_id = '<reported_id>' and reviewed_at is null;

-- (C) 問題あり: 入れないようにする（期間つきなら until に日時。ずっとなら null）
-- insert into public.world_plaza_bans (user_id, until, note)
-- values ('<reported_id>', now() + interval '30 days', 'reason here')
-- on conflict (user_id) do update set until = excluded.until, note = excluded.note;
-- update public.world_plaza_reports
-- set reviewed_at = now(), review_note = 'banned'
-- where reported_id = '<reported_id>' and reviewed_at is null;

-- (D) 止めるのをやめる
-- delete from public.world_plaza_bans where user_id = '<user_id>';

-- 今の様子（これだけはそのまま実行してよい）
select
  (select count(*) from public.world_plaza_reports where reviewed_at is null) as reports_to_check,
  (select count(*) from public.world_plaza_bans where until is null or until > now()) as banned_now,
  (select count(*) from public.world_plaza_consents) as users_agreed,
  (select count(*) from public.world_plaza_blocks) as blocks;
