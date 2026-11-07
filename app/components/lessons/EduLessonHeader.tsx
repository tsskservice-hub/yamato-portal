import React from "react";

interface EduLessonHeaderProps {
  lesson: any;
  topic: any;
}

export const EduLessonHeader: React.FC<EduLessonHeaderProps> = ({ lesson, topic }) => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-3xl p-8 shadow-xl">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/25 w-fit px-3 py-1 rounded-full mb-3">
        <span>Obento Deluxe</span>
        <span>•</span>
        <span>Unit 4</span>
        <span>•</span>
        <span>Lesson {lesson?.lesson_order || 1}</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
        {lesson?.title_en || "Obento Unit 4: Lesson"}
      </h1>
      {lesson?.title_jp && (
        <p className="text-orange-100 font-semibold text-sm mb-3">
          {lesson.title_jp}
        </p>
      )}
      <p className="text-orange-50 text-sm sm:text-base leading-relaxed max-w-2xl">
        {lesson?.learning_intention || topic?.description || "Let's learn key expressions and vocabulary with Yamato Sensei!"}
      </p>
    </div>
  );
};