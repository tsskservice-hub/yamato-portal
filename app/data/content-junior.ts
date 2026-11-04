/**
 * @file content-junior.ts
 * @description Supabase app_knowledge (key: 'CONTENT_JUNIOR') からの動的データ取得モジュール
 */

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalModule } from '~/data/portal-content';

export interface JuniorContentKnowledge {
  modules: PortalModule[];
  updatedAt?: string;
}

const KNOWLEDGE_KEY = 'CONTENT_JUNIOR';

export async function fetchJuniorContentData(
  supabase: SupabaseClient
): Promise<JuniorContentKnowledge | null> {
  try {
    const { data: row, error } = await supabase
      .from('app_knowledge')
      .select('data, updated_at')
      .eq('key', KNOWLEDGE_KEY)
      .maybeSingle();

    if (error) {
      console.error('[fetchJuniorContentData] Supabase Error:', error);
      return null;
    }

    if (!row || !row.data) {
      console.warn(`[fetchJuniorContentData] No data found for key: ${KNOWLEDGE_KEY}`);
      return null;
    }

    const content = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    const modules = Array.isArray(content) ? content : (content.modules || []);

    return {
      modules,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[fetchJuniorContentData] Unexpected Exception:', err);
    return null;
  }
}

export function useJuniorContent(supabase: SupabaseClient) {
  const [juniorData, setJuniorData] = useState<JuniorContentKnowledge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const data = await fetchJuniorContentData(supabase);
      if (data && data.modules && data.modules.length > 0) {
        setJuniorData(data);
      } else {
        setJuniorData(null);
        setIsError(true);
        setErrorMessage('Failed to retrieve CONTENT_JUNIOR from Supabase. Data does not exist or the key is invalid.');
      }
    } catch (err: any) {
      setJuniorData(null);
      setIsError(true);
      setErrorMessage(`Supabase connection error: ${err?.message || 'An unexpected error occurred while loading CONTENT_JUNIOR.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    juniorData,
    isLoading,
    isError,
    errorMessage,
    refetch: loadData,
  };
}