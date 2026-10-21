/**
 * @file portal-content.ts
 * @description JP Tutor AI Yamato ポータルの全体仕様・LPコンテンツ・機能およびモジュール設定データ
 */

export const PORTAL_CONTENT = {
  // 1. ヘッダーナビゲーションメニュー
  header: {
    brandName: "JP Tutor AI YAMATO",
    navLinks: [
      { label: "Pricing", targetId: "pricing" },
      { label: "FAQ", path: "/faq" },
      { label: "My Account", path: "/account" },
    ],
    userActions: {
      signin: "Sign In",
      signout: "Sign Out",
      displayCreditsLabel: "Credits",
    }
  },

  // 2. ヒーローセクション（トップのメイン訴求）
  hero: {
    badge: "Decades of Expertise in Japanese Language Education",
    title: "Japanese Tutor AI Yamato",
    subtitle: "Your Gateway to Japanese Mastery",
    description: "Backed by decades of expert classroom teaching, now available to learners worldwide. Experience precision AI-driven Japanese tutoring tailored to your unique goals.",
  },

  // 3. デイリーチャレンジ（Daily Quiz）バナー仕様
  dailyChallengeBanner: {
    badge: "DAILY CHALLENGE",
    reward: "+2 Credits",
    title: "Today's Japanese & Culture Quiz",
    rules: {
      frequency: "Available once per day",
      cost: "Free (0 credits)",
      expiration: "Earned credits expire in 7 days",
      unauthenticatedText: "Sign in to take today's quiz and earn 2 free credits! ✨",
      completedText: "You've already completed today's quiz! Come back tomorrow for more ✨",
      defaultText: "Answer correctly to earn 2 credits! (Available once per day)",
    }
  },

  // 4. AI Yamato オートデモ＆チャットガイドセクション
  aiDemoWidget: {
    title: "Japanese Tutor AI Yamato (Auto Demo)",
    badge: "Live Demo",
    learningPaceOptions: ["steady", "normal", "accelerated"],
    chatRequirementNotice: "(Requires login & 2 credits for text chat)",
    welcomeBonusNotice: "Answer today's Daily Quiz to earn 2 credits, or sign up now to receive 10 welcome credits!",
    ctaButtons: {
      chatWithYamato: "Chat with Yamato",
      freeSignUp: "Free Sign Up",
      viewGuide: "Guide",
    }
  },

  // 5. ポータルページ＆モジュール一覧（セクション1 & セクション2）
  modulesSection: {
    header: {
      title: "Portal Pages & Modules",
      subtitle: "Direct access to all specialized exam prep modules, tools, and learning spaces.",
    },

    // セクション1: グローバル・一般学習者向け
    section1: {
      id: "general",
      title: "Section 1: Global & General Japanese Learners",
      emoji: "🌍",
      modules: [
        {
          id: "genkoyoshi-general",
          name: "Genkoyoshi Editor (General)",
          description: "Digital manuscript paper editor with image/text AI layout analysis (Req max 4 credits).",
          category: "AI Tool",
          path: "/genkoyoshi-editor-general",
          isComingSoon: false,
        },
        {
          id: "igo-game",
          name: "Go (Igo) Mini Game",
          description: "Traditional Japanese board game mini-app with AI play modes to relax and build strategic thinking.",
          category: "Mini Game",
          path: null,
          isComingSoon: true,
        }
      ]
    },

    // セクション2: オーストラリア・VCE（Victorian Curriculum）向け
    section2: {
      id: "vce",
      title: "Section 2: Victorian Curriculum & VCE Students (Australia)",
      emoji: "🇦🇺🐨🦘",
      modules: [
        {
          id: "genkoyoshi-vce",
          name: "Genkoyoshi Editor (VCE)",
          description: "Specialized VCE manuscript editor with strict criteria check and image/text AI essay advisor (Req max 4 credits).",
          category: "VCE AI Tool",
          path: "/genkoyoshi-editor-vce",
          isComingSoon: false,
        },
        {
          id: "kanji-grammar-checker",
          name: "VCE Kanji & Grammar Checker",
          description: "Instantly verify unique VCE kanji and grammar patterns in your handwritten essay transcripts.",
          category: "VCE Tool",
          path: "/kanji-grammar-checker",
          isComingSoon: false,
        },
        {
          id: "eoy-oral-drill",
          name: "EOY Oral Drill",
          description: "Targeted practice drills focusing on conversational fluidity and pronunciation for VCE oral exams.",
          category: "Module",
          path: null,
          isComingSoon: true,
        },
        {
          id: "eoy-oral-elaboration",
          name: "EOY Oral Elaboration",
          description: "Deep-dive elaboration strategies and AI-assisted vocabulary building for Section 2 Detailed Study.",
          category: "Module",
          path: null,
          isComingSoon: true,
        },
        {
          id: "eoy-oral-mock",
          name: "EOY Oral Mock Exam",
          description: "Full-length simulated VCE oral exam environment with real-time AI examiner evaluation and scoring.",
          category: "Module",
          path: null,
          isComingSoon: true,
        },
        {
          id: "eoy-writing",
          name: "EOY Writing Exam Tutor",
          description: "Comprehensive writing exam practice suite featuring 110 original prompts and structured feedback (Req max 2 credits).",
          category: "VCE AI Tool",
          path: "/eoy-writing",
          isComingSoon: false,
        },
        {
          id: "eoy-writing-custom",
          name: "Custom Writing Practice (External / Past Exams)",
          description: "Upload any custom past exam paper, textbook prompt, or external questions along with your answer for instant AI feedback (Zero Data Stored).",
          category: "Custom AI Tool",
          path: "/eoy-writing-custom",
          isComingSoon: false,
        },
        {
          id: "oral-exam-questions",
          name: "Oral Exam Questions",
          description: "Curated database of official and practice VCE oral examination questions with audio samples.",
          category: "Reference",
          path: null,
          isComingSoon: true,
        }
      ]
    }
  },

  // 6. フッター情報
  footer: {
    copyright: "© 2026 AI Yamato. All rights reserved.",
    links: [
      { label: "Report Bug & Photo", action: "reportBug" },
      { label: "Quick Feedback", action: "quickFeedback" },
      { label: "Terms of Service", path: "/terms" },
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Disclaimer", path: "/disclaimer" },
      { label: "Contact", path: "/contact" },
    ]
  },

  // 7. グローバル機能・仕様の補足データ
  systemRules: {
    welcomeBonusCredits: 10,
    textChatCost: 2,
    socraticGuidanceEnforced: true, // 直接的な解答やエッセイの代筆（スプーンフィーディング）を禁止する方針
  }
};