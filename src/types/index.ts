export interface Student {
  id: string;
  student_number: number;
  name: string;
  created_at?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  is_submitted: boolean;
  submitted_at: string | null;
  created_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export type BoardTheme = 'chalkboard' | 'dark' | 'whiteboard';
export type FilterType = 'all' | 'unsubmitted' | 'submitted';
