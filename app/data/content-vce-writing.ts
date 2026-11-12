/**
 * @file content-vce-writing.ts
 * @description Supabase kl_app (key: 'CONTENT_VCE_WRITING') からの動的データ取得モジュール
 */

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PortalModule } from '~/data/portal-content';

export interface VceWritingContentKnowledge {
  modules: PortalModule[];
  updatedAt?: string;
}

const KNOWLEDGE_KEY = 'CONTENT_VCE_WRITING';

export async function fetchVceWritingContentData(
  supabase: SupabaseClient
): Promise<VceWritingContentKnowledge | null> {
  try {
    const { data: row, error } = await supabase
      .from('kl_app')
      .select('data, updated_at')
      .eq('key', KNOWLEDGE_KEY)
      .maybeSingle();

    if (error) {
      console.error('[fetchVceWritingContentData] Supabase Error:', error);
      return null;
    }

    if (!row || !row.data) {
      console.warn(`[fetchVceWritingContentData] No data found for key: ${KNOWLEDGE_KEY}`);
      return null;
    }

    const content = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    const modules = Array.isArray(content) ? content : (content.modules || []);

    return {
      modules,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('[fetchVceWritingContentData] Unexpected Exception:', err);
    return null;
  }
}

export function useVceWritingContent(supabase: SupabaseClient) {
  const [vceWritingData, setVceWritingData] = useState<VceWritingContentKnowledge | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const data = await fetchVceWritingContentData(supabase);
      if (data && data.modules && data.modules.length > 0) {
        setVceWritingData(data);
      } else {
        setVceWritingData(null);
        setIsError(true);
        setErrorMessage('Failed to retrieve CONTENT_VCE_WRITING from Supabase. Data does not exist or the key is invalid.');
      }
    } catch (err: any) {
      setVceWritingData(null);
      setIsError(true);
      setErrorMessage(`Supabase connection error: ${err?.message || 'An unexpected error occurred while loading CONTENT_VCE_WRITING.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    vceWritingData,
    isLoading,
    isError,
    errorMessage,
    refetch: loadData,
  };
}