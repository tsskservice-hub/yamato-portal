/**
 * @file content-vce-speaking.ts
 * @description Supabase app_knowledge (key: 'CONTENT_VCE_SPEAKING') からの動的データ取得モジュール
 */

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalModule } from '~/data/portal-content';

export interface VceSpeakingContentKnowledge {
  modules: PortalModule[];
  updatedAt?: string;
}

const KNOWLEDGE_KEY = 'CONTENT_VCE_SPEAKING';

export async function fetchVceSpeakingContentData(
  supabase: SupabaseClient
): Promise<VceSpeakingContentKnowledge | null> {
  try {
    const { data: row, error } = await supabase
      .from('app_knowledge')
      .select('data, updated_at')
      .eq('key', KNOWLEDGE_KEY)
      .maybeSingle();

    if (error) {
      console.error('[fetchVceSpeakingContentData] Supabase Error:', error);
      return null;
    }

    if (!row || !row.data) {
      console.warn(`[fetchVceSpeakingContentData] No data found for key: ${KNOWLEDGE_KEY}`);
      return null;
    }

    const content = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    const modules = Array.isArray(content) ? content : (content.modules || []);

    return {
      modules,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[fetchVceSpeakingContentData] Unexpected Exception:', err);
    return null;
  }
}

export function useVceSpeakingContent(supabase: SupabaseClient) {
  const [vceSpeakingData, setVceSpeakingData] = useState<VceSpeakingContentKnowledge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const data = await fetchVceSpeakingContentData(supabase);
      if (data && data.modules && data.modules.length > 0) {
        setVceSpeakingData(data);
      } else {
        setVceSpeakingData(null);
        setIsError(true);
        setErrorMessage('Failed to retrieve CONTENT_VCE_SPEAKING from Supabase. Data does not exist or the key is invalid.');
      }
    } catch (err: any) {
      setVceSpeakingData(null);
      setIsError(true);
      setErrorMessage(`Supabase connection error: ${err?.message || 'An unexpected error occurred while loading CONTENT_VCE_SPEAKING.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    vceSpeakingData,
    isLoading,
    isError,
    errorMessage,
    refetch: loadData,
  };
}