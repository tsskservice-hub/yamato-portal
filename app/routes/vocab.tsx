import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
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
  // サーバーサイド用 Supabase クライアントの生成
  const { supabase } = createServerSupabaseClient(request, context);

  // Supabase から語彙データと教科書マッピングを結合して取得
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

  return json({ vocabularies: vocabularies || [] });
}

export default function VocabIndexPage() {
  const { vocabularies } = useLoaderData<typeof loader>();
  
  // 検索キーワードとフィルター用の状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  // フォントサイズ切り替え（大・小ボタン用）
  const [isLargeFont, setIsLargeFont] = useState(false);

  // リアルタイムフィルタリングロジック
  const filteredVocabularies = vocabularies.filter((item) => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* ヘッダーとコントロール（文字サイズ変更など） */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              日本語 語彙ドリル・検索
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              7〜10年生の教科書準拠語彙をすぐに検索・確認できます。
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
          {/* キーワード検索 */}
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

          {/* 教科書フィルター */}
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
              <option value="Obento Deluxe">Obento Deluxe</option>
              {/* 必要に応じて追加 */}
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
            </select>
          </div>
        </div>

        {/* 検索結果の件数表示 */}
        <div className="flex justify-between items-center mb-4 px-1">
          <p className="text-sm text-gray-600">
            検索結果: <span className="font-bold text-gray-900">{filteredVocabularies.length}</span> 語
          </p>
        </div>

        {/* 語彙カード・リスト一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVocabularies.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  {/* 日本語表記 */}
                  <div className={`font-bold text-gray-900 ${isLargeFont ? "text-3xl" : "text-xl"}`}>
                    {item.japanese}
                  </div>
                  {/* カテゴリバッジ */}
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    {item.category}
                  </span>
                </div>

                {/* かな・ローマ字 */}
                <div className={`text-gray-600 mb-2 ${isLargeFont ? "text-lg" : "text-sm"}`}>
                  <span className="text-gray-400 mr-2">読み:</span>
                  {item.kana} <span className="text-gray-400 text-xs ml-1">({item.romaji})</span>
                </div>

                {/* 英語訳 */}
                <div className={`text-gray-800 font-medium mb-3 ${isLargeFont ? "text-xl" : "text-base"}`}>
                  {item.english}
                </div>
              </div>

              {/* フッター（教科書マッピングと学年） */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center text-xs text-gray-500 gap-2">
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
          ))}
        </div>

        {/* 該当データがない場合 */}
        {filteredVocabularies.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-base">条件に一致する語彙が見つかりませんでした。</p>
          </div>
        )}

      </div>
    </div>
  );
}