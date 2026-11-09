/**
 * @file app/routes/vce.speaking.eoy-oral-accelerated.tsx
 * @description VCE Japanese - EOY Oral Accelerated Practice (GPT Realtime WebRTC Edition)
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { generateModuleMeta } from '~/utils/seoMeta';
import { ToolPageWrapper } from '~/components/layout/ToolPageWrapper';
import { type PageLayoutRef } from '~/components/layout/PageLayout';
import React, { useState, useEffect, useRef } from "react";
import OralExaminerAvatar from '~/components/oral/OralExaminerAvatar';
import ChatYamatoEoyOralDrill from '~/components/chat/ChatYamatoEoyOralDrill';
import { supabase } from '~/lib/supabaseClient';
import { useRealtimeSpeaking } from '~/hooks/useRealtimeSpeaking';

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

  // 💡 OpenAI Realtime API (WebRTC) を用いた音声対話フックの呼び出し（Accelerated向けプロンプトと連動）
  const {
    isConnected,
    isAiSpeaking,
    statusText,
    turnCount,
    startSession,
    stopSession,
  } = useRealtimeSpeaking({
    userId: user?.id || "guest",
    appType: "eoy-oral-accelerated",
    lessonSlug: "accelerated-free-talk",
    topic: "VCE Section 1 General Conversation & Advanced Discussion (Accelerated Pace)",
    onFinished: () => {
      alert("🎉 素晴らしい会話セッションでした！EOY Oral Accelerated 練習が完了しました。");
    },
  });

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
                EOY Oral Accelerated Practice requires sign-in to access real-time GPT voice conversations with AI Yamato.
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
                  ⚡ Accelerated Track
                </span>
                <span className="text-xs text-slate-500">
                  VCE Japanese Oral Exam (GPT Realtime Voice)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100">
                EOY Oral Accelerated Free Conversation
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                High-achieving VCE student session. Engage in natural, unconstrained real-time Japanese spoken dialogues with AI Yamato.
              </p>
            </div>
            <OralExaminerAvatar statusText={isConnected ? "Live Connected" : "Ready"} themeColor={themeColor} />
          </div>

          {/* 🎙️ GPT Realtime 音声会話コントロールカード */}
          <div className="bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-3xl p-8 shadow-sm space-y-6 text-center">
            <div className="max-w-lg mx-auto space-y-4">
              <div className="inline-flex p-4 bg-violet-50 dark:bg-violet-950/50 rounded-2xl border border-violet-100 dark:border-violet-900 text-violet-600 dark:text-violet-400 text-3xl">
                🎙️
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Live Voice Conversation with AI Yamato
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {statusText}
                </p>
              </div>

              {isConnected && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Conversation Turns: <strong className="text-violet-600 dark:text-violet-400">{turnCount}</strong></span>
                  {isAiSpeaking ? (
                    <span className="text-amber-500 animate-pulse">🔊 AI Yamato is speaking...</span>
                  ) : (
                    <span className="text-emerald-500">🎤 Your turn (Speak freely)</span>
                  )}
                </div>
              )}

              <div className="pt-4 flex items-center justify-center gap-4">
                {!isConnected ? (
                  <button
                    type="button"
                    onClick={startSession}
                    className="py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-sm tracking-wider uppercase transition shadow-md cursor-pointer flex items-center gap-2 mx-auto"
                  >
                    <span>🚀 リアルタイム会話を始める (Start Voice)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopSession}
                    className="py-4 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-sm tracking-wider uppercase transition shadow-md cursor-pointer flex items-center gap-2 mx-auto"
                  >
                    <span>⏹️ 会話を終了する (End Session)</span>
                  </button>
                )}
              </div>
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