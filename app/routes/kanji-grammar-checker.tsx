/**
 * @file kanji-grammar-checker.tsx
 * @description VCE Kanji & Grammar Checker 独立ページ（AI Vision自動文字起こし・クレジット表示・確実なセッション取得対応版）
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useRouteLoaderData, useRevalidator } from '@remix-run/react';
import { 
  Sparkles, 
  Coins, 
  FileText, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Flame,
  ShieldCheck
} from 'lucide-react';
import PageLayout, { PageLayoutRef } from '../components/PageLayout';
// ※ヤマトチャットの実際のパスに合わせて適宜変更してください
import YamatoChat from '../components/ChatYamatoKanjiGrammarCheckerVce'; 

// 外部データファイルからのインポート
import { VCE_KANJI_LIST } from '../data/kanji-list';
import { VCE_GRAMMAR_LIST } from '../data/vce-grammar-list';
import { supabase } from '../lib/supabaseClient';

// ページトップへ戻るボタン（カスタムスタイル: 枠線は紺、背景は白、三角は紺）
function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisible = () => {
      if (window.scrollY > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener("scroll", toggleVisible);
    return () => window.removeEventListener("scroll", toggleVisible);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      style={{ border: "2px solid #1e3a8a" }}
      className="bg-white hover:bg-slate-50 text-indigo-900 w-10 h-10 rounded-full shadow-lg transition cursor-pointer text-xs font-bold flex items-center justify-center"
      title="ページトップへ戻る"
    >
      ▲
    </button>
  );
}

export default function KanjiGrammarCheckerPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const revalidator = useRevalidator(); // 💡 クレジット減算後にヘッダー等を再検証するためのフック

  // 画像アップロードおよび文字起こし用ステート
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  // rootData からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  // 💡 YamatoChatCommon と同様に、Supabaseセッションから直接ユーザーIDを確実に取得するステート
  const [activeUserId, setActiveUserId] = useState<string | null>(rootData?.user?.id ?? null);
  const [currentCredits, setCurrentCredits] = useState<number>(rootData?.credits ?? 10);
  const [nickname, setNickname] = useState<string>(rootData?.nickname ?? "");

  // 💡 コンポーネントマウント時および認証状態の変化時にユーザーIDとクレジットを確実に同期
  useEffect(() => {
    let isMounted = true;

    async function syncUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id && isMounted) {
          setActiveUserId(session.user.id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits, nickname')
            .eq('id', session.user.id)
            .single();
          
          if (profile && isMounted) {
            if (typeof profile.credits === 'number') setCurrentCredits(profile.credits);
            if (profile.nickname) setNickname(profile.nickname);
          }
        }
      } catch (err) {
        console.error("Session sync error in KanjiGrammarCheckerPage:", err);
      }
    }

    syncUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        const newUid = session?.user?.id || null;
        setActiveUserId(newUid);
        if (newUid) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits, nickname')
            .eq('id', newUid)
            .single();
          if (profile && isMounted) {
            if (typeof profile.credits === 'number') setCurrentCredits(profile.credits);
            if (profile.nickname) setNickname(profile.nickname);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const [text, setText] = useState(
    "私は日本へ行って、日本語の勉強をたくさんしなければなりません。"
  );

  useEffect(() => {
    document.title = "VCE Kanji & Grammar Checker | AI Yamato Portal";
  }, []);

  // 💡 バックエンドのAI (Vision API) を利用して手書き画像を自動文字起こしする関数
  const handleAutoTranscribe = async (imageBase64: string) => {
    setIsTranscribing(true);
    try {
      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      const apiBaseUrl = isLocal ? "http://localhost:8787" : "https://api.jptutoraiyamato.com";

      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Please transcribe the handwritten Japanese text in this photo accurately and output ONLY the transcribed Japanese text without any extra explanations or conversational filler.",
          imageBase64: imageBase64,
          userId: activeUserId, // 💡 確実に取得した activeUserId を送信
          appType: "kanji-grammar-checker-ocr"
        }),
      });

      // 💡 型エラー解消のため data に any 型を明示
      const data: any = await response.json();
      if (response.ok && data.reply) {
        // AIの返答から余分な引用符などを除去してテキストエリアにセット
        const cleanedText = data.reply.trim().replace(/^["「]|["」]$/g, "");
        setText(cleanedText);

        // 💡 4クレジット消費が成功したため、画面全体およびヘッダーの残高を即座に再検証・更新
        revalidator.revalidate();
      } else {
        alert(data.error || "Failed to transcribe image automatically. Please try typing or use the chat widget.");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      alert("An error occurred during transcription communication.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // 画像選択時の処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Result = reader.result as string;
        setSelectedImagePreview(base64Result);
        // 画像読み込み完了と同時に自動でバックエンドAI文字起こしを実行
        handleAutoTranscribe(base64Result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getHighlightedText = () => {
    let processedText = text;
    const placeholders: { [key: string]: string } = {};
    let placeholderIndex = 0;

    const foundUniqueGrammar = new Set<string>();
    VCE_GRAMMAR_LIST.forEach((grammar) => {
      if (processedText.includes(grammar)) {
        let canonicalGrammar = grammar;
        if (grammar === "でいます") {
          canonicalGrammar = "ています";
        } else if (grammar === "でから、") {
          canonicalGrammar = "てから、";
        }
        foundUniqueGrammar.add(canonicalGrammar);

        while (processedText.includes(grammar)) {
          const key = `__GRAMMAR_PLACEHOLDER_${placeholderIndex}__`;
          placeholders[key] = `<span style="background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 4px; padding: 2px 4px; margin: 0 2px; font-weight: bold; font-size: 18px;">${grammar}</span>`;

          const targetIndex = processedText.indexOf(grammar);
          if (targetIndex !== -1) {
            processedText =
              processedText.substring(0, targetIndex) +
              key +
              processedText.substring(targetIndex + grammar.length);
          } else {
            break;
          }
          placeholderIndex++;
        }
      }
    });

    const grammarCount = foundUniqueGrammar.size;
    const foundUniqueKanji = new Set<string>();

    VCE_KANJI_LIST.forEach((kanji) => {
      const cleanCheck = processedText.replace(
        /__GRAMMAR_PLACEHOLDER_\d+__/g,
        ""
      );
      const realMatches = cleanCheck.match(
        new RegExp(kanji.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "g")
      );

      if (realMatches) {
        foundUniqueKanji.add(kanji);
        while (processedText.includes(kanji)) {
          const key = `__KANJI_PLACEHOLDER_${placeholderIndex}__`;
          placeholders[key] = `<span style="background-color: #fef08a; color: #854d0e; border: 1px solid #fde047; border-radius: 4px; padding: 2px 4px; margin: 0 2px; font-weight: bold; font-size: 18px;">${kanji}</span>`;

          const targetIndex = processedText.indexOf(kanji);
          if (targetIndex !== -1) {
            processedText =
              processedText.substring(0, targetIndex) +
              key +
              processedText.substring(targetIndex + kanji.length);
          } else {
            break;
          }
          placeholderIndex++;
        }
      }
    });

    const kanjiCount = foundUniqueKanji.size;
    let finalHtml = processedText;
    Object.keys(placeholders).forEach((key) => {
      finalHtml = finalHtml.split(key).join(placeholders[key]);
    });

    return { html: finalHtml, kanjiCount, grammarCount };
  };

  const { html, kanjiCount, grammarCount } = getHighlightedText();

  return (
    <PageLayout ref={layoutRef}>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-12 px-4 sm:px-6 lg:px-8 relative">
        <main className="max-w-4xl mx-auto space-y-8">
          {/* Header Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <p className="text-base text-slate-600 leading-relaxed">
              If you have a typed writing response, please paste it into the checker below. If you have a handwritten response, upload a photo below to automatically transcribe it into the checker using AI Vision. You can see at a glance how many unique VCE Kanji (highlighted in <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">🟡 yellow</span> and VCE Grammar points highlighted in <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">🟢 green</span> you have used without any duplication!
            </p>
          </div>

          {/* 手書き答案のアップロード ＆ 自動文字起こしセクション */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>📷</span> AI Handwriting Auto-Transcription
                </h3>
                <p className="text-sm text-slate-600">
                  Upload a photo of your handwritten response to automatically transcribe it via AI Vision.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isTranscribing}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transcribing...</span>
                    </>
                  ) : (
                    <>
                      <span>📷</span>
                      <span>Transcribe my answer</span>
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-500 font-medium">💡 4 credits needed</span>
              </div>
            </div>

            {selectedImagePreview && (
              <div className="flex items-center gap-4 bg-slate-50 border border-indigo-200 p-3 rounded-2xl">
                <img src={selectedImagePreview} alt="Preview" className="w-14 h-14 object-cover rounded-xl border shadow-xs" />
                <div className="flex-grow">
                  <div className="font-bold text-indigo-900 text-sm">
                    {isTranscribing ? "AI Vision is transcribing your handwriting..." : "Transcription complete! Check the text box below."}
                  </div>
                  <div className="text-slate-600 text-xs">You can freely edit the transcribed text in the input area.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-600 hover:text-red-800 text-xs font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition"
                >
                  Clear ✕
                </button>
              </div>
            )}
          </div>

          {/* Checker Workspace */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 flex items-center justify-between">
                <span>Japanese Text Input (Transcribed or Typed)</span>
                {isTranscribing && (
                  <span className="text-xs text-indigo-600 font-bold flex items-center gap-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processing image...
                  </span>
                )}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type, paste, or upload a photo to transcribe Japanese text here..."
                className="w-full h-40 p-4 rounded-2xl border border-slate-300 text-lg sm:text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y box-border bg-slate-50/50 text-slate-800 leading-relaxed"
              />
            </div>

            {/* Results Section */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner space-y-6">
              <div className="flex gap-4 flex-wrap pb-4 border-b border-slate-200">
                <span className="text-base font-bold text-amber-900 bg-amber-100 border border-amber-300 px-4 py-2 rounded-xl shadow-xs">
                  🟡 Kanji Count (Unique): {kanjiCount}
                </span>
                <span className="text-base font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-xl shadow-xs">
                  🟢 Grammar Count (Unique): {grammarCount}
                </span>
              </div>

              <div className="min-h-[120px] bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                {text ? (
                  <div
                    className="text-xl sm:text-2xl leading-relaxed text-slate-800"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <div className="text-slate-400 italic text-lg">
                    Enter text above to see the highlighted results here.
                  </div>
                )}
              </div>

              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-900 leading-relaxed flex items-start space-x-3">
                <span className="text-lg shrink-0">⚠️</span>
                <div>
                  <strong className="font-bold">Note for Students:</strong> The counting is based on exact matches of grammar patterns and kanji. Because unexpected phrases or typos might occasionally trigger false matches, please use these numbers <strong className="font-bold">for reference only</strong> and double-check your work!
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* 右下のフローティングエリア（上戻りボタン ＆ ヤマトチャットの配置） */}
        <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          <YamatoChat
            userId={activeUserId || undefined}
            userNickname={nickname || (activeUserId ? "Student" : "Student")}
            credits={currentCredits}
          />
          
          <ScrollTopButton />
        </aside>
      </div>
    </PageLayout>
  );
}