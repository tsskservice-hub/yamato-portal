/**
 * @file content-general.ts
 * @description Supabase app_knowledge (key: 'CONTENT_GENERAL') からの動的データ取得モジュール
 */

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalModule } from '~/data/portal-content';

export interface GeneralContentKnowledge {
  modules: PortalModule[];
  updatedAt?: string;
}

const KNOWLEDGE_KEY = 'CONTENT_GENERAL';

export async function fetchGeneralContentData(
  supabase: SupabaseClient
): Promise<GeneralContentKnowledge | null> {
  try {
    const { data: row, error } = await supabase
      .from('app_knowledge')
      .select('data, updated_at')
      .eq('key', KNOWLEDGE_KEY)
      .maybeSingle();

    if (error) {
      console.error('[fetchGeneralContentData] Supabase Error:', error);
      return null;
    }

    if (!row || !row.data) {
      console.warn(`[fetchGeneralContentData] No data found for key: ${KNOWLEDGE_KEY}`);
      return null;
    }

    const content = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    const modules = Array.isArray(content) ? content : (content.modules || []);

    return {
      modules,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[fetchGeneralContentData] Unexpected Exception:', err);
    return null;
  }
}

export function useGeneralContent(supabase: SupabaseClient) {
  const [generalData, setGeneralData] = useState<GeneralContentKnowledge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const data = await fetchGeneralContentData(supabase);
      if (data && data.modules && data.modules.length > 0) {
        setGeneralData(data);
      } else {
        setGeneralData(null);
        setIsError(true);
        setErrorMessage('Failed to retrieve CONTENT_GENERAL from Supabase. Data does not exist or the key is invalid.');
      }
    } catch (err: any) {
      setGeneralData(null);
      setIsError(true);
      setErrorMessage(`Supabase connection error: ${err?.message || 'An unexpected error occurred while loading CONTENT_GENERAL.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    generalData,
    isLoading,
    isError,
    errorMessage,
    refetch: loadData,
  };
}