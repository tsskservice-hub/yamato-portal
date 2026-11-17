-- =====================================================================
-- 43: プライバシーポリシー 5 章（Teachers and Classes）に「課題」と「語彙クイズの点数」を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 42_class_assignments.sql と同じとき（ポータルを公開する前）
--
-- 42 から、先生は宿題に加えて授業内の課題（classwork）を出せ、先生が作った語彙クイズの点数
-- （最高点・回数・最後にやった日）を見られるようになる。5 章は「先生が見られるもの」を具体的に書いているので、これも書く。
-- 14 / 27 と同じやり方: 見出しで章を探し、まだ文が入っていないときだけ足す（二重に実行しても重ならない）。
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
                      and position('vocabulary quizzes' in s.sec ->> 'content') = 0
                     then jsonb_set(s.sec, '{content}', to_jsonb((s.sec ->> 'content') || $t$ A teacher can set homework and in-class work (classwork) for the whole class or for selected students, including vocabulary quizzes the teacher makes. For these quizzes, the teacher can see each student's best score, how many times they tried, and when they last tried.$t$))
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
    where s ->> 'heading' = '5. Teachers and Classes' and position('vocabulary quizzes' in s ->> 'content') = 0
  );

-- 確認用: section5_ok が true なら成功
select
  data #>> '{privacy,lastUpdated}' as last_updated,
  jsonb_array_length(data #> '{privacy,sections}') as sections,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '5. Teachers and Classes'
      and s ->> 'content' like '%vocabulary quizzes the teacher makes%'
  ) as section5_ok
from public.kl_app
where key = 'LEGAL_CONTENTS';
