import { useState, useCallback, useEffect } from 'react';

export interface PageLayoutProps {
  isLoading: boolean;
  error: boolean;
  errorMessage: string;
  onRetry: () => void;
}

export interface UsePageFetchResult<T> {
  data: T | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  loading: boolean;
  error: boolean;
  refetch: () => Promise<void>;
  /** PageLayout コンポーネントに {...pageProps} でそのまま展開して渡せるオブジェクト */
  pageProps: PageLayoutProps;
}

/**
 * PageLayout 統合型データ取得カスタムフック
 * 
 * ページ作成時に PageLayout へ渡す 4 つの基本プロパティ (isLoading, error, errorMessage, onRetry)
 * を全自動で生成・統合管理します。
 * 
 * @param fetcher データ取得関数 (Promise を返す非同期関数)
 * @param errorMessage エラー発生時に表示・自動報告するメッセージ文字列
 * @param autoFetch マウント時に自動でデータ取得を実行するかどうか (デフォルト: true)
 * 
 * @example
 * ```tsx
 * import { PageLayout } from '~/components/PageLayout';
 * import { usePageFetch } from '~/hooks/usePageFetch';
 * import { fetchMyPageData } from '~/data/myPageData';

 * export default function MyPage() {
 *   const { data, pageProps } = usePageFetch(
 *     fetchMyPageData,
 *     "Supabase から MY_PAGE_DATA の取得に失敗しました。"
 *   );
 * 
 *   return (
 *     <PageLayout {...pageProps}>
 *       {data && (
 *         <main className="max-w-4xl mx-auto px-4 py-8">
 *           <h1>{data.title}</h1>
 *         </main>
 *       )}
 *     </PageLayout>
 *   );
 * }
 * ```
 */
export function usePageFetch<T>(
  fetcher: () => Promise<T | null | undefined>,
  errorMessage: string,
  autoFetch: boolean = true
): UsePageFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetcher();
      if (res !== null && res !== undefined) {
        setData(res);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(`[usePageFetch Error] ${errorMessage}:`, err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetcher, errorMessage]);

  useEffect(() => {
    if (autoFetch) {
      loadData();
    }
  }, [autoFetch, loadData]);

  const pageProps: PageLayoutProps = {
    isLoading: loading,
    error: error || (!loading && !data),
    errorMessage,
    onRetry: loadData,
  };

  return {
    data,
    setData,
    loading,
    error,
    refetch: loadData,
    pageProps,
  };
}
