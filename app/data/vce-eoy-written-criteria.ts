export interface ExpectedQuality {
  markRange: string;
  qualities: string[];
}

export interface AssessmentCriterion {
  id: string;
  name: string;
  description?: string[];
}

export interface SectionCriteria {
  section: string;
  title: string;
  criteria: AssessmentCriterion[];
  expectedQualities: ExpectedQuality[];
}

export const vceEoyWrittenCriteria: SectionCriteria[] = [
  {
    section: "Section 2 - Part B",
    title: "Section 2 – Part B Assessment Criteria and Expected Qualities",
    criteria: [
      {
        id: "Criterion 1",
        name: "The capacity to understand general and specific aspects of texts"
      },
      {
        id: "Criterion 2",
        name: "The capacity to convey information and opinions accurately and appropriately"
      }
    ],
    expectedQualities: [
      {
        markRange: "13-15",
        qualities: [
          "accurately identifies the main relevant points of the stimulus text",
          "meets all the requirements of the task effectively, including the specified audience, purpose, style of writing and text type",
          "organises information and ideas logically and clearly throughout the response",
          "consistently uses accurate and appropriate vocabulary, grammar and sentence structure to convey meaning (minor errors only)",
          "manipulates language to successfully convey original meaning with minimal reliance on the language in the stimulus text"
        ]
      },
      {
        markRange: "10-12",
        qualities: [
          "identifies most of the main relevant points of the stimulus text",
          "meets most of the requirements of the task effectively, including the specified audience, purpose, style of writing and text type",
          "organises information and ideas appropriately throughout the response",
          "uses mostly accurate and appropriate vocabulary, grammar and sentence structure to convey meaning",
          "manipulates language to convey original meaning with occasional reliance on the language in the stimulus text"
        ]
      },
      {
        markRange: "7-9",
        qualities: [
          "identifies some of the main relevant points of the stimulus text",
          "meets the requirements of the task satisfactorily, including the specified audience, purpose, style of writing and text type; some requirements not fully achieved",
          "organises information and ideas throughout the response satisfactorily",
          "uses vocabulary, grammar and sentence structure satisfactorily to convey meaning",
          "uses language to convey original meaning with some reliance on the language in the stimulus text"
        ]
      },
      {
        markRange: "4-6",
        qualities: [
          "demonstrates a limited understanding of the stimulus text",
          "meets only some of the requirements of the task; the specified audience, purpose, style of writing or text type may not be addressed adequately",
          "demonstrates limited ability to organise information and ideas",
          "demonstrates a basic knowledge and understanding of vocabulary, grammar and sentence structure",
          "uses language to convey original meaning with frequent reliance on the language in the stimulus text"
        ]
      },
      {
        markRange: "1-3",
        qualities: [
          "demonstrates a very limited understanding of the stimulus text",
          "does not meet the requirements of the task",
          "demonstrates an elementary knowledge and understanding of vocabulary, grammar and sentence structure",
          "relies very heavily on the language in the stimulus text"
        ]
      },
      {
        markRange: "0",
        qualities: [
          "no evidence of meeting the criteria"
        ]
      }
    ]
  },
  {
    section: "Section 3",
    title: "Section 3 Assessment Criteria and Expected Qualities",
    criteria: [
      {
        id: "Criterion 1",
        name: "The capacity to demonstrate relevance, breadth and depth of content",
        description: [
          "relevance of content in relation to task set",
          "comprehensiveness and sophistication of content",
          "structuring and sequencing of ideas within and between paragraphs"
        ]
      },
      {
        id: "Criterion 2",
        name: "The capacity to demonstrate accuracy, range and appropriateness of vocabulary and grammar",
        description: [
          "accuracy and range of vocabulary and grammar",
          "appropriateness of vocabulary and grammar for the context, purpose, style of writing, audience and text type",
          "cohesiveness of writing within and between paragraphs"
        ]
      }
    ],
    expectedQualities: [
      {
        markRange: "19-20",
        qualities: [
          "demonstrates an original interpretation of the task, always adhering to the task itself",
          "consistently demonstrates highly effective structuring and sequencing of information and ideas appropriate to the context, purpose and audience specified in the task",
          "consistently demonstrates highly appropriate features of the required style of writing and text type",
          "uses a broad range of sophisticated and highly appropriate vocabulary and demonstrates outstanding control of grammatical structures and, where relevant, highly accurate script; minor errors only (highly accurate script)"
        ]
      },
      {
        markRange: "16-18",
        qualities: [
          "conveys highly relevant and significant information, successfully integrating information and ideas in an effective manner throughout the response",
          "demonstrates highly effective structuring and sequencing of information and ideas appropriate to the context, purpose and audience specified in the task",
          "demonstrates highly appropriate features of the required style of writing and text type",
          "uses a broad range of highly appropriate vocabulary and complex and accurate grammatical structures (accurate script)"
        ]
      },
      {
        markRange: "13-15",
        qualities: [
          "conveys relevant and significant information, successfully integrating information and ideas throughout the response",
          "demonstrates effective structuring and sequencing of information and ideas appropriate to the context, purpose and audience specified in the task",
          "demonstrates most of the features of the required style of writing and text type",
          "uses a range of appropriate vocabulary, including some complex grammatical structures (mostly accurate script)"
        ]
      },
      {
        markRange: "10-12",
        qualities: [
          "provides relevant information and ideas throughout the response",
          "demonstrates structuring and sequencing of information and ideas appropriate to the task",
          "demonstrates features of the required style of writing and text type",
          "uses suitable vocabulary and grammatical structures (uses script appropriately)"
        ]
      },
      {
        markRange: "7-9",
        qualities: [
          "provides some relevant information and ideas throughout the response",
          "inconsistent structuring and sequencing of information and ideas across the response; audience and purpose not clearly reflected in the response",
          "demonstrates a few of the features of the required style of writing and text type",
          "sometimes uses vocabulary and grammatical structures appropriately (partly accurate script)"
        ]
      },
      {
        markRange: "4-6",
        qualities: [
          "provides basic information and ideas relevant to the task",
          "demonstrates little structuring and sequencing of information and ideas",
          "demonstrates insufficient features of the required style of writing and text type",
          "uses a very limited range of vocabulary and grammatical structures (frequent misuse of script)"
        ]
      },
      {
        markRange: "1-3",
        qualities: [
          "demonstrates very little awareness of the requirements of the task",
          "uses minimal phrases or words (minimal use of script)"
        ]
      },
      {
        markRange: "0",
        qualities: [
          "no evidence of meeting the criteria"
        ]
      }
    ]
  }
];