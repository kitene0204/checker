/**
 * Supabase SQL Script
 * 
 * 특징:
 * 1. 학생 로그인 없이(No-Auth) 전자칠판에서 자유롭게 클릭할 수 있도록 RLS 완전 비활성화 (Run without RLS)
 * 2. 익명 사용자(anon) 및 모든 역할에 완전한 읽기/쓰기/수정/삭제 권한 부여 (GRANT ALL)
 * 3. 모든 브라우저 및 전자칠판 간 즉시 동기화되도록 REPLICA IDENTITY FULL 및 supabase_realtime Publication 등록
 * 4. 우리반 기본 학생 20명 및 첫 번째 과제 샘플 데이터 자동 포함
 */
export const SUPABASE_SQL_SCRIPT = `-- ========================================================
-- 우리반 전자칠판 과제 제출 체크 시스템 (Supabase DDL & RLS 완전 해제)
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

-- 4. [핵심] RLS(Row Level Security) 완전 비활성화
-- 학생이 별도의 로그인/계정 생성 없이 전자칠판이나 모바일에서 즉시 제출할 수 있도록 보안 잠금 해제
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- 5. [권한 허용] 익명(anon) 클라이언트에게 완전한 CRUD 접근 권한 부여
GRANT ALL ON TABLE public.students TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.assignments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.submissions TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. [실시간 레코드 복제 설정] 실시간 이벤트 시 전체 변경 행 데이터 전송
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.assignments REPLICA IDENTITY FULL;
ALTER TABLE public.submissions REPLICA IDENTITY FULL;

-- 7. [실시간 구독 활성화] Supabase Realtime Publication 등록
-- 연결된 모든 브라우저와 전자칠판이 변경 사항을 즉시(0.1초) 수신하도록 설정
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.students, public.assignments, public.submissions;
COMMIT;

-- 8. 초기 샘플 데이터 입력 (필요시 수정 가능)
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
SELECT '우리반 전자칠판 테이블 생성, RLS 완전 해제 및 Realtime 등록 완료!' AS result;
`;
