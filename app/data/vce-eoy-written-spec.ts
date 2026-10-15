export interface WrittenSectionPart {
  part?: string;
  title: string;
  marks: number;
  description: string;
  details?: string[];
}

export interface WrittenSection {
  section: string;
  title: string;
  totalMarks: number;
  parts: WrittenSectionPart[];
}

export interface WrittenSpecification {
  title: string;
  study: string;
  accreditationPeriod: string;
  overallConditions: {
    readingTime: string;
    writingTime: string;
    marking: string;
    weighting: string;
    rulesAndLocation: string;
  };
  content: string;
  format: {
    formatType: string;
    sections: WrittenSection[];
    totalMarks: number;
  };
  additionalInformation: {
    listeningLength: string;
    readingLength: string;
    visualTextsCount: string;
  };
  approvedMaterials: string[];
  relevantReferences: string[];
}

export const vceEoyWrittenSpec: WrittenSpecification = {
  title: "Written examination – End of year",
  study: "VCE Japanese Second Language",
  accreditationPeriod: "From 2020 (Version 4 – March 2025)",
  overallConditions: {
    readingTime: "15 minutes",
    writingTime: "2 hours",
    marking: "Marked by a panel appointed by the VCAA",
    weighting: "37.5 per cent of the study score",
    rulesAndLocation: "Set annually by the VCAA, published in the VCE Administrative Handbook."
  },
  content: "All key knowledge and key skills underpinning relevant outcomes in Units 3 and 4, relating to the themes and topics prescribed on page 12 of the VCE Japanese Second Language Study Design.",
  format: {
    formatType: "Question and Answer Book",
    sections: [
      {
        section: "Section 1",
        title: "Listening",
        totalMarks: 20,
        parts: [
          {
            part: "Part A",
            title: "Listening Text 1",
            marks: 10,
            description: "Listen to one listening text in Japanese. Played twice with a pause. Questions phrased in English for responses in English.",
            details: ["Tables, charts, lists, forms, multiple-choice items, or open-ended questions."]
          },
          {
            part: "Part B",
            title: "Listening Text 2",
            marks: 10,
            description: "Listen to one listening text in Japanese. Played twice with a pause. Questions phrased in English and Japanese for responses in Japanese."
          }
        ]
      },
      {
        section: "Section 2",
        title: "Reading and Responding",
        totalMarks: 35,
        parts: [
          {
            part: "Part A",
            title: "Reading and Listening Integration",
            marks: 20,
            description: "Read Text 3A (Japanese) and listen to Text 3B (Japanese) related in subject matter/context. 5 minutes reading time before listening. Extract, summarise, interpret, evaluate, and compare texts.",
            details: ["Questions phrased in English for responses in English."]
          },
          {
            part: "Part B",
            title: "Reading and Responding (Writing Task)",
            marks: 15,
            description: "Read one text in Japanese and produce a text in Japanese (approx. 300 ji) developing ideas, opinions, and/or arguments based on evidence.",
            details: ["Task specifies context, purpose, style of writing, audience, and text type (from productive use list). Phrased in English and Japanese for a response in Japanese."]
          }
        ]
      },
      {
        section: "Section 3",
        title: "Writing in Japanese",
        totalMarks: 20,
        parts: [
          {
            title: "Extended Writing Task",
            marks: 20,
            description: "Choice of four tasks related to prescribed themes. Write a text (400–500 ji) presenting ideas, information, opinions, and/or arguments.",
            details: ["Specifies context, purpose, style of writing, audience, and text type. Differs from Section 2 Part B in text type and style. Phrased in English and Japanese for a response in Japanese."]
          }
        ]
      }
    ],
    totalMarks: 75
  },
  additionalInformation: {
    listeningLength: "Total length of one playing of the three listening texts will be 4½ – 5 minutes.",
    readingLength: "Total length of the two reading texts in Section 2 will be approximately 1100 ji.",
    visualTextsCount: "One or two visual texts in this examination."
  },
  approvedMaterials: [
    "Normal stationery requirements (pens, pencils, highlighters, erasers, sharpeners, and rulers)",
    "Any printed monolingual and/or bilingual dictionary in one or two separate volumes"
  ],
  relevantReferences: [
    "VCE Japanese Second Language Study Design (From 2020)",
    "VCE Japanese Second Language – Advice for teachers",
    "VCAA Bulletin",
    "VCAA Notices to Schools"
  ]
};