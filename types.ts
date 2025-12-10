export type UserRole = 'admin' | 'professor' | 'aluno';

export interface User {
  id: string;
  name: string;
  nickname?: string; // Apelido
  email: string;
  role: UserRole;
  avatarUrl?: string;
  belt?: string; // Cordel/Graduação
  beltColor?: string; // CSS Color or Gradient
  professorName?: string; // Nome/Apelido do Professor do aluno
  birthDate?: string; // Data de nascimento (YYYY-MM-DD)
  graduationCost?: number; // Custo individual da troca de corda
  phone?: string; // WhatsApp: 55 + DDD + Numero
  first_name?: string; // Supabase profile field
  last_name?: string; // Supabase profile field
}

export interface ClassSession {
  id: string;
  date: string;
  time: string;
  instructor: string;
  location: string;
  level: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  imageUrl?: string;
}

export interface GroupEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  price?: number; // Valor do evento definido pelo Admin
}

export interface MusicItem {
  id: string;
  title: string;
  category: string; // Permitir texto livre
  lyrics: string;
}

export interface HomeTraining {
  id: string;
  date: string;
  videoName: string;
  expiresAt: string; // ISO String
}

// New Types for Admin Dashboard
export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface PaymentRecord {
  studentId: string;
  studentName: string;
  month: string; // "Janeiro", "Fevereiro"...
  dueDate: string; // YYYY-MM-DD
  status: PaymentStatus;
  paidAt?: string;
  amount: number;
}

export interface StudentAcademicData {
  studentId: string;
  studentName: string;
  attendanceRate: number; // 0-100
  technicalGrade: number; // 0-10
  musicalityGrade: number; // 0-10
  lastEvaluation: string;
  graduationCost?: number; // Custo definido pelo admin para este aluno específico
  phone?: string; // WhatsApp
}

export interface ProfessorClassData {
  professorId: string;
  professorName: string;
  phone?: string; // WhatsApp do Professor
  currentContent: string; // O que está sendo ensinado
  students: StudentAcademicData[];
}

export interface AdminNotification {
  id: string;
  userId: string;
  userName: string;
  action: string; // Ex: "Copiou PIX Mensalidade"
  timestamp: string;
}

export interface UniformOrder {
  id: string;
  userId: string;
  userName: string;
  userRole: string; // 'aluno' | 'professor'
  date: string;
  item: string;
  shirtSize?: string;
  pantsSize?: string;
  total: number;
  status: 'pending' | 'ready' | 'delivered'; // ready = pago/aprovado
}