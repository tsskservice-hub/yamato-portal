/**
 * @file writing-styles.tsx
 * @description VCE Writing Styles Guide ページ（Supabase WRITING_STYLES 動的連動・DataErrorState版）
 * 模範: terms.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';
import PageLayout from '../components/PageLayout';
import DataErrorState from '../components/DataErrorState';
import { fetchWritingStylesData, WritingStylesData, WritingStyleDetail } from '../data/writing-styles';
import { supabase } from '../lib/supabaseClient';

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Writing Styles Guide | AI Yamato" },
    { name: "description", content: "Explore the 5 core writing styles for VCE Japanese, complete with purpose, key features, grammar, compatible text types, and effective vocabulary." },
  ];
};

export default function WritingStylesGuide() {
  // 💡 terms.tsx 模範の独立ステート管理
  const [stylesData, setStylesData] = useState<WritingStylesData | null>(null);
  const [activeStyleKey, setActiveStyleKey] = useState<string>('Informative');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // 💡 再試行（Retry）時にも再利用できるフェッチコールバック
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchWritingStylesData(supabase);
      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        setStylesData(result);
        // 現在のアクティブキーが存在しない場合は先頭のキー（keys[0]）を選択
        const keys = Object.keys(result);
        if (!result[activeStyleKey] && keys.length > 0) {
          setActiveStyleKey(keys[0]); // 💡 keys[0] に修正
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to load writing styles from Supabase:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activeStyleKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentStyle: WritingStyleDetail | undefined = stylesData ? stylesData[activeStyleKey] : undefined;

  return (
    <PageLayout breadcrumbTitle="Writing Styles">
      <div className="max-w-6xl mx-auto p-6 bg-slate-50 min-h-screen text-slate-800">
        
        {/* ヘッダーエリア */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            VCE Writing Styles Guide
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm md:text-base">
            Explore the 5 core writing styles for VCE Japanese, complete with purpose, key features, grammar, compatible text types, and effective vocabulary.
          </p>
        </div>

        {/* 1. ローディング状態 */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium text-sm">Loading Writing Styles Guide...</p>
          </div>
        ) : error || !stylesData || Object.keys(stylesData).length === 0 ? (
          /* 2. 💡 データ取得失敗時の DataErrorState フォールバック */
          <div className="py-12">
            <DataErrorState
              title="Writing Styles Guide Unavailable"
              message="Failed to load Writing Styles from the database. Please check your network connection and try again."
              errorMessage="Failed to fetch key 'WRITING_STYLES' from app_knowledge table in Supabase."
              onRetry={loadData}
            />
          </div>
        ) : (
          /* 3. 正常取得時のコンテンツ描画 */
          <>
            {/* スタイル切り替えタブ */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {Object.keys(stylesData).map((key) => {
                const style = stylesData[key];
                const isActive = key === activeStyleKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveStyleKey(key)}
                    className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all shadow-xs cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-blue-200'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{style.styleName}</span>
                    <span className={`block text-xs ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                      {style.japaneseName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* スタイル詳細カード */}
            {currentStyle && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 左カラム: Purpose, Key Features & Text Types */}
                <div className="md:col-span-1 space-y-6">
                  <div>
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-3">
                      {currentStyle.japaneseName}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{currentStyle.styleName}</h2>
                    <p className="text-slate-600 text-sm leading-relaxed">{currentStyle.purpose}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Key Features
                    </h3>
                    <ul className="space-y-2">
                      {currentStyle.keyFeatures.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-slate-700">
                          <span className="text-blue-500 mr-2 font-bold">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Compatible Text Types
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {currentStyle.compatibleTextTypes.map((type, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 右カラム: Effective Vocabulary & Grammar */}
                <div className="md:col-span-2 space-y-6 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      Effective Vocabulary
                    </h3>
                    <div className="space-y-4">
                      {currentStyle.effectiveVocabulary.map((vocabCat, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
                            {vocabCat.categories}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {vocabCat.examples.map((ex, eIdx) => (
                              <span
                                key={eIdx}
                                className="px-3 py-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-lg shadow-2xs font-medium"
                              >
                                {ex}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Effective Grammar
                    </h3>
                    <ul className="space-y-2">
                      {currentStyle.effectiveGrammar.map((grammar, idx) => (
                        <li
                          key={idx}
                          className="flex items-start text-sm text-slate-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50"
                        >
                          <span className="text-blue-600 mr-2 font-bold">✓</span>
                          <span>{grammar}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </PageLayout>
  );
}