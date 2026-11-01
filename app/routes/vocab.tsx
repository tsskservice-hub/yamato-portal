import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useMemo } from "react";
import { createServerSupabaseClient } from "../lib/supabase.server";

// 型定義
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
  year_levels: number[];
  textbook_mappings: TextbookMapping[];
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabaseClient(request, context);

  // 1. 語彙データと教科書マッピングを結合して取得
  const { data: vocabularies, error } = await supabase
    .from("vocabularies")
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
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Response("Failed to fetch vocabularies", { status: 500 });
  }

  const vocabList: Vocabulary[] = vocabularies || [];

  // 2. 登録されているすべての教科書名を重複なく抽出（フィルターの選択肢動的生成用）
  const uniqueBooks = Array.from(
    new Set(
      vocabList.flatMap((v) => v.textbook_mappings?.map((m) => m.book) || [])
    )
  ).sort();

  return json({ vocabularies: vocabList, availableBooks: uniqueBooks });
}

export default function VocabIndexPage() {
  const { vocabularies, availableBooks } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  
  // 検索キーワードとフィルター用の状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  // 選択中の単語IDリスト
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // フォントサイズ切り替え（大・小ボタン用）
  const [isLargeFont, setIsLargeFont] = useState(false);

  // リアルタイムフィルタリングロジック
  const filteredVocabularies = useMemo(() => {
    return vocabularies.filter((item) => {
      const matchesSearch =
        item.japanese.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kana.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.romaji.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBook =
        selectedBook === "all" ||
        item.textbook_mappings?.some((m) => m.book === selectedBook);

      const matchesYear =
        selectedYear === "all" ||
        item.year_levels?.includes(Number(selectedYear));

      return matchesSearch && matchesBook && matchesYear;
    });
  }, [vocabularies, searchQuery, selectedBook, selectedYear]);

  // 個別選択の切り替え
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 表示中の単語をすべて選択 / 解除
  const toggleSelectAllVisible = () => {
    const visibleIds = filteredVocabularies.map((v) => v.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      // すべて選択されている場合は、表示中のものを解除
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      // 未選択のものを追加
      const combined = Array.from(new Set([...selectedIds, ...visibleIds]));
      setSelectedIds(combined);
    }
  };


// 選択した単語を持ってドリル作成画面へ遷移する部分
const handleCreateDrillWithSelected = () => {
  if (selectedIds.length === 0) return;
  // sessionStorage に確実に保存
  sessionStorage.setItem("preselected_vocab_ids", JSON.stringify(selectedIds));
  // 実際のドリル作成画面のルート（パス）に合わせる（例: /vocab/create など）
  navigate("/vocab-creator"); 
};

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-5xl mx-auto">
        
        {/* ヘッダーとコントロール（文字サイズ変更など） */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              日本語 語彙ドリル・検索
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              教科書準拠語彙を検索し、選択してそのまま宿題やドリルを作成できます。
            </p>
          </div>

          {/* 大・小 フォントサイズ切り替えボタン */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border shadow-sm">
            <span className="text-xs font-medium text-gray-500 px-2">表示サイズ:</span>
            <button
              onClick={() => setIsLargeFont(false)}
              className={`px-3 py-1 text-sm font-bold rounded ${
                !isLargeFont ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              小
            </button>
            <button
              onClick={() => setIsLargeFont(true)}
              className={`px-3 py-1 text-sm font-bold rounded ${
                isLargeFont ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              大
            </button>
          </div>
        </div>

        {/* 検索コントロール & フィルターバー */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              キーワード検索 (英語 / かな / 漢字)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="例: friend, ともだち, 友達..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* 教科書フィルター（データベースから動的生成） */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              教科書・教材
            </label>
            <select
              value={selectedBook}
              onChange={(e) => setSelectedBook(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
            >
              <option value="all">すべての教科書</option>
              {availableBooks.map((bookName) => (
                <option key={bookName} value={bookName}>
                  {bookName}
                </option>
              ))}
            </select>
          </div>

          {/* 学年フィルター */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              対象学年
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
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

        {/* 検索結果の件数表示 & 一括選択ボタン */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 px-1 gap-2">
          <p className="text-sm text-gray-600">
            検索結果: <span className="font-bold text-gray-900">{filteredVocabularies.length}</span> 語
            <span className="ml-3 text-indigo-600 font-semibold">（選択中: {selectedIds.length} 語）</span>
          </p>
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded font-bold text-gray-700 transition-colors"
          >
            表示中の単語をすべて選択/解除
          </button>
        </div>

        {/* 語彙カード・リスト一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVocabularies.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-indigo-50/70 border-indigo-500 shadow-md"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      {/* チェックボックス風インジケーター */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // 親divのonClickで処理するためダミー
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <div className={`font-bold text-gray-900 ${isLargeFont ? "text-3xl" : "text-xl"}`}>
                        {item.japanese}
                      </div>
                    </div>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      {item.category}
                    </span>
                  </div>

                  <div className={`text-gray-600 mb-2 pl-7 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                    <span className="text-gray-400 mr-2">読み:</span>
                    {item.kana} <span className="text-gray-400 text-xs ml-1">({item.romaji})</span>
                  </div>

                  <div className={`text-gray-800 font-medium mb-3 pl-7 ${isLargeFont ? "text-xl" : "text-base"}`}>
                    {item.english}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center text-xs text-gray-500 gap-2 pl-7">
                  <div className="flex flex-wrap gap-1">
                    {item.textbook_mappings?.map((m, idx) => (
                      <span key={idx} className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {m.book} ({m.ref})
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {item.year_levels?.map((yr: number) => (
                      <span key={yr} className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                        Y{yr}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 該当データがない場合 */}
        {filteredVocabularies.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-base">条件に一致する語彙が見つかりませんでした。</p>
          </div>
        )}

      </div>

      {/* 画面下部に固定する「選択した単語でドリル作成」フローティングバー */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 py-4 px-6 shadow-lg z-50 animate-slide-up">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-sm font-bold text-gray-800">
              🎯 <span className="text-indigo-600">{selectedIds.length} 語</span> の単語が選択されています
            </div>
            <button
              type="button"
              onClick={handleCreateDrillWithSelected}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow transition-colors text-sm"
            >
              この選択した単語でドリル（宿題）を作成する →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}