/**
 * @file faq-database.ts
 * @description Comprehensive FAQ and AI Yamato Expert Guidance Data Bank for the VCE Japanese Portal (Yamato Portal)
 */

export interface FaqItem {
  id: string;
  category: "general" | "vce_written" | "vce_oral" | "genkoyoshi" | "portal_usage";
  tags: string[];          // Tags for search and filtering
  questionEn: string;      // English question text
  questionJp: string;      // Japanese question text
  answerHtml: string;      // Detailed explanation displayed on the site's FAQ page (supports HTML and ruby tags)
  expertGuidance: string;  // Scoring criteria and guidance policy referenced by AI Yamato in its prompt
}

export const faqDatabase: FaqItem[] = [
  // --- 1. Portal Usage Related (portal_usage) ---
  {
    id: "portal_credits_system",
    category: "portal_usage",
    tags: ["credits", "login", "portal", "bonus"],
    questionEn: "How do credits and daily login bonuses work?",
    questionJp: "How do credits and daily login bonuses work?",
    answerHtml: `You can earn credits by logging into the portal daily or through special missions. Credits are used when chatting with AI Yamato or getting your essays reviewed. Check your balance at the top right of your dashboard!`,
    expertGuidance: `Explain the daily login bonus and credit consumption for AI interactions politely and encouragingly.`
  },
  {
    id: "portal_bug_feedback",
    category: "portal_usage",
    tags: ["bug", "feedback", "support", "issue"],
    questionEn: "How can I report a bug or give feedback?",
    questionJp: "How can I report a bug or give feedback?",
    answerHtml: `You can click on the "Report a Bug / Issue" or "Quick Feedback & Suggestions" cards on your dashboard to share your thoughts with us. We appreciate your help in improving Yamato Portal!`,
    expertGuidance: `Direct students to use the bug report and feedback cards on the dashboard warmly.`
  },

  // --- 2. Genkoyoshi Usage Related (genkoyoshi) ---
  {
    id: "genkoyoshi_title_and_name",
    category: "genkoyoshi",
    tags: ["genkoyoshi", "title", "name", "formatting"],
    questionEn: "Where should I write the title and my name on the genkoyoshi?",
    questionJp: "Where should I write the title and my name on the genkoyoshi?",
    answerHtml: `<ul><li><strong>Title (Line 1):</strong> Leave 3 blank squares at the beginning, then write your title.</li><li><strong>Name (Line 2):</strong> Write your name at the end of the line, leaving the last square blank.</li></ul>`,
    expertGuidance: `On VCE Japanese Genkoyoshi: Title is written on line 1 with 3 spaces indentation. Name is written on line 2, aligned to the bottom with the last square blank.`
  },
  {
    id: "genkoyoshi_punctuation",
    category: "genkoyoshi",
    tags: ["punctuation", "comma", "period", "quotes"],
    questionEn: "How should punctuation marks (「」、。) be placed on genkoyoshi?",
    questionJp: "How should punctuation marks (「」、。) be placed on genkoyoshi?",
    answerHtml: `Punctuation marks (「、」, 「。」) and closing quotation marks (」) occupy their own square, usually placed at the top-right of the square or at the beginning of a new line if they fall on the first square. Never start a line with a comma or full stop.`,
    expertGuidance: `Advise students on standard vertical genkoyoshi rules: punctuation and small kana take individual squares, and line-start prohibition rules apply.`
  },

  // --- 3. VCE Written Examination & Essay Writing Related (vce_written) ---
  {
    id: "vce_kanji_usage",
    category: "vce_written",
    tags: ["kanji", "writing", "checker", "grammar"],
    questionEn: "How many kanji should I use, and how is the Kanji & Grammar Checker used?",
    questionJp: "How many kanji should I use, and how is the Kanji & Grammar Checker used?",
    answerHtml: `Quality matters more than quantity! Use appropriate core VCE kanji in correct contexts. You can paste your transcribed text into the <strong>Highlight Checker</strong> on your dashboard to instantly track your unique VCE Kanji (🟡 Yellow) and VCE Grammar (🟢 Green).`,
    expertGuidance: `Emphasize that the dashboard's Highlight Checker counts exact matches for reference. Advise students to focus on correct contextual use of core VCE kanji rather than forcing complex kanji.`
  },
  {
    id: "vce_text_types_selection",
    category: "vce_written",
    tags: ["text types", "format", "article", "speech"],
    questionEn: "What are the text types, and how should I choose the correct format?",
    questionJp: "What are the text types, and how should I choose the correct format?",
    answerHtml: `VCE requires proficiency in various formats such as <strong>Articles, Speeches, Letters, Emails, Journals, and Reports</strong>. Click on any green text type tag on the Task List to view specific requirements, structures, and sample PDF guides!`,
    expertGuidance: `Strictly distinguish Text Types (physical formats/conventions like Speech scripts, Letters, Articles) from Writing Styles (purposes like Persuasive, Evaluative). Guide students on specific structural elements.`
  },

  // --- 4. VCE Oral Examination Related (vce_oral) ---
  {
    id: "oral_general_conversation",
    category: "vce_oral",
    tags: ["oral", "conversation", "exam", "keigo"],
    questionEn: "What kind of questions are asked in Section 1 General Conversation?",
    questionJp: "What kind of questions are asked in Section 1 General Conversation?",
    answerHtml: `In Section 1, assessors will ask about your personal world—including your family, friends, hobbies, school life, and future plans. <strong>Never give one-word answers!</strong> Always expand with reasons using connectors like ～から、～ので、and ～たり～たりする.`,
    expertGuidance: `Coach students to expand responses with reasons and details during Section 1 General Conversation. Emphasize natural, polite conversational Keigo (desu/masu).`
  },
  {
    id: "oral_detailed_study",
    category: "vce_oral",
    tags: ["detailed study", "oral exam", "discussion", "artifact"],
    questionEn: "How should I prepare for Section 2 Detailed Study Discussion?",
    questionJp: "How should I prepare for Section 2 Detailed Study Discussion?",
    answerHtml: `For Section 2, you must discuss your chosen sub-topic based on your visual and written artifacts. Be ready to refer directly to your items (e.g., 「この写真によると…」) and express clear personal insights and analysis rather than just memorized facts.`,
    expertGuidance: `Encourage students to directly reference artifacts/visuals and express independent analytical thoughts during the Section 2 Detailed Study discussion.`
  }
];