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

export const vceU3O1Descriptor: UnitOutcomeDescriptor = {
  unit: "Unit 3",
  outcome: "Outcome 1",
  title: "Participate in a spoken exchange in Japanese to resolve a personal issue.",
  totalMarks: 20,
  levels: [
    {
      level: "Very low",
      markRange: "1–4",
      descriptors: [
        "Exchanges a limited range of simple ideas and concepts. Provides very limited information that reflects very few aspects of culture or cultural perspectives[cite: 8].",
        "Expresses limited information and preferences about the issue[cite: 8].",
        "Uses a very narrow range of simple vocabulary and grammar with a very limited level of accuracy. Pronunciation, intonation, stress and tempo interfere with ability to convey meaning[cite: 8].",
        "Makes few links with the other speaker. Very limited response to non-verbal forms of communication or cues for turn-taking. Demonstrates little capacity to participate in the exchange[cite: 8]."
      ]
    },
    {
      level: "Low",
      markRange: "5–8",
      descriptors: [
        "Exchanges some relevant ideas and concepts. Provides limited information that reflects few aspects of culture. Displays a narrow cultural perspective[cite: 8].",
        "Provides a narrow range of information and preferences to persuade the other person. Limited use of strategies in order to reach a resolution about the issue[cite: 8].",
        "Demonstrates some accuracy in a narrow range of grammar and vocabulary. Uses some appropriate pronunciation, intonation, register, stress and/or tempo[cite: 8].",
        "Makes some links with the other speaker. Limited response to non-verbal forms of communication or cues for turn-taking. Some capacity to identify errors and to self-correct as required[cite: 8]."
      ]
    },
    {
      level: "Medium",
      markRange: "9–12",
      descriptors: [
        "Exchanges a range of relevant ideas and concepts. Provides some appropriate information for the audience, context and purpose of the task, including some ideas that take into account cultural perspectives[cite: 8].",
        "Links some logical ideas and provides a point of view or a preference to persuade the other person. Some use of negotiation strategies in order to reach a resolution about the issue[cite: 8].",
        "Demonstrates a satisfactory level of fluency, accurately using a variety of vocabulary, grammar and expressions. Demonstrates some appropriate pronunciation, intonation, register, stress and/or tempo[cite: 8].",
        "Establishes and maintains links with the other speaker. Responds to non-verbal forms of communication and cues for turn-taking. Uses a limited range of communication and repair strategies as required[cite: 8]."
      ]
    },
    {
      level: "High",
      markRange: "13–16",
      descriptors: [
        "Exchanges a broad range of relevant ideas and concepts. Provides appropriate information for the audience, context and purpose of the task, including terms, ideas and idioms that take into account cultural perspectives[cite: 8].",
        "Links relevant ideas logically, and provides a point of view or a preference to persuade the other person. Effective use of negotiation strategies in order to reach a resolution about the issue[cite: 8].",
        "Demonstrates a high level of fluency, accurately using a wide variety of vocabulary, grammar and expressions. Demonstrates appropriate pronunciation, intonation, register, stress and tempo[cite: 8].",
        "Establishes and maintains links with the other speaker effectively. Uses non-verbal forms of communication and cues for turn-taking. Uses a range of communication and repair strategies as required[cite: 8]."
      ]
    },
    {
      level: "Very high",
      markRange: "17–20",
      descriptors: [
        "Exchanges a very broad range of relevant ideas and concepts. Provides highly appropriate information for the audience, context and purpose of the task, including terms, ideas and idioms that take into account cultural perspectives[cite: 8].",
        "Links highly relevant ideas logically, and provides a point of view or a preference to persuade the other person. Highly effective use of negotiation strategies in order to reach a resolution about the issue[cite: 8].",
        "Demonstrates a very high level of fluency, accurately using a very wide variety of vocabulary, grammar and expressions. Demonstrates highly appropriate pronunciation, register, intonation, stress and tempo[cite: 8].",
        "Establishes and maintains links with the other speaker in a highly effective manner. Successfully uses non-verbal forms of communication and cues for turn-taking. Uses a broad range of communication and repair strategies as required[cite: 8]."
      ]
    }
  ]
};