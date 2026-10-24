/**
 * @file legal-content.ts
 * @description Decoupled TypeScript logic & Supabase client integration for AI Yamato Portal legal documents.
 * Stores data in Supabase 'app_knowledge' table under key: 'LEGAL_CONTENTS'.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// --- Type Definitions ---
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

// 💡 contact.tsx 等の静的メタデータ(meta関数)およびフォールバック用のエクスポート
export const LEGAL_CONTENT: LegalContent = {
  terms: {
    title: "Terms of Service",
    lastUpdated: "October 19, 2026",
    summary: "AI Yamato terms governing educational use of AI Japanese tutoring, passkey authentication, credit-based interactions, and user responsibilities.",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        content: "By accessing or using our website, web application, and related Japanese language learning services (collectively, the 'Service'), you agree to be bound by these Terms of Service."
      },
      {
        heading: "2. Description of Service",
        content: "AI Yamato is an AI-powered educational platform designed to assist learners with Japanese language writing, oral practice, grammar checking, and vocabulary acquisition under a credit-based system."
      },
      {
        heading: "3. User Accounts and Passkey Authentication",
        content: "Our Service utilizes WebAuthn Passkeys for secure authentication. You are responsible for maintaining the security of your device and passkey credentials."
      },
      {
        heading: "4. Credits, Payments, and Refunds",
        content: "Credits are required for certain AI interactions and can be obtained via daily login rewards, promotional grants, or purchasing credit packs. All purchases of digital credits are final except where required by applicable consumer protection laws."
      },
      {
        heading: "5. Acceptable Use Policy",
        content: "Users must not use the Service for unlawful purposes, attempt to reverse engineer or hack infrastructure, bypass credit tracking, or upload malicious code."
      },
      {
        heading: "6. Intellectual Property",
        content: "All software, curriculum mappings, original prompts, visual assets, and text content provided through AI Yamato are the intellectual property of AI Yamato, granted under a limited personal educational license."
      },
      {
        heading: "7. Limitation of Liability and Disclaimer",
        content: "The Service is provided on an 'as is' basis as an educational learning aid and does not guarantee specific academic exam scores or VCE outcomes."
      },
      {
        heading: "8. Changes to Terms",
        content: "We reserve the right to modify these Terms at any time. Your continued use of the Service after any changes constitutes acceptance of the new Terms."
      },
      {
        heading: "9. Contact Information",
        isContactLink: true
      }
    ]
  },
  disclaimer: {
    title: "Disclaimer",
    lastUpdated: "October 19, 2026",
    summary: "Educational use limitations, AI output disclaimers, custom prompt/past exam handling, PDF export guidelines, and service availability for AI Yamato.",
    sections: [
      {
        heading: "1. General Educational Purpose",
        content: "The AI Yamato platform is designed exclusively as an educational learning aid to support a global community of learners in practicing and improving their Japanese language skills."
      },
      {
        heading: "2. No Guarantee of Exam Results or Academic Scores",
        globalContent: "While we strive to provide high-quality tutoring logic and comprehensive practice tools, AI Yamato does not guarantee specific academic results, test scores (JLPT or school exams), or certification outcomes.",
        vceContent: "While we strive to align our curriculum with Victorian Curriculum standards and VCE assessment frameworks, AI Yamato does not guarantee specific VCE study scores, ATAR contributions, or exam outcomes.",
        vceNote: "For VCE students in Victoria, Australia, ultimate academic results depend on formal school assessments and official VCAA guidelines."
      },
      {
        heading: "3. Custom Practice & External Past Exam Materials",
        content: "External prompts and past exam questions inputted into the custom practice workspace are used solely for personal study and formative feedback."
      },
      {
        heading: "4. PDF Feedback Export & Private Study Scope",
        content: "Features allowing users to export AI feedback reports as PDF files are provided strictly for private study and personal review."
      },
      {
        heading: "5. AI-Generated Content and Accuracy",
        content: "AI models can occasionally produce errors or unnatural phrasing. Users are solely responsible for verifying the accuracy of AI feedback before school submissions."
      },
      {
        heading: "6. Service Availability and Technical Interruption",
        content: "We maintain high availability via Cloudflare and Supabase but do not warrant uninterrupted service or immunity from maintenance downtime."
      },
      {
        heading: "7. Credits, Campaigns, and Promotional Terms",
        content: "Promotional credits are subject to specific validity terms and will automatically expire upon the conclusion of stated periods."
      },
      {
        heading: "8. External Links and Third-Party Services",
        content: "The Service may contain links to third-party services (e.g. Stripe). We assume no responsibility for third-party practices."
      },
      {
        heading: "9. Contact Information",
        isContactLink: true
      }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "October 19, 2026",
    summary: "How AI Yamato handles user data, Supabase secure database storage, third-party payments, and Passkey biometric security.",
    sections: [
      {
        heading: "1. Introduction",
        content: "AI Yamato is committed to protecting your privacy. This policy explains how we collect and safeguard your information."
      },
      {
        heading: "2. Information We Collect",
        content: "We collect public key credentials for WebAuthn passkeys, learning content (drafts, transcripts, quiz results), and usage logs."
      },
      {
        heading: "3. How We Use Your Information",
        content: "Information is used to authenticate passkeys, deliver AI tutoring feedback, and manage your credit balance."
      },
      {
        heading: "4. Data Storage and Security (Supabase & Cloudflare)",
        content: "Data is stored securely in Supabase with encryption and Row Level Security (RLS) under Cloudflare infrastructure."
      },
      {
        heading: "5. Disclosure of Your Information",
        content: "We do not sell personal data. Information is only shared with trusted service providers under confidentiality agreements."
      },
      {
        heading: "6. Your Privacy Rights & Choices",
        content: "You may request account deletion and learning data export at any time by contacting our support team."
      },
      {
        heading: "7. Changes to This Privacy Policy",
        content: "We may update this policy periodically. Revisions will be reflected with an updated date."
      },
      {
        heading: "8. Contact Us",
        isContactLink: true
      }
    ]
  },
  contact: {
    title: "Contact Us",
    lastUpdated: "October 19, 2026",
    summary: "Support channels, feedback options, and School License inquiries for teachers and students using AI Yamato.",
    directEmail: "support@jptutoraiyamato.com",
    inquiryTypes: [
      "General Support / Question",
      "Technical Issue (Passkey, Credits, Payments)",
      "School License / Teacher Inquiry",
      "Feedback & Suggestions"
    ],
    sections: [
      {
        heading: "Support & School Licenses",
        content: "Have questions about AI Yamato, need technical support, or interested in a School License for your classroom? Reach out via the form below or contact our team directly at support@jptutoraiyamato.com."
      }
    ]
  }
};

export default LEGAL_CONTENT;

// 💡 Supabase app_knowledge の key
const KNOWLEDGE_KEY = 'LEGAL_CONTENTS';

/**
 * Fetch Legal Content data from Supabase 'app_knowledge' table.
 */
export async function fetchLegalContentData(supabaseClient: SupabaseClient): Promise<LegalContent> {
  try {
    const { data: row, error } = await supabaseClient
      .from('app_knowledge')
      .select('*')
      .eq('key', KNOWLEDGE_KEY)
      .single();

    if (error || !row) {
      console.warn(`[${KNOWLEDGE_KEY}] Supabase fetch failed, returning fallback:`, error?.message);
      return LEGAL_CONTENT;
    }

    const result = (row.data || row.content_json) as LegalContent;
    if (result && typeof result === 'object' && Object.keys(result).length > 0) {
      return {
        terms: result.terms || LEGAL_CONTENT.terms,
        disclaimer: result.disclaimer || LEGAL_CONTENT.disclaimer,
        privacy: result.privacy || LEGAL_CONTENT.privacy,
        contact: result.contact || LEGAL_CONTENT.contact,
      };
    }

    return LEGAL_CONTENT;
  } catch (err) {
    console.error(`Error fetching ${KNOWLEDGE_KEY} from Supabase:`, err);
    return LEGAL_CONTENT;
  }
}

/**
 * Upsert Legal Content data to Supabase 'app_knowledge' table.
 */
export async function upsertLegalContentData(
  supabaseClient: SupabaseClient,
  content: LegalContent,
  category = 'Legal & Compliance'
): Promise<boolean> {
  const { error } = await supabaseClient
    .from('app_knowledge')
    .upsert({
      key: KNOWLEDGE_KEY,
      title: 'AI Yamato Legal Documents',
      category,
      data: content,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (error) {
    console.error(`Error upserting ${KNOWLEDGE_KEY} to Supabase:`, error);
    return false;
  }
  return true;
}

export function getLegalDocument(content: LegalContent, docKey: keyof LegalContent): LegalDocument {
  return content[docKey] || LEGAL_CONTENT[docKey];
}