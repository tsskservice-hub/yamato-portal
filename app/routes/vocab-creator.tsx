/**
 * @file app/routes/vocab-creator.tsx
 * @description AI Yamato Japanese Hub - 語彙クイズ作成（教師・生徒共通 / edu_vocab_lists / edu_tasks 統合版）
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { useLoaderData, useNavigate } from "@remix-run/react";
import React, { useState, useEffect, useRef } from "react";
import { createServerSupabaseClient } from '~/lib/supabase.server';
import { supabase } from '~/lib/supabaseClient';
import { ToolPageWrapper } from '~/components/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/PageLayout';
import { generateModuleMeta } from '~/utils/seoMeta';

interface Vocabulary {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  category?: string;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const { supabase: serverSupabase } = createServerSupabaseClient(request, context);
  
  let portalContent = null;
  try {
    const { data: portalData } = await serverSupabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  // 1. ログインユーザーの教師権限を判定
  let isTeacher = false;
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (user) {
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('is_teacher')
      .eq('id', user.id)
      .maybeSingle();
    if (profile && (profile as any).is_teacher) {
      isTeacher = true;
    }
  }

  // 2. edu_vocabulary テーブルから語彙データを取得
  const { data: vocabularies, error } = await serverSupabase
    .from("edu_vocabulary")
    .select("id, japanese, kana, romaji, english, category")
    .order("order_index", { ascending: true });

  if (error) {
    console.warn("Failed to fetch edu_vocabulary:", error.message);
  }

  return json({
    vocabularies: vocabularies || [],
    isTeacher,
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function VocabCreatorPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const { vocabularies, isTeacher } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [title, setTitle] = useState(isTeacher ? "Obento Unit 4 Lesson 1 語彙確認テスト" : "マイ復習用 語彙ドリル");
  const [creatorName, setCreatorName] = useState(isTeacher ? "Yamato Teacher" : "Student Practice");
  const [drillMode, setDrillMode] = useState("mcq");
  const [taskType, setTaskType] = useState("quiz");
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
      // 1. 現在ログイン中のユーザー情報を取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("ログインセッションが見つかりません。");
      }

      // 2. edu_vocab_lists にインサート
      const { data: listData, error: listError } = await supabase
        .from("edu_vocab_lists")
        .insert({ title, creator_name: creatorName, drill_mode: drillMode })
        .select("id")
        .single();

      if (listError || !listData) {
        throw new Error(`edu_vocab_lists へのリスト作成に失敗しました: ${listError?.message}`);
      }

      const listId = listData.id;

      // 3. 選択された単語を edu_vocab_list_items に一括登録
      const itemsToInsert = selectedIds.map((vocabId) => ({
        list_id: listId,
        vocabulary_id: vocabId,
      }));

      const { error: itemsError } = await supabase
        .from("edu_vocab_list_items")
        .insert(itemsToInsert);

      if (itemsError) {
        throw new Error(`edu_vocab_list_items への単語紐付けに失敗しました: ${itemsError.message}`);
      }

      // 4. 教師の場合のみ、edu_tasks テーブルへ配信データとして登録（生徒の場合は自主学習用なので登録をスキップ）
      if (isTeacher) {
        const { error: taskError } = await supabase
          .from("edu_tasks")
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
          throw new Error(`edu_tasks への課題配信登録に失敗しました: ${taskError.message}`);
        }
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
      (item.japanese && item.japanese.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.kana && item.kana.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.english && item.english.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
              📝 {isTeacher ? "語彙クイズ・テスト作成 (教師用アサイン)" : "自主復習用 語彙ドリル作成"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {isTeacher
                ? "選択した単語から小テストや宿題を作成し、クラスへ配信します。"
                : "選択した単語から、あなただけの復習用ドリルを作成して練習できます。"}
              選択中: <strong className="text-orange-600">{selectedIds.length} 語</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  ドリルのタイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 自分の復習用テスト"
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  作成者名
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="例: あなたのお名前"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* 教師の場合のみ、課題の種類や提出期限、学校時間ブロックの設定を表示 */}
            {isTeacher && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      課題の種類 (Task Type)
                    </label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="homework">宿題 (Homework)</option>
                      <option value="classwork">授業内課題 (Classwork)</option>
                      <option value="quiz">小テスト (Quiz)</option>
                      <option value="exam">定期試験 (Exam)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      提出期限 (Due Date) ※任意
                    </label>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blockSchoolHours}
                      onChange={(e) => setBlockSchoolHours(e.target.checked)}
                      className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300">学校の授業時間中（平日の 9:00 〜 15:30）のアクセスをブロックする</span>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">授業中に生徒がスマホ等で遊んでしまわないように制限します。</p>
                    </div>
                  </label>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                学習モード（出題形式）の指定
              </label>
              <select
                value={drillMode}
                onChange={(e) => setDrillMode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200"
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl disabled:bg-slate-300 dark:disabled:bg-slate-800 transition-colors text-xs uppercase tracking-wider cursor-pointer shadow-sm mt-2"
              >
                {isSubmitting ? "作成中..." : (isTeacher ? `選択した ${selectedIds.length} 語で課題を配信・URLを発行する` : `選択した ${selectedIds.length} 語で復習ドリルを作成する`)}
              </button>
            </div>

            {errorMessage && (
              <p className="text-red-600 dark:text-red-400 text-xs font-bold">{errorMessage}</p>
            )}
          </form>

          {createdUrl && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-6 rounded-3xl shadow-sm space-y-3">
              <h2 className="text-sm font-black text-emerald-900 dark:text-emerald-300">🎉 復習ドリルの作成とURLの発行が完了しました！</h2>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  readOnly
                  value={createdUrl}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copied ? "コピーしました！" : "URLをコピー"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="語彙を検索して絞り込む（例: お父さん、人...）"
                className="w-full sm:w-80 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
              >
                表示中をすべて選択/解除
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950">
              {filteredVocabularies.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected 
                        ? "bg-orange-50 dark:bg-orange-950/40 border-orange-400 dark:border-orange-600 shadow-sm" 
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.japanese}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.kana} ({item.romaji})</div>
                    </div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-2">{item.english}</div>
                  </div>
                );
              })}
              {filteredVocabularies.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                  該当する語彙が見つかりません。Supabaseの `edu_vocabulary` テーブルにデータを登録してください。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolPageWrapper>
  );
}