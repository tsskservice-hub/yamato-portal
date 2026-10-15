export interface PerformanceLevel {
  level: string;
  markRange: string;
  descriptors: string[];
}

export interface UnitOutcomeDescriptor {
  unit: string;
  outcome: string;
  title: string;
  totalMarks: number;
  levels: PerformanceLevel[];
}

export const vceU4O1Descriptor: UnitOutcomeDescriptor = {
  unit: "Unit 4",
  outcome: "Outcome 1",
  title: "Share information, ideas and opinions in a spoken exchange in Japanese.",
  totalMarks: 20,
  levels: [
    {
      level: "Very low",
      markRange: "1–4",
      descriptors: [
        "Shares very limited information relating to a cultural product or practice and within a very limited cultural or social context. Very limited information that reflects very few aspects of culture or cultural perspectives[cite: 11].",
        "Responds to questions with a limited range of ideas. Shows a very limited ability to differentiate between factual information and personal perspectives[cite: 11].",
        "Uses a very limited vocabulary and a narrow range of grammar structures with a very limited level of accuracy. Pronunciation, intonation, stress and tempo interfere with ability to convey meaning[cite: 11].",
        "Demonstrates limited oral language to link with the interlocutor. Minimal response to non-verbal forms of communication or cues for turn-taking. Very limited use of communication and repair strategies as required[cite: 11]."
      ]
    },
    {
      level: "Low",
      markRange: "5–8",
      descriptors: [
        "Shares some information relating to a cultural product or practice and within a limited cultural or social context. Limited information that reflects few aspects of culture and cultural perspective[cite: 11].",
        "Responds to questions with some relevant ideas that are linked. Shows a limited ability to differentiate between factual information and personal perspectives[cite: 11].",
        "Demonstrates a limited fluency in the language. Uses simple grammar and vocabulary with limited accuracy. Uses limited pronunciation, intonation, register, stress and/or tempo[cite: 11].",
        "Demonstrates some oral language to link with the interlocutor. Some response to non-verbal forms of communication or cues for turn-taking. Limited use of communication and repair strategies as required[cite: 11]."
      ]
    },
    {
      level: "Medium",
      markRange: "9–12",
      descriptors: [
        "Shares a satisfactory range of information relating to a cultural product or practice and within an appropriate cultural and social context. Includes some ideas that take into account cultural perspectives[cite: 11].",
        "Responds to questions with a range of relevant ideas that are linked. Offers some justification of opinions, and shows some ability to distinguish between factual information and personal perspectives[cite: 11].",
        "Demonstrates a satisfactory level of fluency, and uses a variety of vocabulary, grammar and expressions with some accuracy. Demonstrates some appropriate pronunciation, intonation, register, stress and/or tempo[cite: 11].",
        "Demonstrates satisfactory oral language to link with the interlocutor. Responds to non-verbal forms of communication and cues for turn-taking. Uses some communication and repair strategies as required[cite: 11]."
      ]
    },
    {
      level: "High",
      markRange: "13–16",
      descriptors: [
        "Shares detailed information relating to a cultural product or practice and within a detailed cultural and social context. Includes a range of terms, ideas and idioms that take into account cultural perspectives[cite: 11].",
        "Responds to questions with a broad range of relevant ideas that are linked logically. Offers a detailed justification of opinions, and distinguishes factual information and personal perspectives[cite: 11].",
        "Demonstrates a high level of fluency, accurately using a range of vocabulary, grammar and expressions. Demonstrates appropriate pronunciation, intonation, register, stress and tempo[cite: 11].",
        "Demonstrates effective oral language to link with the interlocutor. Uses non-verbal forms of communication and cues for turn-taking. Uses communication and repair strategies as required[cite: 11]."
      ]
    },
    {
      level: "Very high",
      markRange: "17–20",
      descriptors: [
        "Shares very detailed information relating to a cultural product or practice and within a very detailed cultural and social context. Includes a broad range of terms, ideas and idioms that take into account cultural perspectives[cite: 11].",
        "Responds to questions with a very broad range of relevant ideas that are linked logically. Offers a comprehensive justification of opinions, and effectively distinguishes factual information and personal perspectives[cite: 11].",
        "Demonstrates a very high level of fluency, accurately using a very broad range of vocabulary, grammar and expressions. Demonstrates highly appropriate pronunciation, register, intonation, stress and tempo[cite: 11].",
        "Demonstrates highly effective oral language to link with the interlocutor. Uses non-verbal forms of communication and cues for turn-taking very effectively. Appropriate use of communication and repair strategies as required[cite: 11]."
      ]
    }
  ]
};