export interface AssessmentCriterion {
  id: number;
  name: string;
  focus: string;
  descriptors: {
    markRange: string;
    description: string;
  }[];
}

export interface ExamSectionCriteria {
  sectionName: string;
  description: string;
  criteria: AssessmentCriterion[];
}

export const VCE_ORAL_ASSESSMENT_CRITERIA: Record<string, ExamSectionCriteria> = {
  sec1: {
    sectionName: "Section 1 – Conversation",
    description: "Information, ideas and opinions about the student’s personal world and their interactions with the language and culture as learners.",
    criteria: [
      {
        id: 1,
        name: "Content and communication",
        focus: "Relevance, depth and range of information; capacity to elaborate, reflect, and interact effectively.",
        descriptors: [
          { markRange: "0–1", description: "Provides hardly any or no evidence of meeting the criterion." },
          { markRange: "2–3", description: "Demonstrates minimal understanding and ability to advance the conversation; slow to respond, consistent hesitation, frequent support needed; limited range of information/opinions not always relevant." },
          { markRange: "4–5", description: "Demonstrates satisfactory understanding; communicates with hesitation and pauses; provides satisfactory range of information/opinions that are somewhat relevant." },
          { markRange: "6–7", description: "Demonstrates good understanding; communicates well with occasional hesitation; provides good range of generally relevant information; clarifies or elaborates some of the time." },
          { markRange: "8–9", description: "Demonstrates very high level of understanding; carries conversation forward with confidence; provides very good range of relevant information; clarifies, elaborates on, or defends information most of the time." },
          { markRange: "10", description: "Demonstrates excellent understanding with spontaneity and confidence; provides excellent range of clear, logical, and highly relevant information; elaborates and defends very effectively." }
        ]
      },
      {
        id: 2,
        name: "Language",
        focus: "Appropriateness of vocabulary, grammar, sentence structures, and clarity of expression (pronunciation, intonation, stress, and tempo).",
        descriptors: [
          { markRange: "0–1", description: "Provides hardly any or no evidence of meeting the criterion." },
          { markRange: "2–3", description: "Uses very simple vocabulary and structures; frequent intrusive errors; poor pronunciation, intonation, stress, and tempo with significant problems." },
          { markRange: "4–5", description: "Uses simple vocabulary/structures; expresses meaning despite errors; relies on rote-learned language or literal translation; satisfactory pronunciation/tempo with some problems." },
          { markRange: "6–7", description: "Uses good vocabulary/structures; expresses meaning despite errors; occasional reliance on rote-learned language; good pronunciation with minor problems." },
          { markRange: "8–9", description: "Uses very good vocabulary and structures accurately and appropriately; very good pronunciation, intonation, stress, and tempo." },
          { markRange: "10", description: "Uses sophisticated vocabulary and structures accurately and appropriately; uses language naturally; excellent pronunciation, intonation, stress, and tempo." }
        ]
      }
    ]
  },
  sec2: {
    sectionName: "Section 2 – Discussion",
    description: "Information, ideas and opinions related to the chosen subtopic and supporting visual material from prescribed themes.",
    criteria: [
      {
        id: 1,
        name: "Content and communication",
        focus: "Relevance, depth and range of information; capacity to elaborate and defend ideas; effective use of supporting visual material.",
        descriptors: [
          { markRange: "0–1", description: "Provides hardly any or no evidence of meeting the criterion." },
          { markRange: "2–3", description: "Minimal information, not always relevant; difficulty clarifying/elaborating; slow to respond with hesitation; weak connection between image and subtopic." },
          { markRange: "4–5", description: "Satisfactory range of relevant information; communicates with evident hesitation; describes the image rather than using it to support discussion; requires support." },
          { markRange: "6–7", description: "Good range of relevant information; elaborates on information and defends ideas; uses image appropriately; communicates well despite hesitation." },
          { markRange: "8–9", description: "Very good range and depth of information highly relevant to subtopic; elaborates and defends clearly; uses image effectively; communicates confidently." },
          { markRange: "10", description: "Excellent range and depth with original perspective; elaborates on complex information and defends logically; uses image skilfully; spontaneous and very confident." }
        ]
      },
      {
        id: 2,
        name: "Language",
        focus: "Accurate and appropriate language structures and vocabulary related to the subtopic and visual material; clarity of expression.",
        descriptors: [
          { markRange: "0–1", description: "Provides hardly any or no evidence of meeting the criterion." },
          { markRange: "2–3", description: "Uses very simple vocabulary and structures; frequent intrusive errors; poor pronunciation, intonation, stress, and tempo with significant problems." },
          { markRange: "4–5", description: "Uses simple vocabulary/structures; expresses meaning despite errors; relies on rote-learned language or literal translation; satisfactory pronunciation/tempo with minor problems." },
          { markRange: "6–7", description: "Uses good vocabulary/structures; expresses meaning despite errors; good pronunciation, intonation, stress, and tempo with minor problems." },
          { markRange: "8–9", description: "Uses very good vocabulary and structures accurately and appropriately; very good pronunciation, intonation, stress, and tempo." },
          { markRange: "10", description: "Uses sophisticated vocabulary and structures accurately and appropriately; uses language naturally; excellent pronunciation, intonation, stress, and tempo." }
        ]
      }
    ]
  }
};