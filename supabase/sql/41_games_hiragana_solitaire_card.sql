-- =====================================================================
-- 41: ゲーム一覧に「Hiragana Solitaire」のカードを足す
--   ゲーム本体は app/games/frames/hiragana-solitaire.html、ページは /games/hiragana-solitaire
--   （ログインと先生のゲームのロックは、ほかのゲームと同じく効く）
-- 実行先: 本番 ybquwzoreecxxbewjpdn（SQL Editor）
-- 実行タイミング: このゲームを含むポータルを公開した「後」
--   （先に実行すると、公開前のポータルではカードを押すと 404 になる）
--
-- kl_app の CONTENT_GAMES は { title, subtitle, sections: [{ title, subtitle, games: [...] }] }。
-- Memory Match（/games/memory-match）がある節（Character Learning Games）の末尾に 1 枚足す。
-- その節が見つからなければ、最初の節に足す。
-- id が 'hiragana-solitaire' のカードがすでにあれば何もしない（二重に実行しても重ならない）。
-- =====================================================================

with card as (
  select jsonb_build_object(
    'id',           'hiragana-solitaire',
    'name',         'Hiragana Solitaire',
    'category',     'Card Game & Kana',
    'badge',        'New',
    'iconName',     'Layers',
    'description',  'A solitaire card game with all 46 hiragana. Stack the cards in gojūon order and collect every row — あいうえお to わをん!',
    'path',         '/games/hiragana-solitaire',
    'actionLabel',  'Play Now',
    'isComingSoon', false
  ) as c
),
target as (
  select k.key,
         coalesce(
           (select (s.ord - 1)::int
              from jsonb_array_elements(k.data -> 'sections') with ordinality as s(sec, ord)
             where exists (select 1 from jsonb_array_elements(s.sec -> 'games') g
                            where g ->> 'path' = '/games/memory-match')
             limit 1),
           0
         ) as idx
  from public.kl_app k
  where k.key = 'CONTENT_GAMES'
    and jsonb_typeof(k.data -> 'sections') = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(k.data -> 'sections') s,
           jsonb_array_elements(s -> 'games') g
      where g ->> 'id' = 'hiragana-solitaire'
    )
)
update public.kl_app k
set data = jsonb_set(
             k.data,
             array['sections', target.idx::text, 'games'],
             coalesce(k.data #> array['sections', target.idx::text, 'games'], '[]'::jsonb) || jsonb_build_array(card.c)
           ),
    updated_at = now()
from card, target
where k.key = target.key;

-- 確認用: hiragana-solitaire のカードが 1 枚だけ出て、section が Character Learning Games なら成功
select s ->> 'title' as section, g ->> 'id' as id, g ->> 'name' as name, g ->> 'path' as path
from public.kl_app k,
     jsonb_array_elements(k.data -> 'sections') s,
     jsonb_array_elements(s -> 'games') g
where k.key = 'CONTENT_GAMES'
  and g ->> 'id' = 'hiragana-solitaire';
