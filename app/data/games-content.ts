/**
 * @file games-content.ts
 * @description Supabase GAMES_CONTENT キーからの動的データ取得モジュール
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

/**
 * Supabase から GAMES_CONTENT キーのデータを直接フェッチする関数
 * 💡 フォールバックデータは存在せず、取得失敗時は null を返します。
 */
export async function fetchGamesContentData(
  supabase: SupabaseClient
): Promise<GamesKnowledge | null> {
  try {
    const { data, error } = await supabase
      .from('app_knowledge')
      .select('content, raw_text, updated_at')
      .eq('key', 'GAMES_CONTENT')
      .maybeSingle();

    if (error) {
      console.error('[fetchGamesContentData] Supabase Error:', error);
      return null;
    }

    if (!data || !data.content) {
      console.warn('[fetchGamesContentData] No data found for key: GAMES_CONTENT');
      return null;
    }

    const content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;

    return {
      title: content.title || 'Japanese Learning Games',
      subtitle: content.subtitle || 'Interactive AI-powered games for Japanese practice.',
      sections: content.sections || [],
      rawText: data.raw_text,
      updatedAt: data.updated_at,
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
        setErrorMessage('Supabase から GAMES_CONTENT の取得に失敗しました。データが存在しないかキーが無効です。');
      }
    } catch (err: any) {
      setGamesData(null);
      setIsError(true);
      setErrorMessage(`Supabase 接続エラー: ${err?.message || 'GAMES_CONTENT の読み込み中に予期せぬエラーが発生しました。'}`);
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
