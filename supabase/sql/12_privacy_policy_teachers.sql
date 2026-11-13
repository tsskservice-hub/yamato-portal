-- =====================================================================
-- 12: プライバシーポリシーに「州・学校名」と「先生とクラス」を追記する（下書き）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 文面を確認・修正してから、10 を実行して新機能を公開するのと同じ日に
--
-- kl_app の key = 'LEGAL_CONTENTS' の data.privacy を書き換える。
--   - 1. Information We Collect / 2. How We Use Your Information の文末に 1 文ずつ追記
--   - 「5. Teachers and Classes」を末尾に追加
--   - lastUpdated を更新（公開する日付に合わせて書き換える）
-- 二重に実行しても同じ文が重ならないよう、5 章がまだない場合だけ更新する。
--
-- ※ 注意（2026-11-13）: この SQL では 1 章・2 章への追記が反映されない。5 章を追加する処理が
--   書き換え前の data を使うため、1 章・2 章の変更を上書きしてしまう。本番では 5 章だけが入った。
--   1 章・2 章の追記は 14_privacy_policy_google_profile.sql で行う。
-- =====================================================================

update public.kl_app
set data = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            data,
            '{privacy,sections,0,content}',
            to_jsonb((data #>> '{privacy,sections,0,content}') || $t$ If you choose to provide them, we also collect your state (or that you live outside Australia) and the name of your school. If you link a school Google or Microsoft account, we receive only its email address, so we can confirm which school you belong to.$t$)
          ),
          '{privacy,sections,1,content}',
          to_jsonb((data #>> '{privacy,sections,1,content}') || $t$ Your state and school are optional and are used only to improve features for schools (such as teacher dashboards) and, for teacher accounts, to help us confirm that you are a teacher.$t$)
        ),
        '{privacy,sections}',
        (data #> '{privacy,sections}') || jsonb_build_array(jsonb_build_object(
          'heading', '5. Teachers and Classes',
          'content', $t$Teacher accounts are checked by AI Yamato, and a teacher must verify their school Google or Microsoft account before creating a class. Each class is linked to the teacher's school email domain. To ask to join a class, a student must enter the class code and verify a school account from the same school (or, for some government school systems, the same state school system); the teacher then approves or declines the request. Students who study on their own do not need a school account. A student can leave a class at any time from My Account. While a student is in a class, the teacher can see the student's nickname and verified school email address (not the email they signed up with), their progress on AI Yamato lesson tasks, how much of the homework they have completed, and their writing submissions (the AI transcription and, if the class keeps them, photos of their handwriting). Handwriting photos are kept only for the period the teacher chooses (up to 180 days) and are then deleted. Students are shown how long their photo will be kept when they submit it.$t$
        ))
      ),
      '{privacy,lastUpdated}',
      to_jsonb('November 13, 2026'::text)
    ),
    updated_at = now()
where key = 'LEGAL_CONTENTS'
  and not exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s->>'heading' = '5. Teachers and Classes'
  );

-- 確認用
select data #> '{privacy,lastUpdated}' as last_updated,
       jsonb_array_length(data #> '{privacy,sections}') as sections
from public.kl_app where key = 'LEGAL_CONTENTS';
