/**
 * @file kanji-grammar-checker.tsx
 * @description VCE Kanji & Grammar Checker 独立ページ（手書き解答の画像アップロード＆チャット連携対応版）
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useRouteLoaderData } from '@remix-run/react';
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

  // 画像アップロード用ステート
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // rootData からグローバルデータを安全に取得
  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;
  const nickname = rootData?.nickname ?? "";

  const [text, setText] = useState(
    "私は日本へ行って、日本語の勉強をたくさんしなければなりません。"
  );

  useEffect(() => {
    document.title = "VCE Kanji & Grammar Checker | AI Yamato Portal";
  }, []);

  // 画像選択時の処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result as string);
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
              If you have a typed writing response, please paste it into the checker below. If you have a handwritten response, transcribe it below first, and then paste it into the checker. You can see at a glance how many unique VCE Kanji (highlighted in <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">🟡 yellow</span>) and VCE Grammar points (highlighted in <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">🟢 green</span>) you have used without any duplication!
            </p>
          </div>

          {/* 手書き答案のアップロードセクション */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>📷</span> Handwriting Transcription & AI Assist
                </h3>
                <p className="text-sm text-slate-600">
                  Upload a photo of your handwritten response to transcribe it with AI Yamato.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>📷</span>
                  <span>{selectedImagePreview ? "Change Answer Photo" : "Upload Answer Photo"}</span>
                </button>
              </div>
            </div>

            {selectedImagePreview && (
              <div className="flex items-center gap-4 bg-slate-50 border border-indigo-200 p-3 rounded-2xl">
                <img src={selectedImagePreview} alt="Preview" className="w-14 h-14 object-cover rounded-xl border shadow-xs" />
                <div className="flex-grow">
                  <div className="font-bold text-indigo-900 text-sm">Handwritten Answer Ready for AI Tutor</div>
                  <div className="text-slate-600 text-xs">Open the chat widget below and send it to transcribe!</div>
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
                  Remove ✕
                </button>
              </div>
            )}
          </div>

          {/* Checker Workspace */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700">
                Japanese Text Input
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste Japanese text here..."
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
            userId={user?.id}
            userNickname={nickname || (user?.email ? user.email.split('@')[0] : "Student")}
            credits={credits}
            externalImageFile={selectedImage}
            externalImagePreview={selectedImagePreview}
            onClearExternalImage={() => {
              setSelectedImage(null);
              setSelectedImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <ScrollTopButton />
        </aside>
      </div>
    </PageLayout>
  );
}