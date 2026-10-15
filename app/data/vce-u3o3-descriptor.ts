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

export const vceU3O3Descriptor: UnitOutcomeDescriptor = {
  unit: "Unit 3",
  outcome: "Outcome 3",
  title: "Express ideas in a personal, informative or imaginative piece of writing in Japanese.",
  totalMarks: 15,
  levels: [
    {
      level: "Very low",
      markRange: "1–3",
      descriptors: [
        "A piece of writing with limited demonstration of the kind of writing required for the task. Presents very few ideas, thoughts or responses on an aspect of the selected subtopic. Includes a very limited range of relevant or culturally appropriate content[cite: 10].",
        "Uses a very narrow range of language appropriately (including spelling, grammar and punctuation and where relevant, script) with very limited accuracy. The written language lacks clarity and lacks appropriate stylistic features for the task[cite: 10].",
        "Ideas are disjointed and are not sequenced appropriately or in accordance with any of the features of the text type. Includes a very limited use of an introduction, body and conclusion[cite: 10]."
      ]
    },
    {
      level: "Low",
      markRange: "4–6",
      descriptors: [
        "A piece of personal, informative or imaginative writing with some original elements. Presents few ideas, thoughts or responses on an aspect of the selected subtopic. Includes a limited range of relevant and culturally appropriate content[cite: 10].",
        "Uses a narrow range of language appropriately (including spelling, grammar and punctuation and where relevant, script) with limited accuracy and clarity. Demonstrates few effective stylistic features, language, layout and other elements for the text type, purpose and audience[cite: 10].",
        "Few of the ideas are sequenced and organised in the writing, and in accordance with the features of the text type. Includes, where appropriate, some use of an introduction, body and conclusion[cite: 10]."
      ]
    },
    {
      level: "Medium",
      markRange: "7–9",
      descriptors: [
        "An original piece of personal, informative or imaginative writing. Presents some ideas, thoughts or responses on an aspect of the selected subtopic. Includes a satisfactory range of relevant and culturally appropriate content[cite: 10].",
        "Uses language appropriately (including spelling, grammar and punctuation and where relevant, script) with a satisfactory level of accuracy and clarity. Demonstrates some effective stylistic features, language, layout and other elements for the text type, purpose and audience[cite: 10].",
        "Ideas are organised and sequenced with some effectiveness within and between paragraphs and in the writing as a whole, and in accordance with the features of the text type. Includes, where appropriate, a satisfactory use of an introduction, body and conclusion[cite: 10]."
      ]
    },
    {
      level: "High",
      markRange: "10–12",
      descriptors: [
        "An effective and original piece of personal, informative or imaginative writing. Presents many ideas, thoughts or responses on an aspect of the selected subtopic. Includes a range of relevant and culturally appropriate content[cite: 10].",
        "Uses a variety of language appropriately (including spelling, grammar and punctuation and where relevant, script) with a high level of accuracy and clarity. Demonstrates effective stylistic features, language, layout and other elements for the text type, purpose and audience[cite: 10].",
        "Ideas are organised and sequenced effectively within and between paragraphs and with cohesiveness in the writing as a whole, and in accordance with the features of the text type. Includes, where appropriate, an effective use of an introduction, body and conclusion[cite: 10]."
      ]
    },
    {
      level: "Very high",
      markRange: "13–15",
      descriptors: [
        "A highly effective and original piece of personal, informative or imaginative writing. Presents very many ideas, thoughts or responses on an aspect of the selected subtopic. Includes a broad range of highly relevant and culturally appropriate content[cite: 10].",
        "Uses a very broad variety of language appropriately (including spelling, grammar and punctuation and where relevant, script) with a very high level of accuracy and clarity. Demonstrates highly effective stylistic features, language, layout and other elements for the text type, purpose and audience[cite: 10].",
        "Ideas are organised and sequenced highly effectively within and between paragraphs, achieving cohesiveness in the writing as a whole, and in accordance with the features of the text type. Includes, where appropriate, a highly effective use of an introduction, body and conclusion[cite: 10]."
      ]
    }
  ]
};