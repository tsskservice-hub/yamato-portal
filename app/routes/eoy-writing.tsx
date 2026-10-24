/**
 * @file eoy-writing.tsx
 * @description EOY Writing Practice モジュール
 * 💡 特徴：
 * 1. Text Type（緑バッジ）をクリック ➔ TextTypeModal（Supabase: TEXTTYPES）を表示
 * 2. Writing Style（青バッジ）をクリック ➔ WritingStyleModal（Supabase: WRITING_STYLES）を表示
 * 3. 「How to use Genkoyoshi」ボタン ➔ 原稿用紙使い方モーダルを表示
 * 4. 設問・写真解答アップロード & AIヤマトチャット連携
 */
import { useState, useEffect, useRef } from "react";
import { Link, useRouteLoaderData } from "@remix-run/react";
import TextTypeModal from "../components/TextTypeModal";
import PageLayout, { PageLayoutRef } from "../components/PageLayout";
import ChatYamatoEoyWriting from "../components/ChatYamatoEoyWriting";
import { DataErrorState } from "../components/DataErrorState";

// 💡 外部データ・APIフェッチ関数のインポート
import { WRITING_EXAM_QUESTIONS_FALLBACK, fetchWritingExamQuestionsData } from "../data/writing-exam-questions";
import TEXT_TYPES_DATA, { fetchTextTypesData, TextTypesData } from "../data/texttypes";
import { fetchWritingStylesData, WritingStylesData } from "../data/writing-styles";
import { supabase } from "../lib/supabaseClient";

// 💡 原稿用紙ガイドのフォールバックデータ
const DEFAULT_GENKOYOSHI_DATA = {
  title: "Genkoyoshi Usage Guide (原稿用紙の使い方)",
  purpose: "This guide outlines the general rules for formatting titles, names, main text, and square usage on genkoyoshi. Refer to each text type for details.",
  structure: [
    "Title (Line 1): Leave 3 spaces at the beginning, then write the title",
    "Name (Line 2): Write at the end, leaving the last square blank",
    "Main Text: Indent 1 space at the beginning of each paragraph",
    "Square Usage: Place punctuation marks (、。) in their own square. Never start a line with punctuation."
  ],
  sampleImage: "/genkoyoshi.pdf"
};

export default function Dashboard() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeTextType, setActiveTextType] = useState<string>("all");
  const [activeModal, setActiveModal] = useState<string | null>(null); // Text Type / Genkoyoshi 用モーダルキー
  const [activeStyleModal, setActiveStyleModal] = useState<string | null>(null); // 💡 Writing Style 用モーダルキー
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // 💡 設問、TextTypes、WritingStyles データをステートで管理（WritingStylesの初期値は空）
  const [questions, setQuestions] = useState<any[]>(WRITING_EXAM_QUESTIONS_FALLBACK);
  const [modalData, setModalData] = useState<TextTypesData>({
    ...TEXT_TYPES_DATA,
    Genkoyoshi: DEFAULT_GENKOYOSHI_DATA,
    Genkooyooshi: DEFAULT_GENKOYOSHI_DATA,
  });
  const [stylesData, setStylesData] = useState<WritingStylesData>({});
  const [isStylesLoading, setIsStylesLoading] = useState<boolean>(true);

  const rootData = useRouteLoaderData("root") as {
    user?: any;
    credits?: number;
    nickname?: string;
  } | undefined;

  const user = rootData?.user ?? null;
  const credits = rootData?.credits ?? 10;
  const nickname = rootData?.nickname ?? "";

  const layoutRef = useRef<PageLayoutRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 画像アップロード用ステート
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Learning Dashboard | VCE EOY Exam Writing Tutor";
  }, []);

  // 💡 ページ表示時に Supabase から設問、TEXTTYPES、WRITING_STYLES を非同期フェッチ
  useEffect(() => {
    let isMounted = true;

    async function loadDataFromSupabase() {
      try {
        // 1. 設問一覧の取得
        const fetchedQuestions = await fetchWritingExamQuestionsData(supabase);
        if (isMounted && fetchedQuestions && Array.isArray(fetchedQuestions) && fetchedQuestions.length > 0) {
          setQuestions(fetchedQuestions);
        }

        // 2. TEXTTYPES データの取得
        const fetchedTextTypes = await fetchTextTypesData(supabase);
        if (isMounted && fetchedTextTypes && typeof fetchedTextTypes === "object" && Object.keys(fetchedTextTypes).length > 0) {
          setModalData((prev) => ({
            ...prev,
            ...fetchedTextTypes,
            Genkoyoshi: fetchedTextTypes["Genkoyoshi"] || fetchedTextTypes["Genkooyooshi"] || prev["Genkoyoshi"] || DEFAULT_GENKOYOSHI_DATA,
            Genkooyooshi: fetchedTextTypes["Genkoyoshi"] || fetchedTextTypes["Genkooyooshi"] || prev["Genkooyooshi"] || DEFAULT_GENKOYOSHI_DATA,
          }));
        }

        // 3. 💡 WRITING_STYLES データの取得（Supabase の key: 'WRITING_STYLES'）
        const fetchedStyles = await fetchWritingStylesData(supabase);
        if (isMounted && fetchedStyles && typeof fetchedStyles === "object") {
          setStylesData(fetchedStyles);
        }
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
      } finally {
        if (isMounted) {
          setIsStylesLoading(false);
        }
      }
    }

    loadDataFromSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const filteredQuestions = questions.filter((q) => {
    const matchesCategory =
      activeCategory === "all" || q.category === activeCategory;
    const matchesTextType =
      activeTextType === "all" || q.textType === activeTextType;
    return matchesCategory && matchesTextType;
  });

  const currentSystemPrompt = selectedQuestion
    ? `[Selected VCE EOY Writing Question Q${selectedQuestion.id}]\nCategory: ${selectedQuestion.category}\nText Type: ${selectedQuestion.textType}\nPrompt (English): ${selectedQuestion.english}\nPrompt (Japanese): ${selectedQuestion.japanese}`
    : "";

  const assignedQuestionText = selectedQuestion
    ? `Q${selectedQuestion.id}: (${selectedQuestion.textType}) ${selectedQuestion.english}`
    : "";

  // TextType モーダル用データの解決
  const activeModalData = activeModal
    ? modalData[activeModal] ||
      (activeModal === "Genkoyoshi" ? modalData["Genkooyooshi"] || DEFAULT_GENKOYOSHI_DATA : null) ||
      (activeModal === "Genkooyooshi" ? modalData["Genkoyoshi"] || DEFAULT_GENKOYOSHI_DATA : null)
    : null;

  // 💡 Writing Style モーダル用データの解決
  const activeWritingStyleData = activeStyleModal ? stylesData[activeStyleModal] : null;

  // 💡 データ読み込み中の表示
  if (isStylesLoading) {
    return (
      <PageLayout ref={layoutRef} breadcrumbTitle="End of Year Writing Practice">
        <div className="min-h-screen bg-white text-slate-800 font-sans flex items-center justify-center p-8">
          <div className="text-slate-600 font-bold text-lg animate-pulse">Loading Writing Styles...</div>
        </div>
      </PageLayout>
    );
  }

  // 💡 Supabase から Writing Styles が取得できなかった（空だった）場合は DataErrorState を表示
  if (!stylesData || Object.keys(stylesData).length === 0) {
    return (
      <PageLayout ref={layoutRef} breadcrumbTitle="End of Year Writing Practice">
        <div className="min-h-screen bg-white text-slate-800 font-sans px-4 py-8 max-w-4xl mx-auto">
          <DataErrorState errorMessage="Failed to fetch WRITING_STYLES from app_knowledge table in Supabase." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout ref={layoutRef} breadcrumbTitle="End of Year Writing Practice">
      <div className="min-h-screen bg-white text-slate-800 font-sans relative">
        <main className="max-w-4xl mx-auto px-4 py-8 relative">
          
          {/* 上部ショートカットボタン */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setActiveModal("Genkoyoshi")}
              className="w-full text-left p-3.5 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl cursor-pointer font-bold text-sm shadow-xs transition-all flex items-center justify-between box-border"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-base">📝</span>
                <span className="truncate">How to use Genkoyoshi</span>
              </div>
              <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-rose-200 shrink-0 ml-2">View →</span>
            </button>

            <Link
              to="/kanji-grammar-checker"
              className="w-full text-left p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-800 border border-amber-200 hover:border-amber-300 rounded-xl cursor-pointer font-bold text-sm shadow-xs transition-all flex items-center justify-between box-border no-underline"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="text-base">✨</span>
                <span className="truncate">VCE Kanji & Grammar Checker</span>
              </div>
              <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-amber-200 shrink-0 ml-2">Open →</span>
            </Link>
          </div>

          {/* AIヤマトガイドエリア */}
          <div>
            <div className="mb-6 p-5 bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-lg">
                  <span>🤖</span> AI Yamato is ready for you
                </div>

                <div className="flex items-center gap-2">
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
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>📷</span>
                    <span>{selectedImagePreview ? "Change Answer Photo" : "Upload Answer Photo"}</span>
                  </button>
                  {selectedImagePreview && (
                    <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded">
                      ✓ Attached
                    </span>
                  )}
                </div>
              </div>

              {/* 選択中の問題バナー */}
              <div id="active-ai-tutor-banner" className="px-4 py-3 bg-white/80 border border-indigo-200 rounded-lg text-indigo-900 text-base font-bold flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-xs scroll-mt-6 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>🎯 Active Question Q</span>
                  <input
                    type="number"
                    min="1"
                    max={questions.length}
                    value={selectedQuestion ? selectedQuestion.id : ""}
                    onChange={(e) => {
                      const qId = parseInt(e.target.value, 10);
                      const found = questions.find((q) => q.id === qId);
                      if (found) {
                        setSelectedQuestion(found);
                      } else if (e.target.value === "") {
                        setSelectedQuestion(null);
                      }
                    }}
                    placeholder="No."
                    className="w-16 px-2 py-1 bg-white border border-indigo-300 rounded text-center text-indigo-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {selectedQuestion ? (
                    <span className="text-sm font-normal text-indigo-700 truncate max-w-xs sm:max-w-sm">
                      ({selectedQuestion.textType}) {selectedQuestion.english}
                    </span>
                  ) : (
                    <span className="text-sm font-normal text-amber-700">⚠️ None selected</span>
                  )}
                </div>
              </div>

              {selectedImagePreview && (
                <div className="flex items-center gap-3 bg-white border border-indigo-200 px-3 py-2 rounded-lg text-sm">
                  <img src={selectedImagePreview} alt="Preview" className="w-10 h-10 object-cover rounded border" />
                  <div className="flex-grow">
                    <div className="font-bold text-indigo-900 text-xs">Handwritten Answer Ready for AI Tutor</div>
                    <div className="text-slate-600 text-xs truncate">You can now open the chat and send it!</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1 bg-red-50 rounded"
                  >
                    Remove ✕
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-indigo-100 text-slate-700 text-base leading-relaxed">
                <div className="mb-2 text-indigo-900 font-bold">
                  To get started, please follow these two quick steps:
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-900 shrink-0">1️⃣</span>
                    <div><strong>Select question & photo:</strong> Enter the question number and upload your handwritten answer photo using the button above. 📋📸</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-900 shrink-0">2️⃣</span>
                    <div><strong>Chat with AI Yamato:</strong> Open the chat bubble at the bottom-right and send it!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ガイド案内バナー */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-6 text-sm sm:text-base text-sky-900 flex items-center gap-3 shadow-xs">
            <span className="text-xl">💡</span>
            <span>
              Click on the <strong>blue Writing Style tag</strong> or <strong>green Text Type tag</strong> on each question to view requirements, purpose, and key features.
            </span>
          </div>

          {/* タスクリストヘッダー */}
          <div className="flex justify-between items-end border-b-2 border-slate-200 pb-2 mb-6">
            <h1 className="text-slate-800 text-2xl sm:text-3xl font-bold m-0">
              📚 Task List ({filteredQuestions.length} questions)
            </h1>
          </div>

          {/* フィルターボタン群 */}
          <div className="mb-6">
            <div className="mb-2 text-lg font-bold text-slate-600">Filter by Writing Style</div>
            <div className="flex gap-2.5 flex-wrap mb-4">
              {["all", "Informative", "Evaluative", "Persuasive", "Personal", "Imaginative"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-base font-bold cursor-pointer transition-colors ${
                    activeCategory === cat ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>

            <div id="filter-by-text-type" className="scroll-mt-10">
              <div className="mb-2 text-lg font-bold text-slate-600">Filter by Text Type</div>
              <div className="flex gap-2.5 flex-wrap">
                {["all", "Speech", "Email", "Letter", "Article", "Journal", "Essay", "Story", "Report", "Account", "Message", "Review", "Summary", "Official Report"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveTextType(type)}
                    className={`px-4 py-2 rounded-lg text-base font-bold cursor-pointer transition-colors ${
                      activeTextType === type ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {type === "all" ? "All" : type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 設問カード一覧 */}
          <div className="flex flex-col gap-6 mb-12">
            {filteredQuestions.map((q) => {
              const isSelected = selectedQuestion?.id === q.id;
              return (
                <div
                  key={q.id}
                  className={`p-6 border rounded-xl bg-white shadow-sm transition-all ${
                    isSelected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-2 flex-wrap items-center">
                      {/* 💡 青色の Writing Style バッジ：クリックで activeStyleModal にセット */}
                      <span
                        onClick={() => setActiveStyleModal(q.category)}
                        className="text-base bg-sky-100 text-sky-800 px-3 py-1 rounded-md font-bold cursor-pointer hover:bg-sky-200 hover:scale-105 transition-all shadow-2xs"
                        title="Click to view Writing Style specifications"
                      >
                        {q.category} ↗
                      </span>

                      {/* 💡 緑色の text type バッジ：クリックで activeModal にセット */}
                      <span
                        onClick={() => setActiveModal(q.textType)}
                        className="text-base bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md font-bold cursor-pointer hover:bg-emerald-200 hover:scale-105 transition-all shadow-2xs"
                        title="Click to view Text Type format and conventions"
                      >
                        {q.textType} ↗
                      </span>
                    </div>
                    <span className="text-lg text-slate-600 font-bold">Q{q.id}</span>
                  </div>

                  <p className="text-[20px] text-slate-800 mb-3 leading-relaxed font-medium">{q.english}</p>
                  <div className="text-lg sm:text-[20px] text-slate-700 mb-4 border-l-4 border-slate-200 pl-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.japanese }} />

                  <button
                    onClick={() => {
                      setSelectedQuestion(q);
                      const banner = document.getElementById("active-ai-tutor-banner");
                      if (banner) banner.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`px-4 py-2 text-base rounded-lg cursor-pointer font-bold transition-colors shadow-sm ${
                      isSelected ? "bg-indigo-600 text-white" : "bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-700"
                    }`}
                  >
                    {isSelected ? "🤖 Currently Active in AI Tutor Bubble" : "🎯 Select for AI Tutor"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* チャットウィジェット */}
          <ChatYamatoEoyWriting
            systemPrompt={currentSystemPrompt}
            userId={user?.id}
            userNickname={nickname || (user?.email ? user.email.split('@')[0] : "Student")}
            credits={credits}
            externalImageFile={selectedImage}
            externalImagePreview={selectedImagePreview}
            assignedQuestion={assignedQuestionText}
            onClearExternalImage={() => {
              setSelectedImage(null);
              setSelectedImagePreview(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />

          {/* 画像拡大モーダル */}
          {modalImageSrc && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setModalImageSrc(null)}>
              <div className="relative max-w-4xl max-h-[90vh]">
                <button onClick={() => setModalImageSrc(null)} className="absolute -top-10 right-0 text-white text-xl font-bold bg-black/50 px-3 py-1 rounded-full hover:bg-black/80 transition">
                  ✕ Close
                </button>
                <img src={modalImageSrc} alt="Enlarged View" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl bg-white" />
              </div>
            </div>
          )}

          {/* 💡 TextTypeModal: Genkoyoshi または各テキストタイプのモーダルを描画 */}
          {activeModal && activeModalData && (
            <TextTypeModal
              isOpen={true}
              onClose={() => setActiveModal(null)}
              modalKey={activeModal}
              {...activeModalData}
            />
          )}

          {/* 💡 Writing Style 専用モーダル（青バッジクリックでポップアップ表示） */}
          {activeStyleModal && activeWritingStyleData && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50 p-4"
              onClick={() => setActiveStyleModal(null)}
            >
              <div
                className="bg-white p-6 sm:p-7 w-full max-w-2xl rounded-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto box-border border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 border-none w-8 h-8 rounded-full flex items-center justify-center text-lg cursor-pointer text-slate-500 hover:text-slate-800 transition"
                  onClick={() => setActiveStyleModal(null)}
                >
                  ✕
                </button>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 px-2.5 py-1 rounded-md">
                    Writing Style (Kind of Writing)
                  </span>
                </div>

                <h3 className="mt-2 text-slate-800 text-2xl font-bold">
                  {activeWritingStyleData.styleName} ({activeWritingStyleData.japaneseName})
                </h3>

                {/* 目的 (Purpose) */}
                <div className="mt-4 bg-sky-50/70 p-4 rounded-xl border border-sky-100">
                  <h4 className="m-0 mb-1.5 font-bold text-sky-900 text-base flex items-center gap-2">
                    <span>🎯</span> Purpose & Stance
                  </h4>
                  <p className="m-0 text-slate-700 text-base leading-relaxed">
                    {activeWritingStyleData.purpose}
                  </p>
                </div>

                {/* 主な特徴 (Key Features) */}
                {activeWritingStyleData.keyFeatures && activeWritingStyleData.keyFeatures.length > 0 && (
                  <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="m-0 mb-2 font-bold text-slate-800 text-base flex items-center gap-2">
                      <span>📌</span> Key Features in VCE
                    </h4>
                    <ul className="m-0 pl-5 text-slate-700 space-y-1.5 text-base list-disc">
                      {activeWritingStyleData.keyFeatures.map((feature, idx) => (
                        <li key={idx} className="leading-relaxed">{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 効果的な語彙 & 文法 */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeWritingStyleData.effectiveVocabulary && activeWritingStyleData.effectiveVocabulary.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="m-0 mb-2 font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <span>✨</span> Effective Expressions
                      </h4>
                      <div className="space-y-2 text-sm text-slate-700">
                        {activeWritingStyleData.effectiveVocabulary.map((vocabCat, idx) => (
                          <div key={idx}>
                            <span className="font-bold text-slate-900 text-xs block mb-0.5">{vocabCat.categories}:</span>
                            <div className="flex flex-wrap gap-1">
                              {vocabCat.examples.map((ex, eIdx) => (
                                <span key={eIdx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs">
                                  {ex}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeWritingStyleData.compatibleTextTypes && activeWritingStyleData.compatibleTextTypes.length > 0 && (
                    <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
                      <div>
                        <h4 className="m-0 mb-2 font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                          <span>📝</span> Compatible Text Types
                        </h4>
                        <p className="text-xs text-emerald-800 mb-2">Common formats used for this style in exams:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeWritingStyleData.compatibleTextTypes.map((type, idx) => (
                            <span key={idx} className="bg-white text-emerald-900 font-bold border border-emerald-200 px-2 py-1 rounded-md text-xs shadow-2xs">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveStyleModal(null);
                            const target = document.getElementById("filter-by-text-type");
                            if (target) target.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                        >
                          Filter by text type →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </PageLayout>
  );
}