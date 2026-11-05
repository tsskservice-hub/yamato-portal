/**
 * @file reference.200kanji.tsx
 * @description VCE 200 Kanji Reference 一覧ページ (カテゴリー別グループ化・ページ内遷移対応版)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from '@remix-run/react';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import PageLayout, { type PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';
import { supabase } from '~/lib/supabaseClient';

// kl_character テーブルの全カラムに合わせた型定義
export interface KanjiCharacter {
  id: string;
  character: string;        // 漢字
  kun_display?: string;     // 訓読み（表示用）
  kun_reading?: string;     // 訓読み（かな等）
  kun_romaji?: string;      // 訓読み（ローマ字）
  on_display?: string;      // 音読み（表示用）
  on_romaji?: string;       // 音読み（ローマ字）
  reading_kana?: string;
  romaji?: string;
  meaning?: string;         // 意味
  stroke_count?: number;    // 画数
  radical?: string;         // 部首
  char_type: string;        // 文字種 ('kanji' 等)
  grade_level?: number;     // 学年レベル
  category?: string;        // カテゴリー
  created_at?: string;
}

// 新しいカテゴリー表示順序
const CATEGORY_ORDER = [
  'Numbers',
  'Counters',
  'Season',
  'Days of the week',
  'Day',
  'Time',
  'Parts of the body',
  'Positions/directions',
  'School life',
  'People/family',
  'Adjectives/adverbs',
  'Verbs',
  'Animals/nature',
  'Geography/travel',
  'Colours',
  'Repeat sign',
  'Miscellaneous'
];

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

export default function Kanji200Component() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const [kanjiList, setKanjiList] = useState<KanjiCharacter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadKanjiData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error } = await supabase
        .from('kl_character')
        .select('*')
        .eq('char_type', 'kanji');

      if (error) throw error;

      if (data && Array.isArray(data)) {
        setKanjiList(data);
      } else {
        setKanjiList([]);
      }
    } catch (err: any) {
      console.error("Failed to load kl_character data:", err);
      setError(true);
      setErrorMessage(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKanjiData();
  }, [loadKanjiData]);

  // データベースの category カラムを元にカテゴリーごとにグループ化
  const groupedKanji = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = kanjiList.filter(item => (item.category || 'Miscellaneous') === cat);
    return acc;
  }, {} as Record<string, KanjiCharacter[]>);

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* ヘッダーセクション */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                200 Essential Kanji / 必修漢字200字
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Master the core 200 kanji required for VCE Japanese by categories.
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

          {/* 各カテゴリーへのページ内遷移目次ナビゲーション */}
          {!loading && !error && kanjiList.length > 0 && (
            <div className="mb-10 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Quick Jump to Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ORDER.map(cat => {
                  const count = (groupedKanji[cat] || []).length;
                  if (count === 0) return null;
                  const anchorId = `cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                  return (
                    <a
                      key={cat}
                      href={`#${anchorId}`}
                      className="text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
                    >
                      {cat} <span className="text-slate-400 ml-1">({count})</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* ステータス・データ表示 */}
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-sm">Loading kanji data from Supabase...</div>
          ) : error ? (
            <div className="text-center py-20 text-red-500 text-sm font-bold">
              Failed to load kanji records: {errorMessage}
            </div>
          ) : kanjiList.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl text-slate-500 text-sm">
              No kanji records found in the kl_character table.
            </div>
          ) : (
            <div className="space-y-12">
              {CATEGORY_ORDER.map(categoryName => {
                const items = groupedKanji[categoryName] || [];
                if (items.length === 0) return null;
                const anchorId = `cat-${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

                return (
                  <div key={categoryName} id={anchorId} className="space-y-4 scroll-mt-24">
                    {/* カテゴリー見出し */}
                    <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <span className="w-2 h-6 bg-indigo-600 rounded-full inline-block"></span>
                        {categoryName}
                      </h2>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-full">
                        {items.length} kanji
                      </span>
                    </div>

                    {/* 漢字カードグリッド */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {items.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col justify-between hover:border-indigo-300 transition-colors relative group"
                        >
                          <div>
                            {/* グレードレベルタグを右上に配置 */}
                            <div className="flex items-center justify-end mb-2 min-h-[1.5rem]">
                              {item.grade_level !== undefined && item.grade_level !== null && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  Grade {item.grade_level}
                                </span>
                              )}
                            </div>

                            {/* 漢字メイン表示 */}
                            <div className="text-center my-2">
                              <span className="text-6xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {item.character || '—'}
                              </span>
                            </div>

                            {/* 意味 */}
                            <div className="text-center text-sm font-semibold text-slate-800 mb-4 min-h-[2rem] flex items-center justify-center">
                              {item.meaning || '—'}
                            </div>

                            {/* 詳細情報（音読み・訓読み・ローマ字・部首・画数を網羅） */}
                            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                              
                              {/* 音読み関連 */}
                              {(item.on_display || item.on_romaji) && (
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-500">Onyomi:</span>
                                  <span className="text-right font-medium">
                                    {item.on_display} {item.on_romaji ? `(${item.on_romaji})` : ''}
                                  </span>
                                </div>
                              )}

                              {/* 訓読み関連 */}
                              {(item.kun_display || item.kun_reading || item.kun_romaji) && (
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-slate-500">Kunyomi:</span>
                                  <span className="text-right font-medium">
                                    {[item.kun_display, item.kun_reading ? `[${item.kun_reading}]` : '', item.kun_romaji ? `(${item.kun_romaji})` : '']
                                      .filter(Boolean)
                                      .join(' ')}
                                  </span>
                                </div>
                              )}

                              {/* 部首 */}
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-500">Radical:</span>
                                <span className="text-right font-medium">{item.radical || '—'}</span>
                              </div>

                              {/* 画数 */}
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-500">Strokes:</span>
                                <span className="text-right font-medium">
                                  {item.stroke_count !== undefined && item.stroke_count !== null ? `${item.stroke_count}画` : '—'}
                                </span>
                              </div>

                            </div>
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
      </div>
    </ToolPageWrapper>
  );
}