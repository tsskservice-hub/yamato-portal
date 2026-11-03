/**
 * @file games-content.ts
 * @description JP Tutor AI Yamato ゲームポータル仕様・マスターデータの取得＆エラーハンドリング
 */
import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

// =================================================================
// 1. 型定義 (Type Definitions)
// =================================================================

export interface GameModule {
  id: string;
  icon: string;
  name: string;
  path: string;
  badge: string;
  category: string;
  description: string;
  isComingSoon?: boolean;
  accentColor?: string;
  actionLabel?: string;
}

export interface GamesHeader {
  title: string;
  subtitle: string;
}

export interface GamesContentData {
  header: GamesHeader;
  games: GameModule[];
}

export interface GamesContentResult {
  data: GamesContentData | null;
  isError: boolean;
  errorMessage?: string;
}

// =================================================================
// 2. デフォルトマスターデータ定数 (games.tsx への export)
// =================================================================

export const GAMES_CONTENT: GamesContentData = {
  games: [
    {
      id: "tunnel-escape",
      icon: "⛏️",
      name: "Shawshank Tunnel Escape",
      path: "/games/tunnel-escape",
      badge: "New",
      category: "Memory & Quiz",
      description: "Memorise the correct sequence of Hiragana and Katakana, answer 4-choice quizzes, and carve your way through the tunnel to freedom.",
      isComingSoon: false,
      accentColor: "emerald",
      actionLabel: "Play Game"
    },
    {
      id: "tower-defense",
      icon: "🎮",
      name: "Kana & Kanji Tower Defense",
      path: "/games/tower-defense",
      badge: "Interactive",
      category: "Typing Action",
      description: "Defeat incoming monsters with Romaji typing! Ideal for solidifying foundational Japanese skills in a gamified environment.",
      isComingSoon: false,
      accentColor: "red",
      actionLabel: "Play Game"
    }
  ],
  header: {
    title: "Japanese Learning Arcade",
    subtitle: "Have fun mastering Hiragana, Katakana, and typing skills through interactive games!"
  }
};

export default GAMES_CONTENT;

// =================================================================
// 3. Supabase 動的データ取得関数
// =================================================================

export const GAMES_KNOWLEDGE_KEY = 'GAMES_CONTENT';

export async function fetchGamesContentData(supabaseClient: SupabaseClient): Promise<GamesContentResult> {
  try {
    const { data, error } = await supabaseClient
      .from('app_knowledge')
      .select('data')
      .eq('key', GAMES_KNOWLEDGE_KEY)
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
        errorMessage: `No content found for key '${GAMES_KNOWLEDGE_KEY}'.`,
      };
    }

    return {
      data: data.data as GamesContentData,
      isError: false,
    };
  } catch (err: any) {
    return {
      data: null,
      isError: true,
      errorMessage: err?.message || 'Network error while fetching games content.',
    };
  }
}

// =================================================================
// 4. カスタムフック (オンライン自動復帰リスナー付き)
// =================================================================

export function useGamesContent(supabaseClient: SupabaseClient) {
  const [gamesContent, setGamesContent] = useState<GamesContentData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchGamesContentData(supabaseClient);

    if (result.isError || !result.data) {
      setGamesContent(null);
      setErrorMessage(result.errorMessage || 'Failed to load Games configuration.');
    } else {
      setGamesContent(result.data);
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
    gamesContent,
    isLoading,
    isError: !isLoading && !gamesContent,
    errorMessage,
    retry: loadData,
  };
}