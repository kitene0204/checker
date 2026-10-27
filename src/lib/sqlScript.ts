/**
 * Supabase SQL Script
 * 
 * 특징:
 * 1. 학생 로그인 없이(No-Auth) 전자칠판에서 자유롭게 클릭할 수 있도록 RLS 비활성화 (Run without RLS)
 * 2. 모든 브라우저 및 전자칠판 간 즉시 동기화되도록 supabase_realtime Publication 등록
 * 3. 우리반 기본 학생 20명 및 첫 번째 과제 샘플 데이터 자동 포함
 */
export const SUPABASE_SQL_SCRIPT = `-- ========================================================
-- 우리반 전자칠판 과제 제출 체크 시스템 (Supabase DDL & RLS 해제)
-- ========================================================

-- 1. 학생 명렬표 테이블 생성
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number INT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 과제 목록 테이블 생성
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 과제 제출 상태 테이블 생성
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    is_submitted BOOLEAN DEFAULT false NOT NULL,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_student_assignment UNIQUE(student_id, assignment_id)
);

-- 4. [중요] RLS(Row Level Security) 비활성화
-- 학생이 로그인(Auth) 절차 없이 전자칠판에서 바로 터치/제출할 수 있도록 설정
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- 5. [중요] Supabase Realtime 실시간 동기화 등록
-- 다른 브라우저, 스마트폰, 전자칠판 간 0.1초 즉각 반영
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.students, public.assignments, public.submissions;
COMMIT;

-- 6. 초기 샘플 데이터 입력 (필요시 수정 가능)
-- (1) 기본 과제 생성
INSERT INTO public.assignments (id, title, description, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '수학 익힘책 42~45쪽', '채점 후 틀린 문제 고치고 제출하기', true)
ON CONFLICT (id) DO NOTHING;

-- (2) 우리반 기본 학생 20명 등록
INSERT INTO public.students (student_number, name) VALUES
(1, '강민준'),
(2, '고서연'),
(3, '김도윤'),
(4, '김예은'),
(5, '문지호'),
(6, '박하은'),
(7, '배준우'),
(8, '서서아'),
(9, '송지후'),
(10, '신수아'),
(11, '유도현'),
(12, '윤채원'),
(13, '이로운'),
(14, '이시우'),
(15, '임지유'),
(16, '정시윤'),
(17, '조은우'),
(18, '최민서'),
(19, '하선우'),
(20, '한유나')
ON CONFLICT DO NOTHING;

-- 완료 안내 메시지
SELECT '우리반 전자칠판 테이블 생성 및 Realtime 설정 완료!' AS result;
`;
