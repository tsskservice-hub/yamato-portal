/**
 * @file tdbd-use-dashboard.ts
 * @description 教師用ダッシュボードの状態管理カスタムフック
 */
import { useState } from 'react';

export type Student = {
  id: string;
  name: string;
  progress: string;
  isUnlocked: boolean;
};

const INITIAL_STUDENTS: Student[] = [
  { id: 's1', name: 'Liam Smith', progress: 'Lesson 5 完了', isUnlocked: false },
  { id: 's2', name: 'Charlotte Brown', progress: 'Lesson 3 進行中', isUnlocked: false },
  { id: 's3', name: 'Noah Davis', progress: 'Lesson 5 完了', isUnlocked: true },
  { id: 's4', name: 'Olivia Wilson', progress: 'Lesson 2 進行中', isUnlocked: false },
];

export function tdbdUseDashboard() {
  const [isGlobalUnlocked, setIsGlobalUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('8842');
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);

  const toggleGlobalUnlock = () => {
    setIsGlobalUnlocked((prev) => !prev);
  };

  const refreshPasscode = () => {
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setPasscode(newCode);
  };

  const toggleStudentLock = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isUnlocked: !s.isUnlocked } : s))
    );
  };

  return {
    isGlobalUnlocked,
    toggleGlobalUnlock,
    passcode,
    refreshPasscode,
    students,
    toggleStudentLock,
  };
}