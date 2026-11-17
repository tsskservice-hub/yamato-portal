/**
 * @file app/routes/vce.speaking.eoy-oral-superb.tsx
 * @description VCE Japanese - EOY Oral Superb（やる気のある生徒向け: AI ヤマトと声で自由に話す。OpenAI Realtime）
 *
 * 流れ: 設定（話すこと・長さ）→ 会話（OralRealtimeSession。途中でフィードバックは出さない）→ フィードバック（OralMockReport を使う）
 * クレジットは会話を始めるときに 1 回だけ（5 分: 25 / 10 分: 50）。api の /api/oral-superb/start が引く
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import React, { useEffect, useRef, useState } from "react";
import { generateModuleMeta } from "~/utils/seoMeta";
import { ToolPageWrapper } from "~/components/layout/ToolPageWrapper";
import { type PageLayoutRef, notifyCreditsUpdated } from "~/components/layout/PageLayout";
import ChatYamatoEoyOralDrill from "~/components/chat/ChatYamatoEoyOralDrill";
import { supabase } from "~/lib/supabaseClient";
import { YAMATO_API_BASE } from "~/lib/yamatoApi";
import { requestAuthModal } from "~/utils/openAuthModal";
import { CREDIT_COSTS } from "~/data/credit-costs";
import {
  OralRealtimeSession,
  type RealtimeConfig,
  type RealtimeFocus,
  type RealtimeResult,
} from "~/components/oral/OralRealtimeSession";
import { OralMockReport } from "~/components/oral/OralMockReport";
import type { ExamResultData } from "~/components/oral/OralMockSession";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  // PORTAL_CONTENT はもう Supabase にないので問い合わせない（meta は generateModuleMeta の既定値を使う）
  return json({ portalContent: null, currentPath: url.pathname });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

const THEME = "#8b5cf6";
const COST: Record<5 | 10, number> = { 5: CREDIT_COSTS.realtime5, 10: CREDIT_COSTS.realtime10 };
const FOCUS_LABEL: Record<RealtimeFocus, string> = {
  free: "Free talk",
  sec1: "Section 1 topics",
  sec2: "Section 2: my detailed study",
};

export default function VceSpeakingEoyOralSuperbPage() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);
  const [nickname, setNickname] = useState<string>("VCE Student");

  const [phase, setPhase] = useState<"config" | "talking" | "result">("config");
  const [focus, setFocus] = useState<RealtimeFocus>("free");
  const [subtopic, setSubtopic] = useState("");
  const [minutes, setMinutes] = useState<5 | 10>(10);
  const [showAiText, setShowAiText] = useState(true);
  const [config, setConfig] = useState<RealtimeConfig | null>(null);
  const [result, setResult] = useState<RealtimeResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("credits, nickname").eq("id", userId).single();
    if (data) {
      if (typeof data.credits === "number") {
        setCredits(data.credits);
        notifyCreditsUpdated(data.credits);
      }
      if (data.nickname) setNickname(data.nickname);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleStart = () => {
    setMessage(null);
    if (!user) {
      alert("Please sign in to talk with AI Yamato.");
      requestAuthModal("signin");
      return;
    }
    if (focus === "sec2" && !subtopic.trim()) {
      alert("Please type your detailed study sub-topic (for example: 日本の祭り).");
      return;
    }
    const cost = COST[minutes];
    if (credits < cost) {
      alert(`This conversation uses ${cost} credits, but you have ${credits}. Please top up your credits.`);
      return;
    }
    if (!window.confirm(`Start a ${minutes}-minute conversation? ${cost} credits will be used.\n\nFind a quiet place and allow the microphone. Headphones work best.`)) return;
    setConfig({ minutes, focus, subtopic: subtopic.trim() || undefined, showAiText });
    setPhase("talking");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToConfig = (msg?: string) => {
    setPhase("config");
    setConfig(null);
    setResult(null);
    setMessage(msg || null);
    if (user?.id) fetchProfile(user.id);
  };

  // フィードバックの画面（mock と同じ部品を使う）に渡す形にする
  const reportData: ExamResultData | null =
    result && config
      ? {
          config: { examSection: "section1", difficulty: "accelerated" } as any,
          sessionId: result.sessionId,
          transcript: result.transcript.map((t) => ({ stage: "sec1", speaker: t.speaker, text: t.text })),
          durations: {},
          totalDurationSeconds: result.totalSeconds,
        }
      : null;

  const optionClass = (active: boolean) =>
    `p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col ${
      active ? "bg-slate-50 dark:bg-slate-800 shadow-sm" : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
    }`;

  return (
    <ToolPageWrapper layoutRef={layoutRef}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
        {phase === "config" && (
          <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-3xl border border-violet-200 dark:border-violet-900/50 shadow-xl space-y-6">
            <div className="text-center space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 border border-violet-300">
                ⭐ Superb
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 pt-2">
                Free Conversation with AI Yamato
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                For students who want a real challenge. Talk with Yamato-sensei in natural-speed Japanese — no buttons, just
                speak, like a real conversation. You get one feedback report at the end.
              </p>
            </div>

            {message && (
              <p className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-200">
                {message}
              </p>
            )}

            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">1. What do you want to talk about?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "free", desc: "Anything — your life, school, hobbies, Japan…" },
                  { id: "sec1", desc: "Exam Section 1 topics: family, school, part-time job, Japan, future" },
                  { id: "sec2", desc: "Discuss your detailed study sub-topic in depth" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFocus(f.id as RealtimeFocus)}
                    className={optionClass(focus === f.id)}
                    style={{ borderColor: focus === f.id ? THEME : undefined }}
                  >
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{FOCUS_LABEL[f.id as RealtimeFocus]}</span>
                    <span className="text-[11px] text-slate-500 mt-1">{f.desc}</span>
                  </button>
                ))}
              </div>
              {focus === "sec2" && (
                <input
                  type="text"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  maxLength={80}
                  placeholder="Your sub-topic (e.g. 日本の祭り)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">2. How long?</h2>
              <div className="grid grid-cols-2 gap-3">
                {([5, 10] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutes(m)}
                    className={optionClass(minutes === m)}
                    style={{ borderColor: minutes === m ? THEME : undefined }}
                  >
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{m} minutes</span>
                    <span className="text-[11px] font-bold mt-1" style={{ color: THEME }}>
                      🪙 {COST[m]} credits
                    </span>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input type="checkbox" checked={showAiText} onChange={(e) => setShowAiText(e.target.checked)} className="cursor-pointer" />
                Show Yamato&apos;s words on screen (turn this off for a listening challenge)
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-100">How it works</p>
              <p>・Yamato-sensei speaks only Japanese, at the natural speed of a native Japanese speaker.</p>
              <p>・No buttons: just talk. You can even jump in while Yamato is speaking.</p>
              <p>・Use headphones so Yamato doesn&apos;t hear its own voice.</p>
              <p>・No corrections during the talk — you get one feedback report at the end.</p>
              <p>・Feedback is based on the text of what you said (speech-to-text). Pronunciation, intonation, rhythm and tempo are not assessed.</p>
              <p>・Credits are used once, when the conversation starts.</p>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm shadow-lg transition active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: THEME }}
            >
              🚀 Start talking ({COST[minutes]} credits)
            </button>
          </div>
        )}

        {phase === "talking" && config && (
          <OralRealtimeSession
            config={config}
            themeColor={THEME}
            onStarted={(balance) => {
              if (typeof balance === "number") {
                setCredits(balance);
                notifyCreditsUpdated(balance);
              }
            }}
            onFinished={(r) => {
              setResult(r);
              setPhase("result");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onCancel={(msg) => backToConfig(msg)}
          />
        )}

        {phase === "result" && reportData && config && (
          <OralMockReport
            result={reportData}
            onRetry={() => backToConfig()}
            themeColor={THEME}
            feedbackEndpoint={`${YAMATO_API_BASE}/api/oral-superb/feedback`}
            subtitle={`${FOCUS_LABEL[config.focus]} · ${config.minutes} minutes`}
            partnerName="Yamato"
            hideStageHeadings
            retryLabel="🔄 Talk again"
            reviewBeforeFeedback
          />
        )}

        {/* 会話中はヤマトチャットを出さない */}
        {phase !== "talking" && (
          <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            <ChatYamatoEoyOralDrill userId={user?.id} userNickname={nickname} credits={credits} />
          </aside>
        )}
      </div>
    </ToolPageWrapper>
  );
}
