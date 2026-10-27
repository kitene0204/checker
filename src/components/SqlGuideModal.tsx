import React, { useState } from 'react';
import { X, Copy, Check, Database, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import { SUPABASE_SQL_SCRIPT } from '../lib/sqlScript';

interface SqlGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlGuideModal: React.FC<SqlGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Supabase SQL 스크립트 및 설정 가이드
              </h2>
              <p className="text-xs text-slate-400">
                학생 로그인 없이 바로 사용하기 위한 RLS 비활성화 및 Realtime 설정
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* Quick Steps Box */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-emerald-200">
            <h3 className="font-semibold text-emerald-300 flex items-center gap-2 mb-2 text-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              슈파베이스(Supabase)에 30초 만에 적용하는 방법
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-emerald-100/90 leading-relaxed">
              <li>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline underline-offset-2 hover:text-white inline-flex items-center gap-1"
                >
                  Supabase 대시보드 <ExternalLink className="w-3 h-3" />
                </a>
                에서 새 프로젝트(New Project)를 생성합니다.
              </li>
              <li>
                좌측 사이드바에서 <strong>SQL Editor</strong> 메뉴를 클릭합니다.
              </li>
              <li>
                아래 녹색 <strong>[SQL 복사하기]</strong> 버튼을 누르고 SQL 에디터에 붙여넣은 뒤, <strong>Run</strong>(실행)을 누릅니다.
              </li>
              <li>
                <strong>Project Settings &gt; API</strong>에서 <code>Project URL</code>과 <code>anon public key</code>를 복사해 [슈파베이스 설정]에 넣으면 즉시 실시간 연동됩니다!
              </li>
            </ol>
          </div>

          {/* RLS Explanation Notice */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">RLS 비활성화 (Run without RLS) 적용 완료</p>
              <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                학생들이 복잡한 로그인이나 계정 생성 없이 전자칠판 터치 한번으로 자유롭게 과제를 제출할 수 있도록
                <code className="mx-1 px-1 py-0.5 bg-amber-950/60 rounded text-amber-300 font-mono">
                  ALTER TABLE ... DISABLE ROW LEVEL SECURITY;
                </code>
                가 스크립트에 포함되어 있습니다.
              </p>
            </div>
          </div>

          {/* SQL Code Preview Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-400">
                SQL Script (students, assignments, submissions & Realtime)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? '복사되었습니다!' : 'SQL 전체 복사하기'}
              </button>
            </div>

            <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400 overflow-x-auto max-h-[300px] leading-relaxed selection:bg-emerald-800 selection:text-white">
              {SUPABASE_SQL_SCRIPT}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '복사 완료!' : 'SQL 클립보드에 복사'}
          </button>
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
