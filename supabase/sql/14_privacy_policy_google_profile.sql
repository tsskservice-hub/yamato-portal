-- =====================================================================
-- 14: プライバシーポリシーの 1 章・2 章に「州・学校名」と「学校アカウント」の説明を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: いつでもよい（12・13 を実行したあと）
--
-- 12 では 1 章・2 章にも文を足すはずだったが、5 章を追加する処理が書き換え前の内容を使っていたため、
-- 1 章・2 章の追加が消えていた（5 章と 13 の 1 文は正しく入っている）。ここで改めて足す。
-- あわせて、Google と紐付けると Supabase はアカウントの名前とプロフィール写真の URL も受け取って保存する（auth.identities）ので、
-- 「メールだけを受け取る」ではなく「受け取るが使わない」と正直に書く。
-- 見出しで章を探し、まだ文が入っていない章にだけ足す（二重に実行しても重ならない）。lastUpdated は実行した日になる。
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
                      and position('name of your school' in s.sec ->> 'content') = 0
                     then jsonb_set(s.sec, '{content}', to_jsonb((s.sec ->> 'content') || $t$ If you choose to provide them, we also collect your state (or that you live outside Australia) and the name of your school. If you link a school Google or Microsoft account, we receive its email address, so we can confirm which school you belong to. We may also receive the name and profile picture on that account, but we do not use them.$t$))
                     when s.sec ->> 'heading' = '2. How We Use Your Information'
                      and position('Your state and school are optional' in s.sec ->> 'content') = 0
                     then jsonb_set(s.sec, '{content}', to_jsonb((s.sec ->> 'content') || $t$ Your state and school are optional and are used only to improve features for schools (such as teacher dashboards) and, for teacher accounts, to help us confirm that you are a teacher.$t$))
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
    where (s ->> 'heading' = '1. Information We Collect' and position('name of your school' in s ->> 'content') = 0)
       or (s ->> 'heading' = '2. How We Use Your Information' and position('Your state and school are optional' in s ->> 'content') = 0)
  );

-- 確認用: section1_ok と section2_ok が true、sections が 5 のままなら成功
select
  data #>> '{privacy,lastUpdated}' as last_updated,
  jsonb_array_length(data #> '{privacy,sections}') as sections,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '1. Information We Collect'
      and s ->> 'content' like '%profile picture on that account, but we do not use them.%'
  ) as section1_ok,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '2. How We Use Your Information'
      and s ->> 'content' like '%Your state and school are optional%'
  ) as section2_ok
from public.kl_app
where key = 'LEGAL_CONTENTS';
