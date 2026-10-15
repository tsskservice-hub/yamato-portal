export interface StudySpecificRequirement {
  studyGroup: string;
  visualMaterial: string;
  allowedItems?: string[];
  prohibitedItems: string[];
  notes?: string;
}

export interface OralExamAdvice2026 {
  title: string;
  year: number;
  version: string;
  summary: string;
  keyDates: {
    vassAvailableDate: string;
  };
  requiredDocuments: string[];
  studySpecificRequirements: StudySpecificRequirement[];
  dressCode: string;
  arrivalInstructions: string;
  conductOfExamination: string[];
}

export const vceEoyOralAdvice2026: OralExamAdvice2026 = {
  title: "2026 VCE Languages oral examination advice",
  year: 2026,
  version: "Version 2 – February 2026",
  summary: "Full details of the requirements of the VCE Languages oral examinations assessed by a panel of assessors using published assessment criteria.",
  keyDates: {
    vassAvailableDate: "27 July 2026"
  },
  requiredDocuments: [
    "Individual Examination Advice Slip (printed and distributed by the school)",
    "Some form of photo identification (e.g., student concession card, learner driver permit, driver’s licence, or school ID card)"
  ],
  studySpecificRequirements: [
    {
      studyGroup: "Auslan Interactive Sign",
      visualMaterial: "Objects such as photographs, diagrams and maps to support the presentation or response in Section 2.",
      prohibitedItems: ["Dictionaries", "electronic communication devices", "notes", "cue cards"]
    },
    {
      studyGroup: "CCAFL (Assessed Languages)",
      visualMaterial: "One image on a piece of paper no larger than A3 size (no three-dimensional objects).",
      allowedItems: ["Brief headings and labels on the visual material"],
      prohibitedItems: ["Dictionaries", "electronic communication devices", "notes", "cue cards"],
      notes: "Applies to Armenian, Bengali, Bosnian, Chin Hakha, Croatian, Dutch, Filipino, Hebrew, Hindi, Hungarian, Karen, Khmer, Macedonian, Persian, Polish, Portuguese, Punjabi, Romanian, Russian, Serbian, Sinhala, Swedish, Tamil, Turkish."
    },
    {
      studyGroup: "Chinese Language, Culture and Society",
      visualMaterial: "Supporting visual material for Section 2, relating to a subtopic from the prescribed topics of the 'Chinese Language' strand (max A3 size, no three-dimensional objects).",
      allowedItems: ["Brief headings and labels"],
      prohibitedItems: ["Dictionaries", "electronic communication devices", "notes", "cue cards"]
    },
    {
      studyGroup: "First Languages",
      visualMaterial: "Objects and/or cue cards to support presentation, including photographs, diagrams, maps.",
      allowedItems: ["Brief speaker's notes in point form on a small card (no more than 20 cm × 12.5 cm)"],
      prohibitedItems: ["Dictionaries", "electronic communication devices"],
      notes: "Applies to Chinese First Language, Indonesian First Language, Japanese First Language, Korean First Language, Vietnamese First Language."
    },
    {
      studyGroup: "Second Languages (including Japanese Second Language)",
      visualMaterial: "Supporting visual material consisting of one image on a piece of paper no larger than A3 size (no three-dimensional objects).",
      allowedItems: ["Brief headings and labels"],
      prohibitedItems: ["Dictionaries", "electronic communication devices", "notes", "cue cards"],
      notes: "Applies to Arabic, Chinese Second Language, Chinese Second Language Advanced, French, German, Greek, Indonesian Second Language, Italian, Japanese Second Language, Korean Second Language, Spanish, Vietnamese Second Language."
    }
  ],
  dressCode: "Neat, casual clothing. School uniforms are not permitted.",
  arrivalInstructions: "Arrive at the examination centre 30 minutes before the start time. VCAA staff will check identification and documents before escorting students to the waiting area.",
  conductOfExamination: [
    "An assessor will invite the student into the examination room (student may choose to sit or stand).",
    "Student states VCAA ID number in English (or Auslan) and hands over the Examination Advice Slip.",
    "Assessor confirms student number, date, time, and venue in English.",
    "Students must speak in the target language (or sign in Auslan) at all times from this point onwards.",
    "The examination duration is approximately 15 minutes for Second Language examinations.",
    "An audio recording of the examination will be made.",
    "Students must leave the examination centre quickly and quietly after completion."
  ]
};