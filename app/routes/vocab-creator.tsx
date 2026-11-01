import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
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
  const drillMode = formData.get("drillMode") as string || "mcq";
  const selectedIdsString = formData.get("selectedIds") as string;
  
  const selectedIds: string[] = selectedIdsString ? JSON.parse(selectedIdsString) : [];

  if (!title || selectedIds.length === 0) {
    return json({ error: "タイトルと1つ以上の単語選択が必要です。" }, { status: 400 });
  }

  try {
    // 1. vocab_lists に親データと drill_mode をインサート
    const { data: listData, error: listError } = await supabase
      .from("vocab_lists")
      .insert({ title, creator_name: creatorName, drill_mode: drillMode })
      .select("id")
      .single();

    if (listError) {
      console.error("vocab_lists insert error:", listError);
      return json({ error: `リストの作成に失敗しました: ${listError.message}` }, { status: 500 });
    }

    if (!listData) {
      return json({ error: "リストの作成に失敗しました（データなし）。" }, { status: 500 });
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
      console.error("vocab_list_items insert error:", itemsError);
      return json({ error: `単語の紐付けに失敗しました: ${itemsError.message}` }, { status: 500 });
    }

    return json({ success: true, listId });
  } catch (err: any) {
    console.error("Unexpected action error:", err);
    return json({ error: `予期せぬエラーが発生しました: ${err?.message || err}` }, { status: 500 });
  }
}

export default function VocabCreatorPage() {
  const { vocabularies } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [drillMode, setDrillMode] = useState("mcq");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (fetcher.data && typeof fetcher.data === "object" && "success" in fetcher.data && fetcher.data.success && "listId" in fetcher.data) {
      const baseUrl = window.location.origin;
      setCreatedUrl(`${baseUrl}/vocab-drill/${fetcher.data.listId}`);
      setCopied(false);
    }
  }, [fetcher.data]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredVocabularies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVocabularies.map((v) => v.id));
    }
  };

  const handleCopy = () => {
    if (createdUrl) {
      navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          授業や課題で出題したい単語を選択し、学習モードを指定した共有用ドリルURLを発行します。
        </p>

        {/* 作成フォーム */}
        <fetcher.Form method="post" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                リストのタイトル
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: Year 7 Term 3 復習テスト"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

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
          </div>

          {/* 学習モード選択 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              学習モード（出題形式）の指定
            </label>
            <select
              name="drillMode"
              value={drillMode}
              onChange={(e) => setDrillMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-800"
            >
              <option value="mcq">① 4択選択式 (英語 → 日本語)</option>
              <option value="audio_en_typing">② 音声リスニング ➔ 英語タイピング (Dictation)</option>
              <option value="jp_en_typing">③ 日本語表記 ➔ 英語タイピング (Reading)</option>
              <option value="en_jp_typing">④ 英語 ➔ 日本語タイピング</option>
            </select>
          </div>

          <div>
            <input type="hidden" name="selectedIds" value={JSON.stringify(selectedIds)} />
            <button
              type="submit"
              disabled={!title || selectedIds.length === 0 || fetcher.state === "submitting"}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors text-sm mt-2"
            >
              {fetcher.state === "submitting" ? "作成中..." : `選択した ${selectedIds.length} 語でドリルURLを発行する`}
            </button>
          </div>

          {fetcher.data && typeof fetcher.data === "object" && "error" in fetcher.data && (
            <p className="text-red-600 text-sm">{(fetcher.data as any).error}</p>
          )}
        </fetcher.Form>

        {/* 発行されたURL表示エリア */}
        {createdUrl && (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm mb-6 animate-fade-in">
            <h2 className="text-base font-bold text-emerald-900 mb-1">
              🎉 ドリルURLが作成されました！
            </h2>
            <p className="text-xs text-emerald-700 mb-4">
              以下のURLをコピーして生徒に共有してください。
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                readOnly
                value={createdUrl}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm text-gray-700 select-all"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                >
                  {copied ? "コピーしました！" : "URLをコピー"}
                </button>
                <a
                  href={createdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors text-center whitespace-nowrap"
                >
                  ドリルを開く ↗
                </a>
              </div>
            </div>
          </div>
        )}

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