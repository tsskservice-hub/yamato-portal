/**
 * @file reference.200kanji.tsx
 * @description VCE 200漢字 リファレンス＆検索ページ (Supabase連携・多条件フィルター対応版)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import PageLayout, { type PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

// kl_character テーブルの型定義（実際のカラム名に合わせて適宜調整してください）
export interface KanjiCharacter {
  id: number;
  kanji: string;
  onyomi?: string;
  kunyomi?: string;
  meaning?: string;
  strokes?: number;
  radical?: string;
  category?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || '');
};

export default function Kanji200ReferenceComponent() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const [kanjiList, setKanjiList] = useState<KanjiCharacter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // 検索・フィルター用のステート
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStrokes, setSelectedStrokes] = useState<string>('all');

  // Supabase から kl_character のデータを取得
  const loadKanjiData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error } = await supabase
        .from('kl_character')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        setKanjiList(data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load kl_character data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKanjiData();
  }, [loadKanjiData]);

  // カテゴ1・画数のセレクトボックス用の選択肢を動的抽出
  const categories = useMemo(() => {
    const set = new Set<string>();
    kanjiList.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [kanjiList]);

  // 検索・フィルター処理（画数、部首、意味、カテゴリー、音読み、訓読み、および漢字・IDに対応）
  const filteredKanji = useMemo(() => {
    return kanjiList.filter(item => {
      const query = searchQuery.toLowerCase().trim();
      
      // キーワードマッチ（漢字、音読み、訓読み、意味、部首、ID、画数）
      const matchesQuery = query === '' || 
        item.kanji?.toLowerCase().includes(query) ||
        item.onyomi?.toLowerCase().includes(query) ||
        item.kunyomi?.toLowerCase().includes(query) ||
        item.meaning?.toLowerCase().includes(query) ||
        item.radical?.toLowerCase().includes(query) ||
        item.id?.toString().includes(query) ||
        item.strokes?.toString().includes(query);

      // カテゴリーフィルター
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      // 画数フィルター
      const matchesStrokes = selectedStrokes === 'all' || item.strokes?.toString() === selectedStrokes;

      return matchesQuery && matchesCategory && matchesStrokes;
    });
  }, [kanjiList, searchQuery, selectedCategory, selectedStrokes]);

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* ヘッダーセクション */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                VCE 200 Kanji Reference / 漢字200字一覧
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Search and master the 200 essential VCE Japanese kanji. Filter by readings, meanings, radicals, stroke count, or categories.
              </p>
            </div>
            <Link
              to="/faq#category-Kanji"
              className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto shadow-xs whitespace-nowrap gap-1.5"
            >
              <span>View FAQ: Kanji Tips</span>
              <span>↗</span>
            </Link>
          </div>

          {/* 検索・フィルターコントロールバー */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* テキスト検索（漢字、音読み、訓読み、意味、部首、ID対応） */}
            <div className="w-full md:w-1/2">
              <label htmlFor="search" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Keyword Search / キーワード検索
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by kanji, reading, meaning, radical..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* カテゴリーフィルター */}
            <div className="w-full sm:w-auto min-w-[180px]">
              <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Category / カテゴリー
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 画数フィルター */}
            <div className="w-full sm:w-auto min-w-[140px]">
              <label htmlFor="strokes" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Strokes / 画数
              </label>
              <select
                id="strokes"
                value={selectedStrokes}
                onChange={(e) => setSelectedStrokes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              >
                <option value="all">All Strokes</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num.toString()}>{num} strokes</option>
                ))}
              </select>
            </div>

          </div>

          {/* ローディング・エラー・結果表示 */}
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-sm">Loading kanji data from Supabase...</div>
          ) : error ? (
            <div className="text-center py-20 text-red-500 text-sm font-bold">Failed to load kanji records. Please try again later.</div>
          ) : filteredKanji.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
              No matching kanji found. Try adjusting your search or filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredKanji.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors relative group"
                >
                  <div>
                    {/* 上部タグ（ID & カテゴリー） */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400">
                        #{item.id}
                      </span>
                      {item.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {/* 漢字メイン表示 */}
                    <div className="text-center my-3">
                      <span className="text-6xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.kanji}
                      </span>
                    </div>

                    {/* 意味 */}
                    <div className="text-center text-sm font-semibold text-slate-800 mb-4 min-h-[2rem] flex items-center justify-center">
                      {item.meaning || '—'}
                    </div>

                    {/* 詳細データ（音読み・訓読み・部首・画数） */}
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-500">Onyomi:</span>
                        <span className="text-right font-medium">{item.onyomi || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-500">Kunyomi:</span>
                        <span className="text-right font-medium">{item.kunyomi || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-500">Radical:</span>
                        <span className="text-right font-medium">{item.radical || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-500">Strokes:</span>
                        <span className="text-right font-medium">{item.strokes ? `${item.strokes}画` : '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </ToolPageWrapper>
  );
}