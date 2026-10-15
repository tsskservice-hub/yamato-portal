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

export const vceU3O2Descriptor: UnitOutcomeDescriptor = {
  unit: "Unit 3",
  outcome: "Outcome 2",
  title: "Interpret information from texts and write responses in Japanese.",
  totalMarks: 15,
  levels: [
    {
      level: "Very low",
      markRange: "1–3",
      descriptors: [
        "The responses demonstrate a very limited understanding and interpretation of concepts, key ideas and detailed information in the texts[cite: 9].",
        "Responses convey limited relevant meaning. Isolated detail and single words are identified or extracted from texts. Information from the texts is not linked or compared[cite: 9].",
        "Responses use a very narrow range of familiar language (including spelling, grammar and punctuation and where relevant, script) demonstrating a very limited level of accuracy. The language lacks clarity[cite: 9]."
      ]
    },
    {
      level: "Low",
      markRange: "4–6",
      descriptors: [
        "Responses demonstrate some understanding and interpretation of concepts, key ideas and detailed information in the texts. Where relevant, responses show a limited recognition of meaning in terms and concepts without a direct equivalent in English[cite: 9].",
        "Limited information is selected and extracted from the texts, some of which is not relevant. The responses show limited ability to link, compare or sequence ideas and information. Different points of view or perspectives are not clearly identified[cite: 9].",
        "Responses use a narrow range of familiar language (including spelling, grammar and punctuation and where relevant, script) demonstrating limited levels of accuracy and clarity[cite: 9]."
      ]
    },
    {
      level: "Medium",
      markRange: "7–9",
      descriptors: [
        "Responses demonstrate a sound understanding and interpretation of concepts, key ideas and detailed information in the texts. Where relevant, responses show some recognition of meaning in terms and concepts without a direct equivalent in English[cite: 9].",
        "Satisfactory information is selected and extracted from the texts, most of which is relevant. The responses link, compare or sequence some of the ideas and information. Some different points of view or perspectives are identified[cite: 9].",
        "Responses use familiar language appropriately (including spelling, grammar and punctuation and where relevant, script) demonstrating satisfactory levels of accuracy and clarity[cite: 9]."
      ]
    },
    {
      level: "High",
      markRange: "10–12",
      descriptors: [
        "Responses demonstrate a detailed understanding and interpretation of concepts, key ideas and detailed information in the texts. Where relevant, responses show a clear recognition of meaning in terms and concepts without a direct equivalent in English[cite: 9].",
        "Appropriate and relevant information is selected and extracted from the texts. The responses link, compare or sequence a range of ideas and information logically. Different points of view or perspectives are identified[cite: 9].",
        "Responses use a broad range of language appropriately (including spelling, grammar and punctuation and where relevant, script) demonstrating a high level of accuracy and clarity[cite: 9]."
      ]
    },
    {
      level: "Very high",
      markRange: "13–15",
      descriptors: [
        "Responses demonstrate a very detailed understanding and interpretation of concepts, key ideas, detailed points and specific items of information in the texts. Where relevant, responses show a very clear recognition of meaning in terms and concepts without a direct equivalent in English[cite: 9].",
        "Highly appropriate and relevant information is selected and extracted from the texts. The responses link, compare or sequence a broad range of ideas and information logically and with some sophistication. Different points of view or perspectives are clearly identified[cite: 9].",
        "Responses use a very broad range of language appropriately (including spelling, grammar and punctuation and where relevant, script) demonstrating a very high level of accuracy and clarity[cite: 9]."
      ]
    }
  ]
};