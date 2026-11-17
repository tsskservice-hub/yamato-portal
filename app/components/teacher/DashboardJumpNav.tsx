/**
 * @file DashboardJumpNav.tsx
 * @description 教師ダッシュボードの上にある、ページ内のジャンプボタン
 *   上段: 日々よく使うもの（ページの上のほうにある）／下段: たまに使う設定（ページの下のほうにある）
 */
import React from 'react';
import type { DashboardData } from '~/components/teacher/TeacherDashboardSections';

type Jump = { id: string; label: string; show?: boolean };

export function DashboardJumpNav({ data }: { data: DashboardData }) {
  const hasClasswork = data.assignmentsAvailable || data.homework.some((hw) => hw.kind === 'classwork');

  const daily: Jump[] = [
    { id: 'td-assign', label: 'Set Homework / Classwork' },
    { id: 'td-homework', label: 'Homework' },
    { id: 'td-classwork', label: 'Classwork', show: hasClasswork },
    { id: 'td-completion', label: 'Completion' },
    { id: 'td-quizzes', label: 'Vocabulary Quizzes', show: data.assignmentsAvailable },
    { id: 'td-handwriting', label: 'Handwritten Writing' },
    { id: 'td-students', label: `Students (${data.students.length})` },
  ];
  const settings: Jump[] = [
    { id: 'td-games', label: 'Games' },
    { id: 'td-class-code', label: 'Class Code' },
    { id: 'td-invites', label: 'Personal Invite Codes' },
    { id: 'td-vocab-length', label: 'Vocabulary Drill Length' },
  ];

  const row = (title: string, items: Jump[], style: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:w-20 shrink-0">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.filter((j) => j.show !== false).map((j) => (
          <a key={j.id} href={`#${j.id}`} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${style}`}>
            {j.label}
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <nav aria-label="Jump to a section" className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-2">
      {row('Daily', daily, 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100')}
      {row('Settings', settings, 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
    </nav>
  );
}

export default DashboardJumpNav;
