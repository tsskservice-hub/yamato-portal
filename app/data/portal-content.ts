/**
 * @file portal-content.ts
 * @description JP Tutor AI Yamato ポータル全体仕様・モジュールマスターデータの取得＆エラーハンドリング
 */
import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

// =================================================================
// 1. 型定義 (Type Definitions)
// =================================================================

export interface PortalNavAction {
  signin: string;
  signout: string;
  displayCreditsLabel: string;
}

export interface PortalHeader {
  brandName: string;
  navLinks: Array<{ label: string; path?: string; targetId?: string }>;
  userActions: PortalNavAction;
}

export interface PortalHero {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
}

export interface DailyChallengeBanner {
  badge: string;
  reward: string;
  title: string;
  unauthenticatedText: string;
  completedText: string;
  defaultText: string;
  unauthenticatedBtnText: string;
  completedBtnText: string;
  defaultBtnText: string;
  rules: {
    frequency: string;
    cost: string;
    expirationDays: number;
  };
}

export interface DailyQuizModalText {
  badge: string;
  title: string;
  completedMessage: string;
  correctMessage: string;
  incorrectMessage: string;
  closeBtnText: string;
}

export interface AiDemoWidget {
  title: string;
  badge: string;
  learningPaceLabel: string;
  defaultPace: string;
  startingNotice: string;
  thinkingNotice: string;
  inputPlaceholder: string;
  chatNotice: string;
  guideLinkText: string;
  subNotice: string;
  chatWithYamatoBtn: string;
  freeSignUpBtn: string;
  chatWidgetAlert: string;
  demoConversations: Array<{ user: string; yamato: string }>;
}

export interface PortalModule {
  id: string;
  name: string;
  description: string;
  category: string;
  path: string;
  isComingSoon: boolean;
  iconName: string;
  accentColor: string;
  actionLabel: string;
  creditRequirement: 'textAi' | 'imageAi' | null;
}

export interface PortalSection {
  id: string;
  title: string;
  emoji: string;
  modules: PortalModule[];
}

export interface PortalModulesSection {
  header: {
    title: string;
    subtitle: string;
  };
  section1: PortalSection;
  section2: PortalSection;
}

export interface PortalFooter {
  copyright: string;
  links: Array<{ label: string; path?: string; action?: string }>;
}

export interface PortalContentData {
  header: PortalHeader;
  hero: PortalHero;
  dailyChallengeBanner: DailyChallengeBanner;
  dailyQuizModal: DailyQuizModalText;
  aiDemoWidget: AiDemoWidget;
  modulesSection: PortalModulesSection;
  footer: PortalFooter;
  systemRules: {
    welcomeBonusCredits: number;
    dailyQuizCredits: number;
    dailyQuizExpirationDays: number;
    maxPhotosAllowed: number;
  };
}

export interface PortalContentResult {
  data: PortalContentData | null;
  isError: boolean;
  errorMessage?: string;
}

// =================================================================
// 2. デフォルトマスターデータ定数 (HeroDemoChat, DailyQuizModal への export)
// =================================================================

export const PORTAL_CONTENT: PortalContentData = {
  header: {
    brandName: "JP Tutor AI YAMATO",
    navLinks: [
      { label: "Pricing", targetId: "pricing" },
      { label: "FAQ", path: "/faq" },
      { label: "My Account", path: "/my-account" }
    ],
    userActions: {
      signin: "Sign In",
      signout: "Sign Out",
      displayCreditsLabel: "Credits"
    }
  },
  hero: {
    badge: "Decades of Expertise in Japanese Language Education",
    title: "Japanese Tutor AI Yamato",
    subtitle: "Your Gateway to Japanese Mastery",
    description: "Backed by decades of expert classroom teaching, now available to learners worldwide. Experience precision AI-driven Japanese tutoring tailored to your unique goals."
  },
  dailyChallengeBanner: {
    badge: "Daily Challenge",
    reward: "+2 Credits",
    title: "Today's Japanese & Culture Quiz",
    unauthenticatedText: "Sign in to take today's quiz and earn 2 free credits! ✨",
    completedText: "You've already completed today's quiz! Come back tomorrow for more ✨",
    defaultText: "Answer correctly to earn 2 credits! (Available once per day)",
    unauthenticatedBtnText: "Sign In to Play Quiz",
    completedBtnText: "View Quiz Results & Explanation",
    defaultBtnText: "Take Today's Quiz",
    rules: {
      frequency: "Available once per day",
      cost: "Free (0 credits)",
      expirationDays: 7
    }
  },
  dailyQuizModal: {
    badge: "Daily Challenge (+2 Credits)",
    title: "Today's Japanese & Culture Quiz",
    completedMessage: "✨ You have already completed today's quiz! (Credits earned: +2)",
    correctMessage: "🎉 Correct! You earned 2 credits!",
    incorrectMessage: "💪 Incorrect! Try again tomorrow!",
    closeBtnText: "Close"
  },
  aiDemoWidget: {
    title: "Japanese Tutor AI Yamato (Auto Demo)",
    badge: "● Live Demo",
    learningPaceLabel: "Learning Pace (Demo)",
    defaultPace: "normal",
    startingNotice: "AI Yamato demo is starting...",
    thinkingNotice: "Yamato is thinking...",
    inputPlaceholder: "Ask Yamato a question...",
    chatNotice: "Want to chat with Yamato-sensei? (Requires login & 2 credits for text chat)",
    guideLinkText: "Guide",
    subNotice: "Answer today's Daily Quiz to earn 2 credits, or sign up now to receive 10 welcome credits!",
    chatWithYamatoBtn: "Chat with Yamato",
    freeSignUpBtn: "Free Sign Up",
    chatWidgetAlert: "You can chat directly with Yamato-sensei using the chat widget in the bottom right corner!",
    demoConversations: [
      {
        user: "How do I practice Japanese writing?",
        yamato: "Hello!🌸 You can use our EOY Writing Exam Tutor with 110 original prompts, Genkoyoshi layout tools, and instant AI feedback."
      },
      {
        user: "Can I practice oral conversations here?",
        yamato: "Yes! Our EOY Oral Mock Exam module provides realistic voice interaction and real-time AI examiner scoring."
      },
      {
        user: "How do credits work?",
        yamato: "Chats and vocabulary Q&A cost 1-2 credits. You also get daily free credits upon login, or you can top up anytime!"
      }
    ]
  },
  modulesSection: {
    header: {
      title: "Portal Pages & Modules",
      subtitle: "Direct access to all specialized exam prep modules, tools, and learning spaces."
    },
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
          iconName: "Grid",
          accentColor: "blue",
          actionLabel: "Open Editor",
          creditRequirement: "imageAi"
        },
        {
          id: "igo-game",
          name: "Go (Igo) Mini Game",
          description: "Traditional Japanese board game mini-app with AI play modes to relax and build strategic thinking.",
          category: "Mini Game",
          path: "/game-igo",
          isComingSoon: true,
          iconName: "Gamepad2",
          accentColor: "blue",
          actionLabel: "Coming Soon",
          creditRequirement: null
        }
      ]
    },
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
          iconName: "Grid",
          accentColor: "red",
          actionLabel: "Open VCE Editor",
          creditRequirement: "imageAi"
        },
        {
          id: "kanji-grammar-checker",
          name: "VCE Kanji & Grammar Checker",
          description: "Instantly verify unique VCE kanji and grammar patterns in your handwritten essay transcripts.",
          category: "VCE Tool",
          path: "/kanji-grammar-checker",
          isComingSoon: false,
          iconName: "Sparkles",
          accentColor: "amber",
          actionLabel: "Open Checker",
          creditRequirement: null
        },
        {
          id: "eoy-oral-drill",
          name: "EOY Oral Drill",
          description: "Targeted practice drills focusing on conversational fluidity and pronunciation for VCE oral exams.",
          category: "Module",
          path: "/eoy-oral-drill",
          isComingSoon: true,
          iconName: "Mic",
          accentColor: "blue",
          actionLabel: "Coming Soon",
          creditRequirement: null
        },
        {
          id: "eoy-oral-elaboration",
          name: "EOY Oral Elaboration",
          description: "Deep-dive elaboration strategies and AI-assisted vocabulary building for Section 2 Detailed Study.",
          category: "Module",
          path: "/eoy-oral-elaborate",
          isComingSoon: true,
          iconName: "Mic",
          accentColor: "indigo",
          actionLabel: "Coming Soon",
          creditRequirement: null
        },
        {
          id: "eoy-oral-mock",
          name: "EOY Oral Mock Exam",
          description: "Full-length simulated VCE oral exam environment with real-time AI examiner evaluation and scoring.",
          category: "Module",
          path: "/eoy-oral-mock",
          isComingSoon: true,
          iconName: "Mic",
          accentColor: "purple",
          actionLabel: "Coming Soon",
          creditRequirement: null
        },
        {
          id: "eoy-writing",
          name: "EOY Writing Exam Tutor",
          description: "Comprehensive writing exam practice suite featuring 110 original prompts and structured feedback (Req max 2 credits).",
          category: "VCE AI Tool",
          path: "/eoy-writing",
          isComingSoon: false,
          iconName: "FileText",
          accentColor: "red",
          actionLabel: "Open Writing Tutor",
          creditRequirement: "textAi"
        },
        {
          id: "eoy-writing-custom",
          name: "Custom Writing Practice (External / Past Exams)",
          description: "Upload any custom past exam paper, textbook prompt, or external questions along with your answer for instant AI feedback (Zero Data Stored).",
          category: "Custom AI Tool",
          path: "/eoy-writing-custom",
          isComingSoon: false,
          iconName: "Sparkles",
          accentColor: "indigo",
          actionLabel: "Open Custom Practice",
          creditRequirement: "textAi"
        },
        {
          id: "oral-exam-questions",
          name: "Oral Exam Questions",
          description: "Curated database of official and practice VCE oral examination questions with audio samples.",
          category: "Reference",
          path: "/oral-exam-questions",
          isComingSoon: true,
          iconName: "FileText",
          accentColor: "blue",
          actionLabel: "Coming Soon",
          creditRequirement: null
        }
      ]
    }
  },
  footer: {
    copyright: "© 2026 AI Yamato. All rights reserved.",
    links: [
      { label: "Report Bug & Photo", action: "reportBug" },
      { label: "Quick Feedback", action: "quickFeedback" },
      { label: "Terms of Service", path: "/terms" },
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Disclaimer", path: "/disclaimer" },
      { label: "Contact", path: "/contact" }
    ]
  },
  systemRules: {
    welcomeBonusCredits: 10,
    dailyQuizCredits: 2,
    dailyQuizExpirationDays: 7,
    maxPhotosAllowed: 4
  }
};

export default PORTAL_CONTENT;

// =================================================================
// 3. Supabase 動的データ取得関数
// =================================================================

export const PORTAL_KNOWLEDGE_KEY = 'PORTAL_CONTENT';

export async function fetchPortalContentData(supabaseClient: SupabaseClient): Promise<PortalContentResult> {
  try {
    const { data, error } = await supabaseClient
      .from('app_knowledge')
      .select('data')
      .eq('key', PORTAL_KNOWLEDGE_KEY)
      .single();

    if (error) {
      return {
        data: null,
        isError: true,
        errorMessage: `Database query failed: ${error.message}`,
      };
    }

    if (!data?.data) {
      return {
        data: null,
        isError: true,
        errorMessage: `No content found for key '${PORTAL_KNOWLEDGE_KEY}'.`,
      };
    }

    return {
      data: data.data as PortalContentData,
      isError: false,
    };
  } catch (err: any) {
    return {
      data: null,
      isError: true,
      errorMessage: err?.message || 'Network error while fetching portal content.',
    };
  }
}

// =================================================================
// 4. カスタムフック (オンライン自動復帰リスナー付き)
// =================================================================

export function usePortalContent(supabaseClient: SupabaseClient) {
  const [portalContent, setPortalContent] = useState<PortalContentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchPortalContentData(supabaseClient);

    if (result.isError || !result.data) {
      setPortalContent(null);
      setErrorMessage(result.errorMessage || 'Failed to load Portal configuration.');
    } else {
      setPortalContent(result.data);
      setErrorMessage(null);
    }
    setIsLoading(false);
  }, [supabaseClient]);

  useEffect(() => {
    loadData();

    const handleOnline = () => {
      loadData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [loadData]);

  return {
    portalContent,
    isLoading,
    isError: !isLoading && !portalContent,
    errorMessage,
    retry: loadData,
  };
}