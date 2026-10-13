/**
 * @file legal-content.ts
 * @description AI Yamato Portal の利用規約・免責事項・プライバシーポリシー・お問い合わせの公式テキストデータ（一元管理用）
 */

export const LEGAL_CONTENT = {
  terms: {
    title: "Terms of Service",
    lastUpdated: "October 12, 2026",
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
        content: "Our Service utilizes WebAuthn Passkeys for secure authentication. Users are responsible for account security, and users under the age of majority should use the Service with parent/guardian or school supervision."
      },
      {
        heading: "4. Credits, Payments, and Refunds",
        content: "Credits are required for certain AI interactions and can be obtained via daily login rewards, promotional grants, or purchasing credit packs. All purchases of digital credits are final except where required by local consumer protection laws."
      },
      {
        heading: "5. Acceptable Use Policy",
        content: "Users must not use the Service for unlawful purposes, attempt to reverse engineer or hack infrastructure, bypass credit tracking, or upload malicious code."
      },
      {
        heading: "6. Intellectual Property",
        content: "All software, curriculum mappings, prompts, and visual assets are intellectual property of AI Yamato, granted under a limited personal educational license."
      },
      {
        heading: "7. Limitation of Liability",
        content: "The Service is provided 'as is' as an educational learning aid and does not guarantee specific academic exam scores or VCE outcomes."
      }
    ]
  },
  disclaimer: {
    title: "Disclaimer",
    lastUpdated: "October 12, 2026",
    summary: "Educational use limitations, AI output disclaimers, VCE preparation scope, and service availability guidelines for AI Yamato.",
    sections: [
      {
        heading: "1. General Educational Purpose",
        content: "Designed exclusively as an educational learning aid to support secondary school students, including VCE Japanese learners in Victoria, Australia."
      },
      {
        heading: "2. No Guarantee of Exam Results",
        content: "AI Yamato does not guarantee specific academic results, study scores, ATAR contributions, or VCE exam outcomes. Performance depends on individual effort and formal school instruction."
      },
      {
        heading: "3. AI-Generated Content and Accuracy",
        content: "AI models can occasionally produce errors or misinterpretations. Students are solely responsible for verifying the accuracy of AI feedback before school submissions."
      },
      {
        heading: "4. Service Availability",
        content: "We maintain high availability via Cloudflare and Supabase but do not warrant uninterrupted service or immunity from maintenance downtime."
      }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "October 12, 2026",
    summary: "How AI Yamato handles user data, Supabase secure database storage, third-party payments, and Passkey biometric security.",
    sections: [
      {
        heading: "1. Information We Collect",
        content: "We collect Passkey authentication credentials, learning activity (essay drafts, oral transcripts, quiz results), transaction tokens via secure payment gateways, and usage/device data."
      },
      {
        heading: "2. How We Use Your Information",
        content: "To manage secure accounts, deliver AI essay corrections and curriculum tutoring, track credit balances, and improve platform security."
      },
      {
        heading: "3. Data Storage and Security",
        content: "Backend database and authentication are hosted securely using Supabase with encrypted connections and Row Level Security (RLS). Web applications run on Cloudflare."
      },
      {
        heading: "4. Disclosure of Information",
        content: "We do not sell personal identification information. Data is only shared with trusted service providers (e.g., Stripe, AI model providers) under strict confidentiality."
      }
    ]
  },
  contact: {
    title: "Contact Us",
    lastUpdated: "October 12, 2026",
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
        content: "Have questions about AI Yamato, need technical support, or interested in a School License for your classroom? Reach out via the form or contact our team directly at support@jptutoraiyamato.com."
      }
    ]
  }
};