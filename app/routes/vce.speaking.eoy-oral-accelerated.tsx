import { safeHtml } from '~/utils/safeHtml';
/**
 * @file app/routes/vce.speaking.eoy-oral-accelerated.tsx
 * @description VCE Japanese - EOY Oral Accelerated Practice (Cascade Hand-Free VAD Voice Edition with Mic Status Indicator)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { generateModuleMeta } from '~/utils/seoMeta';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/layout/PageLayout';
import React, { useState, useEffect, useRef } from "react";
import OralExaminerAvatar from '~/components/oral/OralExaminerAvatar';
import ChatYamatoEoyOralDrill from '~/components/chat/ChatYamatoEoyOralDrill';
import { supabase } from '~/lib/supabaseClient';
import { useOralPracticeEngine, QuestionData } from '~/hooks/OralPracticeHooks';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  let portalContent = null;
  try {
    const { data: portalData } = await supabase
      .from('portal_settings')
      .select('content')
      .eq('key', 'PORTAL_CONTENT')
      .single();
    portalContent = portalData?.content || null;
  } catch (e) {}

  return json({
    portalContent,
    currentPath: url.pathname,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

export default function VceSpeakingEoyOralAcceleratedPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const themeColor = "#8b5cf6"; // Violet / Accelerated theme

  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [credits, setCredits] = useState<number>(10);
  const [nickname, setNickname] = useState<string>("VCE Accelerated Student");

  const {
    chatMessages,
    isPracticing,
    currentQuestionIndex,
    isAnalyzing,
    isRecording, // ユーザーが話しているかどうか（VAD連動）
    startPractice,
    stopPractice,
  } = useOralPracticeEngine("normal", 1.0, user?.id, nickname);

  const handleOpenAuth = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "signin" } }));
    const authButton = document.querySelector("[data-auth-trigger]") as HTMLElement;
    if (authButton) {
      authButton.click();
    } else {
      window.location.href = "/#auth";
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      if (session?.user) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, nickname")
        .eq("id", userId)
        .single();

      if (data && !error) {
        if (typeof data.credits === "number") setCredits(data.credits);
        if (data.nickname) setNickname(data.nickname);
      }
    } catch (err) {
      console.error("Fetch profile error:", err);
    }
  };

  const acceleratedQuestions: QuestionData[] = [
    {
      id: "acc-q1",
      question: "日本語を勉強する理由や、将来どのように活かしたいか教えてください。",
      questionOriginal: "日本語を勉強する理由や、将来どのように活かしたいか教えてください。",
    },
    {
      id: "acc-q2",
      question: "あなたの学校生活や、一番好きな教科について説明してください。",
      questionOriginal: "あなたの学校生活や、一番好きな教科について説明してください。",
    },
    {
      id: "acc-q3",
      question: "オーストラリアの文化と日本の文化で、最も違いを感じるところは何ですか。",
      questionOriginal: "オーストラリアの文化と日本の文化で、最も違いを感じるところは何ですか。",
    },
  ];

  const handleStartHandsfree = () => {
    startPractice(acceleratedQuestions, {}, "sequential", "handsfree");
  };

  if (isAuthLoading) {
    return (
      <ToolPageWrapper layoutRef={layoutRef}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
          <div className="text-violet-600 dark:text-violet-400 font-bold text-lg animate-pulse">
            Loading EOY Oral Accelerated Practice...
          </div>
        </div>
      </ToolPageWrapper>
    );
  }

  if (!user) {
    return (
      <ToolPageWrapper layoutRef={layoutRef}>
        <div className="min-h-[70vh] bg-slate-50 dark:bg-slate-950 py-16 px-4 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-900/50 rounded-3xl p-8 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                Sign In Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                EOY Oral Accelerated Practice requires sign-in to access cascade voice conversations with AI Yamato.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAuth}
              className="w-full py-3 px-6 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs tracking-wider uppercase transition shadow-sm cursor-pointer"
            >
              Sign In / Sign Up Now
            </button>
          </div>
        </div>
      </ToolPageWrapper>
    );
  }

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        <main className="max-w-4xl mx-auto space-y-8">
          {/* ヘッダー情報セクション */}
          <div className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-900/50 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-300">
                  ⚡ Accelerated Track (Hands-Free VAD)
                </span>
                <span className="text-xs text-slate-500">
                  VCE Japanese Oral Exam (Cascade Voice AI)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Accelerated Free Conversation
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                High-achieving VCE student session. Engage in natural, hands-free Japanese spoken dialogues with AI Yamato without touching buttons.
              </p>
            </div>
            <OralExaminerAvatar 
              statusText={isPracticing ? (isRecording ? "🎤 Listening (Speak now...)" : isAnalyzing ? "🧠 AI Thinking & Evaluating..." : "🔊 AI Yamato Speaking...") : "Ready"} 
              themeColor={themeColor} 
            />
          </div>

          {/* 🎙️ ハンズフリー音声会話コントロール＆チャットログカード */}
          <div className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="max-w-xl mx-auto text-center space-y-4">
              
              {/* 💡 マイクのオン/オフ・状態がひと目でわかるビジュアルインジケーター */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className={`relative inline-flex p-5 rounded-3xl border transition-all duration-300 ${
                  isPracticing && isRecording
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-600 shadow-lg shadow-emerald-500/20 scale-105'
                    : isPracticing && isAnalyzing
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-600 shadow-md'
                    : isPracticing
                    ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-300 dark:border-violet-600 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}>
                  {/* マイク作動中の波紋パルスエフェクト */}
                  {isPracticing && isRecording && (
                    <span className="absolute -inset-1 rounded-3xl bg-emerald-400/30 animate-ping pointer-events-none" />
                  )}
                  <span className="text-3xl relative z-10">
                    {isPracticing ? (isRecording ? "🎙️" : isAnalyzing ? "⏳" : "🔊") : "🎤"}
                  </span>
                </div>

                {/* ステータスバッジ */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border">
                  {!isPracticing ? (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                      ⏸️ マイク停止中 (Standby)
                    </span>
                  ) : isRecording ? (
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      🟢 マイクON：収音中（お話しください...）
                    </span>
                  ) : isAnalyzing ? (
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
                      🟡 解析中（AIが考えています）
                    </span>
                  ) : (
                    <span className="bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800 px-2.5 py-0.5 rounded-full">
                      🔵 AI音声再生中（まもなくマイクONになります）
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Hands-Free Voice Session with AI Yamato
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {isPracticing 
                    ? (isRecording ? "🔴 マイクがオンになっています。そのまま自然にお話しください（無音で自動送信されます）。" : isAnalyzing ? "⏳ あなたの発話をテキストに変換し、AIが評価・生成しています..." : "🔊 やまと言葉を再生中です。聞き終わったらすぐにお話しいただけます。")
                    : "「ハンズフリー会話を始める」ボタンを押すと、マイクが自動で有効になり、会話が始まります。"}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-4">
                {!isPracticing ? (
                  <button
                    type="button"
                    onClick={handleStartHandsfree}
                    className="py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm tracking-wider uppercase transition shadow-md cursor-pointer flex items-center gap-2 mx-auto"
                  >
                    <span>🚀 ハンズフリー会話を始める (Start Hands-Free)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopPractice}
                    className="py-4 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm tracking-wider uppercase transition shadow-md cursor-pointer flex items-center gap-2 mx-auto"
                  >
                    <span>⏹️ セッションを終了する (End Session)</span>
                  </button>
                )}
              </div>
            </div>

            {/* 会話ログ・フィードバック表示エリア */}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4 max-h-[400px] overflow-y-auto pr-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Conversation & Feedback History</h4>
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'assistant' 
                      ? 'bg-violet-50/80 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50 text-slate-800 dark:text-slate-200' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ml-8'
                  }`}
                >
                  <div className="font-bold mb-1 text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    {msg.role === 'assistant' ? 'Yamato-sensei' : `${nickname} (You)`}
                  </div>
                  {msg.isHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: safeHtml(msg.content) }} />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside
            aria-label="Floating Controls"
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
          >
            <ChatYamatoEoyOralDrill userId={user?.id} userNickname={nickname} credits={credits} />
          </aside>
        </main>
      </div>
    </ToolPageWrapper>
  );
}