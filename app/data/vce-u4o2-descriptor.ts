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

export const vceU4O2Descriptor: UnitOutcomeDescriptor = {
  unit: "Unit 4",
  outcome: "Outcome 2",
  title: "Analyse information from written, spoken and viewed texts for use in a written response in Japanese.",
  totalMarks: 15,
  levels: [
    {
      level: "Very low",
      markRange: "1–3",
      descriptors: [
        "The response demonstrates a very limited understanding and interpretation of concepts, key ideas, detailed points and specific items of information in the texts[cite: 12].",
        "Very limited relevant meaning is extracted from the texts. The ideas and perspectives expressed in the texts are largely conveyed in isolation from one another[cite: 12].",
        "The response uses a very narrow range of familiar language (including spelling, grammar and punctuation and where relevant, script) demonstrating a very limited level of accuracy. Ideas are disjointed, with a very limited use of language for analysis or comparison of ideas. Uses very few stylistic features suited to the audience, purpose and text type[cite: 12]."
      ]
    },
    {
      level: "Low",
      markRange: "4–6",
      descriptors: [
        "The response demonstrates some understanding and interpretation of concepts, key ideas, detailed points and specific items of information in the texts. Limited recognition of cultural, linguistic or contextual aspects critical to meaning in the texts is shown[cite: 12].",
        "Limited information is extracted from the texts, some of which is not relevant. The response shows some identification of relationships and comparisons between the ideas and perspectives expressed or observed in the texts[cite: 12].",
        "The response uses a narrow range of familiar language (including spelling, grammar and punctuation and where relevant, script) demonstrating a limited level of accuracy. Ideas may be disjointed, with a limited use of language used for analysis or comparison of ideas. The response is partially suited to the audience, purpose and text type[cite: 12]."
      ]
    },
    {
      level: "Medium",
      markRange: "7–9",
      descriptors: [
        "The response demonstrates a sound understanding and interpretation of concepts, key ideas, detailed points and specific items of information in the texts. Satisfactory recognition of cultural, linguistic or contextual aspects critical to meaning in the texts is shown[cite: 12].",
        "Satisfactory relevant information is extracted from the texts. The response shows sound identification of relationships and comparisons between the ideas and perspectives expressed or observed in the texts[cite: 12].",
        "The response uses familiar language appropriately and with some accuracy (including spelling, grammar and punctuation and where relevant, script). Ideas are sequenced and structured, with a sound demonstration of language used for analysis or comparison of ideas. The response is suited to the audience, purpose and text type[cite: 12]."
      ]
    },
    {
      level: "High",
      markRange: "10–12",
      descriptors: [
        "The response demonstrates a detailed understanding and interpretation of concepts, key ideas, detailed points and specific items of information in the texts. Clear recognition of cultural, linguistic or contextual aspects critical to meaning in the texts is shown[cite: 12].",
        "Appropriate and relevant information is extracted from the texts. The response shows a detailed identification of relationships and comparisons between the ideas and perspectives expressed or observed in the texts[cite: 12].",
        "The response uses a broad range of language accurately and appropriately (including spelling, grammar and punctuation and where relevant, script). Ideas are well sequenced and structured within and between paragraphs, with a clear demonstration of language used for analysis or comparison of ideas. The response is well suited to the audience, purpose and text type[cite: 12]."
      ]
    },
    {
      level: "Very high",
      markRange: "13–15",
      descriptors: [
        "The response demonstrates a very detailed understanding and interpretation of concepts, key ideas, detailed points and specific items of information in the texts. Very clear recognition of cultural, linguistic or contextual aspects critical to meaning in the texts is shown[cite: 12].",
        "Highly appropriate and relevant information is extracted from the texts. The response shows a very detailed identification of relationships and comparisons between the ideas and perspectives expressed or observed in the texts[cite: 12].",
        "The response uses a very broad range of language very accurately and appropriately (including spelling, grammar and punctuation and where relevant, script). Ideas are very effectively sequenced and structured within and between paragraphs, with a very clear demonstration of language used for analysis or comparison of ideas. The response is highly suited to the audience, purpose and text type[cite: 12]."
      ]
    }
  ]
};