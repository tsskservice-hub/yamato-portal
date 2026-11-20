/**
 * @file kanji-meaning-check.ts
 * @description 漢字の「英語の意味」テストの答え合わせ
 *
 * 正解のもと: Supabase kl_character.meaning（"study, learning" のようにカンマ区切り）
 *   ＋ 下の EXTRA_ANSWERS（よくある言い方の追加分）。
 *
 * 区別しないもの: 大文字・小文字、前後の空白、先頭の to / the / a / an、
 *   イギリス式とアメリカ式のつづり（colour = color など）、ハイフン、句読点。
 */

/** kl_character.meaning に無いが、正解にしたい言い方 */
export const EXTRA_ANSWERS: Record<string, string[]> = {
  一: ['1'], 二: ['2'], 三: ['3'], 四: ['4'], 五: ['5'], 六: ['6'], 七: ['7'], 八: ['8'], 九: ['9'], 十: ['10'],
  百: ['100'], 千: ['1000'], 万: ['10000'],
  人: ['people', 'counter for people'],
  本: ['counter for long things'],
  回: ['time', 'turn'],
  才: ['age'],
  日: ['date', 'sun'],
  月: ['moon', 'month'],
  土: ['ground'],
  曜: ['weekday'],
  時: ["o'clock"],
  分: ['minutes'],
  毎: ['each'],
  間: ['space', 'gap'],
  先: ['before', 'first', 'last'],
  昼: ['lunch', 'midday'],
  晩: ['night'],
  夜: ['evening'],
  去: ['go away', 'last'],
  午: ['midday'],
  上: ['up', 'on', 'top'],
  中: ['in', 'centre', 'center'],
  下: ['under'],
  前: ['front', 'in front'],
  後: ['back', 'later'],
  外: ['out', 'outside'],
  学: ['learn'],
  英: ['britain', 'england'],
  文: ['text'],
  漢: ['chinese'],
  勉: ['exert'],
  強: ['strength'],
  家: ['family'],
  兄: ['elder brother', 'big brother'],
  弟: ['little brother'],
  姉: ['elder sister', 'big sister'],
  妹: ['little sister'],
  私: ['me'],
  女: ['girl'],
  男: ['boy'],
  子: ['kid'],
  安: ['peaceful', 'inexpensive', 'low price'],
  高: ['high'],
  多: ['a lot', 'lots'],
  楽: ['enjoyable', 'easy'],
  長: ['chief'],
  近: ['nearby'],
  広: ['spacious'],
  明: ['light'],
  行: ['go'],
  来: ['come'],
  休: ['day off', 'break'],
  出: ['leave', 'out'],
  入: ['in', 'put in', 'enter'],
  生: ['live', 'born', 'student'],
  見: ['watch'],
  話: ['speak'],
  食: ['eat'],
  作: ['create'],
  住: ['dwell'],
  会: ['meeting'],
  発: ['depart', 'leave'],
  帰: ['go back', 'come home'],
  持: ['carry'],
  乗: ['get on', 'board'],
  泊: ['stay'],
  歩: ['walk'],
  田: ['field', 'rice paddy', 'paddy'],
  天: ['heaven'],
  都: ['city'],
  国: ['nation'],
  神: ['spirit'],
  屋: ['store'],
  場: ['location'],
  店: ['store', 'shop'],
  電: ['electric'],
  道: ['street', 'path'],
  旅: ['journey'],
  色: ['colour'],
  々: ['repeat', 'repeat mark', 'repeat sign', 'repetition'],
  気: ['energy', 'mood', 'feeling'],
  社: ['company', 'society'],
  方: ['way'],
  飯: ['rice', 'meal'],
  洋: ['west', 'foreign'],
  和: ['japanese', 'peace'],
  病: ['disease', 'sickness'],
  点: ['mark', 'score'],
  元: ['basis'],
};

/** イギリス式 → アメリカ式（両方とも同じ形にそろえる） */
const SPELLING: Record<string, string> = {
  colour: 'color', colours: 'colors', centre: 'center', metre: 'meter', theatre: 'theater',
  grey: 'gray', favourite: 'favorite', neighbour: 'neighbor', practise: 'practice',
  travelling: 'traveling', traveller: 'traveler', harbour: 'harbor', honour: 'honor',
  programme: 'program', organise: 'organize', realise: 'realize', mum: 'mom', labour: 'labor',
};

export function normalizeAnswer(input: string): string {
  let t = input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/[-_/.,!?;:"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // 先頭の to / the / a / an を外す（"to eat" と "eat"、"the sea" と "sea" を同じにする）
  for (let i = 0; i < 2; i++) t = t.replace(/^(to|the|a|an) (?=\S)/, '');
  return t
    .split(' ')
    .map((w) => SPELLING[w] ?? w)
    .join(' ');
}

/** その漢字の正解の一覧（表示用・元の書き方のまま） */
export function acceptedAnswers(kanji: string, meaning: string | null | undefined): string[] {
  const base = (meaning || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const all = [...base, ...(EXTRA_ANSWERS[kanji] || [])];
  const seen = new Set<string>();
  return all.filter((a) => {
    const n = normalizeAnswer(a);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

export function isCorrectMeaning(input: string, accepted: string[]): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return accepted.some((a) => normalizeAnswer(a) === n);
}
