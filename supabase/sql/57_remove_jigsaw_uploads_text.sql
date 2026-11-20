-- =====================================================================
-- 57: 先生がジグソーの写真をアップロードする機能をやめたので、
--     プライバシーポリシー（5 章）と FAQ（faq_036）からその説明を外す
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: api と portal（アップロードを外した版）を本番に公開し、
--   以前に先生がアップロードした写真が残っていないことを確かめた「あと」
--   （写真が残っているうちは「先生がいつでも消せる」の約束を外さない）
-- 何度実行しても安全（文が無ければ何もしない）。lastUpdated は実行した日になる。
-- =====================================================================

-- 1. プライバシーポリシー：5 章からアップロードの文を外す
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
                       replace(replace(s.sec ->> 'content', ' ' || $t$Teachers can upload their own pictures for the class jigsaw game. These pictures are stored on our servers, can be used only by the teacher who uploaded them, and are shown to the students who play that teacher's game. When uploading, the teacher confirms that they have the right to use the picture and that it does not show students' faces or personal information. A teacher can delete their pictures at any time, and their pictures are deleted within a day if their account is deleted.$t$, ''), $t$Teachers can upload their own pictures for the class jigsaw game. These pictures are stored on our servers, can be used only by the teacher who uploaded them, and are shown to the students who play that teacher's game. When uploading, the teacher confirms that they have the right to use the picture and that it does not show students' faces or personal information. A teacher can delete their pictures at any time, and their pictures are deleted within a day if their account is deleted.$t$, '')
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
  and position('pictures for the class jigsaw' in data::text) > 0;

-- 2. FAQ：faq_036 の最後の文（先生がアップロードした写真）を外す
update public.kl_app
set data = (
      select jsonb_agg(
               case
                 when f.item ->> 'id' = 'faq_036'
                 then jsonb_set(f.item, '{answer}', to_jsonb(replace(f.item ->> 'answer', $t$ Pictures that teachers upload themselves (for example, for a class jigsaw) are the responsibility of the teacher who uploads them.$t$, '')))
                 else f.item
               end
               order by f.ord
             )
      from jsonb_array_elements(data) with ordinality as f(item, ord)
    ),
    updated_at = now()
where key = 'FAQ'
  and position('Pictures that teachers upload themselves' in data::text) > 0;

-- 確認用: policy_upload_text と faq_upload_text が false、sections・faq_count が実行前と同じなら成功
select
  (select data #>> '{privacy,lastUpdated}' from public.kl_app where key = 'LEGAL_CONTENTS') as last_updated,
  (select jsonb_array_length(data #> '{privacy,sections}') from public.kl_app where key = 'LEGAL_CONTENTS') as sections,
  (select position('pictures for the class jigsaw' in data::text) > 0 from public.kl_app where key = 'LEGAL_CONTENTS') as policy_upload_text,
  (select position('class live game' in data::text) > 0 from public.kl_app where key = 'LEGAL_CONTENTS') as policy_game_results_kept,
  (select jsonb_array_length(data) from public.kl_app where key = 'FAQ') as faq_count,
  (select position('Pictures that teachers upload themselves' in data::text) > 0 from public.kl_app where key = 'FAQ') as faq_upload_text;
