// src/data/vceGrammarData.ts

export interface GrammarItem {
  id: string;
  pattern: string;
  meaning: string;
  example?: string;
}

export interface GrammarCategory {
  categoryTitle: string;
  items: GrammarItem[];
}

export const vceGrammarCategories: GrammarCategory[] = [
  {
    categoryTitle: "1. VERB FORMS & CONJUGATIONS",
    items: [
      { id: "plain-form", pattern: "Plain Form", meaning: "Dictionary Form / Ru-form / U-form / Irregular verbs" },
      { id: "negative-form", pattern: "Negative Form", meaning: "Nai-form (〜ない)" },
      { id: "past-form", pattern: "Past Form", meaning: "Ta-form (〜た)" },
      { id: "past-negative-form", pattern: "Past Negative Form", meaning: "Nakatta-form (〜なかった)" },
      { id: "polite-form", pattern: "Polite Form", meaning: "Masu / Masen / Mashita / Masendeshita" },
      { id: "te-form", pattern: "Te-form", meaning: "Conjunctive / Linking (~て / 〜で)" },
      { id: "tara-form", pattern: "Tara-form", meaning: "Conditional (~たら)" },
      { id: "volitional-form", pattern: "Volitional Form", meaning: "Let's / Shall we (V-ou/you)" },
      { id: "tentative-form", pattern: "Tentative / Presumptive Form", meaning: "Darou / Deshou (〜だろう / 〜でしょう)" },
      { id: "conjunctive-parallel", pattern: "Conjunctive Form & Parallel", meaning: "~te, ~de, ~ku, ~ni" },
      { id: "stem-form", pattern: "Stem Form", meaning: "Renyoukei / Base for attachments" },
    ],
  },
  {
    categoryTitle: "2. DESIRES, OPINIONS, ABILITIES & PREFERENCES",
    items: [
      { id: "tai-desu", pattern: "verb stem + たいです / たいと思っています", meaning: "want to + verb", example: "日本に行きたいです。" },
      { id: "tsumori-desu", pattern: "verb dictionary form + つもりです", meaning: "intend to + verb", example: "来年、大学に行くつもりです。" },
      { id: "hou-ga-ii", pattern: "verb ほうがいいです / ない方がいいです", meaning: "had better / had better not + verb", example: "もっと野菜を食べたほうがいいです。" },
      { id: "potential", pattern: "noun + ができます / verb dictionary form + ことができます", meaning: "can do / can + verb", example: "日本語を話すことができます。" },
      { id: "jyouzu-heta", pattern: "noun / verb + が上手です / 下手です", meaning: "be good at / bad at", example: "料理を作るのが上手です。" },
      { id: "yasui-nikui", pattern: "verb stem + やすい / づらい / にくい", meaning: "easy / hard to + verb", example: "このペンは書きやすいです。" },
      { id: "suki-kirai", pattern: "noun / verb + が好きです / きらいです", meaning: "like / dislike", example: "サッカーを見るのが好きです。" },
      { id: "hoshii", pattern: "noun + がほしいです", meaning: "want + noun", example: "新しいパソコンがほしいです。" },
    ],
  },
  {
    categoryTitle: "3. TENSE, ASPECT & ACTION PHASES",
    items: [
      { id: "te-imasu", pattern: "verb て form + います", meaning: "is, am, are + verbing / state", example: "今、本を読んでいます。" },
      { id: "hajimemashita", pattern: "verb stem form + はじめました / おえました", meaning: "started to / finished + verbing", example: "雨が降りはじめました。" },
      { id: "ni-kimasu", pattern: "verb stem form + に来ます / 行きます", meaning: "come / go to + verb", example: "映画を見に行きます。" },
      { id: "te-shimaimasu", pattern: "verb dictionary form + てしまいます", meaning: "completion / regret", example: "宿題を全部やってしまいました。" },
      { id: "tameshitemiru", pattern: "verb て form + みます / 試してみます", meaning: "try to + verb", example: "この料理を食べてみます。" },
      { id: "koto-ga-arimasu", pattern: "past positive form + ことがあります", meaning: "have the experience of + verbed", example: "日本に行ったことがあります。" },
    ],
  },
  {
    categoryTitle: "4. PERMISSION, PROHIBITION & OBLIGATION",
    items: [
      { id: "te-mo-ii-desu", pattern: "verb て form + もいいです / もいいですか", meaning: "be allowed to / May I...?", example: "ここに座ってもいいですか。" },
      { id: "te-wa-ikemasen", pattern: "verb て form + はいけません / てはだめです", meaning: "must not + verb", example: "ここで写真を撮ってはいけません。" },
      { id: "nakereba-narimasen", pattern: "verb なければなりません", meaning: "must / have to + verb", example: "宿題をしなければなりません。" },
      { id: "nakutemo-ii-desu", pattern: "verb なくてもいいです", meaning: "do not have to + verb", example: "明日、早く来なくてもいいです。" },
      { id: "beki-desu", pattern: "verb beki desu / べきじゃないです", meaning: "should / should not + verb", example: "もっと日本語を勉強するべきです。" },
    ],
  },
  {
    categoryTitle: "5. REQUESTS, INSTRUCTIONS & INVITATIONS",
    items: [
      { id: "mashou", pattern: "verb stem form + ましょう / ましょうか", meaning: "Let's / Shall we + verb", example: "一緒に帰りましょう。" },
      { id: "masenka", pattern: "verb stem form + ませんか", meaning: "Why don't you + verb?", example: "コーヒーを飲みませんか。" },
      { id: "te-kudasai", pattern: "verb て form + ください / ないでください", meaning: "Please / Please don't + verb", example: "ここに名前を書いてください。" },
      { id: "te-kudasaimasen-ka", pattern: "verb て form + くださいませんか / いただけませんか", meaning: "Would you be able to + verb?", example: "これを手伝っていただけませんか。" },
      { id: "kata", pattern: "verb stem form + かた", meaning: "how to + verb + noun", example: "漢字の書きかたを教えてください。" },
    ],
  },
  {
    categoryTitle: "6. COMPARISON & DEGREE",
    items: [
      { id: "no-hou-ga", pattern: "noun + のほうが noun + より adjective", meaning: "A is more adjective than B", example: "りんごのほうがバナナより大きいです。" },
      { id: "hodo", pattern: "noun + は noun + ほど adjective (否定)", meaning: "A is not as adjective as B", example: "今日は昨日ほど寒くないです。" },
      { id: "ichiban", pattern: "noun + は一番 adjective", meaning: "A is the most adjective", example: "これが一番美味しいです。" },
      { id: "sugimasu", pattern: "stem + すぎます", meaning: "too much", example: "この服は小さすぎます。" },
    ],
  },
  {
    categoryTitle: "7. MODIFIERS, CLAUSES & NOUN LINKING",
    items: [
      { id: "relative-clause", pattern: "Relative Clause: plain form + noun", meaning: "relative clause (who / which / that)", example: "昨日食べた寿司は美味しかったです。" },
      { id: "to-iu", pattern: "noun + という + noun", meaning: "A called B", example: "「すずめ」という映画を見ました。" },
      { id: "tame-ni", pattern: "verb dictionary form + ために", meaning: "in order to + verb", example: "日本語を勉強するために、日本に行きます。" },
      { id: "toki", pattern: "dictionary form / past + とき", meaning: "when...", example: "日本に行ったとき、寿司を食べました。" },
      { id: "nagara", pattern: "verb stem form + ながら", meaning: "while + verbing", example: "音楽を聞きながら勉強します。" },
      { id: "dake-de-naku", pattern: "noun + だけでなく + noun + も", meaning: "not only A but also B", example: "日本語だけでなく、英語も話せます。" },
    ],
  },
  {
    categoryTitle: "8. COMPLEX SENTENCES, REASONS & HYPOTHESES",
    items: [
      { id: "kara-node", pattern: "sentence + から / ので + sentence", meaning: "sentence A because sentence B", example: "雨が降っているので、出かけません。" },
      { id: "okage-de", pattern: "noun + のおかげで", meaning: "thanks to noun", example: "先生のおかげで、合格できました。" },
      { id: "tara-conditional", pattern: "past positive form + ら + sentence", meaning: "if sentence", example: "時間があったら、映画を見ます。" },
      { id: "ga-noni-keredo", pattern: "sentence + が / のに / けれど + sentence", meaning: "A, but B", example: "勉強しましたが、試験は難しかったです。" },
      { id: "sou-desu-hearsay", pattern: "plain form + そうです / らしいです", meaning: "They say that + sentence (hearsay)", example: "明日は雨が降るそうです。" },
      { id: "kamoshiremasen", pattern: "plain form + かもしれません", meaning: "may / might + verb", example: "明日は雨が降るかもしれません。" },
    ],
  },
  {
    categoryTitle: "9. PARTICLES, CONNECTORS & IDIOMS",
    items: [
      { id: "particles", pattern: "は, が, の, に, へ, を, で, と, や, か, も, より, など", meaning: "Basic particles (topic, subject, location, etc.)", example: "学校で友達と日本語を勉強します。" },
      { id: "tatouba", pattern: "たとえば、 / しかし、 / また、 / そして、", meaning: "Transition words (For example, However, Also, And)", example: "日本の食べ物は美味しいです。たとえば、寿司やラーメンがあります。" },
      { id: "ippou", pattern: "一方、 (ni-yoru to)", meaning: "On the other hand / According to", example: "都市部は人口が増えています。一方、地方は減っています。" },
      { id: "ni-tsuite", pattern: "noun + について", meaning: "about / regarding noun", example: "日本の環境問題について発表します。" },
    ],
  },
];