import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Assignment, Submission, BoardTheme } from './types';
import { supabaseManager } from './lib/supabase';
import { Header } from './components/Header';
import { BlackboardGrid } from './components/BlackboardGrid';
import { TeacherModal } from './components/TeacherModal';
import { SqlGuideModal } from './components/SqlGuideModal';
import { UnsubmittedModal } from './components/UnsubmittedModal';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    // Subscribe to realtime changes (Supabase postgres_changes + BroadcastChannel)
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
