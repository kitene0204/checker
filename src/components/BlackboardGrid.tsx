import React, { useState, useMemo } from 'react';
import { Search, Sparkles, Filter, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Student, Assignment, Submission, BoardTheme, FilterType } from '../types';
import { StudentCard } from './StudentCard';

interface BlackboardGridProps {
  students: Student[];
  activeAssignment: Assignment | null;
  submissions: Submission[];
  theme: BoardTheme;
  onToggleSubmission: (studentId: string, nextState: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const BlackboardGrid: React.FC<BlackboardGridProps> = ({
  students,
  activeAssignment,
  submissions,
  theme,
  onToggleSubmission,
  onRefresh,
  isLoading,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Map submissions by student_id
  const submissionMap = useMemo(() => {
    const map = new Map<string, Submission>();
    submissions.forEach((sub) => {
      map.set(sub.student_id, sub);
    });
    return map;
  }, [submissions]);

  // Counts
  const submittedCount = useMemo(() => {
    return students.filter((st) => submissionMap.get(st.id)?.is_submitted).length;
  }, [students, submissionMap]);

  const unsubmittedCount = students.length - submittedCount;
  const isAllSubmitted = students.length > 0 && submittedCount === students.length;

  // Filtered and searched students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const isSub = !!submissionMap.get(student.id)?.is_submitted;

      // Filter check
      if (filter === 'submitted' && !isSub) return false;
      if (filter === 'unsubmitted' && isSub) return false;

      // Search query check (number or name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesNumber = student.student_number.toString() === query;
        const matchesName = student.name.toLowerCase().includes(query);
        return matchesNumber || matchesName;
      }

      return true;
    });
  }, [students, submissionMap, filter, searchQuery]);

  // Blackboard frame styling
  const getBoardContainerStyle = () => {
    if (theme === 'chalkboard') {
      return 'bg-gradient-to-b from-[#132c1e] to-[#0d1e14] text-emerald-50 border-[10px] sm:border-[14px] border-[#382618] rounded-3xl shadow-[inset_0_0_100px_rgba(0,0,0,0.6),0_20px_50px_rgba(0,0,0,0.8)]';
    }
    if (theme === 'whiteboard') {
      return 'bg-slate-50 text-slate-800 border-[8px] sm:border-[12px] border-slate-300 rounded-3xl shadow-xl';
    }
    // Modern Dark
    return 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 border-[8px] sm:border-[12px] border-slate-800 rounded-3xl shadow-2xl';
  };

  const getFilterTabClass = (type: FilterType) => {
    const isActive = filter === type;
    if (theme === 'chalkboard') {
      return isActive
        ? 'bg-emerald-600 text-white font-black shadow-md'
        : 'text-emerald-300/80 hover:bg-emerald-900/50 hover:text-white';
    }
    if (theme === 'whiteboard') {
      return isActive
        ? 'bg-blue-600 text-white font-black shadow-md'
        : 'text-slate-600 hover:bg-slate-200';
    }
    return isActive
      ? 'bg-teal-600 text-white font-black shadow-md'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white';
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {/* Electronic Blackboard Main Panel */}
      <div className={`p-4 sm:p-7 relative transition-all duration-300 min-h-[75vh] flex flex-col ${getBoardContainerStyle()}`}>
        {/* Chalk dust subtle texture overlay for chalkboard */}
        {theme === 'chalkboard' && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none opacity-5 mix-blend-overlay"
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, #ffffff 0.5px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
          />
        )}

        {/* Blackboard Top Title Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between pb-5 mb-5 border-b border-white/10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest font-mono opacity-60">
                {theme === 'chalkboard' ? '초록 전자칠판' : theme === 'whiteboard' ? '화이트보드' : '스마트 스크린'}
              </span>
              {isLoading && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  동기화 중...
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{activeAssignment ? activeAssignment.title : '등록된 과제가 없습니다'}</span>
            </h2>
            {activeAssignment?.description && (
              <p className="text-xs sm:text-sm opacity-80 mt-1 max-w-2xl">
                💡 {activeAssignment.description}
              </p>
            )}
          </div>

          {/* Quick Filter Tabs & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${getFilterTabClass(
                  'all'
                )}`}
              >
                전체 ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unsubmitted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${getFilterTabClass(
                  'unsubmitted'
                )}`}
              >
                미제출 ({unsubmittedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('submitted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${getFilterTabClass(
                  'submitted'
                )}`}
              >
                완료 ({submittedCount})
              </button>
            </div>

            {/* Student Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                placeholder="번호 또는 이름 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 sm:w-44 pl-8 pr-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder:opacity-50 focus:outline-none focus:border-emerald-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 100% All Submitted Celebration Banner */}
        {isAllSubmitted && (
          <div className="relative z-10 mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-teal-500/30 to-amber-500/30 border-2 border-emerald-400/60 flex items-center justify-between animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-bounce">🎉</div>
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-1.5">
                  우리반 전원 과제 제출 완료!
                  <Sparkles className="w-5 h-5 text-amber-300 inline" />
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  총 {students.length}명의 모든 어린이가 스스로 제출을 마쳤습니다. 대단해요!
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-md">
              100% Complete
            </span>
          </div>
        )}

        {/* Main Grid of Student Cards */}
        <div className="relative z-10 flex-1">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 opacity-60" />
              </div>
              <p className="font-bold text-base opacity-80">
                {searchQuery
                  ? `"${searchQuery}"에 일치하는 학생이 없습니다.`
                  : filter === 'unsubmitted'
                  ? '모든 학생이 과제를 제출했습니다! 🎉'
                  : '등록된 학생이 없습니다.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-emerald-400 underline underline-offset-2"
                >
                  검색어 지우기
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4.5">
              {filteredStudents.map((student) => {
                const sub = submissionMap.get(student.id);
                const isSub = !!sub?.is_submitted;
                const submittedAt = sub?.submitted_at || null;

                return (
                  <StudentCard
                    key={student.id}
                    student={student}
                    isSubmitted={isSub}
                    submittedAt={submittedAt}
                    onToggle={onToggleSubmission}
                    theme={theme}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Chalkboard Tray (Aesthetic chalk & eraser tray) */}
        {theme === 'chalkboard' && (
          <div className="relative z-10 mt-6 pt-4 border-t border-emerald-900/60 flex items-center justify-between text-xs text-emerald-300/60">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                초록색: 제출 완료
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-emerald-500/60 inline-block"></span>
                점선: 미제출
              </span>
            </div>
            <div className="text-[11px] opacity-70 hidden sm:block">
              화면을 가볍게 터치하면 제출 완료 표시와 함께 축하 효과가 나타납니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
