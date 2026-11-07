/**
 * @file vocab.tsx
 * @description AI Yamato Japanese Hub - 語彙検索・選択ページ（生徒・教師共通・型エラー解消版）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import React, { useState, useMemo, useRef } from "react";
import { createServerSupabaseClient } from '~/lib/supabase.server';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';

interface TextbookMapping {
  book: string;
  ref: string;
}

interface Vocabulary {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  category: string;
  year_levels?: number[];
  textbook_mappings?: TextbookMapping[];
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const { supabase } = createServerSupabaseClient(request, context);

  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  let isTeacher = false;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_teacher')
      .eq('id', user.id)
      .maybeSingle();
    if (profile && (profile as any).is_teacher) {
      isTeacher = true;
    }
  }

  const { data: vocabularies, error } = await supabase
    .from("edu_vocabulary")
    .select(`
      id,
      japanese,
      kana,
      romaji,
      english,
      category,
      year_levels,
      textbook_mappings (
        book,
        ref
      )
    `)
    .order("order_index", { ascending: true });

  if (error) {
    console.warn("Supabase fetch error from edu_vocabulary:", error.message);
    const { data: fallbackVocabs } = await supabase
      .from("edu_vocabulary")
      .select("id, japanese, kana, romaji, english, category")
      .order("id", { ascending: true });

    return json({
      vocabularies: (fallbackVocabs as Vocabulary[]) || [],
      availableBooks: [] as string[],
      isTeacher,
      portalContent,
      currentPath: url.pathname,
    });
  }

  const vocabList: Vocabulary[] = (vocabularies as any) || [];

  const uniqueBooks = Array.from(
    new Set(
      vocabList.flatMap((v) => v.textbook_mappings?.map((m: TextbookMapping) => m.book) || [])
    )
  ).filter((book): book is string => Boolean(book)).sort();

  return json({
    vocabularies: vocabList,
    availableBooks: uniqueBooks,
    isTeacher,
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function VocabIndexPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const data = useLoaderData<typeof loader>();
  const vocabularies = (data.vocabularies || []) as Vocabulary[];
  const availableBooks = (data.availableBooks || []) as string[];
  const isTeacher = data.isTeacher;
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLargeFont, setIsLargeFont] = useState(false);

  const filteredVocabularies = useMemo(() => {
    return vocabularies.filter((item: Vocabulary) => {
      const matchesSearch =
        (item.japanese && item.japanese.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.kana && item.kana.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.english && item.english.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.romaji && item.romaji.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBook =
        selectedBook === "all" ||
        item.textbook_mappings?.some((m: TextbookMapping) => m.book === selectedBook);

      const matchesYear =
        selectedYear === "all" ||
        item.year_levels?.includes(Number(selectedYear));

      return matchesSearch && matchesBook && matchesYear;
    });
  }, [vocabularies, searchQuery, selectedBook, selectedYear]);

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
                📚 日本語 語彙データベース・検索
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                語彙を検索してリファレンスとして活用したり、気になる単語を選んで自分だけの復習用ドリルを作成できます！
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2">表示サイズ:</span>
              <button
                type="button"
                onClick={() => setIsLargeFont(false)}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                  !isLargeFont ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                小
              </button>
              <button
                type="button"
                onClick={() => setIsLargeFont(true)}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition ${
                  isLargeFont ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                大
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                キーワード検索 (英語 / かな / 漢字)
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="例: friend, ひとり, 友達..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                教科書・教材
              </label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="all">すべての教科書</option>
                {availableBooks.map((bookName: string) => (
                  <option key={bookName} value={bookName}>
                    {bookName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                対象学年
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="all">すべての学年</option>
                <option value="7">Year 7</option>
                <option value="8">Year 8</option>
                <option value="9">Year 9</option>
                <option value="10">Year 10</option>
                <option value="11">Year 11 (VCE)</option>
                <option value="12">Year 12 (VCE)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 px-1 gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              検索結果: <span className="font-bold text-slate-900 dark:text-slate-100">{filteredVocabularies.length}</span> 語
              <span className="ml-3 text-orange-600 dark:text-orange-400 font-semibold">（選択中: {selectedIds.length} 語）</span>
            </p>
            <button
              type="button"
              onClick={toggleSelectAllVisible}
              className="text-xs bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 px-3 py-2 rounded-xl font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              表示中の単語をすべて選択/解除
            </button>
          </div>

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
                          {item.japanese}
                        </div>
                      </div>
                      {item.category && (
                        <span className="bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 text-xs font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <div className={`text-slate-600 dark:text-slate-400 mb-2 pl-7 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                      <span className="text-slate-400 mr-2">読み:</span>
                      {item.kana} <span className="text-slate-400 text-xs ml-1">({item.romaji})</span>
                    </div>

                    <div className={`text-slate-800 dark:text-slate-200 font-medium mb-3 pl-7 ${isLargeFont ? "text-xl" : "text-base"}`}>
                      {item.english}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-2 pl-7">
                    <div className="flex flex-wrap gap-1">
                      {item.textbook_mappings?.map((m: TextbookMapping, idx: number) => (
                        <span key={idx} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {m.book} ({m.ref})
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {item.year_levels?.map((yr: number) => (
                        <span key={yr} className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                          Y{yr}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredVocabularies.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 text-sm">条件に一致する語彙が見つかりませんでした。</p>
            </div>
          )}

        </div>

        {selectedIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 py-4 px-6 shadow-lg z-50 animate-slide-up">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                🎯 <span className="text-orange-600 dark:text-orange-400">{selectedIds.length} 語</span> の単語が選択されています
              </div>
              <button
                type="button"
                onClick={handleCreateDrillWithSelected}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-colors text-xs uppercase tracking-wider cursor-pointer"
              >
                この選択した単語で復習ドリルを作成する →
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolPageWrapper>
  );
}