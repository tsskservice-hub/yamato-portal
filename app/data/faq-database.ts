/**
 * @file faq-database.ts
 * @description Type definitions and helper functions for FAQ and AI Yamato Expert Guidance Data Bank (Yamato Portal)
 */

export interface FaqItem {
  id: string;
  category: "general" | "vce_written" | "vce_oral" | "genkoyoshi" | "portal_usage";
  tags: string[];         // Tags for search and filtering
  questionEn: string;      // English question text
  questionJp: string;      // Japanese question text (kept identical to English for uniformity)
  answerHtml: string;      // Detailed explanation displayed on the site's FAQ page (supports HTML and ruby tags)
  expertGuidance: string;  // Scoring criteria and guidance policy referenced by AI Yamato in its prompt (Backend/AI use only; hidden on frontend FAQ view)
}

// --- FAQ List Data (追加) ---
export const faqList: FaqItem[] = [
  {
    id: "faq-1",
    category: "general",
    tags: ["portal", "yamato"],
    questionEn: "What is AI Yamato Portal?",
    questionJp: "What is AI Yamato Portal?",
    answerHtml: "AI Yamato Portal is an advanced educational platform designed to support Japanese language learners globally.",
    expertGuidance: "Provide general portal overview focusing on global and VCE support."
  },
  {
    id: "faq-2",
    category: "vce_written",
    tags: ["vce", "writing", "kanji", "grammar"],
    questionEn: "How does the Kanji & Grammar Checker work?",
    questionJp: "How does the Kanji & Grammar Checker work?",
    answerHtml: "It scans your Japanese input text and highlights unique VCE kanji and grammar patterns without duplication.",
    expertGuidance: "Explain exact match criteria and remind users to use counts for reference only."
  }
];

export default faqList;

/**
 * Retrieves a specific FAQ item by its ID from Supabase fetched data.
 * @param faqs List of FAQ items fetched from Supabase
 * @param id The target FAQ ID
 */
export function getFaqById(faqs: FaqItem[], id: string): FaqItem | undefined {
  return faqs.find((faq) => faq.id === id);
}

/**
 * Filters FAQ items by category from Supabase fetched data.
 * @param faqs List of FAQ items fetched from Supabase
 * @param category The target category
 */
export function getFaqsByCategory(
  faqs: FaqItem[],
  category: FaqItem["category"]
): FaqItem[] {
  return faqs.filter((faq) => faq.category === category);
}

/**
 * Searches FAQ items by keyword matching against question text, tags, or answer content.
 * @param faqs List of FAQ items fetched from Supabase
 * @param keyword Search keyword
 */
export function searchFaqs(faqs: FaqItem[], keyword: string): FaqItem[] {
  const query = keyword.toLowerCase().trim();
  if (!query) return faqs;

  return faqs.filter(
    (faq) =>
      faq.questionEn.toLowerCase().includes(query) ||
      faq.questionJp.toLowerCase().includes(query) ||
      faq.answerHtml.toLowerCase().includes(query) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(query))
  );
}