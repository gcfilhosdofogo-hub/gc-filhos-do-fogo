export type UserRole = 'admin' | 'professor' | 'aluno';

export interface User {
  id: string;
  name: string;
  nickname?: string; // Apelido
  email: string; // Adicionado para ser buscado do perfil
  role: UserRole;
  // avatarUrl?: string; // Removido conforme solicitação
  belt?: string; // Cordel/Graduação
  beltColor?: string; // CSS Color or Gradient
  professorName?: string; // Nome/Apelido do Professor do aluno
  birthDate?: string; // Data de nascimento (YYYY-MM-DD)
  graduationCost?: number; // Custo individual da troca de corda
  phone?: string; // WhatsApp: 55 + DDD + Numero
  first_name?: string; // Supabase profile field
  last_name?: string; // Supabase profile field
  nextEvaluationDate?: string; // YYYY-MM-DD
  photo_url?: string; // Profile photo URL
}

export interface ClassSession {
  id: string;
  title?: string; // Descriptive title for the class
  date: string;
  time: string;
  instructor: string;
  location: string;
  level: string;
  professor_id?: string; // Link to professor's user ID
  status?: 'pending' | 'completed' | 'cancelled'; // Match database
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
  created_by?: string; // User ID of the creator (admin/professor)
  status?: 'active' | 'cancelled'; // Soft delete flag to preserve financial records
}

export interface MusicItem {
  id: string;
  title: string;
  category: string; // Permitir texto livre
  lyrics: string;
  file_url?: string; // URL do arquivo de áudio
  created_by?: string; // User ID of the creator (professor/admin)
}

export interface HomeTraining {
  id: string;
  user_id: string; // User ID of the student
  date: string;
  video_url: string; // URL of the uploaded video
  expires_at: string; // ISO String
  video_name: string; // Original file name
}

export interface SchoolReport {
  id: string;
  user_id: string; // User ID of the student
  date: string;
  file_url: string; // URL of the uploaded report file
  file_name: string; // Original file name
  period: string; // Ex: "Bimestre Atual", "2024-1"
  status: 'pending' | 'reviewed' | 'approved';
}

export interface Assignment {
  id: string;
  created_by: string; // User ID of the professor/admin who created it
  title: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  status: 'pending' | 'completed';
  attachment_url?: string; // URL of professor's original material
  attachment_name?: string; // Name of professor's original material
  submission_url?: string; // NEW: URL of student's submission
  submission_name?: string; // NEW: Name of student's submission
  student_id?: string; // If assignment is specific to a student
}

// NEW: Event Registration Type
export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string; // Denormalized for easier display
  event_title: string; // Denormalized
  amount_paid: number;
  status: 'pending' | 'paid' | 'cancelled';
  registered_at: string; // ISO string
  proof_url?: string; // NEW: URL do comprovante de pagamento
  proof_name?: string; // NEW: Nome do arquivo do comprovante
}

// New Types for Admin Dashboard
export type PaymentStatus = 'paid' | 'pending' | 'overdue';

export interface PaymentRecord {
  id: string;
  student_id: string;
  student_name: string; // Denormalized for easier display
  month: string; // "Janeiro", "Fevereiro"...
  due_date: string; // YYYY-MM-DD
  status: PaymentStatus;
  paid_at?: string;
  amount: number;
  type?: string; // 'Mensalidade' or 'evaluation'
  created_at?: string;
  proof_url?: string; // URL do comprovante de pagamento
  proof_name?: string; // Nome do arquivo do comprovante
}

export interface StudentAcademicData {
  studentId: string;
  studentName: string;
  attendanceRate: number; // 0-100
  theoryGrade: number; // 0-10
  movementGrade: number; // 0-10
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
  user_id: string;
  user_name: string;
  action: string; // Ex: "Copiou PIX Mensalidade"
  timestamp: string;
}

export interface UniformOrder {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string; // 'aluno' | 'professor'
  date: string;
  item: string;
  shirt_size?: string;
  pants_size?: string;
  total: number;
  status: 'pending' | 'ready' | 'delivered'; // ready = pago/aprovado
  created_at?: string;
  proof_url?: string; // URL do comprovante de pagamento
  proof_name?: string; // Nome do arquivo do comprovante
}

export type GradeCategory = 'theory' | 'movement' | 'musicality';

export interface StudentGrade {
  id: string;
  student_id: string;
  student_name: string;
  professor_id: string;
  professor_name: string;
  category: GradeCategory;
  written: string;
  numeric: number;
  created_at: string;
  updated_at?: string;
}

// All Belts List for Configuration
export const ALL_BELTS = [
  "Cordel Cinza",
  "Cordel Verde",
  "Cordel Verde ponta Amarelo",
  "Cordel Verde ponta Azul",
  "Cordel Verde e Amarelo",
  "Cordel Verde e Amarelo ponta Verde",
  "Cordel Verde e Amarelo ponta Amarelo",
  "Cordel Verde e Amarelo ponta Azul",
  "Cordel Amarelo",
  "Cordel Amarelo ponta Verde",
  "Cordel Amarelo ponta Azul",
  "Cordel Amarelo e Azul (Instrutor)",
  "Cordel Amarelo e Azul ponta Amarelo (Instrutor I)",
  "Cordel Amarelo e Azul ponta Azul (Instrutor II)",
  "Cordel Azul (Professor)",
  "Cordel Azul ponta Verde e Amarelo (Professor I)",
  "Cordel Verde, Amarelo, Azul e Branco (Mestrando)",
  "Cordel Verde e Branco (Mestre I)",
  "Cordel Amarelo e Branco (Mestre II)",
  "Cordel Azul e Branco (Mestre III)",
  "Cordel Branco (Grão-Mestre)"
];
