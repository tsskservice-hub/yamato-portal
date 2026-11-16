/**
 * @file eoy-oral-mock.tsx
 * @description VCE Japanese - EOY Oral Mock Exam（AI の試験官との模擬試験）
 *
 * 流れ: 設定（OralMockConfig）→ 試験（OralMockSession。途中でフィードバックは出さない）→ フィードバック（OralMockReport）
 * クレジットは試験を始めるときに 1 回だけ（Section 1: 15 / Section 2: 15 / 通し: 25）。api の /api/oral-mock/start が引く
 */
import { json, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ToolPageWrapper } from "~/components/layout/ToolPageWrapper";
import { type PageLayoutRef, notifyCreditsUpdated } from "~/components/layout/PageLayout";
import { generateModuleMeta } from "~/utils/seoMeta";
import { supabase } from "~/lib/supabaseClient";
import { yamatoFetch, YAMATO_API_BASE } from "~/lib/yamatoApi";
import { requestAuthModal } from "~/utils/openAuthModal";
import { type MockExamConfig, OralMockConfig, MOCK_SECTION_COST } from "~/components/oral/OralMockConfig";
import { type ExamResultData, OralMockSession } from "~/components/oral/OralMockSession";
import { OralMockReport } from "~/components/oral/OralMockReport";
import ChatYamatoEoyOralMock from "~/components/chat/ChatYamatoEoyOralMock";
import { type OralExamQuestionsData, fetchOralExamQuestionsData } from "~/data/oral-exam-questions";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  // PORTAL_CONTENT はもう Supabase にないので問い合わせない（meta は generateModuleMeta の既定値を使う）
  return json({ portalContent: null, currentPath: url.pathname });
}

export const meta: MetaFunction<typeof loader> = ({ data }: { data: any }) => {
  return generateModuleMeta(data?.portalContent || null, data?.currentPath || "");
};

const THEME = "#ef4444";

/** 写真を長い辺 1024px 以下の JPEG にする（送る量を減らして、AI が早く見られるように） */
function shrinkImage(dataUrl: string, maxSide = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Section 2 の写真を AI の試験官に見せる（試験が始まったらすぐ、裏で送る）。
 * うまくいけば null、使えなかったときは生徒に見せる短い知らせを返す
 */
async function sendSupportPhoto(sessionId: string, dataUrl: string): Promise<string | null> {
  try {
    const small = await shrinkImage(dataUrl);
    const res = await yamatoFetch(`${YAMATO_API_BASE}/api/oral-mock/support-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, imageBase64: small, mimeType: "image/jpeg" }),
    });
    const data = (await res.json().catch(() => ({}))) as any;
    if (res.ok && data.ok) return null;
    return data.message || "The examiner couldn't look at your photo, so the exam will continue without it.";
  } catch {
    return "The examiner couldn't look at your photo, so the exam will continue without it.";
  }
}

export default function MockOralMode() {
  const layoutRef = useRef<PageLayoutRef>(null);
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number>(0);
  const [nickname, setNickname] = useState<string>("VCE Student");
  const [learningPace, setLearningPace] = useState<string>("normal");

  const [questionsData, setQuestionsData] = useState<OralExamQuestionsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [examPhase, setExamPhase] = useState<"config" | "examining" | "result">("config");
  const [currentConfig, setCurrentConfig] = useState<MockExamConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [examResult, setExamResult] = useState<ExamResultData | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  // Section 2 の写真を AI が見終わるのを待つためのもの
  const [supportPhotoReady, setSupportPhotoReady] = useState<Promise<string | null> | null>(null);

  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const fetched = await fetchOralExamQuestionsData(supabase);
      if (fetched && typeof fetched === "object" && Object.keys(fetched).length > 0) {
        setQuestionsData(fetched);
      } else {
        setQuestionsData(null);
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load oral questions from Supabase:", err);
      setQuestionsData(null);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, nickname, learning_pace")
        .eq("id", userId)
        .single();
      if (data && !error) {
        if (typeof data.credits === "number") {
          setCredits(data.credits);
          notifyCreditsUpdated(data.credits);
        }
        if (data.nickname) setNickname(data.nickname);
        if (data.learning_pace) setLearningPace(data.learning_pace);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });
    loadQuestions();
    return () => subscription.unsubscribe();
  }, [loadQuestions]);

  const handleStartExam = async (config: MockExamConfig) => {
    if (!user) {
      alert("Please sign in to take the mock exam.");
      requestAuthModal("signin");
      return;
    }
    const cost = MOCK_SECTION_COST[config.examSection];
    if (credits < cost) {
      alert(`This mock exam uses ${cost} credits, but you have ${credits}. Please top up your credits.`);
      return;
    }
    if (!window.confirm(`Start the mock exam? ${cost} credits will be used now.\n\nFind a quiet place and allow the microphone.`)) return;

    setIsStarting(true);
    try {
      const res = await yamatoFetch(`${YAMATO_API_BASE}/api/oral-mock/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSection: config.examSection,
          difficulty: config.difficulty,
          includeBeforeAfter: config.includeBeforeAfter,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data.sessionId) {
        alert(data.reply || data.message || "We could not start the mock exam. Please try again.");
        return;
      }
      if (typeof data.balance === "number") {
        setCredits(data.balance);
        notifyCreditsUpdated(data.balance);
      }
      // Section 2 の写真があれば、すぐに裏で AI に見せておく（Section 2 が始まる前に終わるように）
      setSupportPhotoReady(
        config.supportMaterialUrl && config.examSection !== "section1"
          ? sendSupportPhoto(data.sessionId, config.supportMaterialUrl)
          : null
      );
      setCurrentConfig(config);
      setSessionId(data.sessionId);
      setExamPhase("examining");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      alert("We could not connect. Please check your internet and try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleExamComplete = (result: ExamResultData) => {
    setExamResult(result);
    setExamPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToConfig = () => {
    setExamPhase("config");
    setSessionId(null);
    setExamResult(null);
    if (user?.id) fetchProfile(user.id);
  };

  return (
    <ToolPageWrapper
      layoutRef={layoutRef}
      hasError={!isLoading && error}
      errorTitle="Unable to Load Data"
      errorMessage="Failed to load ORAL_EXAM_QUESTIONS from Supabase (kl_app)."
      onRetry={loadQuestions}
    >
      {questionsData && (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 relative">
          {examPhase === "config" && (
            <OralMockConfig onStartExam={handleStartExam} learningPace={learningPace} isStarting={isStarting} themeColor={THEME} />
          )}

          {examPhase === "examining" && currentConfig && sessionId && (
            <OralMockSession
              config={currentConfig}
              sessionId={sessionId}
              questionsData={questionsData}
              supportPhotoReady={supportPhotoReady}
              onExamComplete={handleExamComplete}
              onCancel={backToConfig}
              themeColor={THEME}
            />
          )}

          {examPhase === "result" && examResult && (
            <OralMockReport result={examResult} onRetry={backToConfig} themeColor={THEME} />
          )}

          {/* 試験中はヤマトチャットを出さない（本番と同じく、試験官とだけ話す） */}
          {examPhase !== "examining" && (
            <aside aria-label="Floating Controls" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
              <ChatYamatoEoyOralMock userId={user?.id} userNickname={nickname} credits={credits} />
            </aside>
          )}
        </div>
      )}
    </ToolPageWrapper>
  );
}
