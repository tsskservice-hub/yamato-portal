/**
 * @file content-games.ts
 * @description Supabase app_knowledge (key: 'CONTENT_GAMES') からの動的データ取得モジュール
 * 💡 静的フォールバックデータを撤去し、通信失敗・データ不在時は isError: true を返して PageLayout の DataErrorState で処理します。
 */

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GameItem {
  id: string;
  name: string;
  description: string;
  iconName?: string;
  path: string;
  category?: string;
  actionLabel?: string;
  creditRequirement?: 'textAi' | 'imageAi';
  isComingSoon?: boolean;
  badge?: string;
}

export interface GamesContentSection {
  title: string;
  subtitle?: string;
  games: GameItem[];
}

export interface GamesKnowledge {
  title: string;
  subtitle: string;
  sections: GamesContentSection[];
  rawText?: string;
  updatedAt?: string;
}

const KNOWLEDGE_KEY = 'CONTENT_GAMES';

/**
 * Supabase の app_knowledge テーブルから CONTENT_GAMES キーのデータを直接フェッチする関数
 * 💡 app_knowledge の 'data' カラムからゲーム情報を取得します。
 */
export async function fetchGamesContentData(
  supabase: SupabaseClient
): Promise<GamesKnowledge | null> {
  try {
    const { data: row, error } = await supabase
      .from('app_knowledge')
      .select('data, updated_at')
      .eq('key', KNOWLEDGE_KEY)
      .maybeSingle();

    if (error) {
      console.error('[fetchGamesContentData] Supabase Error:', error);
      return null;
    }

    if (!row || !row.data) {
      console.warn(`[fetchGamesContentData] No data found for key: ${KNOWLEDGE_KEY}`);
      return null;
    }

    const content = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;

    return {
      title: content.title || 'Japanese Learning Games',
      subtitle: content.subtitle || 'Interactive AI-powered games for Japanese practice.',
      sections: content.sections || [],
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[fetchGamesContentData] Unexpected Exception:', err);
    return null;
  }
}

/**
 * games.tsx 用のカスタムフック
 * 💡 失敗時は gamesData: null かつ isError: true を返し、PageLayout 統合型 DataErrorState に引き継ぎます。
 */
export function useGamesContent(supabase: SupabaseClient) {
  const [gamesData, setGamesData] = useState<GamesKnowledge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const data = await fetchGamesContentData(supabase);
      if (data && data.sections && data.sections.length > 0) {
        setGamesData(data);
      } else {
        setGamesData(null);
        setIsError(true);
        setErrorMessage('Failed to retrieve CONTENT_GAMES from Supabase. Data does not exist or the key is invalid.');
      }
    } catch (err: any) {
      setGamesData(null);
      setIsError(true);
      setErrorMessage(`Supabase connection error: ${err?.message || 'An unexpected error occurred while loading CONTENT_GAMES.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    gamesData,
    isLoading,
    isError,
    errorMessage,
    refetch: loadData,
  };
}