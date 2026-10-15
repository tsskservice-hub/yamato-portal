/**
 * @file faq-database.ts
 * @description VCE日本語ポータル（Yamato Portal）の総合FAQおよびAIヤマト用エキスパート指導データバンク
 */

export interface FaqItem {
  id: string;
  category: "general" | "vce_written" | "vce_oral" | "genkoyoshi" | "portal_usage";
  tags: string[];         // 検索やフィルタリング用タグ
  questionEn: string;     // 英語の質問文
  questionJp: string;     // 日本語の質問文
  answerHtml: string;     // サイトのFAQページに表示する丁寧な解説（HTMLタグやrubyタグ対応可）
  expertGuidance: string; // AIヤマトがプロンプト内で参照する採点基準・指導方針
}

export const faqDatabase: FaqItem[] = [
  // --- 1. ポータル・使い方関連 (portal_usage) ---
  {
    id: "portal_credits_system",
    category: "portal_usage",
    tags: ["credits", "login", "クレジット", "ログイン"],
    questionEn: "How do credits and daily login bonuses work?",
    questionJp: "クレジットや毎日のログインボーナスについて教えてください。",
    answerHtml: `You can earn credits by logging into the portal daily or through special missions. Credits are used when chatting with AI Yamato or getting your essays reviewed. Check your balance at the top right of your dashboard!`,
    expertGuidance: `Explain the daily login bonus and credit consumption for AI interactions politely and encouragingly.`
  },
  {
    id: "portal_bug_feedback",
    category: "portal_usage",
    tags: ["bug", "feedback", "バグ", "フィードバック"],
    questionEn: "How can I report a bug or give feedback?",
    questionJp: "バグの報告や要望を送るにはどうすればいいですか？",
    answerHtml: `You can click on the "Report a Bug / Issue" or "Quick Feedback & Suggestions" cards on your dashboard to share your thoughts with us. We appreciate your help in improving Yamato Portal!`,
    expertGuidance: `Direct students to use the bug report and feedback cards on the dashboard warmly.`
  },

  // --- 2. 原稿用紙の使い方関連 (genkoyoshi) ---
  {
    id: "genkoyoshi_title_and_name",
    category: "genkoyoshi",
    tags: ["genkoyoshi", "title", "name", "原稿用紙", "タイトル", "名前"],
    questionEn: "Where should I write the title and my name on the genkoyoshi?",
    questionJp: "原稿用紙のタイトルと名前はどこに書きますか？",
    answerHtml: `<ul><li><strong>Title (Line 1):</strong> Leave 3 blank squares at the beginning, then write your title.</li><li><strong>Name (Line 2):</strong> Write your name at the end of the line, leaving the last square blank.</li></ul>`,
    expertGuidance: `On VCE Japanese Genkoyoshi: Title is written on line 1 with 3 spaces indentation. Name is written on line 2, aligned to the bottom with the last square blank.`
  },
  {
    id: "genkoyoshi_punctuation",
    category: "genkoyoshi",
    tags: ["punctuation", "comma", "period", "句読点", "かぎ括弧"],
    questionEn: "How should punctuation marks (「」、。) be placed on genkoyoshi?",
    questionJp: "句読点や「」のマス目の使い方はどうすればいいですか？",
    answerHtml: `Punctuation marks (「、」, 「。」) and closing quotation marks (」) occupy their own square, usually placed at the top-right of the square or at the beginning of a new line if they fall on the first square. Never start a line with a comma or full stop.`,
    expertGuidance: `Advise students on standard vertical genkoyoshi rules: punctuation and small kana take individual squares, and line-start prohibition rules apply.`
  },

  // --- 3. VCE筆記試験・Eoyライティング関連 (vce_written) ---
  {
    id: "vce_kanji_usage",
    category: "vce_written",
    tags: ["kanji", "writing", "漢字", "カウント"],
    questionEn: "How many kanji should I use, and how is the Kanji & Grammar Checker used?",
    questionJp: "漢字はどのくらい使えばいいですか？漢字・文法チェッカーの使い方を教えてください。",
    answerHtml: `Quality matters more than quantity! Use appropriate core VCE kanji in correct contexts. You can paste your transcribed text into the <strong>Highlight Checker</strong> on your dashboard to instantly track your unique VCE Kanji (🟡 Yellow) and VCE Grammar (🟢 Green).`,
    expertGuidance: `Emphasize that the dashboard's Highlight Checker counts exact matches for reference. Advise students to focus on correct contextual use of core VCE kanji rather than forcing complex kanji.`
  },
  {
    id: "vce_text_types_selection",
    category: "vce_written",
    tags: ["text types", "format", "article", "speech", "テキストタイプ", "書式"],
    questionEn: "What are the text types, and how should I choose the correct format?",
    questionJp: "テキストタイプにはどのようなものがあり、どう選べばいいですか？",
    answerHtml: `VCE requires proficiency in various formats such as <strong>Articles, Speeches, Letters, Emails, Journals, and Reports</strong>. Click on any green text type tag on the Task List to view specific requirements, structures, and sample PDF guides!`,
    expertGuidance: `Strictly distinguish Text Types (physical formats/conventions like Speech scripts, Letters, Articles) from Writing Styles (purposes like Persuasive, Evaluative). Guide students on specific structural elements.`
  },

  // --- 4. VCE口頭試験関連 (vce_oral) ---
  {
    id: "oral_general_conversation",
    category: "vce_oral",
    tags: ["oral", "conversation", "口頭試験", "一般会話"],
    questionEn: "What kind of questions are asked in Section 1 General Conversation?",
    questionJp: "口頭試験の一般会話（Section 1）では何を聞かれますか？",
    answerHtml: `In Section 1, assessors will ask about your personal world—including your family, friends, hobbies, school life, and future plans. <strong>Never give one-word answers!</strong> Always expand with reasons using connectors like ～から、～ので、and ～たり～たりする.`,
    expertGuidance: `Coach students to expand responses with reasons and details during Section 1 General Conversation. Emphasize natural, polite conversational Keigo (です/ます).`
  },
  {
    id: "oral_detailed_study",
    category: "vce_oral",
    tags: ["detailed study", "oral exam", "詳説研究", "ディスカッション"],
    questionEn: "How should I prepare for Section 2 Detailed Study Discussion?",
    questionJp: "口頭試験の詳説研究（Section 2）のディスカッションのコツは？",
    answerHtml: `For Section 2, you must discuss your chosen sub-topic based on your visual and written artifacts. Be ready to refer directly to your items (e.g., 「この写真によると…」) and express clear personal insights and analysis rather than just memorized facts.`,
    expertGuidance: `Encourage students to directly reference artifacts/visuals and express independent analytical thoughts during the Section 2 Detailed Study discussion.`
  }
];