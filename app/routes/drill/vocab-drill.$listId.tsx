import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useMemo, useEffect } from "react";
import { createServerSupabaseClient } from '~/lib/supabase.server';

interface Vocabulary {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  category: string;
}

type DrillMode = "mcq" | "audio_en_typing" | "jp_en_typing" | "en_jp_typing";

// カンマ区切りの英語訳を綺麗に分解・正規化するヘルパー関数
function parseEnglishAnswers(rawEnglishText: string): string[] {
  if (!rawEnglishText) return [];
  return rawEnglishText
    .replace(/、/g, ",") // 全角カンマが混ざっていても半角に統一
    .split(",")          // カンマで分割
    .map((s) => s.trim().toLowerCase()) // 前後の空白削除 ＆ 小文字化
    .filter(Boolean);    // 空文字を除外
}

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { listId } = params;
  const { supabase } = createServerSupabaseClient(request, context);

  // 1. リストのメタ情報取得 (drill_mode も含む)
  const { data: listMeta, error: metaError } = await supabase
    .from("vocab_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (metaError || !listMeta) {
    throw new Response("Drill list not found", { status: 404 });
  }

  // 2. このリストに紐づくタスク（tasks）のIDとブロック設定を取得
  const { data: taskData } = await supabase
    .from("tasks")
    .select("id, block_school_hours")
    .eq("content_id", listId)
    .eq("content_type", "vocab")
    .single();

  // ★ 授業中のアクセスブロック判定 ＆ デバッグログ出力
  if (taskData?.block_school_hours) {
    const now = new Date();

    // オーストラリア（メルボルンなど）の現地時間を正確に取得
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Melbourne', // 必要に応じて地域のタイムゾーンに変更してください
      weekday: 'short', // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    let weekday = '';
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekday = part.value;
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const isWeekday = weekdays.includes(weekday);
    const currentTimeMinutes = hour * 60 + minute;
    const isSchoolHours = currentTimeMinutes >= 540 && currentTimeMinutes <= 930; // 9:00 (540分) 〜 15:30 (930分)

    // デバッグ用ログ（ターミナルに表示されます）
    console.log("=== 授業中アクセスブロック判定 ===");
    console.log("判定基準タイムゾーン: Australia/Melbourne");
    console.log(`曜日: ${weekday} (平日か: ${isWeekday})`);
    console.log(`時刻: ${hour}:${minute} (${currentTimeMinutes}分)`);
    console.log(`学校時間内(9:00〜15:30)か: ${isSchoolHours}`);
    console.log(`ブロック発動するか: ${isWeekday && isSchoolHours}`);

    if (isWeekday && isSchoolHours) {
      throw new Response(
        "この宿題は学校の授業時間中（9:00 〜 15:30）はアクセスできません。放課後（15:30以降）に取り組んでください。",
        { status: 403 }
      );
    }
  }

  // 3. リストに紐づく単語を取得
  const { data: listItems, error: itemsError } = await supabase
    .from("vocab_list_items")
    .select(`
      vocabularies (
        id,
        japanese,
        kana,
        romaji,
        english,
        category
      )
    `)
    .eq("list_id", listId);

  if (itemsError || !listItems) {
    throw new Response("Failed to fetch drill items", { status: 500 });
  }

  const vocabularies: Vocabulary[] = listItems
    .map((item: any) => item.vocabularies)
    .filter(Boolean);

  return json({ listMeta, taskId: taskData?.id || null, vocabularies });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { supabase } = createServerSupabaseClient(request, context);

  // ログイン中の生徒の情報を取得
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const formData = await request.formData();
  const taskId = formData.get("taskId") as string;
  const score = Number(formData.get("score"));

  if (!taskId) {
    return json({ success: true });
  }

  const { error: submitError } = await supabase
    .from("task_submissions")
    .upsert({
      task_id: taskId,
      student_id: user.id,
      status: "completed",
      score: score,
      completed_at: new Date().toISOString(),
    }, {
      onConflict: "task_id, student_id",
    });

  if (submitError) {
    console.error("task_submissions save error:", submitError);
    return json({ error: "成績の保存に失敗しました。" }, { status: 500 });
  }

  return json({ success: true });
}

export default function DrillSessionPage() {
  const { listMeta, taskId, vocabularies } = useLoaderData<typeof loader>();
  const submitFetcher = useFetcher();

  const mode: DrillMode = (listMeta.drill_mode as DrillMode) || "mcq";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [isFinished, setIsFinished] = useState(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);

  const currentItem = vocabularies[currentIndex];

  const speakJapanese = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (mode === "audio_en_typing" && currentItem && !isFinished && !isAnswered) {
      speakJapanese(currentItem.japanese);
    }
  }, [currentIndex, mode, isFinished, currentItem, isAnswered]);

  const options = useMemo(() => {
    if (!currentItem || mode !== "mcq") return [];
    const others = vocabularies.filter((v) => v.id !== currentItem.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
    const dummyOptions = shuffledOthers.slice(0, 3).map((v) => v.japanese);
    return [...dummyOptions, currentItem.japanese].sort(() => 0.5 - Math.random());
  }, [currentIndex, vocabularies, mode, currentItem]);

  useEffect(() => {
    if (isFinished && !hasSubmittedScore && taskId) {
      setHasSubmittedScore(true);
      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("score", score.toString());
      submitFetcher.submit(formData, { method: "post" });
    }
  }, [isFinished, hasSubmittedScore, taskId, score, submitFetcher]);

  if (vocabularies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-sm text-center">
          <p className="text-gray-600">このリストには有効な単語が登録されていません。</p>
        </div>
      </div>
    );
  }

  const getModeLabel = (m: DrillMode) => {
    switch (m) {
      case "mcq": return "4択選択式 (英語 → 日本語)";
      case "audio_en_typing": return "音声リスニング ➔ 英語タイピング";
      case "jp_en_typing": return "日本語表記 ➔ 英語タイピング";
      case "en_jp_typing": return "英語 ➔ 日本語タイピング";
      default: return "";
    }
  };

  const handleSelectOption = (option: string) => {
    if (selectedAnswer !== null) return;
    const correct = option === currentItem.japanese;
    setSelectedAnswer(option);
    setIsCorrect(correct);
    if (correct) setScore(score + 1);
  };

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswered) return;

    let correctCondition = false;
    const userClean = inputText.trim().toLowerCase();

    if (mode === "audio_en_typing" || mode === "jp_en_typing") {
      const possibleAnswers = parseEnglishAnswers(currentItem.english);
      correctCondition = possibleAnswers.includes(userClean);
    } else if (mode === "en_jp_typing") {
      const jpClean = currentItem.japanese.trim();
      const kanaClean = currentItem.kana.trim();
      const romajiClean = currentItem.romaji.trim().toLowerCase();
      correctCondition = 
        userClean === jpClean.toLowerCase() || 
        userClean === kanaClean.toLowerCase() || 
        userClean === romajiClean;
    }

    setIsCorrect(correctCondition);
    setIsAnswered(true);
    if (correctCondition) setScore(score + 1);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setInputText("");
    setIsAnswered(false);
    setIsCorrect(null);

    if (currentIndex + 1 < vocabularies.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  const restartDrill = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setInputText("");
    setIsAnswered(false);
    setIsCorrect(null);
    setIsFinished(false);
    setHasSubmittedScore(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
          
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900">
                {listMeta.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {listMeta.creator_name && (
                  <span className="text-xs text-gray-500">作成者: {listMeta.creator_name}</span>
                )}
                <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                  {getModeLabel(mode)}
                </span>
              </div>
            </div>
            {!isFinished && (
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full whitespace-nowrap">
                {currentIndex + 1} / {vocabularies.length} 問
              </span>
            )}
          </div>

          {!isFinished ? (
            <div>
              {mode === "mcq" && (
                <div>
                  <div className="text-center my-6">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
                      この単語の意味は？
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">
                      {currentItem.english}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-6">
                    {options.map((opt, idx) => {
                      let btnStyle = "bg-white border-gray-200 hover:bg-gray-50 text-gray-800";
                      if (selectedAnswer !== null) {
                        if (opt === currentItem.japanese) {
                          btnStyle = "bg-emerald-100 border-emerald-500 text-emerald-800 font-bold";
                        } else if (opt === selectedAnswer) {
                          btnStyle = "bg-rose-100 border-rose-500 text-rose-800";
                        } else {
                          btnStyle = "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
                        }
                      }
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(opt)}
                          disabled={selectedAnswer !== null}
                          className={`p-4 rounded-xl border-2 text-lg font-medium transition-all text-left shadow-sm ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {selectedAnswer !== null && (
                    <div className="text-center animate-fade-in">
                      <p className={`text-lg font-bold mb-4 ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                        {isCorrect ? "正解！ 🎉" : `不正解... (正解: ${currentItem.japanese})`}
                      </p>
                      <button
                        onClick={handleNext}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors"
                      >
                        {currentIndex + 1 < vocabularies.length ? "次の問題へ" : "結果を見る"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(mode === "audio_en_typing" || mode === "jp_en_typing" || mode === "en_jp_typing") && (
                <div>
                  <div className="text-center my-6">
                    {mode === "audio_en_typing" && (
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-2">
                          音声を聞いて英語をタイプしてください
                        </span>
                        <button
                          type="button"
                          onClick={() => speakJapanese(currentItem.japanese)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-full shadow inline-flex items-center gap-2 text-sm transition-transform active:scale-95"
                        >
                          🔊 音声を再生する
                        </button>
                      </div>
                    )}

                    {mode === "jp_en_typing" && (
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
                          この日本語の英単語は？
                        </span>
                        <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">
                          {currentItem.japanese}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">読み: {currentItem.kana}</div>
                      </div>
                    )}

                    {mode === "en_jp_typing" && (
                      <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
                          この英語の日本語（かな・ローマ字）は？
                        </span>
                        <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">
                          {currentItem.english}
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleTypingSubmit} className="mb-6">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isAnswered}
                        placeholder={
                          mode === "en_jp_typing"
                            ? "例: ともだち (または tomodachi)"
                            : "例: friend"
                        }
                        autoFocus
                        autoComplete="off"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg focus:border-indigo-600 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isAnswered || !inputText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold px-6 rounded-xl transition-colors whitespace-nowrap"
                      >
                        解答
                      </button>
                    </div>
                  </form>

                  {isAnswered && (
                    <div className="text-center animate-fade-in">
                      <p className={`text-lg font-bold mb-4 ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                        {isCorrect ? "正解！ 🎉" : `不正解...`}
                      </p>
                      {!isCorrect && (
                        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4">
                          正解の答え: <strong className="text-indigo-600">
                            {mode === "en_jp_typing" ? `${currentItem.japanese} (${currentItem.kana})` : currentItem.english}
                          </strong>
                        </div>
                      )}
                      <button
                        onClick={handleNext}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors"
                      >
                        {currentIndex + 1 < vocabularies.length ? "次の問題へ" : "結果を見る"}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ドリル終了！お疲れ様でした</h2>
              <p className="text-gray-600 mb-2">
                正解数: <strong className="text-2xl text-indigo-600">{score}</strong> / {vocabularies.length} 問
              </p>
              {taskId && (
                <p className="text-xs text-emerald-600 font-semibold mb-6">
                  {submitFetcher.state === "submitting" ? "成績を保存中..." : "✓ 成績が教師に送信されました"}
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={restartDrill}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors text-sm"
                >
                  もう一度挑戦する
                </button>
                <a
                  href="/vocab"
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm inline-flex items-center"
                >
                  検索トップに戻る
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}