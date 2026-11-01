import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { createServerSupabaseClient } from "../lib/supabase.server";

interface Vocabulary {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  category: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { supabase } = createServerSupabaseClient(request, context);
  
  // 登録されている全語彙を取得してリスト化する
  const { data: vocabularies, error } = await supabase
    .from("vocabularies")
    .select("id, japanese, kana, romaji, english, category")
    .order("id", { ascending: true });

  if (error) {
    throw new Response("Failed to fetch vocabularies", { status: 500 });
  }

  return json({ vocabularies: vocabularies || [] });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { supabase } = createServerSupabaseClient(request, context);
  const formData = await request.formData();
  
  const title = formData.get("title") as string;
  const creatorName = formData.get("creatorName") as string;
  const selectedIdsString = formData.get("selectedIds") as string;
  
  const selectedIds: string[] = selectedIdsString ? JSON.parse(selectedIdsString) : [];

  if (!title || selectedIds.length === 0) {
    return json({ error: "タイトルと1つ以上の単語選択が必要です。" }, { status: 400 });
  }

  // 1. vocab_lists に親データをインサート
  const { data: listData, error: listError } = await supabase
    .from("vocab_lists")
    .insert({ title, creator_name: creatorName })
    .select("id")
    .single();

  if (listError || !listData) {
    return json({ error: "リストの作成に失敗しました。" }, { status: 500 });
  }

  const listId = listData.id;

  // 2. 選択された単語を vocab_list_items に一括登録
  const itemsToInsert = selectedIds.map((vocabId) => ({
    list_id: listId,
    vocabulary_id: vocabId,
  }));

  const { error: itemsError } = await supabase
    .from("vocab_list_items")
    .insert(itemsToInsert);

  if (itemsError) {
    return json({ error: "単語の紐付けに失敗しました。" }, { status: 500 });
  }

  // 作成完了したら生成されたドリル画面へリダイレクト
  return redirect(`/vocab/drill/${listId}`);
}

export default function VocabCreatorPage() {
  const { vocabularies } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // 単語の選択 / 解除の切り替え
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // すべて選択 / 解除
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredVocabularies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVocabularies.map((v) => v.id));
    }
  };

  // 検索フィルタリング
  const filteredVocabularies = vocabularies.filter(
    (item) =>
      item.japanese.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kana.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.english.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          ドリルリスト作成・URL発行
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          授業や課題で出題したい単語を選択し、共有用のドリルURLを発行します。
        </p>

        <form method="post" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              リストのタイトル
            </label>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: Year 7 Term 3 Week 2 復習テスト"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                作成者（先生の名前など）
              </label>
              <input
                type="text"
                name="creatorName"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="例: 山本先生"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-end">
              <input type="hidden" name="selectedIds" value={JSON.stringify(selectedIds)} />
              <button
                type="submit"
                disabled={!title || selectedIds.length === 0}
                className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors text-sm"
              >
                選択した {selectedIds.length} 語でドリルURLを発行する
              </button>
            </div>
          </div>

          {fetcher.data?.error && (
            <p className="text-red-600 text-sm">{fetcher.data.error}</p>
          )}
        </form>

        {/* 単語選択エリア */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="単語を検索して絞り込む..."
              className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                選択中: <strong className="text-indigo-600">{selectedIds.length}</strong> 語
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-bold text-gray-700"
              >
                表示中をすべて選択/解除
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1 border rounded-lg bg-gray-50">
            {filteredVocabularies.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-500 shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-gray-900">{item.japanese}</div>
                    <div className="text-xs text-gray-500">{item.kana} ({item.romaji})</div>
                  </div>
                  <div className="text-xs font-medium text-gray-700 mt-2">{item.english}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}