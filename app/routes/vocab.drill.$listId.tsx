import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { useState, useMemo } from "react";
import { createServerSupabaseClient } from "../lib/supabase.server";

interface Vocabulary {
  id: string;
  japanese: string;
  kana: string;
  romaji: string;
  english: string;
  category: string;
}

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  const { listId } = params;
  const { supabase } = createServerSupabaseClient(request, context);

  // 1. リストのメタ情報取得
  const { data: listMeta, error: metaError } = await supabase
    .from("vocab_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (metaError || !listMeta) {
    throw new Response("Drill list not found", { status: 404 });
  }

  // 2. リストに紐づく単語を取得
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // 現在の問題
  const currentItem = vocabularies[currentIndex];

  // 4択の選択肢をランダムに生成する（正解1つ + ダミー3つ）
  const options = useMemo(() => {
    if (!currentItem) return [];
    
    // 他の単語からダミーを抽出
    const others = vocabularies.filter((v) => v.id !== currentItem.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random());
    const dummyOptions = shuffledOthers.slice(0, 3).map((v) => v.japanese);

    // 正解を混ぜてシャッフル
    const allOpts = [...dummyOptions, currentItem.japanese];
    return allOpts.sort(() => 0.5 - Math.random());
  }, [currentIndex, vocabularies, currentItem]);

  if (vocabularies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-sm text-center">
          <p className="text-gray-600">このリストには有効な単語が登録されていません。</p>
        </div>
      </div>
    );
  }

  const handleSelectOption = (option: string) => {
    if (selectedAnswer !== null) return; // すでに解答済みの場合は何もしない

    const correct = option === currentItem.japanese;
    setSelectedAnswer(option);
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
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
            {!isFinished && (
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {currentIndex + 1} / {vocabularies.length} 問
              </span>
            )}
          </div>

          {!isFinished ? (
            <div>
              {/* 問題表示（英語） */}
              <div className="text-center my-8">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-1">
                  この単語の意味は？
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600">
                  {currentItem.english}
                </div>
              </div>

              {/* 4択ボタン */}
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

              {/* 解答後のフィードバックと「次へ」ボタン */}
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
          ) : (
            /* 結果発表画面 */
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ドリル終了！お疲れ様でした</h2>
              <p className="text-gray-600 mb-6">
                正解数: <strong className="text-2xl text-indigo-600">{score}</strong> / {vocabularies.length} 問
              </p>
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