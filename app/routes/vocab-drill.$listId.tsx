import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useState, useMemo, useEffect } from "react";
import { createServerSupabaseClient } from "../lib/supabase.server";

interface Vocabulary {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  category: string;
}

type DrillMode = "mcq" | "audio_en_typing" | "jp_en_typing" | "en_jp_typing";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { listId } = params;
  const { supabase } = createServerSupabaseClient(request, context);

  const { data: listMeta, error: metaError } = await supabase
    .from("vocab_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (metaError || !listMeta) {
    throw new Response("Drill list not found", { status: 404 });
  }

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

  return json({ listMeta, vocabularies });
}

export default function DrillSessionPage() {
  const { listMeta, vocabularies } = useLoaderData<typeof loader>();

  // モード選択 ("select" はモード選択画面)
  const [mode, setMode] = useState<DrillMode | "select">("select");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  
  // 4択用
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  
  // タイピング用
  const [inputText, setInputText] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const [isFinished, setIsFinished] = useState(false);

  const currentItem = vocabularies[currentIndex];

  // 日本語音声を読み上げる関数 (Web Speech API)
  const speakJapanese = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); // 連続再生防止
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // モードがリスニングに変わったとき、自動で音声を再生
  useEffect(() => {
    if (mode === "audio_en_typing" && currentItem && !isFinished && !isAnswered) {
      speakJapanese(currentItem.japanese);
    }
  }, [currentIndex, mode, isFinished]);

  // 4択の選択肢生成
  const options = useMemo(() => {
    if (!currentItem || mode !== "mcq") return [];
    const others = vocabularies.filter((v) => v.id !== currentItem.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
    const dummyOptions = shuffledOthers.slice(0, 3).map((v) => v.japanese);
    return [...dummyOptions, currentItem.japanese].sort(() => 0.5 - Math.random());
  }, [currentIndex, vocabularies, mode, currentItem]);

  if (vocabularies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-sm text-center">
          <p className="text-gray-600">このリストには有効な単語が登録されていません。</p>
        </div>
      </div>
    );
  }

  // 4択の解答処理
  const handleSelectOption = (option: string) => {
    if (selectedAnswer !== null) return;
    const correct = option === currentItem.japanese;
    setSelectedAnswer(option);
    setIsCorrect(correct);
    if (correct) setScore(score + 1);
  };

  // タイピングの解答判定処理
  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnswered) return;

    let correctCondition = false;
    const userClean = inputText.trim().toLowerCase();

    if (mode === "audio_en_typing" || mode === "jp_en_typing") {
      // 英語を入力させるモード (英単語やスペース区切りの答えに対応)
      const targetEnglish = currentItem.english.trim().toLowerCase();
      // カンマ区切りの複数訳がある場合を考慮
      const possibleAnswers = targetEnglish.split(/[,/]/).map(s => s.trim());
      correctCondition = possibleAnswers.includes(userClean);
    } else if (mode === "en_jp_typing") {
      // 日本語（かな、あるいは漢字・ローマ字）を入力させるモード
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
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
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
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
          
          {/* ヘッダー情報 */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-gray-900">
                {listMeta.title}
              </h1>
              {listMeta.creator_name && (
                <p className="text-xs text-gray-500 mt-0.5">作成者: {listMeta.creator_name}</p>
              )}
            </div>
            {mode !== "select" && !isFinished && (
              <button
                onClick={() => { setMode("select"); restartDrill(); }}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1 rounded-lg"
              >
                モード変更
              </button>
            )}
          </div>

          {/* 1. モード選択画面 */}
          {mode === "select" ? (
            <div className="py-4">
              <h2 className="text-base font-bold text-gray-800 mb-4 text-center">学習モードを選んでください</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setMode("mcq")}
                  className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-left transition-all"
                >
                  <div className="font-bold text-indigo-900">① 4択選択式 (英語 → 日本語)</div>
                  <div className="text-xs text-indigo-700 mt-0.5">英語を見て、正しい日本語の意味を選択します。</div>
                </button>

                <button
                  onClick={() => setMode("audio_en_typing")}
                  className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-all"
                >
                  <div className="font-bold text-emerald-900">② 日本語音声 ➔ 英語タイピング (Dictation)</div>
                  <div className="text-xs text-emerald-700 mt-0.5">音声を聞いて、対応する英単語をタイプします。</div>
                </button>

                <button
                  onClick={() => setMode("jp_en_typing")}
                  className="w-full p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all"
                >
                  <div className="font-bold text-amber-900">③ 日本語表記 ➔ 英語タイピング (Reading)</div>
                  <div className="text-xs text-amber-700 mt-0.5">漢字・かなを見て、対応する英単語をタイプします。</div>
                </button>

                <button
                  onClick={() => setMode("en_jp_typing")}
                  className="w-full p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition-all"
                >
                  <div className="font-bold text-purple-900">④ 英語 ➔ 日本語タイピング</div>
                  <div className="text-xs text-purple-700 mt-0.5">英語を見て、対応する日本語（かな・ローマ字）をタイプします。</div>
                </button>
              </div>
            </div>
          ) : !isFinished ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  問題 {currentIndex + 1} / {vocabularies.length}
                </span>
              </div>

              {/* モードごとの出題エリア */}
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

              {/* タイピング系共通レイアウト */}
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
            /* 結果発表画面 */
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ドリル終了！お疲れ様でした</h2>
              <p className="text-gray-600 mb-6">
                正解数: <strong className="text-2xl text-indigo-600">{score}</strong> / {vocabularies.length} 問
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={restartDrill}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors text-sm"
                >
                  同じモードでもう一度
                </button>
                <button
                  onClick={() => { setMode("select"); restartDrill(); }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm"
                >
                  モードを選び直す
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}