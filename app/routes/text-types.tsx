/**
 * @file text-types.tsx
 * @description VCE Japanese Text Types 一覧ページ
 * 
 * 💡 設計仕様:
 * 1. Supabase の app_knowledge テーブル (key: 'TEXTTYPES') からテキストタイプ一覧を取得。
 * 2. 原稿用紙（Genkoyoshi）は TEXTTYPES に含まれないため、純粋なテキストタイプ一覧として描画。
 * 3. terms.tsx と同様のライフサイクル設計（loading / error / data）と DataErrorState による完全なフォールバック。
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { MetaFunction } from '@remix-run/cloudflare';
import PageLayout from '../components/PageLayout';
import DataErrorState from '../components/DataErrorState';
import { fetchTextTypesData, TextTypesData } from '../data/texttypes';
import { supabase } from '../lib/supabaseClient';

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese Text Types | AI Yamato" },
    { name: "description", content: "VCE Japanese Second Language text types specifications, conventions, and structures." },
  ];
};

export const TextTypesComponent: React.FC = () => {
  // 💡 terms.tsx 模範の独立ステート管理
  const [data, setData] = useState<TextTypesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // 💡 データ取得コールバック（DataErrorState の onRetry と共通化）
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchTextTypesData(supabase);
      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        setData(result);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load text types data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // TEXTTYPES に含まれる純粋なテキストタイプリストを配列化
  const textTypeEntries = data ? Object.entries(data) : [];

  return (
    <PageLayout breadcrumbTitle="Text Types">
      <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* 1. ローディング状態 */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium text-sm">Loading Text Types Specification...</p>
            </div>
          ) : error || !data || textTypeEntries.length === 0 ? (
            /* 2. 💡 データ取得失敗時の DataErrorState フォールバック */
            <div className="py-12">
              <DataErrorState
                title="Text Types Specification Unavailable"
                message="Failed to load Text Types from the database. Please check your network connection and try again."
                errorMessage="Failed to fetch key 'TEXTTYPES' from app_knowledge table in Supabase."
                onRetry={loadData}
              />
            </div>
          ) : (
            /* 3. 正常取得時のコンテンツ描画 */
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Text Types / 文章の種類
                </h1>
                <p className="text-sm text-slate-600">
                  VCE Japanese Second Language text types, structures, and conventions ({textTypeEntries.length} types).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {textTypeEntries.map(([typeName, item]) => (
                  <div
                    key={typeName}
                    className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                          {typeName}
                        </span>
                        {item.sampleImage && (
                          <span className="text-xs text-slate-400">Sample Guide Available</span>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-slate-900 mb-2">
                        {item.title}
                      </h2>
                      <p className="text-slate-600 text-sm leading-relaxed mb-4">
                        {item.purpose}
                      </p>

                      {item.structure && item.structure.length > 0 && (
                        <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                            <span>📌</span> Structure & Key Elements
                          </h3>
                          <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5">
                            {item.structure.map((struct, idx) => (
                              <li key={idx} className="leading-relaxed">{struct}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {item.sampleImage && (
                      <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-mono truncate max-w-[200px]">
                          {item.sampleImage}
                        </span>
                        <a
                          href={item.sampleImage.startsWith('/') ? item.sampleImage : `/${item.sampleImage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          View Sample PDF ↗
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </PageLayout>
  );
};

export default TextTypesComponent;