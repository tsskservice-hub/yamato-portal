import { useRef } from 'react';
/**
 * @file vocab-creator.tsx
 * @description AI Yamato Japanese Hub - vocab-creator.tsx
 */
import { generateModuleMeta } from '../utils/seoMeta';
import { ToolPageWrapper } from '../components/ToolPageWrapper';
import { type PageLayoutRef } from '../components/PageLayout';

import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { createServerSupabaseClient } from "../lib/supabase.server";
import { supabase } from "../lib/supabaseClient"; // ◀ クライアントサイド用のSupabaseインポート

interface Vocabulary {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  category: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const { data: portalData } = await supabase
    .from('portal_settings')
    .select('content')
    .eq('key', 'PORTAL_CONTENT')
    .single();

  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  
  const { data: vocabularies, error } = await serverSupabase
    .from("vocabularies")
    .select("id, japanese, kana, romaji, english, category")
    .order("id", { ascending: true });

  if (error) {
    throw new Response("Failed to fetch vocabularies", { status: 500 });
  }

  return json({ vocabularies: vocabularies || [] , portalContent: portalData?.content || null, currentPath: url.pathname });
}


export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return generateModuleMeta((data as any)?.portalContent || null, (data as any)?.currentPath || "");
};

export default function VocabCreatorPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const { vocabularies } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [drillMode, setDrillMode] = useState("mcq");
  const [taskType, setTaskType] = useState("homework");
  const [dueDate, setDueDate] = useState("");
  const [blockSchoolHours, setBlockSchoolHours] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 検索画面からの単語引き継ぎ
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedIds = sessionStorage.getItem("preselected_vocab_ids");
      if (savedIds) {
        try {
          const parsed = JSON.parse(savedIds);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedIds(parsed);
          }
        } catch (e) {
          console.error("Failed to parse preselected vocab IDs", e);
        }
        sessionStorage.removeItem("preselected_vocab_ids");
      }
    }
  }, []);

  // クライアントサイドでの保存処理（ボタンクリック時）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title || selectedIds.length === 0) {
      setErrorMessage("タイトルと1つ以上の単語選択が必要です。");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 現在ログイン中のユーザー情報をクライアント側で取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("ログインセッションが見つかりません。デバッグログイン等を確認してください。");
      }

      // 2. vocab_lists にインサート
      const { data: listData, error: listError } = await supabase
        .from("vocab_lists")
        .insert({ title, creator_name: creatorName, drill_mode: drillMode })
        .select("id")
        .single();

      if (listError || !listData) {
        throw new Error(`リストの作成に失敗しました: ${listError?.message}`);
      }

      const listId = listData.id;

      // 3. 選択された単語を vocab_list_items に一括登録
      const itemsToInsert = selectedIds.map((vocabId) => ({
        list_id: listId,
        vocabulary_id: vocabId,
      }));

      const { error: itemsError } = await supabase
        .from("vocab_list_items")
        .insert(itemsToInsert);

      if (itemsError) {
        throw new Error(`単語の紐付けに失敗しました: ${itemsError.message}`);
      }

      // 4. tasks テーブルへ配信データとして登録
      const { error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: title,
          task_type: taskType,
          content_type: 'vocab',
          content_id: listId,
          teacher_id: user.id,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          block_school_hours: blockSchoolHours,
          is_published: true,
        });

      if (taskError) {
        throw new Error(`課題の配信登録に失敗しました: ${taskError.message}`);
      }

      // 成功時の処理（URL生成）
      const baseUrl = window.location.origin;
      setCreatedUrl(`${baseUrl}/vocab-drill/${listId}`);
      setCopied(false);

    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMessage(err.message || "予期せぬエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          ドリルリスト作成・URL発行
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          選択された単語: <strong className="text-indigo-600">{selectedIds.length} 語</strong>
        </p>

        {/* 通常の Form ではなく onSubmit で処理 */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                リストのタイトル
              </label>
              <input
                type="text"
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
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="例: 山本先生"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                課題の種類 (Task Type)
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white font-medium text-gray-800"
              >
                <option value="homework">宿題 (Homework)</option>
                <option value="classwork">授業内課題 (Classwork)</option>
                <option value="quiz">小テスト (Quiz)</option>
                <option value="exam">定期試験 (Exam)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                提出期限 (Due Date) ※任意
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={blockSchoolHours}
                onChange={(e) => setBlockSchoolHours(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-bold text-amber-900">学校の授業時間中（平日の 9:00 〜 15:30）のアクセスを禁止する</span>
                <p className="text-xs text-amber-700">生徒が授業中に宿題を進めてしまわないよう、この時間帯はアクセスをブロックします。</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              学習モード（出題形式）の指定
            </label>
            <select
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
            <button
              type="submit"
              disabled={!title || selectedIds.length === 0 || isSubmitting}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors text-sm mt-2"
            >
              {isSubmitting ? "作成中..." : `選択した ${selectedIds.length} 語でドリルURLを発行する`}
            </button>
          </div>

          {errorMessage && (
            <p className="text-red-600 text-sm">{errorMessage}</p>
          )}
        </form>

        {createdUrl && (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm mb-6">
            <h2 className="text-base font-bold text-emerald-900 mb-1">🎉 ドリルURLが作成されました！</h2>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-3">
              <input
                type="text"
                readOnly
                value={createdUrl}
                className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm text-gray-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
              >
                {copied ? "コピーしました！" : "URLをコピー"}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4 gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="単語を検索して絞り込む..."
              className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-bold text-gray-700 whitespace-nowrap"
            >
              表示中をすべて選択/解除
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1 border rounded-lg bg-gray-50">
            {filteredVocabularies.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected ? "bg-indigo-50 border-indigo-500 shadow-sm" : "bg-white border-gray-200 hover:border-gray-300"
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
    </ToolPageWrapper>
  );
}