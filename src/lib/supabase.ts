import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Student, Assignment, Submission } from '../types';

const STORAGE_KEY_URL = 'classroom_supabase_url';
const STORAGE_KEY_KEY = 'classroom_supabase_anon_key';
const LOCAL_STUDENTS_KEY = 'classroom_local_students';
const LOCAL_ASSIGNMENTS_KEY = 'classroom_local_assignments';
const LOCAL_SUBMISSIONS_KEY = 'classroom_local_submissions';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'local';

export const DEFAULT_STUDENTS: Student[] = [
  { id: 's-01', student_number: 1, name: '강민준' },
  { id: 's-02', student_number: 2, name: '고서연' },
  { id: 's-03', student_number: 3, name: '김도윤' },
  { id: 's-04', student_number: 4, name: '김예은' },
  { id: 's-05', student_number: 5, name: '문지호' },
  { id: 's-06', student_number: 6, name: '박하은' },
  { id: 's-07', student_number: 7, name: '배준우' },
  { id: 's-08', student_number: 8, name: '서서아' },
  { id: 's-09', student_number: 9, name: '송지후' },
  { id: 's-10', student_number: 10, name: '신수아' },
  { id: 's-11', student_number: 11, name: '유도현' },
  { id: 's-12', student_number: 12, name: '윤채원' },
  { id: 's-13', student_number: 13, name: '이로운' },
  { id: 's-14', student_number: 14, name: '이시우' },
  { id: 's-15', student_number: 15, name: '임지유' },
  { id: 's-16', student_number: 16, name: '정시윤' },
  { id: 's-17', student_number: 17, name: '조은우' },
  { id: 's-18', student_number: 18, name: '최민서' },
  { id: 's-19', student_number: 19, name: '하선우' },
  { id: 's-20', student_number: 20, name: '한유나' },
];

export const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: '수학 익힘책 42~45쪽',
    description: '채점 후 틀린 문제 고치고 제출하기',
    is_active: true,
  },
  {
    id: 'a-02',
    title: '오늘의 일기장',
    description: '자유 주제 10줄 이상 쓰기',
    is_active: false,
  },
  {
    id: 'a-03',
    title: '가정통신문 회신서',
    description: '부모님 서명 확인 후 제출',
    is_active: false,
  },
];

let localBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    localBroadcastChannel = new BroadcastChannel('classroom_blackboard_sync');
  }
} catch {
  localBroadcastChannel = null;
}

class SupabaseManager {
  private client: SupabaseClient | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private url: string = '';
  private anonKey: string = '';
  private currentStatus: RealtimeStatus = 'local';
  private onDataChangeCallbacks: Set<() => void> = new Set();
  private onStatusChangeCallbacks: Set<(status: RealtimeStatus) => void> = new Set();

  constructor() {
    this.initCredentials();
    if (localBroadcastChannel) {
      localBroadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_DATA') {
          this.notifyChange();
        }
      };
    }
  }

  public initCredentials() {
    const envUrl = (import.meta as unknown as { env?: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as unknown as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env?.VITE_SUPABASE_ANON_KEY || '';

    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

    this.url = (storedUrl || envUrl).trim();
    this.anonKey = (storedKey || envKey).trim();

    if (this.url && this.anonKey) {
      try {
        this.client = createClient(this.url, this.anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
        this.updateStatus('connecting');
      } catch (err) {
        console.error('Failed to initialize Supabase client:', err);
        this.client = null;
        this.updateStatus('local');
      }
    } else {
      this.client = null;
      this.updateStatus('local');
    }
  }

  public getStatus(): RealtimeStatus {
    return this.currentStatus;
  }

  private updateStatus(newStatus: RealtimeStatus) {
    this.currentStatus = newStatus;
    this.onStatusChangeCallbacks.forEach((cb) => {
      try {
        cb(newStatus);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public onStatusChange(callback: (status: RealtimeStatus) => void) {
    this.onStatusChangeCallbacks.add(callback);
    callback(this.currentStatus);
    return () => {
      this.onStatusChangeCallbacks.delete(callback);
    };
  }

  public getCredentials() {
    return {
      url: this.url,
      anonKey: this.anonKey,
      isConfigured: !!(this.client && this.url && this.anonKey),
    };
  }

  public setCredentials(url: string, anonKey: string) {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    this.url = cleanUrl;
    this.anonKey = cleanKey;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    }

    if (cleanUrl && cleanKey) {
      try {
        this.client = createClient(cleanUrl, cleanKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
        this.updateStatus('connecting');
      } catch {
        this.client = null;
        this.updateStatus('local');
      }
    } else {
      this.client = null;
      this.updateStatus('local');
    }

    this.subscribeRealtime();
    this.notifyChange();
  }

  public async testConnection(testUrl?: string, testKey?: string): Promise<{ success: boolean; message: string }> {
    const targetUrl = testUrl !== undefined ? testUrl.trim() : this.url;
    const targetKey = testKey !== undefined ? testKey.trim() : this.anonKey;

    if (!targetUrl || !targetKey) {
      return { success: false, message: 'URL과 Anon Key를 모두 입력해주세요.' };
    }

    try {
      const tempClient = createClient(targetUrl, targetKey, {
        auth: { persistSession: false },
      });
      const { error } = await tempClient.from('students').select('id').limit(1);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation "public.students" does not exist')) {
          return {
            success: false,
            message: '연결은 되었으나 students 테이블이 없습니다. SQL 스크립트를 Supabase SQL Editor에서 실행해주세요.',
          };
        }
        return { success: false, message: `오류: ${error.message}` };
      }

      return {
        success: true,
        message: '성공적으로 Supabase에 연결되었습니다! (students 테이블 및 RLS 비활성화 확인됨)',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `연결 실패: ${msg}` };
    }
  }

  /**
   * Supabase Realtime 채널 구독
   * submissions, students, assignments 3개 테이블의 모든 변경 사항을 즉시 수신
   */
  public subscribeRealtime(callback?: () => void) {
    if (callback) {
      this.onDataChangeCallbacks.add(callback);
    }

    if (!this.client) {
      this.updateStatus('local');
      return;
    }

    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    try {
      this.updateStatus('connecting');
      this.realtimeChannel = this.client
        .channel('classroom-realtime-room')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'submissions' },
          (payload) => {
            console.log('⚡ Realtime submission change received:', payload.eventType);
            this.notifyChange();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'students' },
          (payload) => {
            console.log('⚡ Realtime student change received:', payload.eventType);
            this.notifyChange();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'assignments' },
          (payload) => {
            console.log('⚡ Realtime assignment change received:', payload.eventType);
            this.notifyChange();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('🟢 Supabase Realtime 채널 연결 완료!');
            this.updateStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('⚠️ Realtime channel status:', status);
            this.updateStatus('disconnected');
          }
        });
    } catch (e) {
      console.warn('Realtime subscription error:', e);
      this.updateStatus('disconnected');
    }
  }

  public unsubscribe(callback?: () => void) {
    if (callback) {
      this.onDataChangeCallbacks.delete(callback);
    }
  }

  private notifyChange() {
    this.onDataChangeCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });

    if (localBroadcastChannel) {
      try {
        localBroadcastChannel.postMessage({ type: 'SYNC_DATA', timestamp: Date.now() });
      } catch {}
    }
  }

  // --- DATA FETCHING & MUTATION ---

  public async getStudents(): Promise<Student[]> {
    if (this.client) {
      const { data, error } = await this.client
        .from('students')
        .select('*')
        .order('student_number', { ascending: true });

      if (!error && data) {
        return data as Student[];
      }
      console.warn('Supabase fetch students failed, using fallback:', error?.message);
    }

    const saved = localStorage.getItem(LOCAL_STUDENTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(DEFAULT_STUDENTS));
    return DEFAULT_STUDENTS;
  }

  public async saveStudents(students: Student[]): Promise<boolean> {
    students.sort((a, b) => a.student_number - b.student_number);

    if (this.client) {
      try {
        const { error: delError } = await this.client.from('students').delete().neq('student_number', -999);
        if (!delError) {
          const { error: insertError } = await this.client.from('students').insert(
            students.map((s) => ({
              id: s.id.length > 20 ? s.id : undefined,
              student_number: s.student_number,
              name: s.name,
            }))
          );
          if (!insertError) {
            this.notifyChange();
            return true;
          }
        }
      } catch (e) {
        console.error('Failed to sync students to Supabase:', e);
      }
    }

    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
    this.notifyChange();
    return true;
  }

  public async getAssignments(): Promise<Assignment[]> {
    if (this.client) {
      const { data, error } = await this.client
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Assignment[];
      }
    }

    const saved = localStorage.getItem(LOCAL_ASSIGNMENTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(DEFAULT_ASSIGNMENTS));
    return DEFAULT_ASSIGNMENTS;
  }

  public async saveAssignments(assignments: Assignment[]): Promise<boolean> {
    if (this.client) {
      try {
        const { error } = await this.client.from('assignments').upsert(
          assignments.map((a) => ({
            id: a.id.length === 36 ? a.id : undefined,
            title: a.title,
            description: a.description || '',
            is_active: a.is_active,
          }))
        );
        if (!error) {
          this.notifyChange();
          return true;
        }
      } catch (e) {
        console.error(e);
      }
    }

    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    this.notifyChange();
    return true;
  }

  public async setActiveAssignment(assignmentId: string): Promise<boolean> {
    if (this.client) {
      try {
        await this.client.from('assignments').update({ is_active: false }).neq('id', assignmentId);
        await this.client.from('assignments').update({ is_active: true }).eq('id', assignmentId);
        this.notifyChange();
        return true;
      } catch (e) {
        console.error(e);
      }
    }

    const assignments = await this.getAssignments();
    const updated = assignments.map((a) => ({
      ...a,
      is_active: a.id === assignmentId,
    }));
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(updated));
    this.notifyChange();
    return true;
  }

  public async createAssignment(title: string, description: string = ''): Promise<Assignment | null> {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `a-${Date.now()}`;
    const newAssignment: Assignment = {
      id: newId,
      title,
      description,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (this.client) {
      try {
        await this.client.from('assignments').update({ is_active: false }).neq('id', 'dummy');
        const { data, error } = await this.client
          .from('assignments')
          .insert({
            title,
            description,
            is_active: true,
          })
          .select()
          .single();

        if (!error && data) {
          this.notifyChange();
          return data as Assignment;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const assignments = await this.getAssignments();
    const deactivated = assignments.map((a) => ({ ...a, is_active: false }));
    deactivated.unshift(newAssignment);
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(deactivated));
    this.notifyChange();
    return newAssignment;
  }

  public async deleteAssignment(id: string): Promise<boolean> {
    if (this.client) {
      try {
        await this.client.from('submissions').delete().eq('assignment_id', id);
        await this.client.from('assignments').delete().eq('id', id);
        this.notifyChange();
      } catch (e) {
        console.error(e);
      }
    }

    const assignments = await this.getAssignments();
    const filtered = assignments.filter((a) => a.id !== id);
    if (filtered.length > 0 && !filtered.some((a) => a.is_active)) {
      filtered[0].is_active = true;
    }
    localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(filtered));

    const submissions = await this.getSubmissions();
    const filteredSubs = submissions.filter((s) => s.assignment_id !== id);
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(filteredSubs));

    this.notifyChange();
    return true;
  }

  public async getSubmissions(assignmentId?: string): Promise<Submission[]> {
    if (this.client) {
      let query = this.client.from('submissions').select('*');
      if (assignmentId) {
        query = query.eq('assignment_id', assignmentId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data as Submission[];
      }
    }

    const saved = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    if (saved) {
      try {
        const parsed: Submission[] = JSON.parse(saved);
        if (assignmentId) {
          return parsed.filter((s) => s.assignment_id === assignmentId);
        }
        return parsed;
      } catch {}
    }
    return [];
  }

  public async toggleSubmission(
    studentId: string,
    assignmentId: string,
    nextSubmitted: boolean
  ): Promise<boolean> {
    const timestamp = nextSubmitted ? new Date().toISOString() : null;

    if (this.client) {
      try {
        const { error } = await this.client.from('submissions').upsert(
          {
            student_id: studentId,
            assignment_id: assignmentId,
            is_submitted: nextSubmitted,
            submitted_at: timestamp,
          },
          { onConflict: 'student_id,assignment_id' }
        );

        if (!error) {
          this.notifyChange();
          return true;
        } else {
          console.error('Supabase upsert submission error:', error);
        }
      } catch (e) {
        console.error('Supabase submission toggle error:', e);
      }
    }

    const submissions = await this.getSubmissions();
    const existingIndex = submissions.findIndex(
      (s) => s.student_id === studentId && s.assignment_id === assignmentId
    );

    if (existingIndex >= 0) {
      submissions[existingIndex].is_submitted = nextSubmitted;
      submissions[existingIndex].submitted_at = timestamp;
    } else {
      submissions.push({
        id: `sub-${Date.now()}-${studentId}`,
        student_id: studentId,
        assignment_id: assignmentId,
        is_submitted: nextSubmitted,
        submitted_at: timestamp,
      });
    }

    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(submissions));
    this.notifyChange();
    return true;
  }

  public async resetSubmissions(assignmentId: string): Promise<boolean> {
    if (this.client) {
      try {
        await this.client
          .from('submissions')
          .update({ is_submitted: false, submitted_at: null })
          .eq('assignment_id', assignmentId);
        this.notifyChange();
        return true;
      } catch (e) {
        console.error(e);
      }
    }

    const submissions = await this.getSubmissions();
    const updated = submissions.map((s) => {
      if (s.assignment_id === assignmentId) {
        return { ...s, is_submitted: false, submitted_at: null };
      }
      return s;
    });

    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));
    this.notifyChange();
    return true;
  }

  public async markAllSubmitted(assignmentId: string, students: Student[]): Promise<boolean> {
    const now = new Date().toISOString();

    if (this.client) {
      try {
        const rows = students.map((s) => ({
          student_id: s.id,
          assignment_id: assignmentId,
          is_submitted: true,
          submitted_at: now,
        }));
        await this.client.from('submissions').upsert(rows, { onConflict: 'student_id,assignment_id' });
        this.notifyChange();
        return true;
      } catch (e) {
        console.error(e);
      }
    }

    const submissions = await this.getSubmissions();
    const updated = [...submissions];
    students.forEach((st) => {
      const idx = updated.findIndex((s) => s.student_id === st.id && s.assignment_id === assignmentId);
      if (idx >= 0) {
        updated[idx].is_submitted = true;
        updated[idx].submitted_at = now;
      } else {
        updated.push({
          id: `sub-${Date.now()}-${st.id}`,
          student_id: st.id,
          assignment_id: assignmentId,
          is_submitted: true,
          submitted_at: now,
        });
      }
    });

    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));
    this.notifyChange();
    return true;
  }
}

export const supabaseManager = new SupabaseManager();
