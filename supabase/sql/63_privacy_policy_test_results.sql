-- =====================================================================
-- 63: プライバシーポリシー 2 章（How We Use Your Information）に「テストの結果」を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 62_test_attempts.sql と同じとき（ポータルを公開する前）
--
-- 62 から、/test のテスト（漢字など）の結果（正解の数・答えるのにかかった時間）を保存し、
-- /progress（My Progress）で本人が伸びを見られるようにする。1 章の「quiz results」に含まれるが、
-- 何のために使うかを 2 章に具体的に書く。43 と同じやり方（まだ文が入っていないときだけ足す）。
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
                     when s.sec ->> 'heading' = '2. How We Use Your Information'
                      and position('language tests' in s.sec ->> 'content') = 0
                     then jsonb_set(s.sec, '{content}', to_jsonb((s.sec ->> 'content') || $t$ When you are signed in, the results of the language tests (such as the kanji test) are saved: how many answers were correct and how long each answer took. They are used only to show you your own progress on the My Progress page.$t$))
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
    where s ->> 'heading' = '2. How We Use Your Information' and position('language tests' in s ->> 'content') = 0
  );

-- 確認用: section2_ok が true なら成功
select
  data #>> '{privacy,lastUpdated}' as last_updated,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '2. How We Use Your Information'
      and s ->> 'content' like '%My Progress page%'
  ) as section2_ok
from public.kl_app
where key = 'LEGAL_CONTENTS';
