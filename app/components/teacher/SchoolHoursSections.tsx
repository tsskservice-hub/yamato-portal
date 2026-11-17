/**
 * @file SchoolHoursSections.tsx
 * @description 宿題の学校時間ブロック（SQL 44）の先生用の画面
 *   - SchoolHoursCard: クラスの学校時間（タイムゾーン・始まり・終わり・曜日）と、クラス全体の「今日はブロックしない」
 *   - HomeworkUnlockControl: 生徒ごとの「学校時間でも宿題をしてよい」（今日だけ／〇日まで）
 */
import React, { useMemo, useState } from 'react';
import { Form } from '@remix-run/react';
import { Clock, Unlock, Lock, CalendarOff } from 'lucide-react';
import { btn, btnGhost, card, h2, input, type DashboardData } from '~/components/teacher/TeacherDashboardSections';

const DAY_LABELS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 7, label: 'Sun' },
];

/** "YYYY-MM-DD" を「Fri 21 Nov」のように */
function formatDay(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** "15:15" を「3:15 pm」のように */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

/** 「Mon–Fri 8:45 am – 3:15 pm」 */
export function schoolHoursSummary(hours: DashboardData['schoolHours']) {
  const days = [...hours.days].sort();
  const isWeekdays = days.join(',') === '1,2,3,4,5';
  const dayText = isWeekdays ? 'Mon–Fri' : days.map((d) => DAY_LABELS.find((x) => x.value === d)?.label).filter(Boolean).join(', ');
  return `${dayText} ${formatClock(hours.start)} – ${formatClock(hours.end)}`;
}

/** 生徒ごとの解除の状態と操作（Students カードと、生徒の進捗の画面で使う） */
export function HomeworkUnlockControl({ data, studentId, compact = false }: { data: DashboardData; studentId: string; compact?: boolean }) {
  const cls = data.selectedClass!;
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState(data.schoolHours.today);
  if (!data.schoolHours.available) return null;

  const unlock = data.homeworkUnlocks.find((u) => u.userId === studentId);

  if (unlock) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
          <Unlock className="w-3 h-3" />
          Homework allowed in school hours {unlock.untilDate === data.schoolHours.today ? 'today' : `until ${formatDay(unlock.untilDate)}`}
        </span>
        <Form method="post">
          <input type="hidden" name="intent" value="relock-student-homework" />
          <input type="hidden" name="classId" value={cls.id} />
          <input type="hidden" name="studentId" value={studentId} />
          <button type="submit" className="text-slate-500 hover:text-slate-800 underline bg-transparent border-none p-0 cursor-pointer">Lock again</button>
        </Form>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btnGhost} ${compact ? '!px-2 !py-1 !text-[11px]' : ''}`}>
        <Unlock className="w-3 h-3" /> Absent? Allow homework in school hours
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-2 text-xs">
      <Form method="post">
        <input type="hidden" name="intent" value="unlock-student-homework" />
        <input type="hidden" name="classId" value={cls.id} />
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="until" value="today" />
        <button type="submit" className={btn}>Today only</button>
      </Form>
      <span className="text-slate-400">or</span>
      <Form method="post" className="flex items-center gap-1.5">
        <input type="hidden" name="intent" value="unlock-student-homework" />
        <input type="hidden" name="classId" value={cls.id} />
        <input type="hidden" name="studentId" value={studentId} />
        <label className="text-slate-600">until</label>
        <input type="date" name="until" value={until} min={data.schoolHours.today} onChange={(e) => setUntil(e.target.value)} className={`${input} !py-1`} />
        <button type="submit" className={btnGhost}>Save</button>
      </Form>
      <button type="button" onClick={() => setOpen(false)} className="text-slate-500 underline bg-transparent border-none p-0 cursor-pointer">Cancel</button>
    </div>
  );
}

/** クラス全体の「今日はブロックしない」 */
export function DayOffToggle({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  if (!data.schoolHours.available) return null;
  return data.schoolHours.offToday ? (
    <Form method="post" className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="intent" value="school-day-on" />
      <input type="hidden" name="classId" value={cls.id} />
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
        <CalendarOff className="w-3.5 h-3.5" /> Today: homework is open all day for the whole class
      </span>
      <button type="submit" className={btnGhost}><Lock className="w-3 h-3" /> Lock in school hours again</button>
    </Form>
  ) : (
    <Form
      method="post"
      onSubmit={(e) => { if (!window.confirm('No school today? Homework will be open all day today for the whole class.')) e.preventDefault(); }}
    >
      <input type="hidden" name="intent" value="school-day-off-today" />
      <input type="hidden" name="classId" value={cls.id} />
      <button type="submit" className={btnGhost}><CalendarOff className="w-3.5 h-3.5" /> No school today (open homework all day)</button>
    </Form>
  );
}

/** クラスの学校時間の設定 */
export function SchoolHoursCard({ data }: { data: DashboardData }) {
  const cls = data.selectedClass!;
  const hours = data.schoolHours;
  const zones = useMemo(() => {
    let all: string[] = [];
    try { all = (Intl as any).supportedValuesOf?.('timeZone') ?? []; } catch { all = []; }
    return [...new Set([hours.timezone, ...all])].sort();
  }, [hours.timezone]);

  return (
    <section className={card} aria-label="School hours">
      <h2 className={h2}><Clock className="w-5 h-5 text-indigo-600" /> School Hours (Homework Lock)</h2>
      {!hours.available ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Locking homework during school hours will be available after a database update (SQL 44).
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Homework can&apos;t be done during these hours (classwork is not affected). You can allow a homework item in school hours when you set it,
            allow one student (for example, a student who is absent) in the Students list, or open homework for the whole class on a day with no school.
          </p>
          <Form method="post" className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4" key={`${hours.timezone}-${hours.start}-${hours.end}-${hours.days.join()}`}>
            <input type="hidden" name="intent" value="update-school-hours" />
            <input type="hidden" name="classId" value={cls.id} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-xs font-semibold text-slate-600 space-y-1">
                <span className="block">Starts</span>
                <input type="time" name="start" defaultValue={hours.start} required className={`${input} w-full`} />
              </label>
              <label className="text-xs font-semibold text-slate-600 space-y-1">
                <span className="block">Ends</span>
                <input type="time" name="end" defaultValue={hours.end} required className={`${input} w-full`} />
              </label>
              <label className="text-xs font-semibold text-slate-600 space-y-1">
                <span className="block">Time zone</span>
                <select name="timezone" defaultValue={hours.timezone} className={`${input} w-full`}>
                  {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-xs font-semibold text-slate-600 mb-1">School days</legend>
              <div className="flex flex-wrap gap-3">
                {DAY_LABELS.map((d) => (
                  <label key={d.value} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                    <input type="checkbox" name="days" value={d.value} defaultChecked={hours.days.includes(d.value)} /> {d.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end">
              <button type="submit" className={btn}>Save school hours</button>
            </div>
          </Form>
          <DayOffToggle data={data} />
        </>
      )}
    </section>
  );
}
