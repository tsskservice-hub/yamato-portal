/**
 * @file DailyQuizModal.tsx
 * @description デイリークイズモーダルコンポーネント（クイズの出題、解答選択、正誤判定、解説表示を担当）
 */
import React from 'react';
import { X, Check } from 'lucide-react';
import { QuizItem } from '../data/quizzes';

interface DailyQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentQuiz: QuizItem;
  selectedOption: number | null;
  isAnswerSubmitted: boolean;
  hasCompletedTodayQuiz: boolean;
  isQuizCorrect: boolean;
  onAnswer: (selectedIndex: number) => void;
}

export function DailyQuizModal({
  isOpen,
  onClose,
  isDarkMode,
  currentQuiz,
  selectedOption,
  isAnswerSubmitted,
  hasCompletedTodayQuiz,
  isQuizCorrect,
  onAnswer,
}: DailyQuizModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 border shadow-2xl relative ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-500/15 transition-colors text-slate-400 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">
              🧠
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 px-2 py-0.5 rounded bg-red-500/10">Daily Challenge (+2 Credits)</span>
              <h3 className="text-lg font-extrabold tracking-tight">Today's Japanese & Culture Quiz</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left">
            <p className="text-sm font-semibold leading-relaxed">{currentQuiz?.question}</p>
          </div>

          <div className="space-y-2.5">
            {currentQuiz?.options?.map((option, idx) => {
              let btnStyle = "border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20";
              if (isAnswerSubmitted || hasCompletedTodayQuiz) {
                if (idx === currentQuiz.answer) {
                  btnStyle = "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300 font-bold";
                } else if (idx === selectedOption) {
                  btnStyle = "bg-red-500/10 border-red-500 text-red-600";
                } else {
                  btnStyle = "opacity-50 border-slate-200 dark:border-slate-700";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswerSubmitted || hasCompletedTodayQuiz}
                  onClick={() => onAnswer(idx)}
                  className={`w-full p-3.5 rounded-xl border text-xs sm:text-sm text-left transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{option}</span>
                  {(isAnswerSubmitted || hasCompletedTodayQuiz) && idx === currentQuiz.answer && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>

          {(isAnswerSubmitted || hasCompletedTodayQuiz) && (
            <div className="space-y-3 text-left">
              {currentQuiz.images && currentQuiz.images.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center my-2">
                  {currentQuiz.images.map((imgSrc, index) => (
                    <img 
                      key={index}
                      src={imgSrc} 
                      alt={`Quiz illustration ${index + 1}`} 
                      className="h-32 rounded-xl object-contain shadow-md border border-slate-200 dark:border-slate-700 bg-white p-2"
                    />
                  ))}
                </div>
              )}

              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${hasCompletedTodayQuiz && !isAnswerSubmitted ? 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200' : isQuizCorrect ? 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200' : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200'}`}>
                <p className="font-bold">
                  {hasCompletedTodayQuiz && !isAnswerSubmitted 
                    ? "✨ You have already completed today's quiz! (Credits earned: +2)" 
                    : isQuizCorrect 
                    ? "🎉 Correct! You earned 2 credits!" 
                    : "💪 Incorrect! Try again tomorrow!"}
                </p>
                <p className="leading-relaxed text-slate-600 dark:text-slate-300">{currentQuiz.explanation}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}