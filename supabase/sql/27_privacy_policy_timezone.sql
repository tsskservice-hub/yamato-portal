-- =====================================================================
-- 27: プライバシーポリシーの 1 章・2 章に「タイムゾーン」の説明を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 26_daily_quiz_timezone.sql と同じとき（サイトを公開する前）
--
-- 26 から、各ユーザーのタイムゾーン（例: Australia/Melbourne）を profiles.timezone に保存するようになった。
-- 1 章は集める情報を具体的に書いている（州・学校名など）ので、タイムゾーンも書く。
-- 2 章には使い道（デイリークイズが新しくなる時刻を決めるためだけ）を書く。
-- 14 と同じやり方: 見出しで章を探し、まだ文が入っていない章にだけ足す（二重に実行しても重ならない）。
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
                     when s.sec ->> 'heading' = '1. Information We Collect'
                      and position('store your time zone' in s.sec ->> 'content') = 0
                     then jsonb_set(s.sec, '{content}', to_jsonb((s.sec ->> 'content') || $t$ We also store your time zone (for example, Australia/Melbourne). It is set automatically from your browser when you first use AI Yamato while signed in, and you can change it in My Account.$t$))
                     when s.sec ->> 'heading' = '2. How We Use Your Information'
                      and position('Your time zone is used only' in s.sec ->> 'content') = 0
                     then jsonb_set(s.sec, '{content}', to_jsonb((s.sec ->> 'content') || $t$ Your time zone is used only to work out when your Daily Quiz resets (midnight in your time zone).$t$))
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
    where (s ->> 'heading' = '1. Information We Collect' and position('store your time zone' in s ->> 'content') = 0)
       or (s ->> 'heading' = '2. How We Use Your Information' and position('Your time zone is used only' in s ->> 'content') = 0)
  );

-- 確認用: section1_ok と section2_ok が true、sections が 5 のままなら成功
select
  data #>> '{privacy,lastUpdated}' as last_updated,
  jsonb_array_length(data #> '{privacy,sections}') as sections,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '1. Information We Collect'
      and s ->> 'content' like '%store your time zone%'
  ) as section1_ok,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '2. How We Use Your Information'
      and s ->> 'content' like '%Your time zone is used only%'
  ) as section2_ok
from public.kl_app
where key = 'LEGAL_CONTENTS';
