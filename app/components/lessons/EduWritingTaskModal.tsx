/**
 * @file app/components/lessons/EduWritingTaskModal.tsx
 * @description 「誰かに伝えるために書く」ライティング課題モーダル
 *
 * 流れ
 * 1. 課題（読み手・場面・目的・伝えるべきこと）を確認して書く
 *    - 紙に書いて写真を撮る / 画像・PDFをアップロード / デジタル原稿用紙に書く
 * 2. AI が「読み手として読めたもの」をそのまま書き起こす（読めない字は［？］）
 * 3. 生徒が「書きたかったことと同じか」を確認し、違えば本来の意図を入力
 * 4. 読み手からの反応＋伝わったかのチェック＋日本語の直しをフィードバック
 * 5. 課題に沿った提出でフィードバックを受けたら完了 → EduFinishedView
 *
 * 提出回数・画像の保存はすべてサーバーで管理する
 * サーバー: api プロジェクト（Workers）の src/handlers/textbook-lesson-writing-handler.ts
 *          https://api.jptutoraiyamato.com/api/textbook-lesson-writing
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { YAMATO_API_BASE, yamatoFetch } from "~/lib/yamatoApi";
import { EduFinishedView } from "~/components/lessons/EduFinishedView";
import { EduGenkoyoshiCanvas, type GenkoyoshiCanvasHandle } from "~/components/lessons/EduGenkoyoshiCanvas";
import { useSoundEffect } from "~/hooks/useSoundEffect";

// ---------- 型 ----------

interface RequiredPoint {
  key: string;
  label_en: string;
  label_ja?: string;
}

interface WritingTask {
  id: string;
  lesson_id: string;
  title: string;
  recipient: string;
  recipient_en?: string | null;
  situation: string;
  purpose: string;
  instructions_en: string;
  required_points: RequiredPoint[];
}

interface WritingStatus {
  task: WritingTask | null;
  attemptsUsed: number;
  maxAttempts: number;
  retakesUsed: number;
  maxRetakes: number;
  completed: boolean;
  retention: { mode: "none" | "days" | "until"; deleteAfter: string | null };
  pending: { submissionId: string; transcription: string; unreadableCount: number; contentType: string } | null;
}

interface WritingFeedback {
  classification: string;
  reader_reaction_ja: string;
  reader_reaction_en: string;
  points: { key: string; label_en?: string; conveyed: "yes" | "partly" | "no"; note_en: string }[];
  handwriting_note_en: string;
  corrections: { original: string; corrected: string; explanation_en: string }[];
  overall_en: string;
  next_step_en: string;
}

type Phase = "loading" | "load_error" | "no_task" | "compose" | "reading" | "confirm" | "feedback_loading" | "feedback" | "locked" | "finished";
type InputMethod = "photo" | "upload" | "canvas";

interface PreparedFile {
  mediaType: string;
  data: string; // base64（data URL の接頭辞なし）
  previewUrl: string | null;
  name: string;
}

interface EduWritingTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
  /** edu_lessons.id（edu_writing_tasks.lesson_id と同じ値） */
  lessonId: string;
}

const API_URL = `${YAMATO_API_BASE}/api/textbook-lesson-writing`; // api: src/handlers/textbook-lesson-writing-handler.ts
const MAX_IMAGE_EDGE = 1500; // 画像の費用は画素数に比例するので縮小してから送る
const MAX_PDF_BYTES = 5 * 1024 * 1024;

// ---------- ユーティリティ ----------

async function apiFetch(init?: RequestInit & { query?: string }) {
  const { query, ...requestInit } = init ?? {};
  let res: Response;
  try {
    // yamatoFetch がログイン中のアクセストークンを Authorization ヘッダーに付ける
    res = await yamatoFetch(`${API_URL}${query ?? ""}`, {
      ...requestInit,
      headers: {
        "Content-Type": "application/json",
        ...(requestInit.headers ?? {}),
      },
    });
  } catch {
    // ネットワークエラー（オフラインなど）でも画面が止まらないようにする
    return { ok: false, status: 0, body: { message: "Could not connect to the server. Please check your connection and try again." } as any };
  }
  const body: any = await res.json().catch(() => null);
  if (body === null) {
    // JSON 以外が返った = API が正常に動いていない
    console.error(`[EduWritingTaskModal] ${API_URL} returned a non-JSON response (HTTP ${res.status}).`);
    return { ok: false, status: res.status, body: { message: `The writing task service is not available (HTTP ${res.status}). Please try again later.` } as any };
  }
  return { ok: res.ok, status: res.status, body };
}

function splitDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  return match ? { mediaType: match[1], data: match[2] } : null;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/** 画像を長辺 MAX_IMAGE_EDGE 以内の JPEG に縮小する。PDF はそのまま送る */
async function prepareFile(file: File): Promise<PreparedFile> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_BYTES) throw new Error("This PDF is too large. Please use a file under 5 MB.");
    const parts = splitDataUrl(await readAsDataUrl(file));
    if (!parts) throw new Error("Could not read the PDF.");
    return { mediaType: "application/pdf", data: parts.data, previewUrl: null, name: file.name };
  }
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo or a PDF.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This image format can't be opened. Please use a JPEG or PNG photo."));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const parts = splitDataUrl(dataUrl);
    if (!parts) throw new Error("Could not process the image.");
    return { mediaType: parts.mediaType, data: parts.data, previewUrl: dataUrl, name: file.name };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** ［？］ を赤いマークで強調して表示 */
function TranscriptionText({ text }: { text: string }) {
  const parts = text.split(/(［？］|\[\?\])/);
  return (
    <p className="text-xl sm:text-2xl font-bold leading-loose text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part === "［？］" || part === "[?]" ? (
          <span
            key={i}
            className="inline-flex items-center justify-center mx-0.5 px-1.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-lg"
            title="Your reader could not read this character"
          >
            ？
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}

const CONVEYED_STYLE = {
  yes: { icon: "✅", className: "text-emerald-700 dark:text-emerald-400" },
  partly: { icon: "🟡", className: "text-amber-700 dark:text-amber-400" },
  no: { icon: "❌", className: "text-rose-700 dark:text-rose-400" },
} as const;

// ---------- コンポーネント ----------

export const EduWritingTaskModal: React.FC<EduWritingTaskModalProps> = ({ isOpen, onClose, onCompleted, lessonId }) => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<WritingStatus | null>(null);
  const [method, setMethod] = useState<InputMethod>("photo");
  const [prepared, setPrepared] = useState<PreparedFile | null>(null);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState("");
  const [unreadableCount, setUnreadableCount] = useState(0);
  const [mismatch, setMismatch] = useState(false);
  const [intendedText, setIntendedText] = useState("");
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [completedNow, setCompletedNow] = useState(false);

  const canvasRef = useRef<GenkoyoshiCanvasHandle>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const completedRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const { playCompleteSound } = useSoundEffect();

  const task = status?.task ?? null;
  const attemptsLeft = status ? Math.max(0, status.maxAttempts - status.attemptsUsed) : 0;
  const retakesLeft = status ? Math.max(0, status.maxRetakes - status.retakesUsed) : 0;

  const resetDraft = (options: { keepCanvas?: boolean } = {}) => {
    setPrepared(null);
    setMessage(null);
    setSubmissionId(null);
    setTranscription("");
    setUnreadableCount(0);
    setMismatch(false);
    setIntendedText("");
    setFeedback(null);
    if (!options.keepCanvas) canvasRef.current?.clear();
  };

  // 開いた時に状態を取得
  const loadStatus = useCallback(async () => {
    setPhase("loading");
    setMessage(null);
    const { ok, body } = await apiFetch({ method: "GET", query: `?lessonId=${encodeURIComponent(lessonId)}` });
    if (!ok) {
      // 課題データがないので compose 画面は出せない → 専用のエラー画面を表示する
      setStatus(null);
      setPhase("load_error");
      setMessage({ tone: "error", text: body.message || "Could not load this task. Please try again." });
      return;
    }
    if (!body.task) {
      setStatus(null);
      setPhase("no_task");
      return;
    }

    const next = body as WritingStatus;
    setStatus(next);
    completedRef.current = next.completed;

    if (next.pending) {
      // 前回、読み取り結果の確認の途中で閉じた場合は、そこから再開する
      setSubmissionId(next.pending.submissionId);
      setTranscription(next.pending.transcription);
      setUnreadableCount(next.pending.unreadableCount);
      setPhase("confirm");
    } else if (next.completed) {
      setPhase("finished");
    } else if (next.attemptsUsed >= next.maxAttempts) {
      setPhase("locked");
    } else {
      setPhase("compose");
    }
  }, [lessonId]);

  useEffect(() => {
    if (!isOpen) return;
    resetDraft();
    setCompletedNow(false);
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lessonId]);

  // ---------- 入力 ----------

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを選び直せるようにする
    if (!file) return;
    setMessage(null);
    try {
      setPrepared(await prepareFile(file));
    } catch (err: any) {
      setPrepared(null);
      setMessage({ tone: "error", text: err?.message || "Could not read the file." });
    }
  };

  const switchMethod = (next: InputMethod) => {
    setMethod(next);
    setPrepared(null);
    setMessage(null);
  };

  // ---------- 提出（読み取り） ----------

  const handleSend = async () => {
    if (!task) return;
    setMessage(null);

    let file: PreparedFile | null = prepared;
    if (method === "canvas") {
      if (!canvasRef.current?.hasInk()) {
        setMessage({ tone: "error", text: "Write your message on the paper first." });
        return;
      }
      const parts = splitDataUrl(canvasRef.current.exportImage());
      file = parts ? { ...parts, previewUrl: null, name: "genkouyoushi.jpg" } : null;
    }
    if (!file) {
      setMessage({ tone: "error", text: method === "photo" ? "Take a photo of your writing first." : "Choose a file first." });
      return;
    }

    setPhase("reading");
    const { ok, body } = await apiFetch({
      method: "POST",
      body: JSON.stringify({ intent: "read", taskId: task.id, image: { mediaType: file.mediaType, data: file.data } }),
    });

    if (!ok) {
      if (body.error === "attempt_limit") {
        setPhase("locked");
        return;
      }
      if (body.error === "pending_feedback") {
        await loadStatus();
        return;
      }
      setPhase("compose");
      setMessage({ tone: "error", text: body.message || "Could not send your writing. Please try again." });
      return;
    }

    setStatus((prev) =>
      prev
        ? { ...prev, attemptsUsed: body.attemptsUsed, maxAttempts: body.maxAttempts, retakesUsed: body.retakesUsed, maxRetakes: body.maxRetakes }
        : prev
    );

    if (body.kind === "photo_retake") {
      // 写真の問題 → 提出回数には数えない
      setPhase("compose");
      setPrepared(null);
      setMessage({
        tone: "info",
        text: `📷 Your reader couldn't see the photo clearly: ${body.qualityIssue} Please take it again. This did not use up a submission. (Retakes left: ${Math.max(0, body.maxRetakes - body.retakesUsed)})`,
      });
      return;
    }

    setSubmissionId(body.submissionId);
    setTranscription(body.transcription);
    setUnreadableCount(body.unreadableCount);
    setMismatch(false);
    setIntendedText("");
    setPhase("confirm");
  };

  // ---------- フィードバック ----------

  const handleGetFeedback = async () => {
    if (!submissionId) return;
    if (mismatch && !intendedText.trim()) {
      setMessage({ tone: "error", text: "Type what you meant to write, or choose “Yes” above." });
      return;
    }
    setMessage(null);
    setPhase("feedback_loading");

    const { ok, body } = await apiFetch({
      method: "POST",
      body: JSON.stringify({ intent: "feedback", submissionId, intendedText: mismatch ? intendedText : "" }),
    });

    if (!ok) {
      // フィードバックに失敗しても提出回数は増えないので、そのまま再試行できる
      setPhase("confirm");
      setMessage({ tone: "error", text: body.message || "Could not get feedback. Please try again." });
      return;
    }

    setFeedback(body.feedback);
    setStatus((prev) => (prev ? { ...prev, attemptsUsed: body.attemptsUsed, maxAttempts: body.maxAttempts, completed: body.completed, pending: null } : prev));
    setPhase("feedback");

    if (body.completed && !completedRef.current) {
      completedRef.current = true;
      setCompletedNow(true);
      playCompleteSound();
      onCompletedRef.current();
    }
  };

  const handleRewrite = () => {
    // デジタル原稿用紙で書いた生徒は、前回の文を消さずにそのまま書き直せるようにする
    resetDraft({ keepCanvas: true });
    setPhase(attemptsLeft > 0 ? "compose" : "locked");
  };

  if (!isOpen) return null;

  // ---------- 表示 ----------

  const recipientLabel = task ? `${task.recipient}${task.recipient_en ? ` (${task.recipient_en})` : ""}` : "";
  const busy = phase === "reading" || phase === "feedback_loading";

  const methodTab = (value: InputMethod, icon: string, label: string) => (
    <button
      type="button"
      onClick={() => switchMethod(value)}
      aria-pressed={method === value}
      disabled={busy}
      className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
        method === value
          ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-5 sm:p-10 shadow-2xl space-y-6 my-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>✍️</span>
              <span>{task?.title || "Writing Task"}</span>
            </h3>
            {status && phase !== "finished" && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Submissions used: {status.attemptsUsed} / {status.maxAttempts}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-sm p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 disabled:opacity-40"
          >
            ✕ Close
          </button>
        </div>

        {phase === "loading" && (
          <p className="text-center py-16 font-bold text-slate-500 dark:text-slate-400 animate-pulse">Loading your writing task...</p>
        )}

        {/* 課題の読み込みに失敗（API エラー・ネットワークエラーなど） */}
        {phase === "load_error" && (
          <div className="text-center space-y-4 py-10">
            <div className="text-5xl">⚠️</div>
            <p className="text-sm font-bold rounded-xl p-3 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 max-w-md mx-auto">
              {message?.text || "Could not load this task. Please try again."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void loadStatus()}
                className="py-3 px-8 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm transition shadow cursor-pointer"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-8 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {phase === "no_task" && (
          <p className="text-center py-16 font-bold text-slate-500 dark:text-slate-400">There is no writing task for this lesson yet.</p>
        )}

        {/* ---------- 1. 課題と提出 ---------- */}
        {/* 原稿用紙の内容を残すため、他の段階でもアンマウントせずに隠す */}
        {task && (
          <div className={phase === "compose" || phase === "reading" ? "space-y-6" : "hidden"}>
            {/* 課題カード：誰に・何のために */}
            <div className="rounded-3xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-5 sm:p-6 space-y-3">
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">To: {recipientLabel}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{task.situation}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-bold">Your goal: </span>
                {task.purpose}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{task.instructions_en}</p>
              {task.required_points.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Make sure your reader finds out:</p>
                  <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-0.5 list-disc pl-5">
                    {task.required_points.map((p) => (
                      <li key={p.key}>
                        {p.label_en}
                        {p.label_ja ? `（${p.label_ja}）` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your reader will read exactly what you wrote. If a character can't be read, they won't understand it, so write clearly enough for someone else to read.
              </p>
            </div>

            {/* 書き方の選択 */}
            <div className="space-y-4">
              <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                {methodTab("photo", "📷", "Take a photo")}
                {methodTab("upload", "📁", "Upload a file")}
                {methodTab("canvas", "✏️", "Write here")}
              </div>

              {method === "photo" && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Write on paper, then take a photo from directly above in good light. Keep the whole page in the frame.
                  </p>
                  <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChosen} className="hidden" />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={busy}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm hover:border-orange-400 hover:text-orange-600 transition cursor-pointer"
                  >
                    📷 {prepared ? "Take the photo again" : "Open camera"}
                  </button>
                </div>
              )}

              {method === "upload" && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Upload a photo, a screenshot, or a PDF of your writing (for example from a note-taking app).
                  </p>
                  <input ref={uploadInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileChosen} className="hidden" />
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={busy}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm hover:border-orange-400 hover:text-orange-600 transition cursor-pointer"
                  >
                    📁 {prepared ? "Choose a different file" : "Choose a file"}
                  </button>
                </div>
              )}

              <div className={method === "canvas" ? "" : "hidden"}>
                <EduGenkoyoshiCanvas ref={canvasRef} />
              </div>

              {/* プレビュー */}
              {prepared && method !== "canvas" && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
                  {prepared.previewUrl ? (
                    <img src={prepared.previewUrl} alt="Preview of your writing" className="max-h-80 mx-auto rounded-xl object-contain" />
                  ) : (
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center py-4">📄 {prepared.name}</p>
                  )}
                </div>
              )}
            </div>

            {/* 画像の保存についての案内（クラスで保存期間が設定されている場合のみ） */}
            {status?.retention.deleteAfter && (
              <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
                🔒 Your image will be kept privately so your teacher can check it, and will be deleted on {formatDate(status.retention.deleteAfter)}.
              </p>
            )}

            {message && (
              <p
                className={`text-sm font-bold rounded-xl p-3 ${
                  message.tone === "error"
                    ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                    : "text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40"
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={busy}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black text-base transition shadow cursor-pointer flex items-center justify-center gap-2"
            >
              {phase === "reading" ? (
                <span className="animate-pulse">{task.recipient} is reading your message...</span>
              ) : (
                <>
                  <span>Send to {task.recipient} ✉️</span>
                  <span className="text-xs opacity-80 font-normal">
                    ({attemptsLeft} submission{attemptsLeft === 1 ? "" : "s"} left)
                  </span>
                </>
              )}
            </button>
            {retakesLeft < (status?.maxRetakes ?? 0) && (
              <p className="text-xs text-center text-slate-400">Photo retakes left: {retakesLeft}</p>
            )}
          </div>
        )}

        {/* ---------- 2. 読み取り結果の確認 ---------- */}
        {(phase === "confirm" || phase === "feedback_loading") && task && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">This is what {task.recipient} could read:</p>
              <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 sm:p-6">
                <TranscriptionText text={transcription || "（よめませんでした）"} />
              </div>
              {unreadableCount > 0 && (
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {unreadableCount} character{unreadableCount === 1 ? "" : "s"} could not be read.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-base font-black text-slate-900 dark:text-slate-100">Is this what you wrote?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMismatch(false)}
                  disabled={busy}
                  aria-pressed={!mismatch}
                  className={`py-3 px-4 rounded-2xl font-black text-sm border-2 transition cursor-pointer ${
                    !mismatch
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  👍 Yes, that's what I wrote
                </button>
                <button
                  type="button"
                  onClick={() => setMismatch(true)}
                  disabled={busy}
                  aria-pressed={mismatch}
                  className={`py-3 px-4 rounded-2xl font-black text-sm border-2 transition cursor-pointer ${
                    mismatch
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  🤔 No, I meant something different
                </button>
              </div>

              {mismatch && (
                <div className="space-y-2">
                  <label htmlFor="intended-text" className="text-sm font-bold text-slate-700 dark:text-slate-300 block">
                    Type what you meant to write, in Japanese:
                  </label>
                  <textarea
                    id="intended-text"
                    value={intendedText}
                    onChange={(e) => setIntendedText(e.target.value)}
                    disabled={busy}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-lg font-bold"
                    placeholder="わたしは…"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your reader only saw your handwriting. This helps you see where your message didn't get across.
                  </p>
                </div>
              )}
            </div>

            {message && <p className="text-sm font-bold rounded-xl p-3 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40">{message.text}</p>}

            <button
              type="button"
              onClick={handleGetFeedback}
              disabled={busy}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-black text-base transition shadow cursor-pointer"
            >
              {phase === "feedback_loading" ? <span className="animate-pulse">Waiting for {task.recipient}'s reply...</span> : `See ${task.recipient}'s reply`}
            </button>
          </div>
        )}

        {/* ---------- 3. 読み手からの反応とフィードバック ---------- */}
        {phase === "feedback" && feedback && task && (
          <div className="space-y-6">
            {/* 読み手の反応 */}
            <div className="rounded-3xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 p-5 sm:p-6 space-y-2">
              <p className="text-xs font-bold text-sky-700 dark:text-sky-300">Reply from {recipientLabel}</p>
              <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-relaxed">{feedback.reader_reaction_ja}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{feedback.reader_reaction_en}</p>
            </div>

            {/* 伝わったかのチェック */}
            {feedback.points.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-slate-100">Did your message get across?</h4>
                <ul className="space-y-2">
                  {feedback.points.map((p) => {
                    const style = CONVEYED_STYLE[p.conveyed] ?? CONVEYED_STYLE.no;
                    return (
                      <li key={p.key} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-sm">
                        <p className={`font-bold ${style.className}`}>
                          {style.icon} {p.label_en ?? p.key}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">{p.note_en}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* 字の読みやすさ */}
            {feedback.handwriting_note_en && (
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-slate-100">Could your reader read your writing?</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{feedback.handwriting_note_en}</p>
              </div>
            )}

            {/* 日本語の直し */}
            {feedback.corrections.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 dark:text-slate-100">Japanese to fix</h4>
                <ul className="space-y-2">
                  {feedback.corrections.map((c, i) => (
                    <li key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 text-sm space-y-1">
                      <p className="font-bold">
                        <span className="text-rose-600 dark:text-rose-400 line-through decoration-2">{c.original}</span>
                        <span className="mx-2 text-slate-400">➔</span>
                        <span className="text-emerald-700 dark:text-emerald-400">{c.corrected}</span>
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">{c.explanation_en}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-sm space-y-1">
              <p className="text-slate-800 dark:text-slate-200">{feedback.overall_en}</p>
              <p className="font-bold text-orange-600 dark:text-orange-400">Next: {feedback.next_step_en}</p>
            </div>

            {/* 次の行動 */}
            {status?.completed ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPhase("finished")}
                  className="py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow cursor-pointer"
                >
                  {completedNow ? "Finish task 🎉" : "Done"}
                </button>
                {attemptsLeft > 0 && (
                  <button
                    type="button"
                    onClick={handleRewrite}
                    className="py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm hover:border-orange-400 transition cursor-pointer"
                  >
                    Rewrite to improve ({attemptsLeft} left)
                  </button>
                )}
              </div>
            ) : attemptsLeft > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center">
                  Your message didn't do the task yet. Rewrite it and send it again.
                </p>
                <button
                  type="button"
                  onClick={handleRewrite}
                  className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base transition shadow cursor-pointer"
                >
                  Rewrite and send again ({attemptsLeft} left)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPhase("locked")}
                className="w-full py-4 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-base cursor-pointer"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* ---------- 提出回数を使い切った（未完了） ---------- */}
        {phase === "locked" && (
          <div className="text-center space-y-4 py-10">
            <div className="text-5xl">📮</div>
            <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">You've used all your submissions</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              This task isn't complete yet. Your teacher will check your writing and talk with you about the next step.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-10 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* ---------- 完了 ---------- */}
        {phase === "finished" && (
          <EduFinishedView
            taskName="writing tasks"
            description={
              task
                ? `${task.recipient} received your message. Your progress has been saved and this task is now marked as complete.`
                : undefined
            }
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default EduWritingTaskModal;
