/**
 * @file elaborate-hints.ts
 * @description elaborate ページの「Elaborate Hint」で、質問のトピック（category）ごとに出すヒント
 * - category は oral-exam-questions.json の category と同じ名前（20 種類）
 * - jp は文の書き出しの例（です・ます形、JLPT N5〜N3 程度）。「〜」の部分を生徒が自分のことで埋める
 * - トピックがここにない質問（カスタムの質問など）は、ヒントの画面に一般的なパターンだけが出る
 */

export interface ElaborateHintIdea {
  /** 何を書くか（英語） */
  en: string;
  /** 書き出しの例（日本語） */
  jp: string;
}

export const ELABORATE_HINTS: Record<string, ElaborateHintIdea[]> = {
  Family: [
    { en: "Who is in your family", jp: "私の家族は〜人です。父と母と〜と私です。" },
    { en: "What you do together", jp: "週末はよく家族と〜をします。" },
    { en: "Why you like it", jp: "家族と〜するのが好きです。〜からです。" },
    { en: "A real experience", jp: "去年、家族と〜に行きました。とても〜かったです。" },
  ],
  School: [
    { en: "Your favourite subject and why", jp: "一番好きな科目は〜です。〜からです。" },
    { en: "Clubs or after school", jp: "放課後、〜部で〜をしています。" },
    { en: "Teachers or friends", jp: "〜先生はとても〜です。" },
    { en: "Something hard, and your effort", jp: "〜は少しむずかしいですが、がんばっています。" },
  ],
  Hobby: [
    { en: "When, where and with whom", jp: "時間があるとき、〜で〜をします。" },
    { en: "How you started", jp: "〜才のときに〜を始めました。" },
    { en: "Why you like it", jp: "〜ので、〜が好きです。" },
    { en: "What you want to try next", jp: "これから〜にもちょうせんしたいです。" },
  ],
  "Part time Job": [
    { en: "Where you work and what you do", jp: "〜で、〜の仕事をしています。" },
    { en: "How often", jp: "週に〜回、〜時間働いています。" },
    { en: "What you have learnt", jp: "アルバイトをして、〜を学びました。" },
    { en: "Hard and fun parts", jp: "〜は大変ですが、〜は楽しいです。" },
  ],
  "Japanese Study": [
    { en: "When and why you started", jp: "〜年生のときに日本語を始めました。〜からです。" },
    { en: "What is hard and what is fun", jp: "漢字はむずかしいですが、〜はおもしろいです。" },
    { en: "How you study", jp: "毎日〜で〜を練習しています。" },
    { en: "How you will use Japanese", jp: "将来、日本語を使って〜たいです。" },
  ],
  Sports: [
    { en: "What and how often", jp: "週に〜回、〜をしています。" },
    { en: "Your team or games", jp: "〜のチームに入っていて、〜。" },
    { en: "Why you like it", jp: "〜から、〜が好きです。" },
    { en: "A memorable game", jp: "〜の試合で〜て、とてもうれしかったです。" },
  ],
  Travel: [
    { en: "Where and when you went", jp: "〜年に、〜へ行きました。" },
    { en: "What you did there", jp: "そこで〜を見たり、〜を食べたりしました。" },
    { en: "What you remember most", jp: "一番いんしょうにのこったのは〜です。" },
    { en: "Where you want to go next", jp: "いつか〜に行ってみたいです。" },
  ],
  "Leisure Activity": [
    { en: "What you usually do", jp: "週末はたいてい〜をしています。" },
    { en: "With whom", jp: "友だちと〜に行くことが多いです。" },
    { en: "Why you enjoy it", jp: "〜と、リラックスできるからです。" },
    { en: "A recent example", jp: "この前の週末は〜をしました。" },
  ],
  Future: [
    { en: "After you finish school", jp: "高校を卒業したら、大学で〜を勉強したいです。" },
    { en: "Why", jp: "〜にきょうみがあるからです。" },
    { en: "Your dream job", jp: "将来は〜になりたいです。" },
    { en: "A link to Japan", jp: "いつか日本で〜てみたいです。" },
  ],
  Technology: [
    { en: "How you use it", jp: "毎日、スマホで〜をしています。" },
    { en: "A good point", jp: "〜がべんりだと思います。" },
    { en: "A bad point", jp: "でも、使いすぎると〜と思います。" },
    { en: "Your own rule", jp: "だから、〜ようにしています。" },
  ],
  Entering: [
    { en: "Answer, then add how you feel", jp: "はい、元気です。今日は少しきんちょうしていますが、がんばります。" },
    { en: "Thank the examiner", jp: "今日はどうぞよろしくおねがいします。" },
  ],
  End: [
    { en: "Thank the examiner", jp: "今日はありがとうございました。" },
    { en: "Add your plan after the exam", jp: "試験が終わったら、〜をしたいです。" },
  ],
  "Discussion Intro & Pitch": [
    { en: "What you researched", jp: "私は〜について調べました。" },
    { en: "Why you chose it", jp: "このトピックをえらんだ理由は〜からです。" },
    { en: "What interested you most", jp: "特に〜にきょうみを持ちました。" },
  ],
  "Clarification & Details": [
    { en: "Say it another way", jp: "つまり、〜ということです。" },
    { en: "Give details", jp: "具体的に言うと、〜。" },
    { en: "Give an example", jp: "たとえば、〜。" },
  ],
  "Examiner Prompts & Counter-arguments": [
    { en: "Accept the other view", jp: "たしかに、〜という意見もあります。" },
    { en: "Then give your view", jp: "しかし、私は〜と思います。" },
    { en: "Give a reason", jp: "なぜなら、〜からです。" },
  ],
  "Reasons & Justifications": [
    { en: "Say how many reasons", jp: "その理由は二つあります。" },
    { en: "First reason", jp: "一つ目は、〜ことです。" },
    { en: "Second reason", jp: "二つ目は、〜ことです。" },
  ],
  "Impacts, Pros & Cons": [
    { en: "A good point", jp: "いい点は、〜ことです。" },
    { en: "A problem", jp: "一方で、〜という問題もあります。" },
    { en: "Your conclusion", jp: "全体的に見ると、〜と思います。" },
  ],
  "Comparison & Contrast": [
    { en: "Japan and Australia", jp: "日本では〜ですが、オーストラリアでは〜です。" },
    { en: "Compare", jp: "〜とくらべると、〜のほうが〜です。" },
    { en: "Something in common", jp: "どちらも〜という点は同じです。" },
  ],
  "Solutions & Future Prospects": [
    { en: "A solution", jp: "この問題をかいけつするために、〜べきだと思います。" },
    { en: "What will happen", jp: "これから〜になると思います。" },
    { en: "What you can do", jp: "私たちにできることは〜です。" },
  ],
  "Opinions & Stance": [
    { en: "Your stance", jp: "私は〜にさんせいです。" },
    { en: "Why", jp: "なぜなら、〜からです。" },
    { en: "Your opinion", jp: "私の意見では、〜。" },
  ],
};

export function getElaborateHints(category?: string): ElaborateHintIdea[] {
  if (!category) return [];
  return ELABORATE_HINTS[category] || [];
}
