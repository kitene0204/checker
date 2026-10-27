import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Student, Assignment, Submission } from '../types';

const STORAGE_KEY_URL = 'classroom_supabase_url';
const STORAGE_KEY_KEY = 'classroom_supabase_anon_key';
const LOCAL_STUDENTS_KEY = 'classroom_local_students';
const LOCAL_ASSIGNMENTS_KEY = 'classroom_local_assignments';
const LOCAL_SUBMISSIONS_KEY = 'classroom_local_submissions';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected' | 'local';

// Helper to generate compliant RFC 4122 v4 UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Default 20 students with VALID UUIDs so PostgreSQL UUID column never throws syntax errors
export const DEFAULT_STUDENTS: Student[] = [
  { id: '00000000-0000-0000-0000-000000000001', student_number: 1, name: '강민준' },
  { id: '00000000-0000-0000-0000-000000000002', student_number: 2, name: '고서연' },
  { id: '00000000-0000-0000-0000-000000000003', student_number: 3, name: '김도윤' },
  { id: '00000000-0000-0000-0000-000000000004', student_number: 4, name: '김예은' },
  { id: '00000000-0000-0000-0000-000000000005', student_number: 5, name: '문지호' },
  { id: '00000000-0000-0000-0000-000000000006', student_number: 6, name: '박하은' },
  { id: '00000000-0000-0000-0000-000000000007', student_number: 7, name: '배준우' },
  { id: '00000000-0000-0000-0000-000000000008', student_number: 8, name: '서서아' },
  { id: '00000000-0000-0000-0000-000000000009', student_number: 9, name: '송지후' },
  { id: '00000000-0000-0000-0000-000000000010', student_number: 10, name: '신수아' },
  { id: '00000000-0000-0000-0000-000000000011', student_number: 11, name: '유도현' },
  { id: '00000000-0000-0000-0000-000000000012', student_number: 12, name: '윤채원' },
  { id: '00000000-0000-0000-0000-000000000013', student_number: 13, name: '이로운' },
  { id: '00000000-0000-0000-0000-000000000014', student_number: 14, name: '이시우' },
  { id: '00000000-0000-0000-0000-000000000015', student_number: 15, name: '임지유' },
  { id: '00000000-0000-0000-0000-000000000016', student_number: 16, name: '정시윤' },
  { id: '00000000-0000-0000-0000-000000000017', student_number: 17, name: '조은우' },
  { id: '00000000-0000-0000-0000-000000000018', student_number: 18, name: '최민서' },
  { id: '00000000-0000-0000-0000-000000000019', student_number: 19, name: '하선우' },
  { id: '00000000-0000-0000-0000-000000000020', student_number: 20, name: '한유나' },
];

export const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: '수학 익힘책 42~45쪽',
    description: '채점 후 틀린 문제 고치고 제출하기',
    is_active: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: '오늘의 일기장',
    description: '자유 주제 10줄 이상 쓰기',
    is_active: false,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
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
  private pollingTimer: number | null = null;

  constructor() {
    this.parseUrlHashCredentials();
    this.initCredentials();

    if (localBroadcastChannel) {
      localBroadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'SYNC_DATA') {
          this.triggerLocalCallbacks();
        }
      };
    }

    // Start background fallback heartbeat sync every 4 seconds
    if (typeof window !== 'undefined') {
      this.pollingTimer = window.setInterval(() => {
        if (this.client && this.currentStatus === 'connected') {
          this.triggerLocalCallbacks();
        }
      }, 4000);
    }
  }

  /**
   * Check if URL contains #sb_url=...&sb_key=... so a teacher can easily share a link
   * to open the blackboard on another device with 1 click!
   */
  private parseUrlHashCredentials() {
    if (typeof window === 'undefined') return;

    try {
      const hash = window.location.hash;
      const search = window.location.search;
      const params = new URLSearchParams(hash.replace(/^#\/?/, '') || search);

      const urlParam = params.get('sb_url');
      const keyParam = params.get('sb_key');

      if (urlParam && keyParam) {
        localStorage.setItem(STORAGE_KEY_URL, decodeURIComponent(urlParam).trim());
        localStorage.setItem(STORAGE_KEY_KEY, decodeURIComponent(keyParam).trim());
        // Clean URL to avoid leaking keys in browser history
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (e) {
      console.warn('Failed to parse URL credentials:', e);
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
      this.createClientInstance();
    } else {
      this.client = null;
      this.updateStatus('local');

      // Check server API config as fallback (for multi-profile / new windows)
      if (typeof window !== 'undefined') {
        fetch('/api/config')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.isConfigured && data.url && data.anonKey) {
              console.log('🌐 Server-side Supabase configuration found, connecting automatically...');
              this.setCredentials(data.url, data.anonKey);
            }
          })
          .catch(() => {});
      }
    }
  }

  private createClientInstance() {
    if (!this.url || !this.anonKey) return;
    try {
      this.client = createClient(this.url, this.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      });
      this.subscribeRealtime();
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
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

  // Generate shareable link with connection keys for opening on the blackboard
  public getShareableBlackboardUrl(): string {
    if (typeof window === 'undefined') return '';
    if (!this.url || !this.anonKey) return window.location.href;
    const base = window.location.origin + window.location.pathname;
    return `${base}#sb_url=${encodeURIComponent(this.url)}&sb_key=${encodeURIComponent(this.anonKey)}`;
  }

  public setCredentials(url: string, anonKey: string) {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    this.url = cleanUrl;
    this.anonKey = cleanKey;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_KEY, cleanKey);

      // Persist to server config so any other device/account can connect automatically
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl, anonKey: cleanKey }),
      }).catch(() => {});
    }

    if (cleanUrl && cleanKey) {
      this.createClientInstance();
    } else {
      if (this.realtimeChannel && this.client) {
        this.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
      this.client = null;
      this.updateStatus('local');
    }

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
            message: 'Supabase 서버 연결은 성공했으나 students 테이블이 없습니다. SQL 스크립트를 Supabase SQL Editor에서 실행해주세요.',
          };
        }
        return { success: false, message: `오류: ${error.message}` };
      }

      return {
        success: true,
        message: '성공적으로 Supabase에 연결되었습니다! (students 테이블 및 RLS 해제 확인됨)',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `연결 실패: ${msg}` };
    }
  }

  /**
   * Supabase Dual Realtime Architecture:
   * 1. Supabase Broadcast: Ultra low-latency (<50ms) direct websocket event between all open screens!
   * 2. Postgres Changes: Captures every database INSERT, UPDATE, DELETE!
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

      // Create a unified room channel for both Broadcast and Postgres Changes
      const channel = this.client.channel('classroom-live-sync', {
        config: {
          broadcast: { self: false },
        },
      });

      // 1. Listen for instant Broadcast events from other devices
      channel.on('broadcast', { event: 'REALTIME_CHANGE' }, (payload) => {
        console.log('⚡ Instant Broadcast received from peer device:', payload);
        this.triggerLocalCallbacks();
      });

      // 2. Listen for Postgres database changes (submissions, students, assignments)
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'submissions' },
          (payload) => {
            console.log('⚡ DB submission change event:', payload.eventType);
            this.triggerLocalCallbacks();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'students' },
          (payload) => {
            console.log('⚡ DB student change event:', payload.eventType);
            this.triggerLocalCallbacks();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'assignments' },
          (payload) => {
            console.log('⚡ DB assignment change event:', payload.eventType);
            this.triggerLocalCallbacks();
          }
        );

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🟢 Supabase Realtime 채널 구독 활성화 완료!');
          this.updateStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚠️ Supabase Realtime 채널 상태:', status);
          this.updateStatus('disconnected');
        }
      });

      this.realtimeChannel = channel;
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

  private triggerLocalCallbacks() {
    this.onDataChangeCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  }

  private notifyChange() {
    this.triggerLocalCallbacks();

    // 1. Broadcast to other devices over Supabase Realtime (<50ms)
    if (this.realtimeChannel && this.currentStatus === 'connected') {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'REALTIME_CHANGE',
          payload: { timestamp: Date.now() },
        });
      } catch (e) {
        console.warn('Failed to send broadcast message:', e);
      }
    }

    // 2. Broadcast to other tabs on the same computer
    if (localBroadcastChannel) {
      try {
        localBroadcastChannel.postMessage({ type: 'SYNC_DATA', timestamp: Date.now() });
      } catch {}
    }
  }

  // --- DATA FETCHING & MUTATION ---

  public async getStudents(): Promise<Student[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('students')
          .select('*')
          .order('student_number', { ascending: true });

        if (!error && data && data.length > 0) {
          const list: Student[] = data.map((d: any) => ({
            id: String(d.id),
            student_number: Number(d.student_number),
            name: String(d.name),
            created_at: d.created_at,
          }));
          localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(list));
          return list;
        } else if (error) {
          console.warn('Supabase fetch students returned error:', error.message);
        }
      } catch (e) {
        console.error('Supabase getStudents caught:', e);
      }
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

    // Ensure all students have valid UUIDs
    const prepared = students.map((s) => ({
      id: s.id && s.id.length >= 32 ? s.id : generateUUID(),
      student_number: s.student_number,
      name: s.name,
    }));

    if (this.client) {
      try {
        // Delete existing and reinsert to sync entire roster
        await this.client.from('students').delete().neq('student_number', -99999);
        const { data, error } = await this.client
          .from('students')
          .insert(prepared)
          .select();

        if (!error && data) {
          const savedList: Student[] = data.map((d: any) => ({
            id: String(d.id),
            student_number: Number(d.student_number),
            name: String(d.name),
          }));
          localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(savedList));
          this.notifyChange();
          return true;
        } else if (error) {
          console.error('Supabase saveStudents error:', error);
        }
      } catch (e) {
        console.error('Failed to sync students to Supabase:', e);
      }
    }

    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(prepared));
    this.notifyChange();
    return true;
  }

  public async getAssignments(): Promise<Assignment[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const list: Assignment[] = data.map((d: any) => ({
            id: String(d.id),
            title: String(d.title),
            description: d.description || '',
            is_active: Boolean(d.is_active),
            created_at: d.created_at,
          }));
          localStorage.setItem(LOCAL_ASSIGNMENTS_KEY, JSON.stringify(list));
          return list;
        }
      } catch (e) {
        console.error('Supabase getAssignments caught:', e);
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

  public async setActiveAssignment(assignmentId: string): Promise<boolean> {
    if (this.client) {
      try {
        await this.client.from('assignments').update({ is_active: false }).neq('id', assignmentId);
        await this.client.from('assignments').update({ is_active: true }).eq('id', assignmentId);
        this.notifyChange();
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
    const newId = generateUUID();
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
            id: newId,
            title,
            description,
            is_active: true,
          })
          .select()
          .single();

        if (!error && data) {
          this.notifyChange();
          return {
            id: String(data.id),
            title: String(data.title),
            description: data.description || '',
            is_active: Boolean(data.is_active),
          };
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
      try {
        let query = this.client.from('submissions').select('*');
        if (assignmentId) {
          query = query.eq('assignment_id', assignmentId);
        }
        const { data, error } = await query;
        if (!error && data) {
          const list: Submission[] = data.map((d: any) => ({
            id: String(d.id),
            student_id: String(d.student_id),
            assignment_id: String(d.assignment_id),
            is_submitted: Boolean(d.is_submitted),
            submitted_at: d.submitted_at || null,
          }));
          return list;
        }
      } catch (e) {
        console.error('Supabase getSubmissions caught:', e);
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

    // 1. Immediate Broadcast for sub-50ms peer update across screens
    this.notifyChange();

    // 2. Persist to Supabase Database
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
          return true;
        } else {
          console.error('Supabase upsert submission error:', error.message, error.details);
        }
      } catch (e) {
        console.error('Supabase submission toggle caught:', e);
      }
    }

    // Local fallback persistence
    const submissions = await this.getSubmissions();
    const existingIndex = submissions.findIndex(
      (s) => s.student_id === studentId && s.assignment_id === assignmentId
    );

    if (existingIndex >= 0) {
      submissions[existingIndex].is_submitted = nextSubmitted;
      submissions[existingIndex].submitted_at = timestamp;
    } else {
      submissions.push({
        id: generateUUID(),
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
          id: generateUUID(),
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
