/**
 * @file AssignmentSections.tsx
 * @description 教師ダッシュボード：宿題・課題を出す／一覧と進捗／期間内の完了率／語彙クイズを作る（SQL 42）
 *
 *  - 宿題（homework）と授業内の課題（classwork）は動きが同じで、一覧と集計を分ける。課題の締切の初期値は「今日」
 *  - 出せるもの: レッスンのタスク（6 つから選ぶ）または 先生が作った語彙クイズ
 *  - 出す相手: クラス全員 または 選んだ生徒（あとから変えられる）
 *  - 語彙クイズの進捗: 完了（1 回以上やった）・最高点・回数・最後にやった日
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Form, useFetcher, useSearchParams } from '@remix-run/react';
import {
  ClipboardList, BarChart3, Download, Trash2, CheckCircle2, Circle, School, Users, Plus, X, Languages, PencilLine, UserRound,
} from 'lucide-react';
import { LESSON_TASKS, VOCAB_QUIZ_LIMITS, assignmentKindLabel } from '~/lib/teacher-config';
import {
  btn, btnGhost, card, formatDate, h2, input, studentName, taskLabel, useDoneSet, useTzOffset, type DashboardData,
} from '~/components/teacher/TeacherDashboardSections';
import { DayOffToggle, HomeworkUnlockControl, schoolHoursSummary } from '~/components/teacher/SchoolHoursSections';

type Assignment = DashboardData['homework'][number];
type Kind = Assignment['kind'];

// ---------- 共通の計算 ----------

const isTarget = (hw: Assignment, studentId: string) => hw.assignTo === 'class' || hw.studentIds.includes(studentId);
/** 1 つの宿題・課題の「やること」の数（レッスンはタスクの数、クイズは 1） */
const unitsOf = (hw: Assignment) => (hw.itemType === 'lesson' ? hw.taskKeys.length : 1);

function useAssignmentHelpers(data: DashboardData) {
  const done = useDoneSet(data.progress);
  const stats = useMemo(() => new Map(data.quizStats.map((s) => [`${s.homeworkId}:${s.userId}`, s])), [data.quizStats]);
  const statOf = (hw: Assignment, studentId: string) => stats.get(`${hw.id}:${studentId}`) ?? null;
  const taskDone = (hw: Assignment, studentId: string, key: string) => done.has(`${studentId}:${hw.lessonId}:${key}`);
  const doneUnits = (hw: Assignment, studentId: string) =>
    hw.itemType === 'lesson' ? hw.taskKeys.filter((k) => taskDone(hw, studentId, k)).length : statOf(hw, studentId) ? 1 : 0;
  const targets = (hw: Assignment) => data.students.filter((s) => isTarget(hw, s.id));
  const lessonTitle = (id: string | null) => data.lessons.find((l) => l.id === id)?.title ?? 'Lesson';
  const quizTitle = (id: string | null) => data.quizzes.find((q) => q.id === id)?.title ?? 'Vocabulary quiz';
  return { statOf, taskDone, doneUnits, targets, lessonTitle, quizTitle };
}

const pct = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 100) : 0);

/** 締切の日時（例: 17 Nov 2026, 3:15 pm） */
function formatDueDateTime(iso: string) {
  const d = new Date(iso);
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`;
}

/** 今日の日付（先生のブラウザの時間）"YYYY-MM-DD" */
function todayInput() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** 「クラス全員 / 選んだ生徒」の選択（出すときと、あとから変えるときの両方で使う） */
function TargetPicker({
  students, defaultAssignTo = 'class', defaultIds = [], disabled = false,
}: {
  students: DashboardData['students']; defaultAssignTo?: 'class' | 'students'; defaultIds?: string[]; disabled?: boolean;
}) {
  const [assignTo, setAssignTo] = useState<'class' | 'students'>(defaultAssignTo);
  const [picked, setPicked] = useState<Set<string>>(new Set(defaultIds));
  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-xs font-semibold text-slate-600 mb-1">Assign to</legend>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <input type="radio" name="assignTo" value="class" checked={assignTo === 'class'} onChange={() => setAssignTo('class')} />
          Whole class
        </label>
        <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <input type="radio" name="assignTo" value="students" checked={assignTo === 'students'} onChange={() => setAssignTo('students')} />
          Selected students
        </label>
      </div>
      {assignTo === 'students' && (
        students.length === 0 ? (
          <p className="text-xs text-slate-500">No students in this class yet.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <button type="button" className={btnGhost} onClick={() => setPicked(new Set(students.map((s) => s.id)))}>Select all</button>
              <button type="button" className={btnGhost} onClick={() => setPicked(new Set())}>Clear</button>
              <span className="text-xs text-slate-500 self-center">{picked.size} selected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-48 overflow-y-auto border border-slate-200 rounded-md p-2 bg-white">
              {students.map((s) => (
                <label key={s.id} className="inline-flex items-center gap-1.5 text-sm text-slate-700 min-w-0">
                  <input type="checkbox" name="studentIds" value={s.id} checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                  <span className="truncate">{studentName(s)}</span>
                </label>
              ))}
            </div>
          </div>
        )
      )}
    </fieldset>
  );
}

// ---------- 生徒ごとの進捗（URL の ?student=ID で開く。ブラウザの「戻る」で閉じられる） ----------

const STUDENT_PARAM = 'student';

/** 生徒の名前。押すとその生徒の宿題・課題の進捗が開く */
export function StudentLink({ student }: { student: DashboardData['students'][number] }) {
  const [params, setParams] = useSearchParams();
  return (
    <button
      type="button"
      onClick={() => {
        const next = new URLSearchParams(params);
        next.set(STUDENT_PARAM, student.id);
        setParams(next, { preventScrollReset: true });
      }}
      className="text-left text-indigo-700 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
      title="See this student's homework and classwork"
    >
      {studentName(student)}
    </button>
  );
}

/** 生徒の一覧（名前を押すと進捗が開く）。クラスから外す操作もここ */
export function StudentsCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const h = useAssignmentHelpers(data);

  // 一覧に出す簡単なまとめ：宿題・課題をそれぞれ何件終えたか（期間に関係なく、その生徒に出した全部）
  const summary = (studentId: string, kind: Kind) => {
    const mine = data.homework.filter((hw) => hw.kind === kind && isTarget(hw, studentId));
    const done = mine.filter((hw) => h.doneUnits(hw, studentId) === unitsOf(hw)).length;
    return { done, total: mine.length };
  };

  return (
    <section className={card} aria-label="Students">
      <h2 className={h2}>
        <Users className="w-5 h-5 text-indigo-600" /> Students
        <span className="text-xs font-normal text-slate-500">({data.students.length}/{data.limits.maxStudentsPerClass})</span>
      </h2>
      <p className="text-xs text-slate-500">Click a name to see all of that student&apos;s homework and classwork.</p>
      {data.schoolHours.available && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
          <span>Homework is locked in school hours ({schoolHoursSummary(data.schoolHours)}).</span>
          <DayOffToggle data={data} />
        </div>
      )}
      {data.students.length === 0 ? (
        <p className="text-xs text-slate-500">No students yet. Share the class code (below) or personal invite codes.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.students.map((s) => {
            const hwSum = summary(s.id, 'homework');
            const cwSum = summary(s.id, 'classwork');
            return (
              <li key={s.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-md px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm truncate"><StudentLink student={s} /></p>
                  {s.nickname && <p className="text-[11px] text-slate-500 truncate">{s.email}</p>}
                  <p className="text-[11px] text-slate-500">
                    Homework {hwSum.done}/{hwSum.total}
                    {(data.assignmentsAvailable || cwSum.total > 0) && <> · Classwork {cwSum.done}/{cwSum.total}</>}
                  </p>
                  <div className="mt-1"><HomeworkUnlockControl data={data} studentId={s.id} compact /></div>
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
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** 1 人の生徒の、宿題と課題すべての進捗（期間に関係なく、その生徒に出したもの全部） */
export function StudentProgressDialog({ data }: { data: DashboardData }) {
  const [params, setParams] = useSearchParams();
  const h = useAssignmentHelpers(data);
  const studentId = params.get(STUDENT_PARAM);
  const student = data.students.find((s) => s.id === studentId) ?? null;

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete(STUDENT_PARAM);
    setParams(next, { preventScrollReset: true });
  };

  useEffect(() => {
    if (!student) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id]);

  if (!student) return null;

  const now = Date.now();
  const section = (kind: Kind) => {
    const items = data.homework.filter((hw) => hw.kind === kind && isTarget(hw, student.id));
    const fullDone = items.filter((hw) => h.doneUnits(hw, student.id) === unitsOf(hw)).length;
    const label = assignmentKindLabel(kind);
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          {kind === 'classwork' ? <PencilLine className="w-4 h-4 text-teal-600" /> : <School className="w-4 h-4 text-indigo-600" />}
          {label} <span className="text-xs font-normal text-slate-500">({fullDone}/{items.length} fully done)</span>
        </h3>
        {items.length === 0 ? (
          <p className="text-xs text-slate-500">No {label.toLowerCase()} for this student.</p>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-500 bg-slate-50">
                  <th className="text-left font-semibold py-1.5 px-2">Title</th>
                  <th className="text-left font-semibold py-1.5 px-2">Due</th>
                  <th className="text-left font-semibold py-1.5 px-2">Progress</th>
                </tr>
              </thead>
              <tbody>
                {items.map((hw) => {
                  const doneUnits = h.doneUnits(hw, student.id);
                  const finished = doneUnits === unitsOf(hw);
                  const overdue = !finished && new Date(hw.dueAt).getTime() < now;
                  const stat = h.statOf(hw, student.id);
                  return (
                    <tr key={hw.id} className="border-t border-slate-100 align-top">
                      <td className="py-1.5 px-2">
                        <p className="font-semibold text-slate-800">{hw.title}</p>
                        <p className="text-slate-500">
                          {hw.itemType === 'lesson' ? h.lessonTitle(hw.lessonId) : <>Vocabulary quiz: {h.quizTitle(hw.quizId)}</>}
                        </p>
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap text-slate-700" suppressHydrationWarning>
                        {formatDueDateTime(hw.dueAt)}
                        {overdue && <span className="block font-semibold text-red-600">Overdue</span>}
                      </td>
                      <td className="py-1.5 px-2">
                        {hw.itemType === 'lesson' ? (
                          <div className="flex flex-wrap gap-1">
                            {hw.taskKeys.map((k) => {
                              const done = h.taskDone(hw, student.id, k);
                              return (
                                <span key={k} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${
                                  done ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'
                                }`}>
                                  {done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />} {taskLabel(k)}
                                </span>
                              );
                            })}
                            <span className={`font-bold ml-1 ${finished ? 'text-emerald-700' : 'text-slate-600'}`}>{doneUnits}/{unitsOf(hw)}</span>
                          </div>
                        ) : stat ? (
                          <span className="text-slate-700" suppressHydrationWarning>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline -mt-0.5" /> Best <strong>{stat.best}/{stat.total}</strong> ({pct(stat.best, stat.total)}%)
                            {' · '}{stat.attempts} {stat.attempts === 1 ? 'try' : 'tries'} · Last {formatDate(stat.lastAt)}
                          </span>
                        ) : (
                          <span className="text-slate-500"><Circle className="w-3.5 h-3.5 inline -mt-0.5" /> Not started</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${studentName(student)}: homework and classwork`}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <UserRound className="w-5 h-5 text-indigo-600" /> {studentName(student)}
            </h2>
            {student.nickname && <p className="text-xs text-slate-500 truncate">{student.email}</p>}
            <div className="mt-2"><HomeworkUnlockControl data={data} studentId={student.id} /></div>
          </div>
          <button type="button" onClick={close} className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        {section('homework')}
        {(data.assignmentsAvailable || data.homework.some((hw) => hw.kind === 'classwork')) && section('classwork')}
      </div>
    </div>
  );
}

// ---------- 宿題・課題を出す ----------

export function AssignCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const tz = useTzOffset();
  const available = data.assignmentsAvailable;
  const [kind, setKind] = useState<Kind>('homework');
  const [itemType, setItemType] = useState<'lesson' | 'vocab_quiz'>('lesson');
  const [dueDate, setDueDate] = useState('');
  // 締切の時刻。宿題は 23:59、課題（授業内）は 15:15 が初期値（先生が変えたら、種類を切り替えてもそのまま）
  const [dueTime, setDueTime] = useState('23:59');
  const [timeTouched, setTimeTouched] = useState(false);

  // 課題（授業内）は締切の初期値を「今日」にする
  useEffect(() => {
    if (kind === 'classwork' && !dueDate) setDueDate(todayInput());
    if (!timeTouched) setDueTime(kind === 'classwork' ? '15:15' : '23:59');
  }, [kind, dueDate, timeTouched]);

  return (
    <section className={card} aria-label="Set homework or classwork">
      <h2 className={h2}><ClipboardList className="w-5 h-5 text-indigo-600" /> Set Homework or Classwork</h2>

      {!available && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Classwork, vocabulary quizzes and assigning to selected students will be available after a database update (SQL 42).
          You can still set homework from lessons for the whole class.
        </p>
      )}

      <Form method="post" className="space-y-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <input type="hidden" name="intent" value="assign-homework" />
        <input type="hidden" name="classId" value={cls.id} />
        <input type="hidden" name="tz" value={tz} />

        {/* 宿題 / 課題 */}
        <fieldset>
          <legend className="text-xs font-semibold text-slate-600 mb-1">Type</legend>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
              <input type="radio" name="kind" value="homework" checked={kind === 'homework'} onChange={() => setKind('homework')} />
              <School className="w-4 h-4 text-indigo-500" /> Homework <span className="text-xs text-slate-400">(at home)</span>
            </label>
            <label className={`inline-flex items-center gap-1.5 text-sm ${available ? 'text-slate-700' : 'text-slate-400'}`}>
              <input type="radio" name="kind" value="classwork" disabled={!available} checked={kind === 'classwork'} onChange={() => setKind('classwork')} />
              <PencilLine className="w-4 h-4 text-teal-600" /> Classwork <span className="text-xs text-slate-400">(in class)</span>
            </label>
          </div>
        </fieldset>

        {/* 何を出すか */}
        <fieldset>
          <legend className="text-xs font-semibold text-slate-600 mb-1">What</legend>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
              <input type="radio" name="itemType" value="lesson" checked={itemType === 'lesson'} onChange={() => setItemType('lesson')} />
              Lesson tasks
            </label>
            <label className={`inline-flex items-center gap-1.5 text-sm ${available ? 'text-slate-700' : 'text-slate-400'}`}>
              <input type="radio" name="itemType" value="vocab_quiz" disabled={!available} checked={itemType === 'vocab_quiz'} onChange={() => setItemType('vocab_quiz')} />
              My vocabulary quiz
            </label>
          </div>
        </fieldset>

        {itemType === 'lesson' ? (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-600 space-y-1 block">
              <span>Lesson</span>
              <select name="lessonId" required className={`${input} w-full`} defaultValue="">
                <option value="" disabled>Choose a lesson…</option>
                {data.lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </label>
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
          </div>
        ) : data.quizzes.length === 0 ? (
          <p className="text-xs text-slate-600">You have no vocabulary quizzes yet. Make one in &quot;My Vocabulary Quizzes&quot; below first.</p>
        ) : (
          <label className="text-xs font-semibold text-slate-600 space-y-1 block">
            <span>Quiz</span>
            <select name="quizId" required className={`${input} w-full`} defaultValue="">
              <option value="" disabled>Choose a quiz…</option>
              {data.quizzes.map((q) => <option key={q.id} value={q.id}>{q.title} ({q.wordCount} words)</option>)}
            </select>
          </label>
        )}

        <TargetPicker students={data.students} disabled={!available} />

        {/* 宿題は学校時間中にはできない（初期設定）。先生が許せば授業中もしてよい */}
        {kind === 'homework' && data.schoolHours.available && (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" name="allowDuringSchool" className="mt-1" />
            <span>
              Students may also do this homework during school hours
              <span className="block text-xs text-slate-500">
                If unticked, students can&apos;t do it during school hours ({schoolHoursSummary(data.schoolHours)}). Change the hours in Class settings.
              </span>
            </span>
          </label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span className="block">Due date</span>
            <input type="date" name="dueDate" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${input} w-full`} />
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1">
            <span className="block">Due time</span>
            <input
              type="time"
              name="dueTime"
              required
              value={dueTime}
              onChange={(e) => { setDueTime(e.target.value); setTimeTouched(true); }}
              className={`${input} w-full`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-600 space-y-1 sm:col-span-2">
            <span className="block">Title (optional)</span>
            <input
              name="title"
              maxLength={100}
              placeholder={kind === 'classwork' ? 'e.g. Lesson 3 in-class practice' : 'e.g. Week 3 homework'}
              className={`${input} w-full`}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" className={btn} disabled={itemType === 'vocab_quiz' && data.quizzes.length === 0}>
            Set {assignmentKindLabel(kind)}
          </button>
        </div>
      </Form>
    </section>
  );
}

// ---------- 宿題・課題の一覧と進捗（宿題と課題で別のカード） ----------

export function AssignmentListCard({ data, kind }: { data: DashboardData; kind: Kind }) {
  const cls = data.selectedClass!;
  const h = useAssignmentHelpers(data);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const list = data.homework.filter((hw) => hw.kind === kind);
  const label = assignmentKindLabel(kind);

  // 課題のカードは、SQL 42 の前で課題が 1 つもないときは出さない
  if (kind === 'classwork' && !data.assignmentsAvailable && list.length === 0) return null;

  return (
    <section className={card} aria-label={label}>
      <h2 className={h2}>
        {kind === 'classwork' ? <PencilLine className="w-5 h-5 text-teal-600" /> : <School className="w-5 h-5 text-indigo-600" />}
        {label} <span className="text-xs font-normal text-slate-500">({list.length})</span>
      </h2>

      {list.length === 0 ? (
        <p className="text-xs text-slate-500">No {label.toLowerCase()} yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {list.map((hw) => {
            const targets = h.targets(hw);
            const units = unitsOf(hw);
            const finished = targets.filter((s) => h.doneUnits(hw, s.id) === units).length;
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
                      {hw.itemType === 'lesson'
                        ? <>{h.lessonTitle(hw.lessonId)} · {hw.taskKeys.map(taskLabel).join(', ')}</>
                        : <><Languages className="w-3 h-3 inline -mt-0.5" /> Vocabulary quiz: {h.quizTitle(hw.quizId)}</>}
                      {' · '}Due {formatDueDateTime(hw.dueAt)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1 flex-wrap">
                      <Users className="w-3 h-3" />
                      {hw.assignTo === 'class' ? 'Whole class' : `${targets.length} selected student${targets.length === 1 ? '' : 's'}`}
                      {hw.kind === 'homework' && data.schoolHours.available && (
                        <span className={`ml-1 px-1.5 rounded-full border ${hw.allowDuringSchool ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                          {hw.allowDuringSchool ? 'Allowed in school hours' : 'Not in school hours'}
                        </span>
                      )}
                    </p>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-700">{finished}/{targets.length} finished</span>
                    <Form method="post" onSubmit={(e) => { if (!window.confirm(`Delete this ${label.toLowerCase()}?`)) e.preventDefault(); }}>
                      <input type="hidden" name="intent" value="delete-homework" />
                      <input type="hidden" name="classId" value={cls.id} />
                      <input type="hidden" name="homeworkId" value={hw.id} />
                      <button type="submit" className="text-slate-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-1" aria-label={`Delete ${label.toLowerCase()}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Form>
                  </div>
                </div>

                {isOpen && (
                  <div className="space-y-3">
                    {targets.length === 0 ? (
                      <p className="text-xs text-slate-500">No students are assigned.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="text-left font-semibold py-1 pr-3">Student</th>
                              {hw.itemType === 'lesson' ? (
                                <>
                                  {hw.taskKeys.map((k) => <th key={k} className="font-semibold px-2 py-1">{taskLabel(k)}</th>)}
                                  <th className="font-semibold px-2 py-1">Done</th>
                                </>
                              ) : (
                                <>
                                  <th className="font-semibold px-2 py-1">Done</th>
                                  <th className="font-semibold px-2 py-1">Best score</th>
                                  <th className="font-semibold px-2 py-1">Attempts</th>
                                  <th className="font-semibold px-2 py-1">Last tried</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {targets.map((s) => {
                              const stat = h.statOf(hw, s.id);
                              return (
                                <tr key={s.id} className="border-t border-slate-100">
                                  <td className="py-1 pr-3 text-slate-800 whitespace-nowrap"><StudentLink student={s} /></td>
                                  {hw.itemType === 'lesson' ? (
                                    <>
                                      {hw.taskKeys.map((k) => (
                                        <td key={k} className="px-2 py-1 text-center">
                                          {h.taskDone(hw, s.id, k)
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" aria-label="done" />
                                            : <Circle className="w-4 h-4 text-slate-300 inline" aria-label="not done" />}
                                        </td>
                                      ))}
                                      <td className="px-2 py-1 text-center font-semibold text-slate-700">{h.doneUnits(hw, s.id)}/{units}</td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-2 py-1 text-center">
                                        {stat
                                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" aria-label="done" />
                                          : <Circle className="w-4 h-4 text-slate-300 inline" aria-label="not done" />}
                                      </td>
                                      <td className="px-2 py-1 text-center font-semibold text-slate-700">
                                        {stat ? `${stat.best}/${stat.total} (${pct(stat.best, stat.total)}%)` : '–'}
                                      </td>
                                      <td className="px-2 py-1 text-center text-slate-700">{stat?.attempts ?? 0}</td>
                                      <td className="px-2 py-1 text-center text-slate-500" suppressHydrationWarning>
                                        {stat ? formatDate(stat.lastAt) : '–'}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 対象の生徒をあとから変える */}
                    {data.assignmentsAvailable && (
                      editingId === hw.id ? (
                        <Form method="post" className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3" onSubmit={() => setEditingId(null)}>
                          <input type="hidden" name="intent" value="update-homework-targets" />
                          <input type="hidden" name="classId" value={cls.id} />
                          <input type="hidden" name="homeworkId" value={hw.id} />
                          <TargetPicker students={data.students} defaultAssignTo={hw.assignTo} defaultIds={hw.studentIds} />
                          <div className="flex gap-2 justify-end">
                            <button type="button" className={btnGhost} onClick={() => setEditingId(null)}>Cancel</button>
                            <button type="submit" className={btn}>Save students</button>
                          </div>
                        </Form>
                      ) : (
                        <button type="button" className={btnGhost} onClick={() => setEditingId(hw.id)}>
                          <Users className="w-3.5 h-3.5" /> Change students
                        </button>
                      )
                    )}
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

// ---------- 期間内の完了率（%）。宿題と課題を切り替えて見る ----------

export function CompletionCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const tz = useTzOffset();
  const h = useAssignmentHelpers(data);
  const [kind, setKind] = useState<Kind>('homework');
  const label = assignmentKindLabel(kind);
  const inPeriod = data.homework.filter((hw) => hw.inPeriod && hw.kind === kind);
  const hasClasswork = data.homework.some((hw) => hw.kind === 'classwork');

  const rows = data.students.map((s) => {
    const mine = inPeriod.filter((hw) => isTarget(hw, s.id));
    const unitsSet = mine.reduce((sum, hw) => sum + unitsOf(hw), 0);
    const unitsDone = mine.reduce((sum, hw) => sum + h.doneUnits(hw, s.id), 0);
    const fullDone = mine.filter((hw) => h.doneUnits(hw, s.id) === unitsOf(hw)).length;
    const quizScores = mine
      .filter((hw) => hw.itemType === 'vocab_quiz')
      .map((hw) => h.statOf(hw, s.id))
      .filter((st): st is NonNullable<typeof st> => Boolean(st))
      .map((st) => pct(st.best, st.total));
    const quizAverage = quizScores.length ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : null;
    const percent = unitsSet === 0 ? null : Math.round((unitsDone / unitsSet) * 100);
    return { student: s, unitsSet, unitsDone, fullDone, assigned: mine.length, quizAverage, percent };
  });
  const scored = rows.filter((r) => r.percent !== null);
  const average = scored.length ? Math.round(scored.reduce((a, r) => a + (r.percent ?? 0), 0) / scored.length) : null;

  const downloadCsv = () => {
    const header = ['Student', 'Email', 'Completion %', 'Tasks done', 'Tasks set', `${label} fully done`, `${label} set`, 'Quiz best score average %'];
    const lines = rows.map((r) => [
      r.student.nickname ?? '', r.student.email, r.percent ?? '', r.unitsDone, r.unitsSet, r.fullDone, r.assigned, r.quizAverage ?? '',
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cls.name}-${kind}-${data.period.from}-to-${data.period.to}.csv`.replace(/[^\w.-]+/g, '_');
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className={card} aria-label="Completion">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className={h2}><BarChart3 className="w-5 h-5 text-indigo-600" /> {label} Completion</h2>
        <div className="flex items-center gap-2">
          {(hasClasswork || data.assignmentsAvailable) && (
            <div className="inline-flex rounded-md border border-slate-300 overflow-hidden text-xs font-semibold" role="tablist">
              {(['homework', 'classwork'] as Kind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => setKind(k)}
                  className={`px-3 py-1.5 cursor-pointer border-none ${kind === k ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {assignmentKindLabel(k)}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={downloadCsv} className={btnGhost} disabled={rows.length === 0}>
            <Download className="w-3.5 h-3.5" /> Download CSV
          </button>
        </div>
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
        Counts {label.toLowerCase()} due between these dates ({inPeriod.length} set). Each student is counted only for what was assigned to them.
        A lesson task counts as done when the student has completed it on AI Yamato; a vocabulary quiz counts as done after one try.
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
                <th className="font-semibold py-2 px-2">{label} done</th>
                <th className="font-semibold py-2 px-2">Quiz best (avg)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.student.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-800 whitespace-nowrap"><StudentLink student={r.student} /></td>
                  <td className="py-2 px-2">
                    {r.percent === null ? (
                      <span className="text-xs text-slate-400">Nothing assigned in this period</span>
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
                  <td className="py-2 px-2 text-center text-xs text-slate-700">{r.unitsDone}/{r.unitsSet}</td>
                  <td className="py-2 px-2 text-center text-xs text-slate-700">{r.fullDone}/{r.assigned}</td>
                  <td className="py-2 px-2 text-center text-xs text-slate-700">{r.quizAverage === null ? '–' : `${r.quizAverage}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- 語彙クイズを作る ----------

type DraftWord = { key: string; vocabularyId: string | null; jp: string; kana: string | null; english: string };
type SiteWord = { id: string; jp: string; kana: string | null; english: string };

export function VocabQuizCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const wordsFetcher = useFetcher<{ words: SiteWord[] }>();
  const [title, setTitle] = useState('');
  const [words, setWords] = useState<DraftWord[]>([]);
  const [lessonId, setLessonId] = useState('');
  const [custom, setCustom] = useState({ jp: '', kana: '', english: '' });
  const [isOpen, setIsOpen] = useState(false);

  if (!data.assignmentsAvailable) return null;

  const siteWords = lessonId && wordsFetcher.data ? wordsFetcher.data.words : [];
  const chosenIds = new Set(words.map((w) => w.vocabularyId).filter(Boolean));
  const full = words.length >= VOCAB_QUIZ_LIMITS.maxWords;

  const loadLesson = (id: string) => {
    setLessonId(id);
    if (id) wordsFetcher.load(`/api/teacher-vocab?lessonId=${encodeURIComponent(id)}`);
  };
  const addSite = (w: SiteWord) => {
    if (chosenIds.has(w.id) || full) return;
    setWords((prev) => [...prev, { key: `v-${w.id}`, vocabularyId: w.id, jp: w.jp, kana: w.kana, english: w.english }]);
  };
  const addAllSite = () => {
    const room = VOCAB_QUIZ_LIMITS.maxWords - words.length;
    const add = siteWords.filter((w) => !chosenIds.has(w.id)).slice(0, room);
    setWords((prev) => [...prev, ...add.map((w) => ({ key: `v-${w.id}`, vocabularyId: w.id, jp: w.jp, kana: w.kana, english: w.english }))]);
  };
  const addCustom = () => {
    const jp = custom.jp.trim();
    const english = custom.english.trim();
    if (!jp || !english || full) return;
    setWords((prev) => [...prev, { key: `c-${Date.now()}`, vocabularyId: null, jp, kana: custom.kana.trim() || null, english }]);
    setCustom({ jp: '', kana: '', english: '' });
  };
  const remove = (key: string) => setWords((prev) => prev.filter((w) => w.key !== key));

  const duplicateMeaning = new Set(words.map((w) => w.english.toLowerCase())).size !== words.length;
  const canSave = title.trim() && words.length >= VOCAB_QUIZ_LIMITS.minWords && !duplicateMeaning;

  return (
    <section className={card} aria-label="My vocabulary quizzes">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className={h2}><Languages className="w-5 h-5 text-indigo-600" /> My Vocabulary Quizzes</h2>
        {!isOpen && (
          <button type="button" className={btnGhost} onClick={() => setIsOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> New quiz
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        A multiple-choice quiz: students hear and see each Japanese word and choose its English meaning.
        Pick words from AI Yamato lessons, type your own, or both ({VOCAB_QUIZ_LIMITS.minWords}–{VOCAB_QUIZ_LIMITS.maxWords} words).
        Then set the quiz as homework or classwork above.
      </p>

      {isOpen && (
        <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
          <label className="text-xs font-semibold text-slate-600 space-y-1 block">
            <span>Quiz name</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={VOCAB_QUIZ_LIMITS.titleMax}
              placeholder="e.g. Family words – Week 3" className={`${input} w-full`} />
          </label>

          {/* サイトの単語帳から選ぶ */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Add words from an AI Yamato lesson</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={lessonId} onChange={(e) => loadLesson(e.target.value)} className={`${input} flex-1`}>
                <option value="">Choose a lesson…</option>
                {data.lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
              {siteWords.length > 0 && (
                <button type="button" className={btnGhost} onClick={addAllSite} disabled={full}>Add all</button>
              )}
            </div>
            {lessonId && wordsFetcher.state === 'loading' && <p className="text-xs text-slate-500">Loading words…</p>}
            {lessonId && wordsFetcher.state === 'idle' && siteWords.length === 0 && (
              <p className="text-xs text-slate-500">This lesson has no words yet.</p>
            )}
            {siteWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {siteWords.map((w) => {
                  const added = chosenIds.has(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => addSite(w)}
                      disabled={added || full}
                      lang="ja"
                      className={`text-xs px-2 py-1 rounded-full border cursor-pointer disabled:cursor-default ${
                        added ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-indigo-50'
                      }`}
                      title={w.english}
                    >
                      {added ? '✓ ' : '+ '}{w.jp} <span lang="en" className="text-slate-400">{w.english}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 自分で入力する */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Or type your own word</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input value={custom.jp} onChange={(e) => setCustom({ ...custom, jp: e.target.value })} maxLength={VOCAB_QUIZ_LIMITS.jpMax}
                placeholder="Japanese (e.g. 山)" lang="ja" className={input} />
              <input value={custom.kana} onChange={(e) => setCustom({ ...custom, kana: e.target.value })} maxLength={VOCAB_QUIZ_LIMITS.jpMax}
                placeholder="Reading (optional, e.g. やま)" lang="ja" className={input} />
              <input value={custom.english} onChange={(e) => setCustom({ ...custom, english: e.target.value })} maxLength={VOCAB_QUIZ_LIMITS.englishMax}
                placeholder="English (e.g. mountain)" className={input}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
              <button type="button" className={btnGhost} onClick={addCustom} disabled={!custom.jp.trim() || !custom.english.trim() || full}>
                <Plus className="w-3.5 h-3.5" /> Add word
              </button>
            </div>
            <p className="text-[11px] text-slate-500">Words you type are read aloud by the student&apos;s browser. Please check the reading is correct.</p>
          </div>

          {/* 選んだ単語 */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600">
              Words in this quiz: {words.length} / {VOCAB_QUIZ_LIMITS.maxWords}
              {words.length < VOCAB_QUIZ_LIMITS.minWords && <span className="text-slate-400"> (at least {VOCAB_QUIZ_LIMITS.minWords})</span>}
            </p>
            {words.length > 0 && (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md bg-white max-h-56 overflow-y-auto">
                {words.map((w) => (
                  <li key={w.key} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                    <span className="min-w-0 truncate">
                      <span lang="ja" className="font-semibold text-slate-800">{w.jp}</span>
                      {w.kana && <span lang="ja" className="text-slate-500"> （{w.kana}）</span>}
                      <span className="text-slate-500"> – {w.english}</span>
                      {!w.vocabularyId && <span className="ml-1 text-[10px] text-indigo-600 font-semibold">your word</span>}
                    </span>
                    <button type="button" onClick={() => remove(w.key)} className="text-slate-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-1 shrink-0" aria-label={`Remove ${w.jp}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {duplicateMeaning && (
              <p className="text-xs text-red-600">Two words have the same English meaning. Each word needs a different meaning for the multiple-choice quiz.</p>
            )}
          </div>

          <Form method="post" className="flex justify-end gap-2" onSubmit={() => { setIsOpen(false); }}>
            <input type="hidden" name="intent" value="create-quiz" />
            <input type="hidden" name="classId" value={cls.id} />
            <input type="hidden" name="title" value={title} />
            <input type="hidden" name="items" value={JSON.stringify(words.map(({ vocabularyId, jp, kana, english }) => ({ vocabularyId, jp, kana, english })))} />
            <button type="button" className={btnGhost} onClick={() => setIsOpen(false)}>Cancel</button>
            <button type="submit" className={btn} disabled={!canSave}>Save quiz</button>
          </Form>
        </div>
      )}

      {data.quizzes.length === 0 ? (
        <p className="text-xs text-slate-500">No quizzes yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {data.quizzes.map((q) => {
            const usedBy = data.homework.filter((hw) => hw.quizId === q.id).length;
            return (
              <li key={q.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{q.title}</p>
                  <p className="text-xs text-slate-500" suppressHydrationWarning>
                    {q.wordCount} words · Made {formatDate(q.createdAt)}{usedBy > 0 && ` · Set ${usedBy} time${usedBy === 1 ? '' : 's'} in this class`}
                  </p>
                </div>
                <Form
                  method="post"
                  onSubmit={(e) => {
                    const warn = usedBy > 0
                      ? `Delete this quiz? The ${usedBy} homework/classwork using it and the students' scores will also be deleted.`
                      : 'Delete this quiz?';
                    if (!window.confirm(warn)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="intent" value="delete-quiz" />
                  <input type="hidden" name="classId" value={cls.id} />
                  <input type="hidden" name="quizId" value={q.id} />
                  <button type="submit" className="text-slate-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-1" aria-label="Delete quiz">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
