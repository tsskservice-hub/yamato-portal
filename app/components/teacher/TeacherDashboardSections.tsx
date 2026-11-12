/**
 * @file TeacherDashboardSections.tsx
 * @description 教師ダッシュボードの各カード（クラス・設定・宿題・完了率・手書き）
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Form, Link, useNavigation } from '@remix-run/react';
import {
  Users, KeyRound, RefreshCw, Trash2, ClipboardList, BarChart3, PenLine, Download, Image as ImageIcon, CheckCircle2, Circle,
  UserPlus, Check, X,
} from 'lucide-react';
import { HANDWRITING_RETENTION_OPTIONS, LESSON_TASKS } from '~/lib/teacher-config';
import { SchoolAccountLink } from '~/components/SchoolAccountLink';

export type DashboardData = {
  teacher: { email: string; nickname: string | null; schoolName: string | null };
  limits: { maxClasses: number; maxStudentsPerClass: number; maxActiveHomeworkPerClass: number };
  /** 先生の確認済みの学校メール（Google / Microsoft） */
  schoolEmails: Array<{ email: string; domain: string }>;
  classes: Array<{ id: string; name: string }>;
  /** allowedDomains: このクラスに参加を申請できる生徒の学校メールのドメイン */
  selectedClass: { id: string; name: string; joinCode: string; allowedDomains: string[] } | null;
  lessons: Array<{ id: string; slug: string; title: string }>;
  period: { from: string; to: string; tz: number };
  /** email は承認したときの生徒の学校メール（個人のメールではない） */
  students: Array<{ id: string; nickname: string | null; email: string }>;
  joinRequests: Array<{ id: string; nickname: string | null; schoolEmail: string; createdAt: string }>;
  homework: Array<{ id: string; title: string; lessonId: string; taskKeys: string[]; dueAt: string; inPeriod: boolean }>;
  progress: Array<{ userId: string; lessonId: string; taskKey: string; completedAt: string | null }>;
  handwriting: Array<{
    id: string; userId: string; lessonId: string; attemptNo: number | null; transcription: string;
    classification: string; createdAt: string; hasImage: boolean; imageDeleteAfter: string | null;
  }>;
  retention: string;
};

const card = 'bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4';
const h2 = 'text-base font-bold text-slate-800 flex items-center gap-2';
const input = 'px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none';
const btn = 'px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50';
const btnGhost = 'text-xs font-semibold text-slate-600 border border-slate-300 rounded-md px-3 py-1.5 bg-white hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1';

const taskLabel = (key: string) => LESSON_TASKS.find((t) => t.key === key)?.label ?? key;
const studentName = (s: { nickname: string | null; email: string }) => s.nickname || s.email || 'Student';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** ブラウザの時差（分）。日付の区切りを先生の時間に合わせるためにサーバーへ送る */
function useTzOffset() {
  const [tz, setTz] = useState(0);
  useEffect(() => setTz(new Date().getTimezoneOffset()), []);
  return tz;
}

/** 「完了済み」を引けるようにまとめる */
function useDoneSet(progress: DashboardData['progress']) {
  return useMemo(() => new Set(progress.map((p) => `${p.userId}:${p.lessonId}:${p.taskKey}`)), [progress]);
}

function classHref(data: DashboardData, classId: string) {
  const q = new URLSearchParams({ class: classId, from: data.period.from, to: data.period.to, tz: String(data.period.tz) });
  return `/teacher-dashboard?${q}`;
}

// ---------- クラスの切り替え・作成 ----------

export function ClassBar({ data }: { data: DashboardData }) {
  const nav = useNavigation();
  const canCreate = data.classes.length < data.limits.maxClasses;

  return (
    <section className={card} aria-label="Classes">
      <h2 className={h2}><Users className="w-5 h-5 text-indigo-600" /> Your Classes</h2>

      {data.classes.length === 0 ? (
        <p className="text-sm text-slate-600">Create your first class. You will get a class code to share with your students.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.classes.map((c) => (
            <Link
              key={c.id}
              to={classHref(data, c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border no-underline ${
                data.selectedClass?.id === c.id
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {canCreate && data.schoolEmails.length === 0 ? (
        <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-amber-900">Verify your school account to create a class</p>
          <p className="text-xs text-amber-800">
            To keep students safe, a class is linked to your school&apos;s email domain. Only students who verify an account from your school
            can ask to join, and you approve each one.
          </p>
          <SchoolAccountLink verifiedEmails={[]} returnPath="/teacher-dashboard" />
        </div>
      ) : canCreate ? (
        <Form method="post" className="flex flex-col sm:flex-row gap-2">
          <input type="hidden" name="intent" value="create-class" />
          <input name="name" required maxLength={60} placeholder="New class name (e.g. Year 9 Japanese A)" className={`${input} flex-1`} />
          {data.schoolEmails.length > 1 ? (
            <select name="schoolDomain" className={input} aria-label="School email domain for this class">
              {data.schoolEmails.map((e) => <option key={e.domain} value={e.domain}>@{e.domain}</option>)}
            </select>
          ) : (
            <input type="hidden" name="schoolDomain" value={data.schoolEmails[0].domain} />
          )}
          <button type="submit" className={btn} disabled={nav.state !== 'idle'}>Create Class</button>
        </Form>
      ) : (
        <p className="text-xs text-slate-500">
          The free teacher plan includes {data.limits.maxClasses} class. Need more classes?{' '}
          <a href="/contact" className="text-indigo-700 font-semibold hover:underline">Ask us about a school plan</a>.
        </p>
      )}
    </section>
  );
}

// ---------- 参加申請（先生が承認するまで生徒のデータは見えない） ----------

export function JoinRequestsCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  if (data.joinRequests.length === 0) return null;

  return (
    <section className={`${card} border-amber-300`} aria-label="Join requests">
      <h2 className={h2}><UserPlus className="w-5 h-5 text-amber-600" /> Join Requests ({data.joinRequests.length})</h2>
      <p className="text-xs text-slate-500">
        Approve only students you teach. The school email has been verified by Google or Microsoft.
      </p>
      <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
        {data.joinRequests.map((r) => (
          <li key={r.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{r.nickname || r.schoolEmail}</p>
              <p className="text-[11px] text-slate-500 truncate" suppressHydrationWarning>
                {r.schoolEmail} · {formatDate(r.createdAt)}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Form method="post">
                <input type="hidden" name="intent" value="approve-request" />
                <input type="hidden" name="classId" value={cls.id} />
                <input type="hidden" name="requestId" value={r.id} />
                <button type="submit" className={`${btn} inline-flex items-center gap-1`}><Check className="w-4 h-4" /> Approve</button>
              </Form>
              <Form method="post">
                <input type="hidden" name="intent" value="decline-request" />
                <input type="hidden" name="classId" value={cls.id} />
                <input type="hidden" name="requestId" value={r.id} />
                <button type="submit" className={btnGhost}><X className="w-3.5 h-3.5" /> Decline</button>
              </Form>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- 参加コード・生徒・手書き画像の保存設定 ----------

export function ClassSettingsCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const [confirmName, setConfirmName] = useState('');

  return (
    <section className={card} aria-label="Class settings">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <h2 className={h2}><KeyRound className="w-5 h-5 text-indigo-600" /> Class Code</h2>
          <p className="text-3xl font-black tracking-[0.3em] text-indigo-700 font-mono">{cls.joinCode}</p>
          <p className="text-xs text-slate-500">
            Students sign up for free, open <strong>My Account</strong>, verify their school account and enter this code under
            &quot;My Class &amp; Homework&quot;. Only school accounts ending in{' '}
            <strong>{cls.allowedDomains.map((d) => `@${d}`).join(' or ')}</strong> can ask to join, and you approve each request below.
          </p>
          <Form method="post" onSubmit={(e) => { if (!window.confirm('Make a new code? The old code will stop working.')) e.preventDefault(); }}>
            <input type="hidden" name="intent" value="regenerate-code" />
            <input type="hidden" name="classId" value={cls.id} />
            <button type="submit" className={btnGhost}><RefreshCw className="w-3.5 h-3.5" /> New code</button>
          </Form>
        </div>

        <div className="space-y-2">
          <h2 className={h2}><PenLine className="w-5 h-5 text-indigo-600" /> Handwriting Images</h2>
          <p className="text-xs text-slate-500">
            How long to keep photos of students&apos; handwritten writing so you can check them. Students are told how long their image is kept.
          </p>
          <Form method="post" className="flex flex-col sm:flex-row gap-2">
            <input type="hidden" name="intent" value="update-retention" />
            <input type="hidden" name="classId" value={cls.id} />
            <select name="retention" defaultValue={data.retention} key={data.retention} className={`${input} flex-1`}>
              {HANDWRITING_RETENTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="submit" className={btn}>Save</button>
          </Form>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-2">
        <h3 className="text-sm font-bold text-slate-700">
          Students ({data.students.length}/{data.limits.maxStudentsPerClass})
        </h3>
        {data.students.length === 0 ? (
          <p className="text-xs text-slate-500">No students yet. Share the class code above.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.students.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-md px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{studentName(s)}</p>
                  {s.nickname && <p className="text-[11px] text-slate-500 truncate">{s.email}</p>}
                </div>
                <Form method="post" onSubmit={(e) => { if (!window.confirm(`Remove ${studentName(s)} from this class?`)) e.preventDefault(); }}>
                  <input type="hidden" name="intent" value="remove-student" />
                  <input type="hidden" name="classId" value={cls.id} />
                  <input type="hidden" name="studentId" value={s.id} />
                  <button type="submit" className="text-slate-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-1" aria-label={`Remove ${studentName(s)}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <details className="border-t border-slate-100 pt-3">
        <summary className="text-xs font-semibold text-red-600 cursor-pointer">Delete this class</summary>
        <Form method="post" className="mt-2 flex flex-col sm:flex-row gap-2">
          <input type="hidden" name="intent" value="delete-class" />
          <input type="hidden" name="classId" value={cls.id} />
          <input
            name="confirmName"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={`Type "${cls.name}" to confirm`}
            className={`${input} flex-1`}
          />
          <button type="submit" disabled={confirmName !== cls.name} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-md cursor-pointer disabled:opacity-40">
            Delete class & homework
          </button>
        </Form>
      </details>
    </section>
  );
}

// ---------- 宿題を出す・宿題ごとの進捗 ----------

export function HomeworkCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const tz = useTzOffset();
  const done = useDoneSet(data.progress);
  const [openId, setOpenId] = useState<string | null>(null);
  const lessonTitle = (id: string) => data.lessons.find((l) => l.id === id)?.title ?? 'Lesson';

  return (
    <section className={card} aria-label="Homework">
      <h2 className={h2}><ClipboardList className="w-5 h-5 text-indigo-600" /> Homework</h2>

      <Form method="post" className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <input type="hidden" name="intent" value="assign-homework" />
        <input type="hidden" name="classId" value={cls.id} />
        <input type="hidden" name="tz" value={tz} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-slate-600 space-y-1 md:col-span-2">
            <span>Lesson</span>
            <select name="lessonId" required className={`${input} w-full`} defaultValue="">
              <option value="" disabled>Choose a lesson…</option>
              {data.lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span>Due date</span>
            <input type="date" name="dueDate" required className={`${input} w-full`} />
          </label>
        </div>
        <fieldset>
          <legend className="text-xs font-semibold text-slate-600 mb-1">Tasks</legend>
          <div className="flex flex-wrap gap-3">
            {LESSON_TASKS.map((t) => (
              <label key={t.key} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                <input type="checkbox" name="taskKeys" value={t.key} defaultChecked /> {t.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col sm:flex-row gap-2">
          <input name="title" maxLength={100} placeholder="Title (optional, e.g. Week 3 homework)" className={`${input} flex-1`} />
          <button type="submit" className={btn}>Set Homework</button>
        </div>
      </Form>

      {data.homework.length === 0 ? (
        <p className="text-xs text-slate-500">No homework yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {data.homework.map((hw) => {
            const total = hw.taskKeys.length;
            const finished = data.students.filter((s) => hw.taskKeys.every((k) => done.has(`${s.id}:${hw.lessonId}:${k}`))).length;
            const isOpen = openId === hw.id;
            return (
              <li key={hw.id} className="p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : hw.id)}
                    className="text-left bg-transparent border-none p-0 cursor-pointer min-w-0"
                    aria-expanded={isOpen}
                  >
                    <p className="text-sm font-semibold text-slate-800">{hw.title}</p>
                    <p className="text-xs text-slate-500" suppressHydrationWarning>
                      {lessonTitle(hw.lessonId)} · {hw.taskKeys.map(taskLabel).join(', ')} · Due {formatDate(hw.dueAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-700">{finished}/{data.students.length} students finished</span>
                    <Form method="post" onSubmit={(e) => { if (!window.confirm('Delete this homework?')) e.preventDefault(); }}>
                      <input type="hidden" name="intent" value="delete-homework" />
                      <input type="hidden" name="classId" value={cls.id} />
                      <input type="hidden" name="homeworkId" value={hw.id} />
                      <button type="submit" className="text-slate-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-1" aria-label="Delete homework">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Form>
                  </div>
                </div>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left font-semibold py-1 pr-3">Student</th>
                          {hw.taskKeys.map((k) => <th key={k} className="font-semibold px-2 py-1">{taskLabel(k)}</th>)}
                          <th className="font-semibold px-2 py-1">Done</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.students.map((s) => {
                          const n = hw.taskKeys.filter((k) => done.has(`${s.id}:${hw.lessonId}:${k}`)).length;
                          return (
                            <tr key={s.id} className="border-t border-slate-100">
                              <td className="py-1 pr-3 text-slate-800 whitespace-nowrap">{studentName(s)}</td>
                              {hw.taskKeys.map((k) => (
                                <td key={k} className="px-2 py-1 text-center">
                                  {done.has(`${s.id}:${hw.lessonId}:${k}`)
                                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" aria-label="done" />
                                    : <Circle className="w-4 h-4 text-slate-300 inline" aria-label="not done" />}
                                </td>
                              ))}
                              <td className="px-2 py-1 text-center font-semibold text-slate-700">{n}/{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------- 期間内の宿題完了率（%） ----------

export function CompletionCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const tz = useTzOffset();
  const done = useDoneSet(data.progress);
  const inPeriod = data.homework.filter((h) => h.inPeriod);
  const totalTasks = inPeriod.reduce((sum, h) => sum + h.taskKeys.length, 0);

  const rows = data.students.map((s) => {
    const doneTasks = inPeriod.reduce(
      (sum, h) => sum + h.taskKeys.filter((k) => done.has(`${s.id}:${h.lessonId}:${k}`)).length,
      0
    );
    const fullHomework = inPeriod.filter((h) => h.taskKeys.every((k) => done.has(`${s.id}:${h.lessonId}:${k}`))).length;
    const percent = totalTasks === 0 ? null : Math.round((doneTasks / totalTasks) * 100);
    return { student: s, doneTasks, fullHomework, percent };
  });
  const scored = rows.filter((r) => r.percent !== null);
  const average = scored.length ? Math.round(scored.reduce((a, r) => a + (r.percent ?? 0), 0) / scored.length) : null;

  const downloadCsv = () => {
    const header = ['Student', 'Email', 'Completion %', 'Tasks done', 'Tasks set', 'Homework fully done', 'Homework set'];
    const lines = rows.map((r) => [
      r.student.nickname ?? '', r.student.email, r.percent ?? '', r.doneTasks, totalTasks, r.fullHomework, inPeriod.length,
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cls.name}-homework-${data.period.from}-to-${data.period.to}.csv`.replace(/[^\w.-]+/g, '_');
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className={card} aria-label="Homework completion">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className={h2}><BarChart3 className="w-5 h-5 text-indigo-600" /> Homework Completion</h2>
        <button type="button" onClick={downloadCsv} className={btnGhost} disabled={rows.length === 0}>
          <Download className="w-3.5 h-3.5" /> Download CSV
        </button>
      </div>

      <Form method="get" className="flex flex-col sm:flex-row sm:items-end gap-2">
        <input type="hidden" name="class" value={cls.id} />
        <input type="hidden" name="tz" value={tz} />
        <label className="text-xs font-semibold text-slate-600 space-y-1">
          <span className="block">From</span>
          <input type="date" name="from" defaultValue={data.period.from} key={`f-${data.period.from}`} className={input} />
        </label>
        <label className="text-xs font-semibold text-slate-600 space-y-1">
          <span className="block">To</span>
          <input type="date" name="to" defaultValue={data.period.to} key={`t-${data.period.to}`} className={input} />
        </label>
        <button type="submit" className={btn}>Show</button>
      </Form>

      <p className="text-xs text-slate-500">
        Counts homework due between these dates ({inPeriod.length} homework, {totalTasks} tasks).
        A task counts as done when the student has completed it on AI Yamato.
        {average !== null && <> Class average: <strong className="text-slate-800">{average}%</strong>.</>}
      </p>

      {data.students.length === 0 ? (
        <p className="text-xs text-slate-500">No students yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left font-semibold py-2 pr-3">Student</th>
                <th className="text-left font-semibold py-2 px-2 w-1/2">Completion</th>
                <th className="font-semibold py-2 px-2">Tasks</th>
                <th className="font-semibold py-2 px-2">Homework done</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-800 whitespace-nowrap">{studentName(r.student)}</td>
                  <td className="py-2 px-2">
                    {r.percent === null ? (
                      <span className="text-xs text-slate-400">No homework in this period</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[80px]">
                          <div
                            className={`h-full rounded-full ${r.percent >= 80 ? 'bg-emerald-500' : r.percent >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${r.percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-800 w-10 text-right">{r.percent}%</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-xs text-slate-700">{r.doneTasks}/{totalTasks}</td>
                  <td className="py-2 px-2 text-center text-xs text-slate-700">{r.fullHomework}/{inPeriod.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- 手書きライティング ----------

const CLASSIFICATION_LABEL: Record<string, string> = {
  on_task: 'On task',
  off_task: 'Off task',
  blank: 'Blank',
  not_japanese: 'Not Japanese',
  pending: 'Checking',
  photo_issue: 'Photo issue',
};

export function HandwritingCard({ data }: { data: DashboardData }) {
  const [studentFilter, setStudentFilter] = useState('');
  const nameOf = (id: string) => {
    const s = data.students.find((x) => x.id === id);
    return s ? studentName(s) : 'Student';
  };
  const lessonTitle = (id: string) => data.lessons.find((l) => l.id === id)?.title ?? 'Lesson';
  const items = data.handwriting.filter((h) => !studentFilter || h.userId === studentFilter);

  return (
    <section className={card} aria-label="Handwritten writing">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className={h2}><PenLine className="w-5 h-5 text-indigo-600" /> Handwritten Writing</h2>
        <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} className={input} aria-label="Filter by student">
          <option value="">All students</option>
          {data.students.map((s) => <option key={s.id} value={s.id}>{studentName(s)}</option>)}
        </select>
      </div>

      {data.retention === 'none' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Handwriting images are not being kept for this class. Change &quot;Handwriting Images&quot; above to see new submissions as images.
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">No writing submissions yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {items.map((h) => (
            <li key={h.id} className="p-3 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{nameOf(h.userId)}</p>
                  <p className="text-xs text-slate-500" suppressHydrationWarning>
                    {lessonTitle(h.lessonId)} · {formatDate(h.createdAt)}
                    {h.attemptNo ? ` · Attempt ${h.attemptNo}` : ''} · {CLASSIFICATION_LABEL[h.classification] ?? h.classification}
                  </p>
                </div>
                {h.hasImage ? (
                  <a href={`/teacher-handwriting/${h.id}`} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                    <ImageIcon className="w-3.5 h-3.5" /> View handwriting
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">Image not kept</span>
                )}
              </div>
              {h.transcription && (
                <details>
                  <summary className="text-xs text-indigo-700 cursor-pointer">AI transcription</summary>
                  <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-md p-2">{h.transcription}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
