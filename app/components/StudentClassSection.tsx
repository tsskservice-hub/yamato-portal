/**
 * @file StudentClassSection.tsx
 * @description マイアカウント（生徒）：先生の参加コードでクラスに入り、出された宿題と進み具合を見る
 */
import React, { useState } from "react";
import { useFetcher } from "@remix-run/react";
import { Users, ClipboardList, CheckCircle2, Circle, PencilLine, Languages } from "lucide-react";
import { INVITE_CODE_LENGTH, LESSON_TASKS } from "~/lib/teacher-config";
import { SchoolAccountLink } from "~/components/SchoolAccountLink";

/**
 * 宿題・課題 1 件。kind: homework（宿題）/ classwork（授業内の課題）
 * itemType = lesson: tasks にレッスンのタスク / vocab_quiz: quiz に最高点と回数（lessonTitle はクイズ名、lessonUrl はクイズのページ）
 */
export type StudentHomeworkItem = {
  id: string;
  title: string;
  kind: "homework" | "classwork";
  dueAt: string;
  itemType: "lesson" | "vocab_quiz";
  lessonTitle: string;
  lessonUrl: string;
  tasks: Array<{ key: string; done: boolean }>;
  quiz: { best: number | null; total: number | null; attempts: number } | null;
  /** 宿題で、今は学校時間のためできないとき、できるようになる時刻（ISO） */
  lockedUntil?: string | null;
};

type Props = {
  studentClass: { id: string; name: string; teacherName: string | null; schoolName: string | null } | null;
  homework: StudentHomeworkItem[];
  /** 確認済みの学校メール（学校の Google / Microsoft アカウント） */
  verifiedSchoolEmails: Array<{ email: string }>;
  /** 先生の承認待ちの参加申請 */
  joinRequest: { className: string; schoolEmail: string | null } | null;
};

type ActionResult = { intent?: string; success?: boolean; error?: string; message?: string };

const taskLabel = (key: string) => LESSON_TASKS.find((t) => t.key === key)?.label ?? key;

function formatDue(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
}

export function StudentClassSection({ studentClass, homework, verifiedSchoolEmails, joinRequest }: Props) {
  const fetcher = useFetcher<ActionResult>();
  const [code, setCode] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const isBusy = fetcher.state !== "idle";
  const result = fetcher.data;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-900 border-b pb-3 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" /> My Class, Homework & Classwork
      </h2>

      {result?.error && <p className="text-xs text-red-600 font-medium">{result.error}</p>}
      {result?.success && result.message && <p className="text-xs text-emerald-600 font-semibold">✓ {result.message}</p>}

      {!studentClass && joinRequest ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div>
            <p className="text-sm font-bold text-amber-900">Waiting for your teacher to approve</p>
            <p className="text-xs text-amber-800">
              You asked to join {joinRequest.className} with {joinRequest.schoolEmail ?? "your invite code"}.
            </p>
          </div>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="cancel-request" />
            <button type="submit" disabled={isBusy} className="text-xs font-semibold text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 bg-white cursor-pointer disabled:opacity-50">
              Cancel request
            </button>
          </fetcher.Form>
        </div>
      ) : !studentClass ? (
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Studying on your own? You don&apos;t need to do anything here. To join your school class, follow these two steps
            (or use a personal invite code from your teacher, below).
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">1. Verify your school account</p>
            <p className="text-xs text-gray-500">
              Sign in with the Google or Microsoft account your school gave you. This makes sure only students from your school can join your class.
              We only read your school email address.
            </p>
            <SchoolAccountLink verifiedEmails={verifiedSchoolEmails} returnPath="/my-account" />
          </div>

          <fetcher.Form method="post" className="space-y-2">
            <input type="hidden" name="intent" value="join-class" />
            <label htmlFor="join-code" className="block text-sm font-medium text-gray-700">
              2. Enter the class code from your teacher
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="join-code"
                name="joinCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7Q2MX"
                maxLength={12}
                autoComplete="off"
                disabled={verifiedSchoolEmails.length === 0}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 tracking-widest uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isBusy || code.trim().length < 4 || verifiedSchoolEmails.length === 0}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {isBusy ? "Sending..." : "Ask to Join"}
              </button>
            </div>
          </fetcher.Form>

          {/* 学校が Google を使っていない生徒：先生から手渡された 1 人用の招待コードで申請する */}
          <details className="border border-gray-200 rounded-lg px-4 py-3">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              My school doesn&apos;t use Google accounts
            </summary>
            <fetcher.Form method="post" className="space-y-2 mt-3">
              <input type="hidden" name="intent" value="redeem-invite" />
              <label htmlFor="invite-code" className="block text-xs text-gray-600">
                Ask your teacher for a <strong>personal invite code</strong> (8 letters and numbers, only for you). Enter it here instead of the two steps above.
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="invite-code"
                  name="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. K7Q2-MXRT"
                  maxLength={12}
                  autoComplete="off"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-slate-900 tracking-widest uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isBusy || inviteCode.replace(/[^A-Za-z0-9]/g, "").length !== INVITE_CODE_LENGTH}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isBusy ? "Sending..." : "Ask to Join"}
                </button>
              </div>
            </fetcher.Form>
          </details>

          <p className="text-xs text-gray-500">
            Your teacher approves your request. After that, your teacher can see your nickname, your school email address (or the name your teacher
            wrote for your invite code), your progress on AI Yamato lesson tasks, homework and classwork (including your scores on your teacher's vocabulary quizzes), and your writing submissions (including handwriting
            photos if your class keeps them). You can leave the class at any time.{' '}
            <a href="/legal/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div>
              <p className="text-sm font-bold text-blue-900">{studentClass.name}</p>
              <p className="text-xs text-blue-700">
                {[studentClass.teacherName && `Teacher: ${studentClass.teacherName}`, studentClass.schoolName]
                  .filter(Boolean)
                  .join(" · ") || "Your class"}
              </p>
            </div>
            <fetcher.Form
              method="post"
              onSubmit={(e) => {
                if (!window.confirm("Leave this class? Your teacher will no longer see your progress.")) e.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="leave-class" />
              <button
                type="submit"
                disabled={isBusy}
                className="text-xs font-semibold text-slate-600 hover:text-red-600 border border-slate-300 rounded-md px-3 py-1.5 bg-white cursor-pointer disabled:opacity-50"
              >
                Leave class
              </button>
            </fetcher.Form>
          </div>

          <AssignmentList
            title="Homework"
            icon={<ClipboardList className="w-4 h-4 text-blue-600" />}
            items={homework.filter((hw) => hw.kind !== "classwork")}
          />
          {homework.some((hw) => hw.kind === "classwork") && (
            <AssignmentList
              title="Classwork"
              icon={<PencilLine className="w-4 h-4 text-teal-600" />}
              items={homework.filter((hw) => hw.kind === "classwork")}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** 宿題または課題の一覧（レッスンのタスク・語彙クイズ） */
function AssignmentList({ title, icon, items }: { title: string; icon: React.ReactNode; items: StudentHomeworkItem[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-2">
        {icon} {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">No {title.toLowerCase()} yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {items.map((hw) => {
            const isQuiz = hw.itemType === "vocab_quiz";
            const doneCount = isQuiz ? (hw.quiz && hw.quiz.attempts > 0 ? 1 : 0) : hw.tasks.filter((t) => t.done).length;
            const totalCount = isQuiz ? 1 : hw.tasks.length;
            const allDone = doneCount === totalCount;
            const overdue = !allDone && new Date(hw.dueAt).getTime() < Date.now();
            return (
              <li key={hw.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <a href={hw.lessonUrl} className="text-sm font-semibold text-blue-700 hover:underline">
                    {hw.title}
                  </a>
                  <p className="text-xs text-gray-500" suppressHydrationWarning>
                    {isQuiz && <Languages className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                    {isQuiz ? `Vocabulary quiz: ${hw.lessonTitle}` : hw.lessonTitle} · Due {formatDue(hw.dueAt)}
                    {overdue && <span className="ml-1 font-semibold text-red-600">(overdue)</span>}
                  </p>
                  {hw.lockedUntil && !allDone && (
                    <p className="text-[11px] font-semibold text-amber-700 mt-1" suppressHydrationWarning>
                      🔒 Homework can&apos;t be done during school hours. Available after{" "}
                      {new Date(hw.lockedUntil).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}.
                    </p>
                  )}
                  {isQuiz ? (
                    <p className="text-[11px] text-gray-600 mt-1.5">
                      {hw.quiz && hw.quiz.attempts > 0 && hw.quiz.best !== null && hw.quiz.total !== null
                        ? <>Best score: <strong>{hw.quiz.best}/{hw.quiz.total}</strong> · Tried {hw.quiz.attempts} time{hw.quiz.attempts === 1 ? "" : "s"} · You can try again</>
                        : <a href={hw.lessonUrl} className="text-blue-700 font-semibold hover:underline">Start the quiz →</a>}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {hw.tasks.map((t) => (
                        <span
                          key={t.key}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                            t.done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-600"
                          }`}
                        >
                          {t.done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                          {taskLabel(t.key)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-bold shrink-0 ${allDone ? "text-emerald-600" : "text-gray-600"}`}>
                  {isQuiz ? (allDone ? "Done" : "Not started") : `${doneCount}/${totalCount} done`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default StudentClassSection;
