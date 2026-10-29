/**
 * @file text-types.tsx
 * @description VCE Japanese Text Types 一覧ページ (PageLayout 統合型データエラーガード対応版)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from '@remix-run/react';
import type { MetaFunction } from '@remix-run/cloudflare';
import PageLayout from '../components/PageLayout';
import { fetchTextTypesData, TextTypesData } from '../data/texttypes';
import { supabase } from '../lib/supabaseClient';

export const meta: MetaFunction = () => {
  return [
    { title: "VCE Japanese Text Types | AI Yamato" },
    { name: "description", content: "VCE Japanese Second Language text types specifications, conventions, and structures." },
  ];
};

export const TextTypesComponent: React.FC = () => {
  const [data, setData] = useState<TextTypesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

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

  const textTypeEntries = data ? Object.entries(data) : [];

  return (
    <PageLayout
      breadcrumbTitle="Text Types"
      error={error || (!loading && (!data || textTypeEntries.length === 0))}
      errorMessage="Failed to fetch key 'TEXTTYPES' from app_knowledge table in Supabase."
      onRetry={loadData}
    >
      {data && textTypeEntries.length > 0 && (
        <div className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Text Types / 文章の種類
                </h1>
                <p className="text-sm text-slate-600 max-w-2xl">
                  While there are various text types in VCE Japanese, these 8 essential formats frequently appear in external exams. Master these core structures first!
                </p>
              </div>
              <Link
                to="/faq#category-Text%20Types%20and%20Styles"
                className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto shadow-xs whitespace-nowrap gap-1.5"
              >
                <span>View FAQ: Text Types & Styles</span>
                <span>↗</span>
              </Link>
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
                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end items-center text-xs">
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
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default TextTypesComponent;
