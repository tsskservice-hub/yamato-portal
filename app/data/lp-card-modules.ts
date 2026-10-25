/**
 * @file lp-card-modules.ts
 * @description ポータルページのセクション別モジュールカードデータ定義
 */
export interface ModuleItem {
  id: string;
  title: string;
  description: string;
  category: 'global' | 'speaking' | 'writing';
  iconName: 'Gamepad2' | 'Grid' | 'Mic' | 'FileText' | 'Sparkles';
  badge?: string;
  badgeType?: 'default' | 'comingSoon';
  path?: string;
  requiredCredits?: number;
  isComingSoon: boolean;
  borderHoverColor?: string;
  iconBgColor?: string;
  iconTextColor?: string;
  actionText?: string;
}

export const PORTAL_MODULES: ModuleItem[] = [
  // ==========================================
  // Section 1: Global & General Japanese Learners
  // ==========================================
  {
    id: 'igo-game',
    title: 'Go (Igo) Mini Game',
    description: 'Traditional Japanese board game mini-app with AI play modes to relax and build strategic thinking.',
    category: 'global',
    iconName: 'Gamepad2',
    badge: 'Mini Game',
    badgeType: 'default',
    path: '/game-igo',
    isComingSoon: false,
    borderHoverColor: 'hover:border-blue-500/50',
    iconBgColor: 'bg-blue-500/10',
    iconTextColor: 'text-blue-600',
    actionText: 'Play Game',
  },
  {
    id: 'genkoyoshi-editor-general',
    title: 'Genkoyoshi Editor (General)',
    description: 'Digital manuscript paper editor with image/text AI layout analysis (Req max 4 credits).',
    category: 'global',
    iconName: 'Grid',
    badge: 'Coming Soon',
    badgeType: 'comingSoon',
    isComingSoon: true,
    borderHoverColor: '',
    iconBgColor: 'bg-blue-500/10',
    iconTextColor: 'text-blue-600',
    actionText: 'Coming Soon',
  },

  // ==========================================
  // Section 2: VCE Speaking Modules
  // ==========================================
  {
    id: 'eoy-oral-drill',
    title: 'EOY Oral Drill',
    description: 'Targeted practice drills focusing on conversational fluidity and pronunciation for VCE oral exams.',
    category: 'speaking',
    iconName: 'Mic',
    badge: 'Coming Soon',
    badgeType: 'comingSoon',
    isComingSoon: true,
    borderHoverColor: '',
    iconBgColor: 'bg-blue-500/10',
    iconTextColor: 'text-blue-600',
    actionText: 'Coming Soon',
  },
  {
    id: 'eoy-oral-elaboration',
    title: 'EOY Oral Elaboration',
    description: 'Deep-dive elaboration strategies and AI-assisted vocabulary building for Section 2 Detailed Study.',
    category: 'speaking',
    iconName: 'Mic',
    badge: 'Coming Soon',
    badgeType: 'comingSoon',
    isComingSoon: true,
    borderHoverColor: '',
    iconBgColor: 'bg-indigo-500/10',
    iconTextColor: 'text-indigo-600',
    actionText: 'Coming Soon',
  },
  {
    id: 'eoy-oral-mock-exam',
    title: 'EOY Oral Mock Exam',
    description: 'Full-length simulated VCE oral exam environment with real-time AI examiner evaluation and scoring.',
    category: 'speaking',
    iconName: 'Mic',
    badge: 'Coming Soon',
    badgeType: 'comingSoon',
    isComingSoon: true,
    borderHoverColor: '',
    iconBgColor: 'bg-purple-500/10',
    iconTextColor: 'text-purple-600',
    actionText: 'Coming Soon',
  },
  {
    id: 'oral-exam-questions',
    title: 'Oral Exam Questions',
    description: 'Curated database of official and practice VCE oral examination questions with audio samples.',
    category: 'speaking',
    iconName: 'FileText',
    badge: 'Coming Soon',
    badgeType: 'comingSoon',
    isComingSoon: true,
    borderHoverColor: '',
    iconBgColor: 'bg-blue-500/10',
    iconTextColor: 'text-blue-600',
    actionText: 'Coming Soon',
  },

  // ==========================================
  // Section 2: VCE Writing Modules
  // ==========================================
  {
    id: 'genkoyoshi-editor-vce',
    title: 'Genkoyoshi Editor (VCE)',
    description: 'Specialized VCE manuscript editor with strict criteria check and image/text AI essay advisor (Req max 4 credits).',
    category: 'writing',
    iconName: 'Grid',
    badge: 'VCE AI Tool',
    badgeType: 'default',
    path: '/genkoyoshi-editor-vce',
    isComingSoon: false,
    borderHoverColor: 'hover:border-red-500/50',
    iconBgColor: 'bg-red-500/10',
    iconTextColor: 'text-red-600',
    actionText: 'Open VCE Editor',
  },
  {
    id: 'kanji-grammar-checker',
    title: 'VCE Kanji & Grammar Checker',
    description: 'Instantly verify unique VCE kanji and grammar patterns in your handwritten essay transcripts.',
    category: 'writing',
    iconName: 'Sparkles',
    badge: 'VCE Tool',
    badgeType: 'default',
    path: '/kanji-grammar-checker',
    isComingSoon: false,
    borderHoverColor: 'hover:border-red-500/50',
    iconBgColor: 'bg-amber-500/10',
    iconTextColor: 'text-amber-600',
    actionText: 'Open Checker',
  },
  {
    id: 'eoy-writing',
    title: 'EOY Writing Exam Tutor',
    description: 'Comprehensive writing exam practice suite featuring 110 original prompts and structured feedback (Req max 2 credits).',
    category: 'writing',
    iconName: 'FileText',
    badge: 'VCE AI Tool',
    badgeType: 'default',
    path: '/eoy-writing',
    isComingSoon: false,
    borderHoverColor: 'hover:border-red-500/50',
    iconBgColor: 'bg-red-500/10',
    iconTextColor: 'text-red-600',
    actionText: 'Open Writing Tutor',
  },
  {
    id: 'eoy-writing-custom',
    title: 'Custom Writing Practice (External / Past Exams)',
    description: 'Upload any custom past exam paper, textbook prompt, or external questions along with your answer for instant AI feedback (Zero Data Stored).',
    category: 'writing',
    iconName: 'Sparkles',
    badge: 'Custom AI Tool',
    badgeType: 'default',
    path: '/eoy-writing-custom',
    isComingSoon: false,
    borderHoverColor: 'hover:border-indigo-500/50',
    iconBgColor: 'bg-indigo-500/10',
    iconTextColor: 'text-indigo-600',
    actionText: 'Open Custom Practice',
  },
  {
    id: 'section2b-writing',
    title: 'Section 2 Part B Writing (Reading-based)',
    description: 'Practice reading Japanese source texts and crafting precise 300-character responses with AI source-alignment checks.',
    category: 'writing',
    iconName: 'FileText',
    badge: 'Coming Soon',
    badgeType: 'comingSoon',
    isComingSoon: true,
    borderHoverColor: '',
    iconBgColor: 'bg-blue-500/10',
    iconTextColor: 'text-blue-600',
    actionText: 'Coming Soon',
  },
];