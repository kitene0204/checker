import React, { useState, useEffect } from 'react';
import {
  Settings,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Palette,
  FileCode,
  Users,
  CheckCircle,
  Database,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Assignment, BoardTheme } from '../types';
import { soundManager } from '../lib/sound';
import { supabaseManager } from '../lib/supabase';

interface HeaderProps {
  assignments: Assignment[];
  activeAssignment: Assignment | null;
  onSelectAssignment: (id: string) => void;
  totalStudents: number;
  submittedCount: number;
  theme: BoardTheme;
  onThemeChange: (theme: BoardTheme) => void;
  onOpenTeacherModal: () => void;
  onOpenSqlModal: () => void;
  onOpenUnsubmittedModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  assignments,
  activeAssignment,
  onSelectAssignment,
  totalStudents,
  submittedCount,
  theme,
  onThemeChange,
  onOpenTeacherModal,
  onOpenSqlModal,
  onOpenUnsubmittedModal,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.isMuted);
  const [showAssignmentMenu, setShowAssignmentMenu] = useState(false);
  const isSupabaseConfigured = supabaseManager.getCredentials().isConfigured;

  // Toggle fullscreen for electronic blackboard
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMute(next);
  };

  const percentage = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;
  const isAllSubmitted = totalStudents > 0 && submittedCount === totalStudents;

  // Header background theme styles
  const getHeaderTheme = () => {
    if (theme === 'chalkboard') {
      return 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100';
    }
    if (theme === 'whiteboard') {
      return 'bg-white border-slate-200 text-slate-800 shadow-sm';
    }
    return 'bg-slate-900/95 border-slate-800 text-slate-100';
  };

  return (
    <header className={`border-b backdrop-blur-md px-4 sm:px-6 py-3 transition-colors duration-300 ${getHeaderTheme()}`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: App Title & Active Assignment Selector */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl select-none" role="img" aria-label="Blackboard">
              📋
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight leading-none">
                  우리반 전자칠판 과제 제출
                </h1>
                {/* Supabase status badge */}
                <button
                  type="button"
                  onClick={onOpenTeacherModal}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-amber-500/15 border-amber-400/30 text-amber-300 hover:bg-amber-500/25'
                  }`}
                  title="클릭하여 슈파베이스 연결 상태 확인"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  {isSupabaseConfigured ? 'Supabase 실시간' : '로컬 동기화'}
                </button>
              </div>

              {/* Assignment Switcher */}
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setShowAssignmentMenu(!showAssignmentMenu)}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span>과제: {activeAssignment ? activeAssignment.title : '과제 없음'}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showAssignmentMenu && (
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-40 text-slate-100">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      전자칠판에 띄울 과제 선택
                    </div>
                    {assignments.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          onSelectAssignment(a.id);
                          setShowAssignmentMenu(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          a.id === activeAssignment?.id
                            ? 'text-emerald-400 bg-emerald-950/40'
                            : 'text-slate-300'
                        }`}
                      >
                        <span className="truncate">{a.title}</span>
                        {a.id === activeAssignment?.id && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                    <div className="border-t border-slate-800 mt-1 pt-1 px-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignmentMenu(false);
                          onOpenTeacherModal();
                        }}
                        className="w-full text-center py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        + 새 과제 등록하기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live Progress Bar & Stats */}
        <div className="flex-1 max-w-md mx-auto w-full px-1">
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5">
              <span>제출 현황:</span>
              <span className="text-sm font-mono font-black text-emerald-400">
                {submittedCount} / {totalStudents}명
              </span>
              {isAllSubmitted && (
                <span className="text-amber-400 inline-flex items-center gap-1 animate-bounce">
                  <Sparkles className="w-3 h-3" />
                  전원 완료!
                </span>
              )}
            </span>
            <span className="font-mono text-xs">{percentage}%</span>
          </div>

          {/* Progress Track */}
          <div className="w-full h-3 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAllSubmitted
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          {/* Unsubmitted List Modal Trigger */}
          <button
            type="button"
            onClick={onOpenUnsubmittedModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer border border-slate-700/60"
            title="미제출자 명단 확인"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">미제출</span>
            <span className="text-amber-400 font-mono font-bold">
              {totalStudents - submittedCount}
            </span>
          </button>

          {/* SQL Guide Trigger */}
          <button
            type="button"
            onClick={onOpenSqlModal}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
            title="Supabase SQL 스크립트 복사"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => {
              if (theme === 'chalkboard') onThemeChange('dark');
              else if (theme === 'dark') onThemeChange('whiteboard');
              else onThemeChange('chalkboard');
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
            title={`테마 변경 (현재: ${
              theme === 'chalkboard' ? '초록 칠판' : theme === 'dark' ? '다크' : '화이트보드'
            })`}
          >
            <Palette className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
            title={isMuted ? '소리 켜기' : '소리 끄기'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700/60"
            title={isFullscreen ? '전체화면 종료' : '전자칠판 전체화면 모드'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-amber-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Teacher Settings Button */}
          <button
            type="button"
            onClick={onOpenTeacherModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">선생님 관리</span>
          </button>
        </div>
      </div>
    </header>
  );
};
