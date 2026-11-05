/**
 * @file content-other.ts
 * @description Supabase kl_app (key: 'CONTENT_OTHER') からLP全体の設定・メタデータ・ウィジェット情報を動的取得するモジュール
 * 💡 静的フォールバックデータを撤去し、通信失敗・データ不在時は isError: true を返します。
 */

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface HeroConfig {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
}

export interface NavLink {
  label?: string;
  path?: string;
  targetId?: string;
}

export interface HeaderConfig {
  brandName: string;
  navLinks: NavLink[];
  userActions: {
    signin: string;
    signout: string;
    displayCreditsLabel: string;
  };
}

export interface DemoConversation {
  user: string;
  yamato: string;
}

export interface AiDemoWidgetConfig {
  badge: string;
  title: string;
  subNotice: string;
  chatNotice: string;
  defaultPace: string;
  freeSignUpBtn: string;
  guideLinkText: string;
  startingNotice: string;
  thinkingNotice: string;
  chatWidgetAlert: string;
  inputPlaceholder: string;
  chatWithYamatoBtn: string;
  learningPaceLabel: string;
  demoConversations: DemoConversation[];
}

export interface DailyQuizModalConfig {
  badge: string;
  title: string;
  closeBtnText: string;
  correctMessage: string;
  completedMessage: string;
  incorrectMessage: string;
}

export interface DailyChallengeBannerConfig {
  badge: string;
  title: string;
  reward: string;
  rules: {
    cost: string;
    frequency: string;
    expirationDays: number;
  };
  defaultText: string;
  completedText: string;
  defaultBtnText: string;
  completedBtnText: string;
  unauthenticatedText: string;
}

export interface SystemRulesConfig {
  dailyQuizCredits: number;
  maxPhotosAllowed: number;
  welcomeBonusCredits: number;
  dailyQuizExpirationDays: number;
}

export interface FooterLink {
  label?: string;
  action?: string;
  path?: string;
}

export interface FooterConfig {
  copyright: string;
  links: FooterLink[];
}

export interface OtherContentKnowledge {
  hero: HeroConfig;
  header: HeaderConfig;
  aiDemoWidget: AiDemoWidgetConfig;
  dailyQuizModal: DailyQuizModalConfig;
  dailyChallengeBanner: DailyChallengeBannerConfig;
  systemRules: SystemRulesConfig;
  footer: FooterConfig;
  updatedAt?: string;
}

const KNOWLEDGE_KEY = 'CONTENT_OTHER';

/**
 * Supabase の kl_app テーブルから CONTENT_OTHER キーのデータを直接フェッチする関数
 */
export async function fetchOtherContentData(
  supabase: SupabaseClient
): Promise<OtherContentKnowledge | null> {
  try {
    const { data: row, error } = await supabase
      .from('kl_app')
      .select('data, updated_at')
      .eq('key', KNOWLEDGE_KEY)
      .maybeSingle();

    if (error) {
      console.error('[fetchOtherContentData] Supabase Error:', error);
      return null;
    }

    if (!row || !row.data) {
      console.warn(`[fetchOtherContentData] No data found for key: ${KNOWLEDGE_KEY}`);
      return null;
    }

    const content = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;

    return {
      hero: content.hero || {},
      header: content.header || {},
      aiDemoWidget: content.aiDemoWidget || {},
      dailyQuizModal: content.dailyQuizModal || {},
      dailyChallengeBanner: content.dailyChallengeBanner || {},
      systemRules: content.systemRules || {},
      footer: content.footer || {},
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[fetchOtherContentData] Unexpected Exception:', err);
    return null;
  }
}

/**
 * ページ用のカスタムフック
 * 💡 失敗時は otherData: null かつ isError: true を返し、エラーハンドリングに引き継ぎます。
 */
export function useOtherContent(supabase: SupabaseClient) {
  const [otherData, setOtherData] = useState<OtherContentKnowledge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const data = await fetchOtherContentData(supabase);
      if (data && data.hero && data.header) {
        setOtherData(data);
      } else {
        setOtherData(null);
        setIsError(true);
        setErrorMessage('Failed to retrieve CONTENT_OTHER from Supabase. Data does not exist or the key is invalid.');
      }
    } catch (err: any) {
      setOtherData(null);
      setIsError(true);
      setErrorMessage(`Supabase connection error: ${err?.message || 'An unexpected error occurred while loading CONTENT_OTHER.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    otherData,
    isLoading,
    isError,
    errorMessage,
    refetch: loadData,
  };
}