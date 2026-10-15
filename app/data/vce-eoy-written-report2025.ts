export interface WrittenReportSection {
  section: string;
  title: string;
  parts?: {
    part: string;
    title: string;
    whatStudentsDidWell?: string[];
    areasForImprovement?: string[];
    questionFeedback?: {
      question: string;
      notes: string;
    }[];
  }[];
  generalFeedback?: string[];
}

export interface WrittenAssessmentReport2025 {
  title: string;
  year: number;
  study: string;
  sections: WrittenReportSection[];
}

export const vceEoyWrittenReport2025: WrittenAssessmentReport2025 = {
  title: "2025 VCE Japanese Second Language Written External Assessment Report",
  year: 2025,
  study: "VCE Japanese Second Language",
  sections: [
    {
      section: "Section 1",
      title: "Listening and Responding",
      parts: [
        {
          part: "Part A",
          title: "Listening and responding in English",
          questionFeedback: [
            {
              question: "Question 1a",
              notes: "Students generally answered well, but some omitted 'during the summer', overlooking both specific and general time expressions."
            },
            {
              question: "Question 1b",
              notes: "Most understood quiet streets, but some omitted 'very', confused 道 (streets) with 町 (town), or overlooked details."
            },
            {
              question: "Question 1c",
              notes: "Handled well overall, though some missed 'places you have never been before' or did not understand けんこう (health)."
            },
            {
              question: "Question 1d",
              notes: "Common issues included general responses like 'comfortable shoes' instead of 歩きやすいくつ, spelling errors in アプリ, and confusion with the verb 持って来る (to bring)."
            }
          ]
        },
        {
          part: "Part B",
          title: "Listening and responding in Japanese",
          questionFeedback: [
            {
              question: "Question 2a",
              notes: "Generally well answered. Students are reminded to use expected kanji instead of writing 安かった and 乗り物 in hiragana."
            },
            {
              question: "Question 2b",
              notes: "Challenging question. Confusing はじめて with はじめに caused errors, and particle errors with 二人で led to ungrammatical phrases."
            },
            {
              question: "Question 2c",
              notes: "Students had difficulty with conjugated forms of はしる and しなければならない, as well as selecting correct 'wear' verbs (きる, はく, かぶる, する)."
            },
            {
              question: "Question 2d",
              notes: "Good understanding of taking photos, but 友だちと and さくらの下で were frequently mistranslated or had incorrect particles (e.g., using に instead of で)."
            }
          ]
        }
      ]
    },
    {
      section: "Section 2",
      title: "Reading and Responding",
      parts: [
        {
          part: "Part A",
          title: "Reading, listening and responding in English",
          questionFeedback: [
            {
              question: "Question 3a",
              notes: "Identified living arrangement differences, but often omitted required time markers or misinterpreted ふうふだけで and 自分の家で自由に."
            },
            {
              question: "Question 3b",
              notes: "Good overall understanding, but some misread 病気/けが, confused うんてん with うん動, or mistranslated さびしい as 'sad'."
            },
            {
              question: "Question 3c",
              notes: "Accessible for most. Difficulties arose in accurately translating 安心する and omitting へや when stating it is cheap."
            },
            {
              question: "Question 3d",
              notes: "Challenging; many responses lacked required detail such as differences in both waking/sleeping times and mentioning 'at night'."
            },
            {
              question: "Question 3e",
              notes: "Generally performed well, though some confusion occurred regarding who learned what from whom and specific details."
            }
          ]
        },
        {
          part: "Part B",
          title: "Reading and responding in Japanese (Question 4)",
          whatStudentsDidWell: [
            "High-scoring responses successfully integrated information from both the reading text and visual stimulus (flower-shaped wagashi, matcha on tatami).",
            "Demonstrated clear awareness of purpose and audience using an appropriate persuasive email format.",
            "Conveyed content with minimal reliance on the source text while maintaining original meaning."
          ],
          areasForImprovement: [
            "Avoid overly informative responses that lack persuasion.",
            "Avoid copying large chunks directly from the reading text without modification.",
            "Manage character count carefully around the recommended ~300 ji without spending excessive time that impacts Section 3."
          ]
        }
      ]
    },
    {
      section: "Section 3",
      title: "Writing in Japanese (Questions 5–8)",
      generalFeedback: [
        "Question 5 (Informative speech on social media promotion): High-scoring responses addressed the task directly with specific examples (Instagram training photos, TikTok videos, YouTube updates) maintaining an informative tone.",
        "Question 6 (Journal entry on part-time job skills): Popular choice. Successful responses identified transferable skills (communication, teamwork, time management) and connected them to future study or work.",
        "Question 7 (Evaluative report on a new airline's inaugural flight): By far the most popular choice. High-scoring responses evaluated cabin service, meals, and comfort with a balanced, well-reasoned assessment from a passenger's viewpoint.",
        "Question 8 (Imaginative story for children about a delivery robot): Fewest choices. Successful responses created an engaging narrative with a clear setting, development, and resolution suitable for young readers."
      ]
    }
  ]
};