/**
 * @file game-igo.tsx
 * @description ミニ5路 囲碁対局ページ（確実な石取り・クリーンアップ処理・AI投了判定対応版）
 */
import React, { useState, useEffect, useRef } from 'react';
import type { MetaFunction } from "@remix-run/react";
import { useNavigate } from "@remix-run/react";
import PageLayout from "../components/PageLayout";
import { supabase } from "../lib/supabaseClient";
import { Loader2, RotateCcw, Swords, GraduationCap, Flag } from "lucide-react";

import { calculateAiMove, shouldAiResign } from "../lib/igoAlgorithm";
import { getRandomComment } from "../data/igoFreeComments";

export const meta: MetaFunction = () => {
  return [
    { title: "ミニ5路 囲碁 | JPTutor AI Yamato" },
    { name: "description", content: "Enjoy 5x5 Go teaching games and free matches with AI Yamato-sensei." },
  ];
};

/**
 * 盤面上のすべての石のグループ（連）と、その呼吸点（リバティ）を計算する関数
 */
function findAllGroups(board: number[][], color: number) {
  const SIZE = board.length;
  const visited: boolean[][] = Array(SIZE).fill(false).map(() => Array(SIZE).fill(false));
  const groups: { stones: [number, number][]; liberties: Set<string> }[] = [];
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === color && !visited[r][c]) {
        const stones: [number, number][] = [];
        const liberties = new Set<string>();
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;

        let head = 0;
        while (head < queue.length) {
          const [currR, currC] = queue[head++];
          stones.push([currR, currC]);

          for (const [dr, dc] of directions) {
            const nR = currR + dr;
            const nC = currC + dc;
            if (nR >= 0 && nR < SIZE && nC >= 0 && nC < SIZE) {
              if (board[nR][nR] === 0) { // 修正: board[nR][nC]
                // 念のためインデックスの安全確認
              }
              if (board[nR][nC] === 0) {
                liberties.add(`${nR},${nC}`);
              } else if (board[nR][nC] === color && !visited[nR][nC]) {
                visited[nR][nC] = true;
                queue.push([nR, nC]);
              }
            }
          }
        }
        groups.push({ stones, liberties });
      }
    }
  }
  return groups;
}

/**
 * 盤面全体をスキャンし、呼吸点が0になった石グループをすべて自動回収するクリーンアップ関数
 */
function sweepCapturedStones(board: number[][], actionColor: number) {
  let newBoard = board.map(r => [...r]);
  let capturedByPlayer = 0;
  let capturedByAi = 0;

  const opponentColor = actionColor === 1 ? 2 : 1;
  const colorsToCheck = [opponentColor, actionColor]; // 相手の石を先にチェックし、次に自分の石をチェック

  for (const color of colorsToCheck) {
    const groups = findAllGroups(newBoard, color);
    for (const group of groups) {
      if (group.liberties.size === 0) {
        for (const [r, c] of group.stones) {
          if (newBoard[r][c] !== 0) {
            newBoard[r][c] = 0;
            if (color === 2) {
              capturedByPlayer++; // 黒（プレイヤー）が白を取った
            } else {
              capturedByAi++; // 白（AI）が黒を取った
            }
          }
        }
      }
    }
  }

  return { newBoard, capturedByPlayer, capturedByAi };
}

/**
 * 石を置いた時の処理（自殺手チェックと石取りの適用）
 */
function processMove(board: number[][], row: number, col: number, color: number) {
  const SIZE = board.length;
  const testBoard = board.map(r => [...r]);
  testBoard[row][col] = color;

  // 盤面全体をスキャンして取れる石を回収
  const { newBoard, capturedByPlayer, capturedByAi } = sweepCapturedStones(testBoard, color);

  // 自殺手チェック：もし自分が置いた石が、自分の色としてのキャプチャによって消されてしまった場合
  if (newBoard[row][col] === 0) {
    // 相手の石を取れていれば合法（打ち上げ）、取れていなければ自殺手として無効
    const capturedOpponent = color === 1 ? capturedByPlayer : capturedByAi;
    if (capturedOpponent === 0) {
      return { success: false, newBoard: board, playerCapInc: 0, aiCapInc: 0 };
    }
  }

  return {
    success: true,
    newBoard,
    playerCapInc: capturedByPlayer,
    aiCapInc: capturedByAi
  };
}

function IgoBoard({ userId, credits }: { userId: string | null; credits: number | null }) {
  const SIZE = 5;
  const [board, setBoard] = useState<number[][]>(
    Array(SIZE).fill(null).map(() => Array(SIZE).fill(0))
  );
  const [turn, setTurn] = useState<number>(1);
  const [message, setMessage] = useState<string>('あなたの番です（黒・先手）。碁盤の交点をクリックしてください。');
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  
  const [playerCaptures, setPlayerCaptures] = useState<number>(0);
  const [aiCaptures, setAiCaptures] = useState<number>(0);

  const [gameMode, setGameMode] = useState<'teaching' | 'free'>('teaching');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'yamato'; text: string }>>([
    { sender: 'yamato', text: "こんにちは！やまと先生です。今日はどのモードで対局しますか？（指導碁でじっくり学ぶか、フリー対局で腕試しをしましょう！）" }
  ]);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatLog, isAiThinking]);

  const handleIntersectionClick = async (row: number, col: number) => {
    if (turn !== 1 || board[row][col] !== 0 || isAiThinking || isGameOver) return;

    // 1. ユーザーの石を配置 & アゲハマ処理
    const moveResult = processMove(board, row, col, 1);
    if (!moveResult.success) {
      setMessage('そこには置けません（自殺手になります）。別の場所を選んでください。');
      return;
    }

    const newBoard = moveResult.newBoard;
    setPlayerCaptures(prev => prev + moveResult.playerCapInc);
    setAiCaptures(prev => prev + moveResult.aiCapInc);

    setBoard(newBoard);
    setLastMove([row, col]);
    setTurn(2);
    setMessage('やまと先生が考えています...');
    setIsAiThinking(true);

    const moveStr = `(${row + 1}, ${col + 1})`;
    let chatText = `(${row + 1}, ${col + 1}) に黒石を置きました。`;
    if (moveResult.playerCapInc > 0) {
      chatText += ` 白石を ${moveResult.playerCapInc}子取りました！`;
    }

    const updatedChat = [...chatLog, { sender: 'user' as const, text: chatText }];
    setChatLog(updatedChat);

    try {
      let aiComment = "";

      // 2. AIの投了判定チェック
      if (shouldAiResign(newBoard, 2)) {
        setIsGameOver(true);
        aiComment = "参りました。これ以上二眼を作ることができず、私の負けが確定しました。お見事です！（AI投了・Resign）";
        setChatLog([...updatedChat, { sender: 'yamato', text: aiComment }]);
        setMessage('対局終了：やまと先生の投了によりあなたの勝利です！');
        setIsAiThinking(false);
        setTurn(0);
        return;
      }

      // 3. AIの手を計算
      const aiMove = calculateAiMove(newBoard, 2);

      if (aiMove) {
        const [aiRow, aiCol] = aiMove;
        const aiMoveResult = processMove(newBoard, aiRow, aiCol, 2);

        if (aiMoveResult.success) {
          const finalBoard = aiMoveResult.newBoard;
          setPlayerCaptures(prev => prev + aiMoveResult.playerCapInc);
          setAiCaptures(prev => prev + aiMoveResult.aiCapInc);

          setBoard(finalBoard);
          setLastMove([aiRow, aiCol]);

          if (gameMode === 'teaching') {
            const response = await fetch('/api/igo-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userMove: moveStr,
                aiMove: `(${aiRow + 1}, ${aiCol + 1})`,
                boardState: JSON.stringify(finalBoard),
                userId: userId
              })
            });

            if (response.ok) {
              const data = await response.json() as any;
              aiComment = data.commentary || "お見事な一手ですね。布石の形を意識していきましょう！";
            } else {
              aiComment = "良い着眼点ですね。周囲の石のつながりに注意してみましょう。";
            }
          } else {
            const commentObj = getRandomComment('afterMove');
            aiComment = `[白: (${aiRow + 1}, ${aiCol + 1})] ${commentObj.jp} (${commentObj.en})`;
          }

          setChatLog([...updatedChat, { sender: 'yamato', text: aiComment }]);
          setTurn(1);
          setMessage('あなたの番です（黒）。');
        } else {
          setTurn(1);
          setMessage('あなたの番です（黒）。');
        }
      } else {
        setIsGameOver(true);
        aiComment = "盤面が埋まりました！終局です。お疲れ様でした。";
        setBoard([...newBoard]);
        setChatLog([...updatedChat, { sender: 'yamato', text: aiComment }]);
        setMessage('対局終了（終局）');
        setTurn(0);
      }
    } catch (err) {
      console.error("AI move error:", err);
      setChatLog([...updatedChat, { sender: 'yamato', text: "やまと先生：集中力が素晴らしいですね。次の手をどうぞ！" }]);
      setTurn(1);
      setMessage('あなたの番です（黒）。');
    } finally {
      if (!isGameOver) {
        setIsAiThinking(false);
      }
    }
  };

  const resetGame = () => {
    setBoard(Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)));
    setTurn(1);
    setLastMove(null);
    setIsGameOver(false);
    setPlayerCaptures(0);
    setAiCaptures(0);
    setMessage('ゲームがリセットされました。あなたの番です（黒）。');
    setChatLog([{ sender: 'yamato', text: `新しい対局（${gameMode === 'teaching' ? '指導碁モード' : 'フリー対局モード'}）を開始します！最初の1手をどうぞ。` }]);
  };

  const handleResign = () => {
    setIsGameOver(true);
    setTurn(0);
    setMessage('あなたは投了しました。やまと先生の勝利です。');
    setChatLog(prev => [...prev, { sender: 'yamato', text: "投了ですね。お疲れ様でした！次はもっと上手く打てるよう一緒に頑張りましょう。" }]);
  };

  const [lastR, lastC] = lastMove || [-99, -99];

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-3 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl max-w-md mx-auto">
        <button
          onClick={() => {
            setGameMode('teaching');
            resetGame();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            gameMode === 'teaching'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>指導碁モード (Teaching)</span>
        </button>
        <button
          onClick={() => {
            setGameMode('free');
            resetGame();
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
            gameMode === 'free'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>AIフリー対局 (Free Match)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-2">
            <h2 className="text-xl font-bold">ミニ5路 囲碁（5x5 Go Board）</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold">
              {gameMode === 'teaching' ? '🥋 指導対局' : '⚔️ 真剣勝負'}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium text-center">{message}</p>

          <div className="flex space-x-6 text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 bg-amber-100/60 dark:bg-slate-800 px-4 py-1.5 rounded-xl border border-amber-300 dark:border-slate-700">
            <span>あなたのアゲハマ: <strong className="text-blue-600">{playerCaptures} 子</strong></span>
            <span>やまと先生のアゲハマ: <strong className="text-red-600">{aiCaptures} 子</strong></span>
          </div>

          {/* 碁盤表示エリア（上部：西洋数字、左側：漢数字の座標ラベル付き） */}
          <div className="relative bg-[#e6c280] p-8 rounded-2xl shadow-xl w-80 h-80 flex items-center justify-center mb-6 border-4 border-amber-800/40">
            <svg viewBox="-16 -16 132 132" className="w-full h-full cursor-pointer overflow-visible">
              {/* 碁盤の罫線 */}
              {[0, 25, 50, 75, 100].map((pos) => (
                <React.Fragment key={pos}>
                  <line x1={pos} y1="0" x2={pos} y2="100" stroke="#78350f" strokeWidth="1.5" />
                  <line x1="0" y1={pos} x2="100" y2={pos} stroke="#78350f" strokeWidth="1.5" />
                </React.Fragment>
              ))}

              {/* 星（天元） */}
              <circle cx="50" cy="50" r="2.5" fill="#78350f" />

              {/* 上部：西洋数字座標ラベル（1, 2, 3, 4, 5） */}
              {['1', '2', '3', '4', '5'].map((num, idx) => {
                const pos = idx * 25;
                return (
                  <text key={`top-${num}`} x={pos} y="-8" textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="bold" fill="#78350f">
                    {num}
                  </text>
                );
              })}

              {/* 左側：漢数字座標ラベル（一、二、三、四、五） */}
              {['一', '二', '三', '四', '五'].map((kanji, idx) => {
                const pos = idx * 25;
                return (
                  <text key={`left-${kanji}`} x="-8" y={pos} textAnchor="middle" dominantBaseline="central" fontSize="7" fontWeight="bold" fill="#78350f">
                    {kanji}
                  </text>
                );
              })}

              {board.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const cx = cIdx * 25;
                  const cy = rIdx * 25;
                  const isLast = lastR === rIdx && lastC === cIdx;

                  return (
                    <g key={`${rIdx}-${cIdx}`} onClick={() => handleIntersectionClick(rIdx, cIdx)}>
                      <circle cx={cx} cy={cy} r="12" fill="transparent" className="hover:fill-amber-950/20 transition-colors" />

                      {cell === 0 && (
                        <circle cx={cx} cy={cy} r="3" fill="transparent" className="hover:fill-amber-950/40" />
                      )}

                      {cell === 1 && (
                        <g>
                          <circle cx={cx} cy={cy} r="10" fill="#000000" className="shadow-md" />
                          {isLast && <circle cx={cx} cy={cy} r="3.5" fill="#eab308" />}
                        </g>
                      )}

                      {cell === 2 && (
                        <g>
                          <circle cx={cx} cy={cy} r="10" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" className="shadow-md" />
                          {isLast && <circle cx={cx} cy={cy} r="3.5" fill="#eab308" />}
                        </g>
                      )}
                    </g>
                  );
                })
              )}
            </svg>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={resetGame}
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-all shadow-sm flex items-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>リセット (Reset)</span>
            </button>
            {!isGameOver && (
              <button
                onClick={handleResign}
                className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold transition-all shadow-sm flex items-center space-x-2 cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                <span>投了 (Resign)</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col h-[420px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xl">🥋</span>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">やまと先生 (Igo Yamato-sensei)</h3>
              <p className="text-[11px] text-slate-500">
                {gameMode === 'teaching' ? 'ソクラテス式・指導碁コーチング中' : 'AIフリー対局・対局実況中'}
              </p>
            </div>
          </div>

          <div ref={chatScrollRef} className="flex-grow overflow-y-auto space-y-3 pr-2 scroll-smooth">
            {chatLog.map((chat, idx) => (
              <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-xs ${
                  chat.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                }`}>
                  {chat.text}
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl rounded-bl-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center space-x-2 text-xs shadow-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="italic">やまと先生が検討しています...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IgoRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserCredits(userId: string) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", userId)
          .single();
        if (!error && data && isMounted) {
          setUserCredits(data.credits);
        }
      } catch (err) {
        console.error("Error fetching user credits:", err);
      }
    }

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
          await fetchUserCredits(session.user.id);
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchUserCredits(session.user.id);
      } else {
        setUser(null);
        setUserCredits(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f4f1ea] font-sans">
        <h3 className="text-xl font-semibold text-slate-700 animate-pulse">
          Loading 5x5 Go Board... ♟️
        </h3>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-[#f4f1ea] dark:bg-slate-950 pb-16">
        <main className="max-w-4xl mx-auto px-4 pt-8">
          {userCredits !== null && (
            <div className="mb-4 flex justify-end">
              <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-3 py-1.5 rounded-full font-bold shadow-xs flex items-center space-x-1.5">
                <span>💎 Credits:</span>
                <span>{userCredits}</span>
              </span>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800">
            <IgoBoard userId={user?.id} credits={userCredits} />
          </div>
        </main>
      </div>
    </PageLayout>
  );
}