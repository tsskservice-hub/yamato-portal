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

export const vceU4O3Descriptor: UnitOutcomeDescriptor = {
  unit: "Unit 4",
  outcome: "Outcome 3",
  title: "Present information, concepts and ideas in evaluative or persuasive writing on an issue in Japanese.",
  totalMarks: 15,
  levels: [
    {
      level: "Very low",
      markRange: "1–3",
      descriptors: [
        "Presents a very limited range of information, concepts and ideas on an issue associated with a subtopic and its cultural implications, some of which may not be relevant. Very limited Evaluative writing techniques are evident. Or Very limited Persuasive writing strategies are evident[cite: 13].",
        "Uses a very narrow range of language (including spelling, grammar and punctuation and where relevant, script) with very limited accuracy. The language lacks clarity and uses very few writing conventions suited to the audience and purpose[cite: 13].",
        "Ideas are disjointed with minimal sequence in the writing and for the text type. Includes a very limited use of an introduction, body and conclusion[cite: 13]."
      ]
    },
    {
      level: "Low",
      markRange: "4–6",
      descriptors: [
        "Presents a limited range of relevant information, concepts and ideas on an issue associated with a subtopic and its cultural implications. Uses limited Evaluative writing techniques including identifying some different positions on the issue and identifying some relevant information to compare and draw conclusions. Or Uses limited Persuasive writing strategies including formulating a position on the issue and identifying relevant and compelling information to support it[cite: 13].",
        "Uses a narrow range of language appropriately (including spelling, grammar and punctuation and where relevant, script) with limited accuracy and clarity. Demonstrates some writing conventions suited to the audience and purpose[cite: 13].",
        "Some of the ideas are sequenced and organised in the writing, and for the text type. Includes some use of an introduction, body and conclusion[cite: 13]."
      ]
    },
    {
      level: "Medium",
      markRange: "7–9",
      descriptors: [
        "Presents a satisfactory range of relevant information, concepts and ideas on an issue associated with a subtopic and its cultural implications. Uses Evaluative writing techniques to some effect, including identifying different positions on the issue and identifying relevant information to compare and draw conclusions. Or Uses Persuasive writing strategies to some effect, including formulating a position on the issue and identifying relevant and compelling information to support it[cite: 13].",
        "Uses language appropriately (including spelling, grammar and punctuation and where relevant, script) with a satisfactory level of accuracy and clarity. Demonstrates sound writing conventions suited to the audience and purpose[cite: 13].",
        "Ideas are organised and sequenced with some effectiveness within and between paragraphs and in the writing as a whole, and for the text type. Includes a satisfactory use of an introduction, body and conclusion[cite: 13]."
      ]
    },
    {
      level: "High",
      markRange: "10–12",
      descriptors: [
        "Presents a broad range of detailed and relevant information, concepts and ideas on an issue associated with a subtopic and its cultural implications. Effective use of Evaluative writing techniques, including identifying different positions on the issue and identifying relevant information to compare and draw conclusions. Or Effective use of Persuasive writing strategies, including formulating a position on the issue and identifying relevant and compelling information to support it[cite: 13].",
        "Uses a variety of language appropriately (including spelling, grammar and punctuation and where relevant, script) with a high level of accuracy and clarity. Demonstrates effective use of writing conventions suited to the audience and purpose[cite: 13].",
        "Ideas are organised and sequenced effectively within and between paragraphs and with cohesiveness in the writing as a whole, and for the text type. Includes an effective use of an introduction, body and conclusion[cite: 13]."
      ]
    },
    {
      level: "Very high",
      markRange: "13–15",
      descriptors: [
        "Presents a very broad range of detailed and highly relevant information, concepts and ideas on an issue associated with a subtopic and its cultural implications. Highly effective use of Evaluative writing techniques, including identifying different positions on the issue and identifying relevant information to compare and draw conclusions. Or Highly effective use of Persuasive writing strategies, including formulating a position on the issue and identifying relevant and compelling information to support it[cite: 13].",
        "Uses a very broad variety of language appropriately (including spelling, grammar and punctuation and where relevant, script) and with a very high level of accuracy and clarity. Demonstrates highly effective use of writing conventions suited to the audience and purpose[cite: 13].",
        "Ideas are organised and sequenced in a highly effective manner within and between paragraphs, achieving cohesiveness in the writing as a whole, and for the text type. Includes a highly effective use of an introduction, body and conclusion[cite: 13]."
      ]
    }
  ]
};