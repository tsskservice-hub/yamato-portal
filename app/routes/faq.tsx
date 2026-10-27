/**
 * @file faq.tsx
 * @description VCE Japanese Portal FAQ ページ
 * （Supabase app_knowledge key: 'FAQ' 全21件フラット動的連動・DataErrorState版）
 * 模範: terms.tsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from '@remix-run/react';
import type { MetaFunction } from "@remix-run/cloudflare";
import { Search, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import DataErrorState from '../components/DataErrorState';
import ScrollTopButton from '../components/ScrollTopButton';
import { fetchFaqData, FaqItem } from '../data/faq-database';
import { supabase } from '../lib/supabaseClient';

export const meta: MetaFunction = () => {
  return [
    { title: "FAQ & AI Guide | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Frequently Asked Questions and guidance for VCE Japanese external exams, text types, genkoyoshi, and portal usage.",
    },
  ];
};

export default function FaqPage() {
  const location = useLocation();

  // 💡 terms.tsx 模範の独立ステート管理 (データ・ローディング・エラー)
  const [faqs, setFaqs] = useState<FaqItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // 検索用ステート
  const [searchQuery, setSearchQuery] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  // 💡 再試行（Retry）時にも再利用できるフェッチコールバック
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchFaqData(supabase);
      if (result && Array.isArray(result) && result.length > 0) {
        setFaqs(result);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load FAQ data from Supabase:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 💡 URLハッシュ（#category-...）やクエリパラメータを検知して自動スクロール
  useEffect(() => {
    if (!loading && faqs && faqs.length > 0) {
      const hash = location.hash;
      if (hash) {
        const elementId = hash.replace('#', '');
        const element = document.getElementById(elementId);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    }
  }, [loading, faqs, location]);

  // アコーディオンの開閉切り替え
  const toggleAccordion = (id: string) => {
    setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 💡 検索キーワードに基づく絞り込み
  const filteredFaqs = useMemo(() => {
    if (!faqs) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return faqs;

    return faqs.filter(item => {
      return (
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [faqs, searchQuery]);

  // 💡 カテゴリごとにグループ化してすべてのカテゴリーを一度に表示
  const groupedFaqs = useMemo(() => {
    const groups: { category: string; items: FaqItem[] }[] = [];
    filteredFaqs.forEach(item => {
      let group = groups.find(g => g.category === item.category);
      if (!group) {
        group = { category: item.category, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [filteredFaqs]);

  // 💡 該当カテゴリーの位置へスムーズスクロールする関数
  const scrollToCategory = (categoryName: string) => {
    const element = document.getElementById(`category-${categoryName}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // SEO 用 JSON-LD 構造化データの動的生成
  const faqJsonLd = useMemo(() => {
    if (!faqs || faqs.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer.replace(/<[^>]*>?/gm, '').trim()
        }
      }))
    };
  }, [faqs]);

  return (
    <PageLayout breadcrumbTitle="FAQ & AI Guide">
      {/* 💡 JSON-LD Structured Data for SEO */}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 pb-16 relative">
        {/* ヘッダーエリア */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Frequently Asked Questions & AI Guide
            </h1>
            <p className="text-blue-100 text-sm sm:text-base max-w-2xl">
              Everything you need to know about VCE Japanese external exam writing rules, genkoyoshi formatting, oral examinations, and how to interact with AI Yamato.
            </p>

            {/* 検索バー */}
            <div className="mt-8 relative max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all questions (e.g., kanji, credits, punctuation)..."
                disabled={loading || error || !faqs}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white text-slate-800 placeholder-slate-400 text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:opacity-60"
              />
            </div>

            {/* 💡 サーチボックスの下にすべてのカテゴリーを配置（クイックジャンプボタン） */}
            {groupedFaqs.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-xs text-blue-200 font-medium mr-1">Categories:</span>
                {groupedFaqs.map(group => (
                  <button
                    key={group.category}
                    type="button"
                    onClick={() => scrollToCategory(group.category)}
                    className="px-3 py-1 rounded-full bg-blue-700/60 hover:bg-blue-600 text-white text-xs font-semibold border border-blue-400/30 transition-all cursor-pointer shadow-xs capitalize"
                  >
                    {group.category} ({group.items.length})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

          {/* 1. ローディング状態 */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-medium text-sm">Loading FAQ & Knowledge Base...</p>
            </div>
          ) : error || !faqs || faqs.length === 0 ? (
            /* 2. 💡 データ取得失敗時の DataErrorState フォールバック */
            <div className="py-12">
              <DataErrorState
                title="FAQ Data Unavailable"
                message="Failed to load FAQ items from the database. Please check your network connection and try again."
                errorMessage="Failed to fetch key 'FAQ' from app_knowledge table in Supabase."
                onRetry={loadData}
              />
            </div>
          ) : (
            /* 3. 正常取得時のコンテンツ描画（各カテゴリに id を付与してスクロール遷移に対応） */
            <>
              <div className="space-y-10">
                {groupedFaqs.length > 0 ? (
                  groupedFaqs.map(group => (
                    <div key={group.category} id={`category-${group.category}`} className="space-y-4 scroll-mt-6">
                      {/* カテゴリ見出し */}
                      <div className="flex items-center space-x-3 border-b border-slate-200 pb-2">
                        <h2 className="text-lg font-extrabold text-slate-900 capitalize">
                          {group.category}
                        </h2>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {group.items.length} {group.items.length === 1 ? 'question' : 'questions'}
                        </span>
                      </div>

                      {/* 該当カテゴリのFAQリスト */}
                      <div className="space-y-4">
                        {group.items.map((faq: FaqItem) => {
                          const isOpen = !!openIds[faq.id];
                          return (
                            <div
                              key={faq.id}
                              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-blue-200"
                            >
                              <button
                                type="button"
                                onClick={() => toggleAccordion(faq.id)}
                                className="w-full text-left px-6 py-5 flex items-start justify-between space-x-4 cursor-pointer focus:outline-hidden"
                              >
                                <div className="space-y-1">
                                  <h3 className="text-base font-bold text-slate-900">
                                    {faq.question}
                                  </h3>
                                </div>
                                <div className="shrink-0 mt-1 w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200">
                                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </button>

                              {/* アコーディオン本文 */}
                              {isOpen && (
                                <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4">
                                  <div
                                    className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700">No matching questions found</h3>
                    <p className="text-xs text-slate-500 mt-1">Try searching with a different keyword.</p>
                  </div>
                )}
              </div>

              {/* お問い合わせ誘導セクション */}
              <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                <h3 className="text-lg font-bold text-blue-900">Still have questions?</h3>
                <p className="text-xs sm:text-sm text-blue-700 max-w-xl mx-auto">
                  Please let us know your question via Contact, Report Bug & Photo, or Quick Feedback in the footer.
                </p>
                <div className="pt-2">
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </>
          )}

        </div>

        {/* 💡 スクロールトップボタンの配置 */}
        <ScrollTopButton floatingClass="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white border border-blue-400 shadow-xl" />
      </div>
    </PageLayout>
  );
}