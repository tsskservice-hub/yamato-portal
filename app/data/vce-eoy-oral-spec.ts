export interface OralSection {
  section: string;
  title: string;
  duration: string;
  marks: number;
  description: string;
  details?: string[];
}

export interface OralSpecification {
  title: string;
  study: string;
  accreditationPeriod: string;
  overallConditions: {
    examinationTime: string;
    assessors: string;
    weighting: string;
    locationAndRules: string;
  };
  format: {
    introduction: string;
    sections: OralSection[];
    totalMarks: number;
  };
  approvedMaterials: {
    visualMaterial: string;
    restrictions: string[];
  };
  relevantReferences: string[];
}

export const vceEoyOralSpec: OralSpecification = {
  title: "Oral examination – End of year",
  study: "VCE Japanese Second Language",
  accreditationPeriod: "From 2020 (Version 3 – March 2025)",
  overallConditions: {
    examinationTime: "approximately 15 minutes",
    assessors: "Conducted by two assessors appointed by the VCAA",
    weighting: "12.5 per cent of the study score",
    locationAndRules: "Set annually by the VCAA, published in the VCE Administrative Handbook. Examination Advice Slips available in Term 3 via VASS."
  },
  format: {
    introduction: "Conducted by two assessors. Upon entering, students verbally provide their student number in English, then indicate to assessors in Japanese their chosen subtopic and supporting visual material for Section 2. (This introductory information is not assessed).",
    sections: [
      {
        section: "Section 1",
        title: "Conversation",
        duration: "approximately seven minutes",
        marks: 20,
        description: "A general conversation between the student and the two assessors about the student’s personal world and their interactions with the Japanese language and culture as learners.",
        details: [
          "Begins with questions about the student's personal world.",
          "Followed by general questions about the student's interactions with the Japanese language and culture as learners.",
          "Students may support personal reflections by referring to relevant subtopics studied in class from the prescribed themes 'The individual' and 'The Japanese-speaking communities'."
        ]
      },
      {
        section: "Section 2",
        title: "Discussion",
        duration: "approximately eight minutes",
        marks: 20,
        description: "Following the conversation, the student discusses their chosen subtopic and the supporting visual material brought with them.",
        details: [
          "Must be related to either the prescribed theme 'The Japanese-speaking communities' or 'The world around us'.",
          "Focuses on exploring aspects of the subtopic, including information, opinions and ideas.",
          "Students are expected to respond to questions on the subtopic itself and the supporting visual material."
        ]
      }
    ],
    totalMarks: 40
  },
  approvedMaterials: {
    visualMaterial: "Must consist of one image on a piece of paper no larger than A3 size.",
    restrictions: [
      "Three-dimensional objects are not permitted.",
      "The quality of the supporting visual material will not be assessed.",
      "Should not include any writing; if writing is present, it must be minimal.",
      "Dictionaries, notes and cue cards are not permitted."
    ]
  },
  relevantReferences: [
    "VCE Japanese Second Language Study Design (From 2020)",
    "VCE Japanese Second Language – Advice for teachers",
    "VCAA Bulletin",
    "VCAA Notices to Schools"
  ]
};