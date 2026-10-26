/**
 * @file faq.tsx
 * @description VCE Japanese Portal (Yamato Portal) Comprehensive FAQ Page
 * （Supabase app_knowledge key: 'FAQ' 100%動的連動・DataErrorState版）
 * 模範: terms.tsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from '@remix-run/react';
import type { MetaFunction } from "@remix-run/cloudflare";
import { Search, HelpCircle, ChevronDown, ChevronUp, FileText, Mic, PenTool, LayoutDashboard } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import DataErrorState from '../components/DataErrorState';
import { fetchFaqData, FaqItem } from '../data/faq-database';
import { supabase } from '../lib/supabaseClient';

export const meta: MetaFunction = () => {
  return [
    { title: "FAQ & AI Guide | AI Yamato Japanese Tutoring" },
    {
      name: "description",
      content: "Frequently Asked Questions and AI Yamato expert guidance for VCE Japanese students.",
    },
  ];
};

export default function FaqPage() {
  // 💡 terms.tsx 模範の独立ステート管理 (データ・ローディング・エラー)
  const [faqs, setFaqs] = useState<FaqItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // 検索・フィルタリング用ステート
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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

  // アコーディオンの開閉切り替え
  const toggleAccordion = (id: string) => {
    setOpenIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // カテゴリタブの定義
  const categories = [
    { id: "all", label: "All Questions", icon: HelpCircle },
    { id: "portal_usage", label: "Portal & Credits", icon: LayoutDashboard },
    { id: "genkoyoshi", label: "Genkoyoshi", icon: FileText },
    { id: "vce_written", label: "VCE Written Exam", icon: PenTool },
    { id: "vce_oral", label: "VCE Oral Exam", icon: Mic },
  ];

  // 💡 Supabase から取得した faqs を対象に検索とカテゴリフィルターを実行
  const filteredFaqs = useMemo(() => {
    if (!faqs) return [];
    return faqs.filter(item => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();

      if (!query) return matchesCategory;

      const matchesSearch = 
        item.questionEn.toLowerCase().includes(query) ||
        item.questionJp.toLowerCase().includes(query) ||
        item.answerHtml.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [faqs, searchQuery, selectedCategory]);

  // SEO 用 JSON-LD 構造化データの動的生成
  const faqJsonLd = useMemo(() => {
    if (!faqs || faqs.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(item => ({
        "@type": "Question",
        "name": item.questionEn,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answerHtml.replace(/<[^>]*>?/gm, '').trim()
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

      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 pb-16">
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
                placeholder="Search by keyword (e.g., kanji, punctuation, credits, speech)..."
                disabled={loading || error || !faqs}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white text-slate-800 placeholder-slate-400 text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:opacity-60"
              />
            </div>
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
            /* 3. 正常取得時のコンテンツ描画 */
            <>
              {/* カテゴリフィルタータブ */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-4 no-scrollbar">
                {categories.map(cat => {
                  const IconComponent = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shadow-xs ${
                        isSelected 
                          ? "bg-blue-600 text-white shadow-md" 
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-slate-500"}`} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* FAQ リスト */}
              <div className="mt-6 space-y-4">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq: FaqItem) => {
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
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {faq.category.replace('_', ' ')}
                              </span>
                              {faq.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            <h2 className="text-base font-bold text-slate-900">
                              {faq.questionEn}
                            </h2>
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
                              dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700">No matching questions found</h3>
                    <p className="text-xs text-slate-500 mt-1">Try searching with a different keyword or switching categories.</p>
                  </div>
                )}
              </div>

              {/* お問い合わせ誘導セクション */}
              <div className="mt-12 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                <h3 className="text-lg font-bold text-blue-900">Still have questions?</h3>
                <p className="text-xs sm:text-sm text-blue-700 max-w-xl mx-auto">
                  Feel free to reach out anytime via the feedback feature or bug report cards on your dashboard. AI Yamato is also here to support you!
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
      </div>
    </PageLayout>
  );
}