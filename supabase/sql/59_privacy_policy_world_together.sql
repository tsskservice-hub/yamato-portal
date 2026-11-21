-- =====================================================================
-- 59: プライバシーポリシー 1 章（Information We Collect）に、Yamato Town の「みんなで（Together）」モードの説明を足す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: 58_world_plaza.sql を実行し、api とポータルを本番に公開した「あと」
--
-- 内容はコードで確認済み（2026-11-21。api/src/world/plaza-room.ts・plaza-rules.ts）:
--   ・ほかの人に見えるのは、ランダムの町の名前・アバター・位置・決まった文とスタンプ・「AI と話し中」だけ
--   ・位置や発言は保存しない（部屋の中だけ）。保存するのは、決まりへの同意・ブロック・報告（報告された人の最近の決まった文）
--   ・学校のアカウント（先生・クラスの生徒・クラスに申請中の人）は使えない
--   ・アカウントを消すと、同意・ブロック・その人への報告は消える（cascade）。その人がした報告は、報告した人の欄だけ空になる
--
-- 43 と同じやり方: 見出しで章を探し、まだ文が入っていないときだけ足す（二重に実行しても重ならない）。
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
                      and position('Together mode' in s.sec ->> 'content') = 0
                     then jsonb_set(s.sec, '{content}', to_jsonb((s.sec ->> 'content') || $t$ In Yamato Town, users with a personal account can choose Together mode, where learners in the same place can see each other. Other users only see a random town name (never your real name or nickname), your avatar, where it is in the room, the set phrases and stamps you choose, and whether you are talking to an AI character. There is no free chat, no voice between users and no private messaging. Positions, phrases and stamps are not saved. We keep a record that you agreed to the Together mode rules, the people you block, and any reports you make or receive; a report includes the reported person's most recent set phrases and stamps so that our team can check it. Accounts linked to a school class cannot use Together mode.$t$))
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
    where s ->> 'heading' = '1. Information We Collect' and position('Together mode' in s ->> 'content') = 0
  );

-- 確認用: together_ok が true、sections の数が実行前と同じなら成功
select
  data #>> '{privacy,lastUpdated}' as last_updated,
  jsonb_array_length(data #> '{privacy,sections}') as sections,
  exists (
    select 1 from jsonb_array_elements(data #> '{privacy,sections}') s
    where s ->> 'heading' = '1. Information We Collect'
      and s ->> 'content' like '%Together mode%'
  ) as together_ok
from public.kl_app
where key = 'LEGAL_CONTENTS';
