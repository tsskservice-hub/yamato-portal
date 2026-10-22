/**
 * @file faq-database.ts
 * @description Comprehensive FAQ and AI Yamato Expert Guidance Data Bank for the VCE Japanese Portal (Yamato Portal)
 */

export interface FaqItem {
  id: string;
  category: "general" | "vce_written" | "vce_oral" | "genkoyoshi" | "portal_usage";
  tags: string[];          // Tags for search and filtering
  questionEn: string;      // English question text
  questionJp: string;      // Japanese question text (kept identical to English for uniformity)
  answerHtml: string;      // Detailed explanation displayed on the site's FAQ page (supports HTML and ruby tags)
  expertGuidance: string;  // Scoring criteria and guidance policy referenced by AI Yamato in its prompt (Backend/AI use only; hidden on frontend FAQ view)
}

export const faqList: FaqItem[] = [
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
    id: "portal_credit_costs_and_discounts",
    category: "portal_usage",
    tags: ["credits", "pricing", "images", "discount", "chat", "generation"],
    questionEn: "How many credits do text chats, image attachments, and image generations cost?",
    questionJp: "How many credits do text chats, image attachments, and image generations cost?",
    answerHtml: `Here is the credit consumption breakdown for each feature:<br><br><ul><li><strong>Text Chat:</strong> 2 credits / turn</li><li><strong>1 Image Attachment or Image Generation:</strong> 4 credits</li><li><strong>2 Image Attachments (e.g. Question Photo + Essay Photo):</strong> 6 credits</li></ul><br><em>Why 6 credits for 2 images instead of 8?</em><br>From a system architecture perspective, sending 2 images in 1 unified request allows the AI server to process the system prompt, instructions, and context all at once, requiring far less backend overhead than sending 1 image across 2 separate requests. Therefore, instead of charging 8 credits separately (4 + 4), we apply a <strong>multi-image discount</strong> to pass that system efficiency back to you so you can study more affordably!`,
    expertGuidance: `Explain the exact credit costs clearly and highlight the multi-image discount rationale based on system architecture efficiency.`
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
    id: "faq_001",
    category: "vce_written",
    tags: ["name", "exam", "fictional name"],
    questionEn: "Can I use my own name in the exam?",
    questionJp: "Can I use my own name in the exam?",
    answerHtml: "It is recommended to use a fictional name.",
    expertGuidance: "Advise students on examination name conventions. Reassure them that using a fictional or pen name is standard practice."
  },
  {
    id: "faq_002",
    category: "vce_written",
    tags: ["name", "formatting", "space", "middle dot"],
    questionEn: "When writing a name, should I leave a space between the surname and the last name?",
    questionJp: "When writing a name, should I leave a space between the surname and the last name?",
    answerHtml: "Yes, you should leave a space, and it is a good idea to write a middle dot (・) in that space.",
    expertGuidance: "Guide students on proper spacing for western/foreign names using the middle dot (・) on Japanese writing grids."
  },
  {
    id: "faq_003",
    category: "vce_written",
    tags: ["name", "japanese name"],
    questionEn: "Can the name be a Japanese name?",
    questionJp: "Can the name be a Japanese name?",
    answerHtml: "Yes, you can use a Japanese name.",
    expertGuidance: "Confirm that Japanese names are completely acceptable to use in VCE writing tasks."
  },
  {
    id: "faq_004",
    category: "vce_written",
    tags: ["name", "surname", "given name"],
    questionEn: "Is it okay to write only the surname or only the given name?",
    questionJp: "Is it okay to write only the surname or only the given name?",
    answerHtml: "Yes, writing just one of them should be fine.",
    expertGuidance: "Instruct students that partial names are acceptable if needed, though full names are preferred."
  },
  {
    id: "faq_005",
    category: "vce_written",
    tags: ["word count", "characters", "length", "penalty"],
    questionEn: "What happens if I don't write 400 characters?",
    questionJp: "What happens if I don't write 400 characters?",
    answerHtml: "The examiners will still read it, but it will certainly result in a deduction. The exact amount of point deduction is not publicly disclosed.",
    expertGuidance: "Warn students about length requirements and point deductions for falling short of the required character count."
  },
  {
    id: "faq_006",
    category: "vce_written",
    tags: ["word count", "characters", "length", "substance"],
    questionEn: "What happens if I write 500 characters or more?",
    questionJp: "What happens if I write 500 characters or more?",
    answerHtml: "The examiners will read it, but writing more does not automatically lead to a higher score. Whether you write within the word limit or exceed it, superficial content will lead to deductions. What is desired is rich, substantive content within the word limit. To achieve this, you need to make full use of VCE grammar and kanji.",
    expertGuidance: "Emphasize quality, depth of content, and correct grammar/kanji over excessive length."
  },
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
    id: "faq_007",
    category: "vce_written",
    tags: ["kanji", "score", "accuracy"],
    questionEn: "Does using a lot of kanji increase my score?",
    questionJp: "Does using a lot of kanji increase my score?",
    answerHtml: "First and foremost, it is crucial that the kanji you write are error-free. Even if you write many kanji, incorrect ones defeat the purpose. Writing all possible vocabulary using mandatory VCE kanji is an important mindset for aiming for a high score.",
    expertGuidance: "Stress accuracy over mere quantity when evaluating student kanji usage."
  },
  {
    id: "faq_008",
    category: "vce_written",
    tags: ["kanji", "advanced kanji", "content"],
    questionEn: "Does writing kanji outside of the mandatory VCE list increase the score?",
    questionJp: "Does writing kanji outside of the mandatory VCE list increase the score?",
    answerHtml: "It might make a slightly positive impression, but the most important thing in your response is the overall content. Kanji are merely components that build it. If there is no content, your score will not increase.",
    expertGuidance: "Advise students that core content and meaning take precedence over obscure or overly advanced kanji."
  },
  {
    id: "faq_009",
    category: "vce_written",
    tags: ["text types", "polite form", "plain form"],
    questionEn: "I am not good at plain forms. Can I use polite forms for all text types?",
    questionJp: "I am not good at plain forms. Can I use polite forms for all text types?",
    answerHtml: "To conclude, there should be no problem using polite forms for all text types. While diaries and stories are often written in plain forms, there are Japanese people who use polite forms for them as well.",
    expertGuidance: "Clarify register requirements and reassure students regarding the use of polite forms (desu/masu)."
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
  {
    id: "faq_010",
    category: "vce_written",
    tags: ["text types", "easiest", "emails", "letters", "speeches", "articles"],
    questionEn: "Which one is the easiest text type?",
    questionJp: "Which one is the easiest text type?",
    answerHtml: "For students, <strong>emails</strong>, <strong>letters</strong>, <strong>speeches</strong>, and <strong>articles</strong> are generally easier choices. <strong>Emails</strong> and <strong>letters</strong> benefit from fixed formats like greetings and sign-offs, which help meet length requirements without needing extra body text. <strong>Speeches</strong> allow a natural, engaging tone using polite style（です、ます）, making it easier to connect with an audience. <strong>Articles</strong> are also manageable because they let you blend facts with personal insights creatively. Since these formats rely heavily on familiar phrasing and personal expression, you can write smoothly and manage the time limit much more comfortably under exam pressure.",
    expertGuidance: "Guide students on selecting student-friendly text formats with clear conventions."
  },
  
  {
    id: "faq_011",
    category: "vce_written",
    tags: ["text types", "hardest", "diary", "essay", "story", "report"],
    questionEn: "Which one is the hardest text type?",
    questionJp: "Which one is the hardest text type?",
    answerHtml: "<strong>Diary entries</strong>, <strong>essays</strong>, <strong>creative stories</strong>, and <strong>reports</strong> are much more challenging. <strong>Diary entries</strong> can be difficult because reflecting on personal events naturally requires focusing on deep reflection and emotional expression rather than simple description. <strong>Essays</strong> demand strict academic structures and deep arguments under tight time limits. <strong>Creative stories</strong> require strong narrative imagination and plotting skills to avoid getting stuck. Finally, <strong>reports</strong> are the hardest because they require objective data, formal analysis, and logical proof rather than just personal opinions. Without pre-existing data or careful structural planning, these text types carry a high risk of running out of time.",
    expertGuidance: "Warn students about the advanced structural demands of diaries, essays, stories, and reports."
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
  },

  // --- 5. General & AI Yamato (general) ---
  {
    id: "faq_012",
    category: "general",
    tags: ["ai yamato", "misread", "handwriting", "correction"],
    questionEn: "What should I do if AI Yamato misreads my handwriting or makes a transcription error?",
    questionJp: "What should I do if AI Yamato misreads my handwriting or makes a transcription error?",
    answerHtml: "Just like a human teacher reviewing handwritten work, AI Yamato may occasionally misinterpret a character or character count due to lighting, image angle, or handwriting style.<br><br>If you spot a misreading, don’t worry at all—treat it as an interactive learning opportunity! Simply point it out directly to AI Yamato in the chat (for example: \"Yamato-sensei, line 2 should be 『学校』, not 『学考』!\").<br><br>AI Yamato will instantly acknowledge your correction, update its understanding, and adjust its guidance accordingly. Engaging in this two-way dialogue is a fantastic way to sharpen your own eye for detail as you prepare for the final exam!",
    expertGuidance: "Instruct AI Yamato to accept handwriting corrections gracefully and build a supportive, interactive dialog with students."
  }
];