export interface OralReportSection {
  section: string;
  title: string;
  whatStudentsDidWell: string[];
  areasForImprovement: string[];
}

export interface OralAssessmentReport2025 {
  title: string;
  year: number;
  study: string;
  sections: OralReportSection[];
  commonSubtopics: string[];
}

export const vceEoyOralReport2025: OralAssessmentReport2025 = {
  title: "2025 VCE Japanese Second Language Oral External Assessment Report",
  year: 2025,
  study: "VCE Japanese Second Language",
  sections: [
    {
      section: "Section 1",
      title: "Conversation",
      whatStudentsDidWell: [
        "Engaged well in a general conversation about their personal world, interactions with the language and culture as learners, family, school, Japanese language study, holidays, hobbies, and post-secondary plans.",
        "Provided a range of relevant information, ideas, and opinions with appropriate depth, elaborating on and defending ideas.",
        "Used connectives effectively in higher-scoring responses (e.g., まず, つまり, じつは) and demonstrated a wide vocabulary.",
        "Used appropriate grammar, sentence structures, and expression (pronunciation, intonation, stress, and tempo), including natural interjections like そうですね and repair strategies."
      ],
      areasForImprovement: [
        "Practise answering a range of question words (いつ, どこ, だれ, 何, どんな, どのくらい, どうやって, どちらの方など) to avoid mismatched responses.",
        "Build confidence through natural interactions rather than reciting overlong, memorized responses.",
        "Revise grammar rules, including correct adjective forms (e.g., かわいい人 instead of かわいいの人), verb forms (て-form, correct verb-noun pairing like ケーキを作る), particles (e.g., unnecessary に after 昨日), listing structures (~いたり), 'I think' (~と思います), and あまり with negative verbs.",
        "Build vocabulary specific to personal world and interactions (e.g., 兄弟, むりょう, ただ, けんこう, 運転する, お客さん, 料理).",
        "Improve pronunciation of katakana words (オーストラリア, アルバイト, サーフィン) and double consonant / long vowel sounds."
      ]
    },
    {
      section: "Section 2",
      title: "Discussion",
      whatStudentsDidWell: [
        "Explored a diverse range of discussion topics based on cultural products or practices.",
        "Demonstrated in-depth knowledge, going beyond facts to discuss topics from multiple perspectives (comparisons, good/bad points, solutions).",
        "Skilfully integrated the supporting visual image throughout the discussion rather than just describing it when prompted.",
        "Clarified, elaborated on, and defended opinions and ideas effectively."
      ],
      areasForImprovement: [
        "Choose an appropriate subtopic matching ability and interests based on a cultural product or practice, ensuring enough depth to sustain an 8-minute conversation.",
        "Prepare wide-ranging, critical-thinking perspectives rather than reciting memorized scripts.",
        "Ensure a strong, meaningful connection between the chosen image and the subtopic to support deeper discussion and personal opinions (avoid overly simple images like Hello Kitty or Pocky).",
        "Avoid overly scripted transition phrases (e.g., つぎに悪い点について話します) that hinder natural discussion flow.",
        "Practise repair strategies to ask for clarification when a word or question is not understood.",
        "Build key vocabulary specific to the selected subtopic (e.g., 雪 for Sapporo snow festival, さくら for flower viewing, えいきょう, いんしょう, 思い出)."
      ]
    }
  ],
  commonSubtopics: [
    "カラオケ (Karaoke)",
    "コンビニ (Convenience stores)",
    "コンビニとフードロス (Convenience stores and food loss)",
    "給食 (School meals)",
    "自動販売機 (Vending machines)",
    "子ども食堂 (Children’s cafeteria)",
    "マンガの色々な使い方 (Various ways of using manga)",
    "オタク文化 (Geek culture)",
    "温泉 (Onsen)",
    "お正月 (New Year)",
    "部活 (Club activities)",
    "ひきこもり (Social withdrawal)",
    "浅草寺 (Sensou-ji temple)",
    "祭り (Festivals)",
    "柔道 (Judo)",
    "お弁当 (Obento)",
    "七夕 (Tanabata)",
    "和食 (Japanese food)",
    "ゆるキャラ (Mascot characters)",
    "教育テクノロジー (Education technology)",
    "アイヌ (Ainu)",
    "オーバーツーリズム (Over-tourism)",
    "キャラ弁 (Character lunch boxes)",
    "東京のごみ問題 (Tokyo’s rubbish problem)",
    "新幹線 (Bullet trains)"
  ]
};