import React, { useState } from 'react';
import {
  X,
  Users,
  BookOpen,
  Database,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Upload,
  AlertTriangle,
  Key,
  Globe,
  Sparkles,
  Check,
  FileCode,
  Link,
  Share2,
  Copy,
} from 'lucide-react';
import { Student, Assignment } from '../types';
import { supabaseManager, DEFAULT_STUDENTS, generateUUID } from '../lib/supabase';
import { SqlGuideModal } from './SqlGuideModal';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  assignments: Assignment[];
  activeAssignment: Assignment | null;
  onRefreshData: () => void;
}

type TabType = 'roster' | 'assignments' | 'supabase';

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  students,
  assignments,
  activeAssignment,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('roster');

  // Supabase form state
  const creds = supabaseManager.getCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(creds.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);

  // Roster form state
  const [newNumber, setNewNumber] = useState(students.length + 1);
  const [newName, setNewName] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [rosterMessage, setRosterMessage] = useState<string | null>(null);

  // Assignment form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // --- ROSTER ACTIONS ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newStudent: Student = {
      id: generateUUID(),
      student_number: Number(newNumber) || students.length + 1,
      name: newName.trim(),
    };

    const updated = [...students, newStudent].sort((a, b) => a.student_number - b.student_number);
    await supabaseManager.saveStudents(updated);
    setNewName('');
    setNewNumber(updated.length + 1);
    setRosterMessage(`${newStudent.name} 학생이 추가되었습니다.`);
    setTimeout(() => setRosterMessage(null), 2500);
    onRefreshData();
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`${name} 학생을 명렬표에서 삭제하시겠습니까?`)) return;
    const updated = students.filter((s) => s.id !== id);
    await supabaseManager.saveStudents(updated);
    onRefreshData();
  };

  const handleBulkParse = async () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedStudents: Student[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Match patterns like "1 김민준", "1. 김민준", "1번 김민준" or tab-separated "1\t김민준"
      const match = trimmed.match(/^(\d+)[.\s\t번_-]+(.+)$/);
      if (match) {
        parsedStudents.push({
          id: generateUUID(),
          student_number: parseInt(match[1], 10),
          name: match[2].trim(),
        });
      } else {
        // Just name separated by spaces or commas
        const items = trimmed.split(/[,;\t]+/).map((s) => s.trim()).filter(Boolean);
        if (items.length > 1) {
          items.forEach((item) => {
            parsedStudents.push({
              id: generateUUID(),
              student_number: parsedStudents.length + 1,
              name: item,
            });
          });
        } else {
          parsedStudents.push({
            id: generateUUID(),
            student_number: parsedStudents.length + 1,
            name: trimmed,
          });
        }
      }
    });

    if (parsedStudents.length === 0) {
      alert('유효한 학생 명단을 찾을 수 없습니다. 형식을 확인해주세요.');
      return;
    }

    parsedStudents.sort((a, b) => a.student_number - b.student_number);
    await supabaseManager.saveStudents(parsedStudents);
    setBulkText('');
    setShowBulkInput(false);
    setRosterMessage(`총 ${parsedStudents.length}명의 학생 명렬표가 일괄 등록되었습니다.`);
    setTimeout(() => setRosterMessage(null), 3000);
    onRefreshData();
  };

  const handleLoadSampleRoster = async () => {
    if (window.confirm('기본 20명 샘플 명렬표로 덮어쓰시겠습니까?')) {
      await supabaseManager.saveStudents(DEFAULT_STUDENTS);
      setRosterMessage('기본 샘플 명렬표 20명이 적용되었습니다.');
      setTimeout(() => setRosterMessage(null), 2500);
      onRefreshData();
    }
  };

  // --- ASSIGNMENT ACTIONS ---
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await supabaseManager.createAssignment(newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setAssignmentMessage('새 과제가 등록되고 활성화되었습니다.');
    setTimeout(() => setAssignmentMessage(null), 2500);
    onRefreshData();
  };

  const handleSetActive = async (id: string) => {
    await supabaseManager.setActiveAssignment(id);
    onRefreshData();
  };

  const handleResetCurrentSubmissions = async () => {
    if (!activeAssignment) return;
    if (
      window.confirm(
        `[${activeAssignment.title}] 과제의 모든 학생 제출 상태를 미제출로 초기화하시겠습니까?`
      )
    ) {
      await supabaseManager.resetSubmissions(activeAssignment.id);
      setAssignmentMessage('모든 학생의 제출 상태가 초기화되었습니다.');
      setTimeout(() => setAssignmentMessage(null), 2500);
      onRefreshData();
    }
  };

  const handleMarkAllSubmissions = async () => {
    if (!activeAssignment) return;
    if (
      window.confirm(
        `[${activeAssignment.title}] 과제에 대해 모든 학생을 "제출 완료"로 일괄 처리하시겠습니까?`
      )
    ) {
      await supabaseManager.markAllSubmitted(activeAssignment.id, students);
      setAssignmentMessage('모든 학생이 제출 완료 처리되었습니다.');
      setTimeout(() => setAssignmentMessage(null), 2500);
      onRefreshData();
    }
  };

  const handleDeleteAssignment = async (id: string, title: string) => {
    if (assignments.length <= 1) {
      alert('최소 1개 이상의 과제가 있어야 합니다.');
      return;
    }
    if (window.confirm(`[${title}] 과제를 삭제하시겠습니까? 관련 제출 기록도 함께 삭제됩니다.`)) {
      await supabaseManager.deleteAssignment(id);
      onRefreshData();
    }
  };

  // --- SUPABASE ACTIONS ---
  const handleSaveSupabaseConfig = async () => {
    supabaseManager.setCredentials(supabaseUrl, supabaseAnonKey);
    setTestResult(null);
    setIsTesting(true);
    const res = await supabaseManager.testConnection(supabaseUrl, supabaseAnonKey);
    setIsTesting(false);
    setTestResult(res);
    onRefreshData();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await supabaseManager.testConnection(supabaseUrl, supabaseAnonKey);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleResetToDemo = () => {
    if (window.confirm('슈파베이스 연동을 해제하고 로컬/체험 모드로 전환하시겠습니까?')) {
      setSupabaseUrl('');
      setSupabaseAnonKey('');
      supabaseManager.setCredentials('', '');
      setTestResult(null);
      onRefreshData();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                👨‍🏫 선생님 관리 도구
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                우리반 명렬표, 과제 등록, 슈파베이스(Supabase) 실시간 연동 관리
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 pt-2">
            <button
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'roster'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              우리반 명렬표 ({students.length}명)
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'assignments'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              과제 관리 ({assignments.length}개)
            </button>
            <button
              onClick={() => setActiveTab('supabase')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'supabase'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/40 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4" />
              슈파베이스 연동
              {supabaseManager.getCredentials().isConfigured ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  로컬
                </span>
              )}
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: ROSTER */}
            {activeTab === 'roster' && (
              <div className="space-y-6">
                {rosterMessage && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {rosterMessage}
                  </div>
                )}

                {/* Top Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkInput(!showBulkInput)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-400" />
                      엑셀 / 나이스 일괄 붙여넣기
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleRoster}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      기본 20명 샘플
                    </button>
                  </div>
                  <span className="text-xs text-slate-400">
                    등록된 학생: <strong className="text-emerald-400">{students.length}</strong>명
                  </span>
                </div>

                {/* Bulk Input Drawer */}
                {showBulkInput && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-300">
                        엑셀, 나이스, 텍스트 일괄 붙여넣기
                      </label>
                      <span className="text-[11px] text-slate-400">
                        예: &quot;1 강민준&quot; 또는 줄바꿈으로 이름만 나열
                      </span>
                    </div>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={`1 강민준\n2 고서연\n3 김도윤\n4 김예은\n...\n(번호 없이 이름만 한 줄씩 붙여넣어도 1번부터 자동 부여됩니다)`}
                      rows={6}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkInput(false)}
                        className="px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-white"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkParse}
                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                      >
                        명렬표 일괄 적용하기
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Single Student Form */}
                <form
                  onSubmit={handleAddStudent}
                  className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">번호</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={newNumber}
                      onChange={(e) => setNewNumber(parseInt(e.target.value, 10) || 1)}
                      className="w-16 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono text-center font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <input
                      type="text"
                      placeholder="학생 이름 입력 (예: 홍길동)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    학생 추가
                  </button>
                </form>

                {/* Student List Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 group hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {student.student_number}
                        </span>
                        <span className="font-bold text-sm text-slate-200 truncate">
                          {student.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="opacity-40 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: ASSIGNMENTS */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                {assignmentMessage && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {assignmentMessage}
                  </div>
                )}

                {/* Create Assignment Form */}
                <form
                  onSubmit={handleCreateAssignment}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3"
                >
                  <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    새로운 과제 등록하기
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="과제 제목 (예: 수학 익힘책 50쪽, 일기장 검사)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="설명 또는 안내 (선택)"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      과제 추가 및 바로 활성화
                    </button>
                  </div>
                </form>

                {/* Quick Submission Control Bar for Active Assignment */}
                {activeAssignment && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                    <div>
                      <span className="text-xs text-emerald-400 font-semibold block">
                        현재 전자칠판에 띄워진 과제:
                      </span>
                      <strong className="text-base text-white font-black">
                        {activeAssignment.title}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetCurrentSubmissions}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        전체 미제출로 리셋
                      </button>
                      <button
                        type="button"
                        onClick={handleMarkAllSubmissions}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        전원 제출 완료 처리
                      </button>
                    </div>
                  </div>
                )}

                {/* Assignment List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400">등록된 과제 목록</h4>
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        assignment.is_active
                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white truncate">
                            {assignment.title}
                          </span>
                          {assignment.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              칠판에 활성화됨
                            </span>
                          )}
                        </div>
                        {assignment.description && (
                          <p className="text-xs text-slate-400 mt-1 truncate">
                            {assignment.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!assignment.is_active && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(assignment.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                          >
                            칠판에 띄우기
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                          title="과제 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SUPABASE CONFIG */}
            {activeTab === 'supabase' && (
              <div className="space-y-6">
                {/* Intro Banner */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      슈파베이스(Supabase) 실시간 연동
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowSqlModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      SQL 스크립트 복사 및 가이드
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    선생님의 슈파베이스 프로젝트에 연결하면 교실 내 전자칠판, 태블릿, PC 등{' '}
                    <strong className="text-slate-200">어떤 기기에서 열든 0.1초 만에 실시간(Realtime) 동기화</strong>됩니다.
                    학생들은 계정 로그인 없이 바로 전자칠판을 터치할 수 있도록{' '}
                    <span className="text-amber-400 font-semibold">RLS 비활성화(Run without RLS)</span>로 동작합니다.
                  </p>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        supabaseManager.getCredentials().isConfigured
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-200">
                      현재 상태:{' '}
                      {supabaseManager.getCredentials().isConfigured
                        ? '🟢 Supabase Realtime 연결됨'
                        : '🟡 로컬 브라우저 동기화 모드 (BroadcastChannel)'}
                    </span>
                  </div>
                  {supabaseManager.getCredentials().isConfigured && (
                    <button
                      type="button"
                      onClick={handleResetToDemo}
                      className="text-xs text-slate-400 hover:text-red-400 underline underline-offset-2"
                    >
                      연결 해제
                    </button>
                  )}
                </div>

                {/* Blackboard One-Click Sync Link */}
                {supabaseManager.getCredentials().isConfigured && (
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-emerald-400" />
                        전자칠판(스마트TV / 태블릿) 즉시 연결 링크
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const shareUrl = supabaseManager.getShareableBlackboardUrl();
                          navigator.clipboard.writeText(shareUrl);
                          setCopiedShareUrl(true);
                          setTimeout(() => setCopiedShareUrl(false), 2500);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm"
                      >
                        {copiedShareUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedShareUrl ? '링크 복사됨!' : '전자칠판 접속 링크 복사'}
                      </button>
                    </div>
                    <p className="text-xs text-emerald-100/80 leading-relaxed">
                      💡 이 링크를 복사하여 전자칠판 브라우저나 즐겨찾기에 열면, <strong>복잡한 API 키를 직접 타이핑할 필요 없이 즉시 동일한 실시간 데이터베이스에 연결</strong>되어 양방향 동기화됩니다.
                    </p>
                  </div>
                )}

                {/* Form Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      Supabase Anon Public API Key
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Test Result Message */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                        : 'bg-red-950/60 border border-red-500/50 text-red-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !supabaseUrl || !supabaseAnonKey}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors cursor-pointer"
                  >
                    {isTesting ? '연결 테스트 중...' : '연결 상태 테스트'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSupabaseConfig}
                    disabled={isTesting || !supabaseUrl || !supabaseAnonKey}
                    className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors cursor-pointer shadow-md"
                  >
                    {isTesting ? '저장 및 연결 중...' : '설정 저장하고 Realtime 시작'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80">
            <span className="text-[11px] text-slate-500">
              전자칠판 터치 최적화 모드 | 실시간 과제 제출 체크
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      <SqlGuideModal isOpen={showSqlModal} onClose={() => setShowSqlModal(false)} />
    </>
  );
};
