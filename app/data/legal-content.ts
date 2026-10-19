/**
 * @file legal-content.ts
 * @description AI Yamato Portal の利用規約・免責事項・プライバシーポリシー・お問い合わせの公式テキストデータ（全免責事項・PDF・過去問規約完全統合版）
 */

export const LEGAL_CONTENT = {
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
    lastUpdated: "October 19, 2026",
    summary: "Educational use limitations, AI output disclaimers, custom prompt/past exam handling, PDF export guidelines, and service availability for AI Yamato.",
    sections: [
      {
        heading: "1. General Educational Purpose",
        content: "The AI Yamato platform, including all AI-powered writing assistants, oral practice modules, grammar checkers, vocabulary drills, audio generation, and visual diagrams (collectively, the 'Service'), is designed exclusively as an educational learning aid. The Service is intended to support a global community of learners—including middle school students, high school students, and adult learners worldwide—in practicing and improving their Japanese language skills."
      },
      {
        heading: "2. No Guarantee of Exam Results or Academic Scores",
        globalContent: "While we strive to provide high-quality tutoring logic, standard curricula alignment, and comprehensive practice tools, AI Yamato does not guarantee 100% specific academic results, language proficiency test scores (such as JLPT or school exams), or certification outcomes. Learner performance depends heavily on individual effort, consistency, external instruction, and various personal factors beyond our control.",
        vceContent: "While we strive to align our curriculum and tutoring logic with Victorian Curriculum standards and VCE assessment frameworks (such as detailed study and general conversation practice), AI Yamato does not guarantee specific VCE study scores, ATAR contributions, or exam outcomes.",
        vceNote: "For VCE students in Victoria, Australia, ultimate academic results depend on formal school assessments, independent study habits, and official Victorian Curriculum and Assessment Authority (VCAA) guidelines."
      },
      {
        heading: "3. Custom Practice & External Past Exam Materials",
        content: "The custom practice workspace (Custom EOY Writing Practice) allows users to input external questions, textbook prompts, or past exam materials for AI evaluation. Users acknowledge and agree that:",
        listItems: [
          { strong: "Personal Study Scope", text: "External prompts and past exam questions are inputted solely for personal study, formative feedback, and individual skill improvement." },
          { strong: "No Ownership Claim", text: "AI Yamato does not claim ownership of external exam questions or third-party educational content." },
          { strong: "Prohibition of Redistribution", text: "Users are strictly prohibited from publicly redistributing, commercially selling, or sharing copyrighted examination materials or AI-generated feedback reports outside the scope of fair dealing or personal educational use." }
        ]
      },
      {
        heading: "4. PDF Feedback Export & Private Study Scope",
        content: "Features allowing users to export AI feedback reports and session data as PDF files are provided strictly for private study, personal portfolio building, and non-commercial educational review. Users assume full responsibility for complying with applicable copyright laws regarding any third-party source texts or extracts included in their custom prompts or exported reports."
      },
      {
        heading: "5. AI-Generated Content and Accuracy",
        content: "The Service utilizes advanced artificial intelligence models (such as LLMs) to generate feedback, translations, essay corrections, and conversational responses.",
        listItems: [
          { strong: "Potential for Inaccuracies", text: "AI models can occasionally produce errors, misinterpretations, or unnatural phrasing." },
          { strong: "User Responsibility", text: "Users, students, and adult learners are solely responsible for verifying the accuracy, appropriateness, and academic integrity of any feedback, corrections, or content generated by the AI before submitting work to schools, teachers, or professional institutions." }
        ]
      },
      {
        heading: "6. Service Availability and Technical Interruption",
        content: "We endeavor to maintain high availability of the Service through robust cloud infrastructure (Cloudflare and Supabase). However, we do not warrant that the Service will be uninterrupted, timely, secure, or error-free. We shall not be held liable for any temporary service disruptions, maintenance downtime, third-party API outages, or data loss beyond our reasonable control."
      },
      {
        heading: "7. Credits, Campaigns, and Promotional Terms",
        content: "Any promotional campaigns, daily login bonuses, or complimentary credit grants are subject to specific terms and validity periods (e.g., expiration dates specified during campaign periods). Unused promotional credits will automatically expire upon the conclusion of the stated validity term. We reserve the right to modify or terminate credit promotion rules at any time without prior notice."
      },
      {
        heading: "8. External Links and Third-Party Services",
        content: "The Service may contain links to external websites, payment gateways (e.g., Stripe), or resources not operated by us. We assume no responsibility or liability for the content, privacy policies, or practices of any third-party websites or services."
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
        content: "Have questions about AI Yamato, need technical support, or interested in a School License for your classroom? Reach out via the form or contact our team directly at support@jptutoraiyamato.com."
      }
    ]
  }
};