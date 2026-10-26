/**
 * @file portal-content.ts
 * @description JP Tutor AI Yamato ポータル全体仕様・モジュールマスターデータの取得＆エラーハンドリング
 * 💡 静的バックアップによる隠蔽を完全撤廃。
 * 取得失敗時は DataErrorState.tsx を全面に表示し、Resend 経由で開発者へエラー報告を送る仕様 (SSOT)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import DataErrorState from '../components/DataErrorState';

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
  iconName: string;          // Lucide アイコン名 (Grid, Sparkles, Mic, FileText, Gamepad2 等)
  accentColor: string;       // テーマカラー (blue, red, amber, indigo, purple 等)
  actionLabel: string;       // ボタン表示名
  creditRequirement: 'textAi' | 'imageAi' | null; // 利用時の必要クレジット判定キー
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

/**
 * 取得結果の型
 * 💡 静的バックアップによる隠蔽を行わないため、取得失敗時は data が null になります。
 */
export interface PortalContentResult {
  data: PortalContentData | null;
  isError: boolean;
  errorMessage?: string;
}

// =================================================================
// 2. Supabase 動的データ取得関数 (No Silent Fallback)
// =================================================================

export const PORTAL_KNOWLEDGE_KEY = 'PORTAL_CONTENT';

/**
 * Supabase の app_knowledge テーブルから PORTAL_CONTENT を取得する関数
 * ※ 失敗時に古い静的データでごまかさず、正確にエラー情報を返します。
 */
export async function fetchPortalContentData(supabaseClient: SupabaseClient): Promise<PortalContentResult> {
  try {
    const { data, error } = await supabaseClient
      .from('app_knowledge')
      .select('data')
      .eq('key', PORTAL_KNOWLEDGE_KEY)
      .single();

    if (error) {
      console.error(`[portal-content] Supabase error for key '${PORTAL_KNOWLEDGE_KEY}':`, error);
      return {
        data: null,
        isError: true,
        errorMessage: `Database query failed for '${PORTAL_KNOWLEDGE_KEY}': ${error.message} (Code: ${error.code})`,
      };
    }

    if (!data?.data) {
      console.error(`[portal-content] No content found for key '${PORTAL_KNOWLEDGE_KEY}'`);
      return {
        data: null,
        isError: true,
        errorMessage: `The portal configuration key '${PORTAL_KNOWLEDGE_KEY}' exists in app_knowledge, but contains empty data.`,
      };
    }

    return {
      data: data.data as PortalContentData,
      isError: false,
    };
  } catch (err: any) {
    console.error(`[portal-content] Network/Fetch exception:`, err);
    return {
      data: null,
      isError: true,
      errorMessage: err?.message || 'Network error: Failed to connect to Supabase server.',
    };
  }
}

// =================================================================
// 3. React 用カスタムフック (自動再接続リスナー完備)
// =================================================================

/**
 * 💡 ポータルデータを取得し、通信障害や復旧をリアルタイムに検知するフック
 */
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

    // 💡 ネットワークが復旧（オンライン化）した瞬間に自動で再取得して画面を復帰させる
    const handleOnline = () => {
      console.log('[portal-content] Network restored. Retrying fetch automatically...');
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

// =================================================================
// 4. DataErrorState フォールバックコンポーネント (Resend 連携)
// =================================================================

export interface PortalDataFallbackProps {
  errorMessage?: string;
  onRetry?: () => void;
  supportEmail?: string;
}

/**
 * 💡 データ取得失敗時に画面に全面表示されるフォールバック
 * DataErrorState.tsx を直接呼び出し、ワンクリックで Resend 経由のエラー報告メールを送信させます。
 */
export function PortalDataFallback({
  errorMessage = 'Failed to load Portal configuration from Supabase.',
  onRetry = () => {
    if (typeof window !== 'undefined') window.location.reload();
  },
  supportEmail = 'support@jptutoraiyamato.com',
}: PortalDataFallbackProps) {
  return (
    <DataErrorState
      featureName="Portal Content & Modules Configuration (PORTAL_CONTENT)"
      errorMessage={errorMessage}
      onRetry={onRetry}
      supportEmail={supportEmail}
    />
  );
}

export default fetchPortalContentData;