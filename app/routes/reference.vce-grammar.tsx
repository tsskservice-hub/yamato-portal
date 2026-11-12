/**
 * @file reference.vce-grammar.tsx
 * @description VCE Grammar Reference 一覧ページ (ScrollTopButton統合・scrollUtils共通化対応版)
 */
import { DataErrorState } from '~/components/DataErrorState';
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import type { PageLayoutRef } from '~/components/layout/PageLayout';
import ScrollTopButton from '~/components/layout/ScrollTopButton';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';
import { handleScrollToSection, getAnchorId } from '~/utils/scrollUtils';

// 文法アイテムの型定義
export interface GrammarItem {
  id: string;
  pattern: string;         // 文法・表現パターン (例: "verb stem + たいです")
  meaning: string;         // 意味・訳 (例: "want to + verb")
  example?: string;        // 例文 (例: "日本に行きたいです。")
  explanation?: string;    // 補足・解説
}

// カテゴリーごとの型定義
export interface GrammarCategory {
  categoryTitle: string;   // カテゴリー名 (例: "1. VERB FORMS & CONJUGATIONS")
  items: GrammarItem[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  let grammarCategories: GrammarCategory[] = [];

  try {
    // ポータル設定の取得
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;

    // kl_app テーブルから VCE_GRAMMAR_LIST のデータを取得
    const { data: grammarData, error: grammarError } = await supabase
      .from('kl_app')
      .select('content')
      .eq('key', 'VCE_GRAMMAR_LIST')
      .single();

    if (grammarError) {
      console.error("Error fetching VCE_GRAMMAR_LIST from kl_app:", grammarError);
    } else if (grammarData?.content) {
      // content が配列か、またはパースが必要な場合のハンドリング
      if (Array.isArray(grammarData.content)) {
        grammarCategories = grammarData.content;
      } else if (typeof grammarData.content === 'string') {
        grammarCategories = JSON.parse(grammarData.content);
      }
    }
  } catch (e) {
    console.error("Failed to load loader data:", e);
  }

  return json({
    portalContent,
    grammarCategories,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function VceGrammarComponent() {
  // Remixのローダーデータを取得（SSR対応）
  // ※ クライアント側で直接Supabaseから再取得も可能ですが、loaderデータを初期値として活用します
  const layoutRef = useRef<PageLayoutRef>(null);
  const [categories, setCategories] = useState<GrammarCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadGrammarData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error } = await supabase
        .from('kl_app')
        .select('content')
        .eq('key', 'VCE_GRAMMAR_LIST')
        .single();

      if (error) throw error;

      if (data?.content) {
        const parsed = Array.isArray(data.content) 
          ? data.content 
          : typeof data.content === 'string' 
            ? JSON.parse(data.content) 
            : [];
        setCategories(parsed);
      } else {
        setCategories([]);
      }
    } catch (err: any) {
      console.error("Failed to load VCE grammar data from kl_app:", err);
      setError(true);
      setErrorMessage(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGrammarData();
  }, [loadGrammarData]);

  // 検索キーワードに基づいてカテゴリー・アイテムをフィルタリング
  const filteredCategories = categories.map(cat => {
    const filteredItems = cat.items.filter(item => {
      const query = searchQuery.toLowerCase();
      const matchPattern = item.pattern?.toLowerCase().includes(query) || false;
      const matchMeaning = item.meaning?.toLowerCase().includes(query) || false;
      const matchExample = item.example?.toLowerCase().includes(query) || false;
      const matchId = item.id?.toLowerCase().includes(query) || false;
      return matchPattern || matchMeaning || matchExample || matchId;
    });
    return {
      ...cat,
      items: filteredItems
    };
  }).filter(cat => cat.items.length > 0);

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative pb-16">
        <div className="max-w-6xl mx-auto">
          
          {/* ヘッダーセクション */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                VCE Japanese Grammar / 必須文法一覧
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Master the core grammar patterns and structures required for VCE Japanese by categories.
              </p>
            </div>
            <Link
              to="/faq#category-Grammar"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto shadow-xs whitespace-nowrap gap-1.5"
            >
              <span>View FAQ: Grammar Tips</span>
              <span>↗</span>
            </Link>
          </div>

          {/* 検索バー ＆ クイックジャンプ目次 */}
          {!loading && !error && categories.length > 0 && (
            <div className="mb-10 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              {/* リアルタイム検索入力 */}
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search grammar patterns, meanings, or examples (e.g., たいです, 否定, て形)..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-xs transition-all"
                />
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Quick Jump to Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const count = (cat.items || []).length;
                    if (count === 0) return null;
                    const anchorId = getAnchorId(cat.categoryTitle);
                    return (
                      <a
                        key={cat.categoryTitle}
                        href={`#${anchorId}`}
                        onClick={(e) => handleScrollToSection(e, anchorId)}
                        className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60 cursor-pointer"
                      >
                        {cat.categoryTitle}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ステータス・データ表示 */}
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-sm">Loading grammar data from Supabase...</div>
          ) : error ? (
            <DataErrorState
              title="Unable to Load Data"
              errorMessage={`Failed to load VCE_GRAMMAR_LIST (kl_app): ${errorMessage}`}
              onRetry={loadGrammarData}
            />
          ) : categories.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
              No grammar records found in the kl_app table.
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
              No grammar items match your search query "{searchQuery}".
            </div>
          ) : (
            <div className="space-y-12">
              {filteredCategories.map(category => {
                const anchorId = getAnchorId(category.categoryTitle);

                return (
                  <div key={category.categoryTitle} id={anchorId} className="space-y-4 scroll-mt-24">
                    <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="w-2 h-6 bg-indigo-600 rounded-full inline-block"></span>
                        {category.categoryTitle}
                      </h2>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-full">
                        {category.items.length} items
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {category.items.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:border-indigo-300 transition-colors relative group"
                        >
                          <div>
                            {/* IDバッジ */}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                                ID: {item.id}
                              </span>
                            </div>

                            {/* パターン (見出し) */}
                            <div className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                              {item.pattern || '—'}
                            </div>

                            {/* 意味 */}
                            <div className="text-sm font-semibold text-slate-600 mb-4">
                              {item.meaning || '—'}
                            </div>

                            {/* 例文ボックス */}
                            {item.example && (
                              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                                <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Example</span>
                                <div className="font-medium text-slate-800 text-sm">
                                  {item.example}
                                </div>
                              </div>
                            )}

                            {/* 補足解説があれば表示 */}
                            {item.explanation && (
                              <div className="mt-3 text-xs text-slate-500">
                                {item.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ページトップへ戻るボタン */}
        <ScrollTopButton floatingClass="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-400 shadow-xl" />
      </div>
    </ToolPageWrapper>
  );
}