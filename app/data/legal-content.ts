/**
 * @file legal-content.ts
 * @description Type definitions and helper functions for AI Yamato Portal legal documents, terms, privacy, and contact information.
 */

export interface LegalListItem {
  strong?: string;
  text?: string;
}

export interface LegalSection {
  heading?: string;
  content?: string;
  globalContent?: string;
  vceContent?: string;
  vceNote?: string;
  listItems?: LegalListItem[];
  isContactLink?: boolean;
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  summary: string;
  sections: LegalSection[];
  directEmail?: string;
  inquiryTypes?: string[];
}

export interface LegalContent {
  terms: LegalDocument;
  disclaimer: LegalDocument;
  privacy: LegalDocument;
  contact: LegalDocument;
}

/**
 * Retrieves a specific legal document (e.g., terms, disclaimer, privacy, contact) from Supabase-fetched legal content.
 * @param content The full LegalContent object retrieved from Supabase
 * @param docKey The document key
 */
export function getLegalDocument(
  content: LegalContent,
  docKey: keyof LegalContent
): LegalDocument {
  return content[docKey];
}

/**
 * Searches across all legal sections for a given keyword.
 * @param content The full LegalContent object retrieved from Supabase
 * @param keyword Search keyword
 */
export function searchLegalContent(
  content: LegalContent,
  keyword: string
): { docKey: keyof LegalContent; section: LegalSection }[] {
  const query = keyword.toLowerCase().trim();
  if (!query) return [];

  const results: { docKey: keyof LegalContent; section: LegalSection }[] = [];
  const docKeys: (keyof LegalContent)[] = ["terms", "disclaimer", "privacy", "contact"];

  for (const docKey of docKeys) {
    const doc = content[docKey];
    for (const section of doc.sections) {
      const matchHeading = section.heading?.toLowerCase().includes(query) ?? false;
      const matchContent = section.content?.toLowerCase().includes(query) ?? false;
      const matchGlobal = section.globalContent?.toLowerCase().includes(query) ?? false;
      const matchVce = section.vceContent?.toLowerCase().includes(query) ?? false;
      
      const matchLists = section.listItems?.some(
        (item) =>
          (item.strong?.toLowerCase().includes(query) ?? false) ||
          (item.text?.toLowerCase().includes(query) ?? false)
      ) ?? false;

      if (matchHeading || matchContent || matchGlobal || matchVce || matchLists) {
        results.push({ docKey, section });
      }
    }
  }

  return results;
}