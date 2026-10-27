import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Assignment, Submission, BoardTheme } from './types';
import { supabaseManager, RealtimeStatus } from './lib/supabase';
import { Header } from './components/Header';
import { BlackboardGrid } from './components/BlackboardGrid';
import { TeacherModal } from './components/TeacherModal';
import { SqlGuideModal } from './components/SqlGuideModal';
import { UnsubmittedModal } from './components/UnsubmittedModal';
import { AlertCircle, ArrowRight, X } from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(supabaseManager.getStatus());
  const [dismissWarning, setDismissWarning] = useState(false);

  // Modals state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isUnsubmittedModalOpen, setIsUnsubmittedModalOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<BoardTheme>(() => {
    const saved = localStorage.getItem('classroom_chalkboard_theme');
    return (saved as BoardTheme) || 'chalkboard';
  });

  const handleThemeChange = (newTheme: BoardTheme) => {
    setTheme(newTheme);
    localStorage.setItem('classroom_chalkboard_theme', newTheme);
  };

  // Listen to realtime status
  useEffect(() => {
    const unsub = supabaseManager.onStatusChange((status) => {
      setRealtimeStatus(status);
    });
    return () => unsub();
  }, []);

  // Fetch all current data
  const fetchData = useCallback(async () => {
    try {
      const [fetchedStudents, fetchedAssignments] = await Promise.all([
        supabaseManager.getStudents(),
        supabaseManager.getAssignments(),
      ]);

      setStudents(fetchedStudents);
      setAssignments(fetchedAssignments);

      // Find active assignment
      let currentActive = fetchedAssignments.find((a) => a.is_active);
      if (!currentActive && fetchedAssignments.length > 0) {
        currentActive = fetchedAssignments[0];
      }
      setActiveAssignment(currentActive || null);

      if (currentActive) {
        const fetchedSubmissions = await supabaseManager.getSubmissions(currentActive.id);
        setSubmissions(fetchedSubmissions);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Failed to fetch classroom data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup Supabase Realtime and data fetching on mount
  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes (Supabase postgres_changes + Broadcast + BroadcastChannel)
    const handleRealtimeUpdate = () => {
      fetchData();
    };

    supabaseManager.subscribeRealtime(handleRealtimeUpdate);

    return () => {
      supabaseManager.unsubscribe(handleRealtimeUpdate);
    };
  }, [fetchData]);

  // Handle switching active assignment
  const handleSelectAssignment = async (id: string) => {
    await supabaseManager.setActiveAssignment(id);
    fetchData();
  };

  // Handle student card touch/click submission toggle
  const handleToggleSubmission = async (studentId: string, nextState: boolean) => {
    if (!activeAssignment) return;

    // Optimistic UI update for instantaneous responsiveness on touch screens
    setSubmissions((prev) => {
      const existingIdx = prev.findIndex((s) => s.student_id === studentId);
      const now = nextState ? new Date().toISOString() : null;

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          is_submitted: nextState,
          submitted_at: now,
        };
        return copy;
      } else {
        return [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            student_id: studentId,
            assignment_id: activeAssignment.id,
            is_submitted: nextState,
            submitted_at: now,
          },
        ];
      }
    });

    // Send update to Supabase / local store
    await supabaseManager.toggleSubmission(studentId, activeAssignment.id, nextState);
  };

  // Submissions stats
  const submittedCount = useMemo(() => {
    return students.filter((student) => {
      const sub = submissions.find((s) => s.student_id === student.id);
      return sub?.is_submitted;
    }).length;
  }, [students, submissions]);

  const unsubmittedStudents = useMemo(() => {
    return students.filter((student) => {
      const sub = submissions.find((s) => s.student_id === student.id);
      return !sub?.is_submitted;
    });
  }, [students, submissions]);

  // Outer container theme class
  const getThemeBackground = () => {
    if (theme === 'chalkboard') {
      return 'bg-[#0f2318] text-emerald-100';
    }
    if (theme === 'whiteboard') {
      return 'bg-slate-100 text-slate-900';
    }
    return 'bg-slate-950 text-slate-100';
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 font-sans ${getThemeBackground()}`}>
      {/* Top Warning Banner if this specific browser window is in Local Mode */}
      {realtimeStatus === 'local' && !dismissWarning && (
        <div className="bg-amber-500/90 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              현재 창은 <strong>[로컬 모드]</strong>로 동작 중입니다. 다른 창이나 전자칠판과 실시간 동기화하려면 Supabase 키를 입력하거나 연동 링크로 접속해야 합니다.
            </span>
            <button
              type="button"
              onClick={() => setIsTeacherModalOpen(true)}
              className="ml-2 underline underline-offset-2 hover:text-black flex items-center gap-1 cursor-pointer shrink-0"
            >
              연동 설정하기 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDismissWarning(true)}
            className="p-1 hover:bg-black/10 rounded-lg text-slate-900"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navbar Header */}
      <Header
        assignments={assignments}
        activeAssignment={activeAssignment}
        onSelectAssignment={handleSelectAssignment}
        totalStudents={students.length}
        submittedCount={submittedCount}
        theme={theme}
        onThemeChange={handleThemeChange}
        onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onOpenUnsubmittedModal={() => setIsUnsubmittedModalOpen(true)}
      />

      {/* Main Electronic Blackboard Workspace */}
      <main className="flex-1 flex flex-col justify-center">
        <BlackboardGrid
          students={students}
          activeAssignment={activeAssignment}
          submissions={submissions}
          theme={theme}
          onToggleSubmission={handleToggleSubmission}
          onRefresh={fetchData}
          isLoading={isLoading}
        />
      </main>

      {/* Modals */}
      <TeacherModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        students={students}
        assignments={assignments}
        activeAssignment={activeAssignment}
        onRefreshData={fetchData}
      />

      <SqlGuideModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      <UnsubmittedModal
        isOpen={isUnsubmittedModalOpen}
        onClose={() => setIsUnsubmittedModalOpen(false)}
        unsubmittedStudents={unsubmittedStudents}
        totalCount={students.length}
        assignmentTitle={activeAssignment ? activeAssignment.title : '과제'}
      />
    </div>
  );
}
