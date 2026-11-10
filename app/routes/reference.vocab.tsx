/**
 * @file reference.vocab.tsx
 * @description AI Yamato Japanese Hub - Vocabulary Reference & Search (Schema Matched Version)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from '~/lib/supabaseClient';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/layout/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';

interface Vocabulary {
  id: string;
  lesson_id?: string;
  jp_text: string;
  romaji: string;
  english_text: string;
  category: string;
  order_index?: number;
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
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function VocabIndexPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const navigate = useNavigate();

  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLargeFont, setIsLargeFont] = useState(false);

  // 実際の kl_vocabulary テーブルの構造に合わせたデータ取得
  const loadVocabData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error } = await supabase
        .from("kl_vocabulary")
        .select("id, lesson_id, jp_text, romaji, english_text, category, order_index")
        .order("order_index", { ascending: true });

      if (error) throw error;

      if (data && Array.isArray(data)) {
        setVocabularies(data);
      } else {
        setVocabularies([]);
      }
    } catch (err: any) {
      console.error("Failed to load kl_vocabulary data:", err);
      setError(true);
      setErrorMessage(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVocabData();
  }, [loadVocabData]);

  // 利用可能なカテゴリー一覧を動的に抽出
  const availableCategories = useMemo(() => {
    return Array.from(new Set(vocabularies.map(v => v.category).filter(Boolean))).sort();
  }, [vocabularies]);

  const filteredVocabularies = useMemo(() => {
    return vocabularies.filter((item: Vocabulary) => {
      const matchesSearch =
        (item.jp_text && item.jp_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.english_text && item.english_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.romaji && item.romaji.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" ||
        item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [vocabularies, searchQuery, selectedCategory]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredVocabularies.map((v: Vocabulary) => v.id);
    const allSelected = visibleIds.every((id: string) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(selectedIds.filter((id: string) => !visibleIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedIds, ...visibleIds]));
      setSelectedIds(combined);
    }
  };

  const handleCreateDrillWithSelected = () => {
    if (selectedIds.length === 0) return;
    sessionStorage.setItem("preselected_vocab_ids", JSON.stringify(selectedIds));
    navigate("/vocab-creator"); 
  };

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                📚 Japanese Vocabulary Database & Reference
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Search curriculum vocabulary for reference, or select items to create your own personalized review drill!
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">Font Size:</span>
              <button
                type="button"
                onClick={() => setIsLargeFont(false)}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                  !isLargeFont ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Small
              </button>
              <button
                type="button"
                onClick={() => setIsLargeFont(true)}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                  isLargeFont ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Large
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Keyword Search (Japanese / English / Romaji)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. smelly, kusai, くさい..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 px-1 gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Results: <span className="font-bold text-slate-900 dark:text-slate-100">{filteredVocabularies.length}</span> terms
              <span className="ml-3 text-orange-600 dark:text-orange-400 font-semibold">（Selected: {selectedIds.length} terms）</span>
            </p>
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-3 py-2 rounded-xl font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Select / Deselect All Visible
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500 text-sm">Loading vocabulary data from Supabase...</div>
          ) : error ? (
            <div className="text-center py-20 text-red-500 text-sm font-bold">
              Failed to load vocabulary records: {errorMessage}
            </div>
          ) : filteredVocabularies.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 text-sm">No vocabulary terms found in the `kl_vocabulary` table.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVocabularies.map((item: Vocabulary) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-orange-50/70 dark:bg-orange-950/40 border-orange-500 shadow-md"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                          />
                          <div className={`font-bold text-slate-900 dark:text-slate-100 ${isLargeFont ? "text-3xl" : "text-xl"}`}>
                            {item.jp_text}
                          </div>
                        </div>
                        {item.category && (
                          <span className="bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 text-xs font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                            {item.category}
                          </span>
                        )}
                      </div>

                      <div className={`text-slate-600 dark:text-slate-400 mb-2 pl-7 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                        <span className="text-slate-400 mr-2">Romaji:</span>
                        {item.romaji}
                      </div>

                      <div className={`text-slate-800 dark:text-slate-200 font-medium mb-3 pl-7 ${isLargeFont ? "text-xl" : "text-base"}`}>
                        {item.english_text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {selectedIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 py-4 px-6 shadow-lg z-50 animate-slide-up">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                🎯 <span className="text-orange-600 dark:text-orange-400">{selectedIds.length} terms</span> selected for practice
              </div>
              <button
                type="button"
                onClick={handleCreateDrillWithSelected}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                Create Review Drill with Selected →
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}