import React, { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, BoardTheme } from '../types';
import { soundManager } from '../lib/sound';

interface StudentCardProps {
  student: Student;
  isSubmitted: boolean;
  submittedAt: string | null;
  onToggle: (studentId: string, nextState: boolean) => void;
  theme: BoardTheme;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  isSubmitted,
  submittedAt,
  onToggle,
  theme,
}) => {
  const [isPressing, setIsPressing] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nextState = !isSubmitted;

    if (nextState) {
      // Confetti burst from click position
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 35,
        spread: 60,
        origin: { x, y },
        colors: ['#4ade80', '#22c55e', '#facc15', '#38bdf8', '#f43f5e'],
        disableForReducedMotion: true,
      });

      soundManager.playSubmitSuccess();
    } else {
      soundManager.playCancel();
    }

    onToggle(student.id, nextState);
  };

  // Format submission time (e.g. 09:24)
  const formattedTime = submittedAt
    ? new Date(submittedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;

  // Theme-specific styles
  const getCardStyle = () => {
    if (theme === 'chalkboard') {
      if (isSubmitted) {
        return 'bg-emerald-600/90 hover:bg-emerald-600 text-white border-2 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02]';
      }
      return 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-100/90 border-2 border-dashed border-emerald-600/40 hover:border-emerald-400/70 shadow-sm';
    }

    if (theme === 'whiteboard') {
      if (isSubmitted) {
        return 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-400 shadow-md scale-[1.02]';
      }
      return 'bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-blue-300 shadow-sm';
    }

    // Default 'dark' theme
    if (isSubmitted) {
      return 'bg-teal-600 hover:bg-teal-500 text-white border-2 border-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.35)] scale-[1.02]';
    }
    return 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-2 border-slate-700 hover:border-slate-500 shadow-sm';
  };

  const getBadgeStyle = () => {
    if (isSubmitted) {
      return 'bg-white text-emerald-900 shadow-sm font-extrabold';
    }
    if (theme === 'chalkboard') {
      return 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/50';
    }
    if (theme === 'whiteboard') {
      return 'bg-slate-100 text-slate-600 border border-slate-300';
    }
    return 'bg-slate-700 text-slate-300 border border-slate-600';
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={() => setIsPressing(true)}
      onMouseUp={() => setIsPressing(false)}
      onMouseLeave={() => setIsPressing(false)}
      onTouchStart={() => setIsPressing(true)}
      onTouchEnd={() => setIsPressing(false)}
      className={`group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl transition-all duration-200 cursor-pointer select-none text-left min-h-[105px] sm:min-h-[120px] active:scale-95 ${
        isPressing ? 'scale-95 brightness-95' : ''
      } ${getCardStyle()}`}
      aria-label={`${student.student_number}번 ${student.name} ${isSubmitted ? '제출 완료' : '미제출'}`}
    >
      {/* Top Header: Student Number & Checkmark / Status icon */}
      <div className="flex items-center justify-between w-full">
        <span
          className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg text-sm sm:text-base font-mono transition-colors ${getBadgeStyle()}`}
        >
          {student.student_number}번
        </span>

        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
            isSubmitted
              ? 'bg-white text-emerald-600 ring-2 ring-white/70 scale-100'
              : 'border border-white/20 text-transparent group-hover:border-white/40 scale-90'
          }`}
        >
          <Check className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[3] ${isSubmitted ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>

      {/* Middle: Student Name (Large readable font for blackboard) */}
      <div className="my-1 sm:my-1.5">
        <div className="text-xl sm:text-2xl font-black tracking-tight truncate leading-tight">
          {student.name}
        </div>
      </div>

      {/* Bottom Footer: Status text & timestamp */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium w-full">
        {isSubmitted ? (
          <>
            <span className="font-bold tracking-wide flex items-center gap-1">
              제출 완료 ✨
            </span>
            {formattedTime && (
              <span className="opacity-90 text-[11px] sm:text-xs flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {formattedTime}
              </span>
            )}
          </>
        ) : (
          <span className="opacity-60 text-xs tracking-tight group-hover:opacity-90 transition-opacity">
            터치하여 제출
          </span>
        )}
      </div>

      {/* Subtle touch indicator ripple ring */}
      {isSubmitted && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
        </span>
      )}
    </button>
  );
};
