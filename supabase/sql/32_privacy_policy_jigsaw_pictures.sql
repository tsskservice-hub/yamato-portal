-- =====================================================================
-- 32: プライバシーポリシーの 5 章に、クラスのライブゲームの説明を足す
--   (a) ゲームの結果（表示名・得点・正解数・間違えた文字）を保存すること
--   (b) 先生がアップロードしたジグソーの写真を預かること
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: ジグソー（25）と写真を消す機能（31・api の削除ボタン）を本番に公開した「あと」
--   (b) は「先生がいつでも消せる」「アカウントを消すと消える」と約束するので、先に仕組みを公開する。
--
-- 内容はコードで確認済み（2026-11-15）:
--   ・結果は edu_live_game_results（22・25）。display_name / coins / correct_count / answered_count /
--     missed（間違えた文字と回数）/ contributions（ジグソーで置けたピース）。ゲームが終わったときにサーバーが書く
--   ・ブラウザからは読めない（RLS・ポリシーなし）。消えるのは、生徒のアカウント・クラス・先生のアカウントが消えたとき（cascade）
--   ・ゲーム中は、先生の画面（プロジェクター）に表示名と得点が出る。先生は「Show who is who」で誰がどの名前かを見られる
--
-- 27 と同じやり方: 見出しで章を探し、まだ入っていない文だけを足す（二重に実行しても重ならない）。
-- lastUpdated は実行した日になる。
-- =====================================================================

update public.kl_app
set data = jsonb_set(
      jsonb_set(
        data,
        '{privacy,sections}',
        (
          select jsonb_agg(
                   case
                     when s.sec ->> 'heading' = '5. Teachers and Classes'
                     then jsonb_set(s.sec, '{content}', to_jsonb(
                       (s.sec ->> 'content')
                       || case when position('class live game' in s.sec ->> 'content') = 0
                               then $t$ Teachers can also run a class live game, in which the students in their class answer questions at the same time. During the game, each player's display name (a game name chosen by the student or given by AI Yamato) and score are shown on the teacher's screen, which the class may see, and the teacher can see which student is using each display name. At the end of the game, we save each student's results: their display name, score (coins, or jigsaw pieces placed), how many questions they answered and got right, and which characters they got wrong. These results are kept until the class or the student's account is deleted.$t$
                               else '' end
                       || case when position('pictures for the class jigsaw' in s.sec ->> 'content') = 0
                               then $t$ Teachers can upload their own pictures for the class jigsaw game. These pictures are stored on our servers, can be used only by the teacher who uploaded them, and are shown to the students who play that teacher's game. When uploading, the teacher confirms that they have the right to use the picture and that it does not show students' faces or personal information. A teacher can delete their pictures at any time, and their pictures are deleted within a day if their account is deleted.$t$
                               else '' end
                     ))
                     else s.sec
                   end
                   order by s.ord
                 )
          from jsonb_array_elements(data #> '{privacy,sections}') with ordinality as s(sec, ord)
        )
      ),
      '{privacy,lastUpdated}',
      to_jsonb(to_char(now() at time zone 'Australia/Melbourne', 'FMMonth FMDD, YYYY'))
    ),
    updated_at = now()
where key = 'LEGAL_CONTENTS'
  and exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '5. Teachers and Classes'
      and (position('class live game' in s ->> 'content') = 0
           or position('pictures for the class jigsaw' in s ->> 'content') = 0)
  );

-- 確認用: game_results_ok と jigsaw_pictures_ok が true、sections の数が実行前と同じなら成功
select
  data #>> '{privacy,lastUpdated}' as last_updated,
  jsonb_array_length(data #> '{privacy,sections}') as sections,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '5. Teachers and Classes'
      and s ->> 'content' like '%class live game%'
  ) as game_results_ok,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '5. Teachers and Classes'
      and s ->> 'content' like '%pictures for the class jigsaw%'
  ) as jigsaw_pictures_ok
from public.kl_app
where key = 'LEGAL_CONTENTS';
