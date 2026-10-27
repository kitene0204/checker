import React, { useState } from 'react';
import { X, Copy, Check, AlertCircle, Volume2 } from 'lucide-react';
import { Student } from '../types';

interface UnsubmittedModalProps {
  isOpen: boolean;
  onClose: () => void;
  unsubmittedStudents: Student[];
  totalCount: number;
  assignmentTitle: string;
}

export const UnsubmittedModal: React.FC<UnsubmittedModalProps> = ({
  isOpen,
  onClose,
  unsubmittedStudents,
  totalCount,
  assignmentTitle,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = `[${assignmentTitle}] 미제출 학생 명단 (${unsubmittedStudents.length}명 / 총 ${totalCount}명)\n` +
      unsubmittedStudents.map((s) => `${s.student_number}번 ${s.name}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">미제출 학생 명단</h2>
              <p className="text-xs text-slate-400">과제: {assignmentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-amber-300">
              미제출 {unsubmittedStudents.length}명 / 전체 {totalCount}명
            </span>
            {unsubmittedStudents.length > 0 && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '복사됨!' : '명단 텍스트 복사'}
              </button>
            )}
          </div>

          {unsubmittedStudents.length === 0 ? (
            <div className="text-center py-10 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
              <div className="text-3xl mb-2">🎉</div>
              <p className="font-bold text-emerald-300 text-base">모두 제출 완료했습니다!</p>
              <p className="text-xs text-emerald-200/80 mt-1">우리반 전원이 과제를 확인/제출했습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {unsubmittedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-bold shrink-0">
                    {student.student_number}
                  </span>
                  <span className="font-bold text-sm truncate">{student.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
