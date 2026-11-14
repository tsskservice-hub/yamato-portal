-- 18. 教科書の対応表（16 で作成）を、サイトから読めるようにする
--    16 では読み取りのポリシーは作ったが、表への GRANT が無かったため、
--    レッスンページの「📚 Obento Deluxe (5th edition) · Unit 4 · P. 1-3」が表示されなかった。
--    読むだけの権限。書き込みは今まで通り管理者キーのみ。何度実行しても同じ結果になる。

grant select on public.edu_textbooks             to anon, authenticated;
grant select on public.edu_textbook_units        to anon, authenticated;
grant select on public.edu_lesson_textbook_units to anon, authenticated;
