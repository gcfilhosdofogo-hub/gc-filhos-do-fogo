import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, GroupEvent, MusicItem, UniformOrder, StudentAcademicData, ClassSession, Assignment as AssignmentType, StudentGrade, GradeCategory } from '../types'; // Renamed Assignment to AssignmentType to avoid conflict
import { Users, CalendarCheck, PlusCircle, Copy, Check, ArrowLeft, Save, X, UploadCloud, BookOpen, Paperclip, Calendar, Wallet, Info, Shirt, ShoppingBag, Music, Mic2, MessageCircle, AlertTriangle, Video, Clock, Camera, UserPlus, Shield, Award, GraduationCap, PlayCircle, FileUp, Eye, DollarSign, FileText, Ticket } from 'lucide-react'; // Adicionado FileUp, Eye, DollarSign, FileText, Ticket
import { Button } from '../components/Button';
import { supabase } from '../src/integrations/supabase/client'; // Import supabase client
import { Logo } from '../components/Logo'; // Import Logo component

interface Props {
  user: User;
  events: GroupEvent[];
  musicList: MusicItem[];
  uniformOrders: UniformOrder[];
  onAddOrder: (order: UniformOrder) => void;
  onAddMusic: (music: MusicItem) => void;
  onNotifyAdmin: (action: string, user: User) => void;
  onUpdateProfile: (data: Partial<User>) => void;
  classSessions: ClassSession[]; // Use real class sessions
  onAddClassSession: (newSession: Omit<ClassSession, 'id' | 'created_at'>) => Promise<void>;
  onUpdateClassSession: (updatedSession: ClassSession) => Promise<void>;
  assignments: AssignmentType[]; // Use real assignments
  onAddAssignment: (newAssignment: Omit<AssignmentType, 'id' | 'created_at'>) => Promise<void>;
  onUpdateAssignment: (updatedAssignment: AssignmentType) => Promise<void>;
  homeTrainings: any[];
  eventRegistrations: any[]; // Added for consistency, though not directly used in this component's logic
  onAddStudentGrade: (payload: Omit<StudentGrade, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  studentGrades: StudentGrade[];
  onAddAttendance: (records: any[]) => Promise<void>;
  monthlyPayments: any[]; // Changed to any[] or PaymentRecord[] if imported
  onUpdatePaymentRecord: (updatedPayment: any) => Promise<void>;
  onUpdateOrderWithProof: (orderId: string, proofUrl: string, proofName: string) => Promise<void>;
  onUpdateEventRegistrationWithProof: (updatedRegistration: any) => Promise<void>;
}

interface AssignmentFormState {
  title: string;
  description: string;
  dueDate: string; // Changed to dueDate for consistency with Supabase
  studentId: string; // Added for specific student assignment
}

const UNIFORM_PRICES = {
  shirt: 30,
  pants_roda: 80,
  pants_train: 80,
  combo: 110
};

type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager' | 'grades' | 'financial';

export const DashboardProfessor: React.FC<Props> = ({
  user,
  events,
  musicList,
  uniformOrders,
  onAddOrder,
  onAddMusic,
  onNotifyAdmin,
  onUpdateProfile,
  classSessions,
  onAddClassSession,
  onUpdateClassSession,
  assignments,
  onAddAssignment,
  onUpdateAssignment,
  homeTrainings,
  onAddStudentGrade,
  studentGrades,
  onAddAttendance,
  monthlyPayments,
  onUpdatePaymentRecord,
  onUpdateOrderWithProof,
  onUpdateEventRegistrationWithProof,
  eventRegistrations, // Add this
}) => {
  const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
  const [myClasses, setMyClasses] = useState<ClassSession[]>(classSessions.filter(cs => cs.professor_id === user.id)); // Use real class sessions
  const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '' });

  // Attendance State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null); // Changed to string
  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'justified'>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Assignments
  const [profAssignments, setProfAssignments] = useState<AssignmentType[]>(assignments.filter(a => a.created_by === user.id)); // Filter assignments created by this professor
  const [newAssignment, setNewAssignment] = useState<AssignmentFormState>({ title: '', description: '', dueDate: '', studentId: '' }); // Added studentId
  const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false);
  const [selectedAssignmentToAssign, setSelectedAssignmentToAssign] = useState<AssignmentType | null>(null);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<string>('');


  // Music
  const [musicForm, setMusicForm] = useState({ title: '', category: '', lyrics: '', file: null as File | null });
  const [uploadingMusicFile, setUploadingMusicFile] = useState(false);

  // Uniform
  const [orderForm, setOrderForm] = useState({ item: 'combo', shirtSize: '', pantsSize: '' });
  const [costPixCopied, setCostPixCopied] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // Photo
  const [classPhoto, setClassPhoto] = useState<string | null>(null);

  // Evaluation
  const [selectedStudentForEval, setSelectedStudentForEval] = useState<string | null>(null);
  const [evalData, setEvalData] = useState({ positive: '', negative: '' });
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<string | null>(null);
  const [gradesForm, setGradesForm] = useState({
    theory: { written: '', numeric: '' },
    movement: { written: '', numeric: '' },
    musicality: { written: '', numeric: '' },
  });
  const [savingGrades, setSavingGrades] = useState(false);

  // Financial & Uploads
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const [uploadingEventProof, setUploadingEventProof] = useState(false);
  const [selectedPaymentToProof, setSelectedPaymentToProof] = useState<any | null>(null);
  const [selectedEventRegToProof, setSelectedEventRegToProof] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventFileInputRef = useRef<HTMLInputElement>(null);

  const myFilteredPayments = (monthlyPayments || []).filter(p => p.student_id === user.id);
  const myMonthlyPayments = myFilteredPayments.filter(p => (!p.type || p.type === 'Mensalidade') && !p.month.toLowerCase().includes('avalia'));
  const myEvaluations = myFilteredPayments.filter(p => p.type === 'evaluation' || p.month.toLowerCase().includes('avalia'));
  const myEventRegistrations = eventRegistrations ? eventRegistrations.filter(r => r.id === user.id) : [];

  const overdueStatus = useMemo(() => {
    const pending = myMonthlyPayments.filter(p => p.status === 'pending' || p.status === 'overdue');
    return {
      count: pending.length,
      isOverdue: pending.length >= 1,
      message: pending.length >= 3 ? "Atenção: Evite o bloqueio do seu acesso efetuando o pagamento!" : "Atraso no pagamento das mensalidades pode levar ao bloqueio do aplicativo!",
      color: pending.length >= 3 ? 'red' : pending.length === 2 ? 'orange' : 'yellow'
    };
  }, [myMonthlyPayments]);

  const handleFileChangeForPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedPaymentToProof) return;
    const file = e.target.files[0];
    setUploadingPaymentProof(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/payment_proofs/${selectedPaymentToProof.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('payment_proofs').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('payment_proofs').getPublicUrl(filePath);

      await onUpdatePaymentRecord({
        ...selectedPaymentToProof,
        status: 'pending', // Keeps pending until admin confirms, but now has proof
        proof_url: publicUrl,
        proof_name: file.name
      });
      alert('Comprovante enviado com sucesso!');
      setSelectedPaymentToProof(null);
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      alert('Erro ao enviar comprovante: ' + error.message);
    } finally {
      setUploadingPaymentProof(false);
    }
  };

  const handleFileChangeForEventProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedEventRegToProof) return;
    const file = e.target.files[0];
    setUploadingEventProof(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/payment_proofs/${selectedEventRegToProof.id}_event_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('payment_proofs').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('payment_proofs').getPublicUrl(filePath);

      await onUpdateEventRegistrationWithProof({
        ...selectedEventRegToProof,
        proof_url: publicUrl,
        proof_name: file.name
      });
      alert('Comprovante de evento enviado com sucesso!');
      setSelectedEventRegToProof(null);
    } catch (error: any) {
      console.error('Error uploading event proof:', error);
      alert('Erro ao enviar comprovante: ' + error.message);
    } finally {
      setUploadingEventProof(false);
    }
  };

  const handleViewPaymentProof = (url: string, name: string) => {
    window.open(url, '_blank');
  };


  // State for students managed by this professor
  const [myStudents, setMyStudents] = useState<User[]>([]);

  useEffect(() => {
    const fetchMyStudents = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nickname, belt, phone, graduation_cost, next_evaluation_date, avatar_url')
        .eq('professor_name', user.nickname || user.first_name || user.name);

      if (error) {
        console.error('Error fetching students for professor:', error);
      } else {
        const students: User[] = data.map(p => ({
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.nickname || 'Aluno',
          nickname: p.nickname || undefined,
          email: '', // Not fetched here
          role: 'aluno', // Always aluno for these
          belt: p.belt || undefined,
          phone: p.phone || undefined,
          graduationCost: p.graduation_cost !== null ? parseFloat(p.graduation_cost.toString()) : 0,
          nextEvaluationDate: p.next_evaluation_date || undefined,
          photo_url: p.avatar_url || undefined
        }));
        setMyStudents(students);
      }
    };

    fetchMyStudents();
  }, [user.nickname, user.first_name, user.name]);

  useEffect(() => {
    setMyClasses(classSessions.filter(cs => cs.professor_id === user.id));
    setProfAssignments(assignments.filter(a => a.created_by === user.id));
  }, [classSessions, assignments, user.id]);

  // Calculate Grade Averages
  const gradeStats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const relevantGrades = studentGrades.filter(g => myStudents.some(s => s.id === g.student_id));

    const calcAvg = (grades: StudentGrade[]) => {
      if (grades.length === 0) return 0;
      const sum = grades.reduce((acc, curr) => acc + (typeof curr.numeric === 'number' ? curr.numeric : parseFloat(curr.numeric as any) || 0), 0);
      return sum / grades.length;
    };

    return {
      weekly: calcAvg(relevantGrades.filter(g => new Date(g.created_at) >= oneWeekAgo)),
      monthly: calcAvg(relevantGrades.filter(g => new Date(g.created_at) >= oneMonthAgo)),
      annual: calcAvg(relevantGrades.filter(g => new Date(g.created_at) >= startOfYear))
    };
  }, [studentGrades, myStudents]);


  // Filter my orders
  const myOrders = uniformOrders.filter(o => o.user_id === user.id);

  // Belt Bar Style with Ponta support
  const beltColors = useMemo(() => {
    const b = (user.belt || '').toLowerCase();
    const [mainPart, ...rest] = b.split('ponta');
    const pontaPart = rest.join('ponta');

    const colorMap: Record<string, string> = {
      'verde': '#22c55e',
      'amarelo': '#FDD835',
      'azul': '#3b82f6',
      'branco': '#ffffff',
      'cinza': '#9ca3af',
    };

    let mainColor = user.beltColor || '#fff';
    let pontaColor: string | null = null;

    if (mainPart.includes('verde, amarelo, azul e branco')) {
      mainColor = 'linear-gradient(to bottom,#22c55e,#FDD835,#3b82f6,#ffffff)';
    } else if (mainPart.includes('amarelo e azul')) {
      mainColor = 'linear-gradient(to bottom,#FDD835,#3b82f6)';
    } else if (mainPart.includes('verde e amarelo')) {
      mainColor = 'linear-gradient(to bottom,#22c55e,#FDD835)';
    } else if (mainPart.includes('verde e branco')) {
      mainColor = 'linear-gradient(to bottom,#22c55e,#ffffff)';
    } else if (mainPart.includes('amarelo e branco')) {
      mainColor = 'linear-gradient(to bottom,#FDD835,#ffffff)';
    } else if (mainPart.includes('azul e branco')) {
      mainColor = 'linear-gradient(to bottom,#3b82f6,#ffffff)';
    } else if (mainPart.includes('cinza')) {
      mainColor = '#9ca3af';
    } else if (mainPart.includes('verde')) {
      mainColor = '#22c55e';
    } else if (mainPart.includes('amarelo')) {
      mainColor = '#FDD835';
    } else if (mainPart.includes('azul')) {
      mainColor = '#3b82f6';
    } else if (mainPart.includes('branco')) {
      mainColor = '#ffffff';
    }

    if (pontaPart) {
      if (pontaPart.includes('verde') && pontaPart.includes('amarelo')) {
        pontaColor = 'linear-gradient(to bottom, #22c55e, #FDD835)';
      } else if (pontaPart.includes('verde')) pontaColor = colorMap['verde'];
      else if (pontaPart.includes('amarelo')) pontaColor = colorMap['amarelo'];
      else if (pontaPart.includes('azul')) pontaColor = colorMap['azul'];
      else if (pontaPart.includes('branco')) pontaColor = colorMap['branco'];
    }

    return { mainColor, pontaColor };
  }, [user.belt, user.beltColor]);

  // Handlers
  const handleCopyPix = () => {
    navigator.clipboard.writeText('soufilhodofogo@gmail.com');
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const handleCopyCostPix = () => {
    navigator.clipboard.writeText('soufilhodofogo@gmail.com');
    setCostPixCopied(true);
    setTimeout(() => setCostPixCopied(false), 2000);
  };

  const handleOpenAttendance = (classId: string) => { // Changed to string
    const initial: Record<string, 'present' | 'absent' | 'justified'> = {};
    myStudents.forEach(s => initial[s.id] = 'present'); // Use real students
    setAttendanceData(initial);
    setSelectedClassId(classId);
    setProfView('attendance');
    setShowSuccess(false);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId) return;

    const records = Object.entries(attendanceData).map(([studentId, status]) => ({
      session_id: selectedClassId,
      student_id: studentId,
      status: status,
      justification: status === 'justified' ? justifications[studentId] : null
    }));

    try {
      await onAddAttendance(records);
      setShowSuccess(true);
      setTimeout(() => {
        setSelectedClassId(null);
        setProfView('dashboard');
        setShowSuccess(false);
        setAttendanceData({});
        setJustifications({});
        onNotifyAdmin('Realizou chamada de aula', user);
      }, 1500);
    } catch (err) {
      alert('Erro ao salvar chamada.');
    }
  };

  const handleSaveNewClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.title || !newClassData.date || !newClassData.time || !newClassData.location) {
      alert('Por favor, preencha todos os campos da aula.');
      return;
    }
    const newSession = {
      title: newClassData.title,
      date: newClassData.date,
      time: newClassData.time,
      instructor: user.nickname || user.name,
      location: newClassData.location,
      level: 'Todos os Níveis', // Default level, can be made dynamic
      professor_id: user.id,
    };
    await onAddClassSession(newSession);
    setNewClassData({ title: '', date: '', time: '', location: '' });
    setProfView('dashboard');
    onNotifyAdmin(`Agendou nova aula: ${newClassData.title}`, user);
  };

  const handleSubmitMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicForm.title || !musicForm.category || !musicForm.lyrics) {
      alert('Por favor, preencha todos os campos da música.');
      return;
    }
    const newMusicItem = {
      title: musicForm.title,
      category: musicForm.category,
      lyrics: musicForm.lyrics,
      created_by: user.id,
    };
    await onAddMusic(newMusicItem);
    setMusicForm({ title: '', category: '', lyrics: '' });
    onNotifyAdmin(`Adicionou música: ${musicForm.title}`, user);
    alert('Música adicionada!');
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.title || !newAssignment.dueDate) {
      alert('Por favor, preencha o título e a data de entrega do trabalho.');
      return;
    }
    const assignmentPayload: Omit<AssignmentType, 'id' | 'created_at'> = {
      created_by: user.id,
      title: newAssignment.title,
      description: newAssignment.description,
      due_date: newAssignment.dueDate,
      status: 'pending',
      student_id: newAssignment.studentId || null, // Assign to specific student or null for general
    };
    await onAddAssignment(assignmentPayload);
    setNewAssignment({ title: '', description: '', dueDate: '', studentId: '' });
    onNotifyAdmin(`Criou trabalho: ${newAssignment.title}`, user);
    setShowAssignToStudentModal(false); // Close modal after adding
  };

  const handleCompleteAssignment = async (assignmentId: string, studentId: string, file: File) => {
    setUploadingMusicFile(true); // Reusing this state for any file upload
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${studentId}/assignments/${assignmentId}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assignment_submissions')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('assignment_submissions')
        .getPublicUrl(filePath);

      const updatedAssignment: AssignmentType = {
        ...assignments.find(a => a.id === assignmentId)!,
        status: 'completed',
        attachment_url: publicUrlData.publicUrl,
        attachment_name: file.name,
        student_id: studentId, // Ensure student_id is set for submission
      };
      await onUpdateAssignment(updatedAssignment);
      onNotifyAdmin(`Aluno ${myStudents.find(u => u.id === studentId)?.nickname || 'desconhecido'} entregou trabalho: ${updatedAssignment.title}`, user);
      alert('Entrega registrada com sucesso!');
    } catch (error: any) {
      console.error('Error uploading assignment submission:', error);
      alert('Erro ao fazer upload da entrega: ' + error.message);
    } finally {
      setUploadingMusicFile(false);
    }
  };

  const handleOrderUniform = (e: React.FormEvent) => {
    e.preventDefault();
    let price = 0;
    let itemName = '';

    if (orderForm.item === 'shirt') { price = UNIFORM_PRICES.shirt; itemName = 'Blusa Oficial'; }
    else if (orderForm.item === 'pants_roda') { price = UNIFORM_PRICES.pants_roda; itemName = 'Calça de Roda'; }
    else if (orderForm.item === 'pants_train') { price = UNIFORM_PRICES.pants_train; itemName = 'Calça de Treino'; }
    else if (orderForm.item === 'combo') { price = UNIFORM_PRICES.combo; itemName = 'Combo'; }

    const newOrder: Omit<UniformOrder, 'id' | 'created_at'> = {
      user_id: user.id,
      user_name: user.nickname || user.name,
      user_role: user.role,
      date: new Date().toLocaleDateString('pt-BR'),
      item: itemName,
      shirt_size: orderForm.item.includes('pants') ? undefined : orderForm.shirtSize,
      pants_size: orderForm.item === 'shirt' ? undefined : orderForm.pantsSize,
      total: price,
      status: 'pending'
    };
    onAddOrder(newOrder);
    alert('Pedido realizado! Aguarde a confirmação do Admin.');
    setOrderForm({ item: 'combo', shirtSize: '', pantsSize: '' });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/class_records/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('class_records').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('class_records').getPublicUrl(filePath);
      setClassPhoto(null);
      onNotifyAdmin(`Registro de aula enviado: ${pub.publicUrl}`, user);
      alert('Registro de aula enviado ao Admin.');
    } catch (err: any) {
      console.error('Error uploading class record:', err);
      alert('Erro ao enviar registro de aula.');
    }
  }

  // PROFILE PHOTO UPLOAD
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } }); // Changed photo_url to avatar_url
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      if (dbError) throw dbError;

      onUpdateProfile({ photo_url: publicUrl });
      alert("Foto de perfil atualizada!");
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      alert('Erro ao atualizar foto de perfil: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveEvaluation = () => {
    alert("Avaliação salva com sucesso!");
    setProfView('all_students');
    setSelectedStudentForEval(null);
    const studentName = myStudents.find(s => s.id === selectedStudentForEval)?.name || 'Aluno';
    onNotifyAdmin(`Avaliou o aluno: ${studentName}`, user); // Added notification
  };

  const selectedClassInfo = myClasses.find(c => c.id === selectedClassId);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fade-in relative">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-stone-900 p-8 rounded-2xl border border-purple-900/50 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => !uploadingPhoto && photoInputRef.current?.click()} title="Clique para alterar a foto">
            <div className="w-24 h-24 rounded-full bg-stone-700 flex items-center justify-center border-4 border-white/10 overflow-hidden shadow-lg relative">
              {user.photo_url ? (
                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Logo className="w-full h-full object-cover" />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="text-white" size={24} />
              </div>
            </div>
            {uploadingPhoto && <div className="absolute inset-0 flex items-center justify-center rounded-full"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>}
          </div>
          <input
            type="file"
            ref={photoInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleProfilePhotoUpload}
            disabled={uploadingPhoto}
          />

          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-3">
              <Shield className="text-purple-500" /> {/* Changed icon color for professor */}
              Painel do Professor
            </h1>
            <p className="text-purple-200 mt-2">Olá, {user.nickname || user.name}!</p>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-purple-600 rounded-full filter blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* OVERDUE ALERT FOR PROFESSORS */}
      {overdueStatus.isOverdue && (
        <div className={`p-4 rounded-xl border mb-6 flex items-center gap-4 animate-pulse-subtle shadow-lg ${overdueStatus.color === 'red' ? 'bg-red-900/30 border-red-500 text-red-500 shadow-red-900/20' :
          overdueStatus.color === 'orange' ? 'bg-orange-900/30 border-orange-500 text-orange-400 shadow-orange-900/20' :
            'bg-yellow-900/30 border-yellow-500 text-yellow-400 shadow-yellow-900/20'
          }`}>
          <div className={`p-2 rounded-lg ${overdueStatus.color === 'red' ? 'bg-red-500/20' : overdueStatus.color === 'orange' ? 'bg-orange-500/20' : 'bg-yellow-500/20'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm uppercase tracking-tighter">
              {overdueStatus.count === 1 ? 'Uma mensalidade pendente' : `${overdueStatus.count} mensalidades pendentes`}
            </h4>
            <p className="text-xs font-medium leading-tight mt-0.5">{overdueStatus.message}</p>
          </div>
        </div>
      )}

      {/* Top Actions */}
      <div className="flex flex-wrap gap-2 justify-end bg-stone-800 p-4 rounded-xl border border-stone-700">
        {profView === 'dashboard' && (
          <Button onClick={() => setProfView('new_class')}>
            <PlusCircle size={18} /> Nova Aula
          </Button>
        )}
        <Button onClick={() => setProfView('financial')} className="bg-stone-700 hover:bg-stone-600 text-white border-stone-600">
          <Wallet size={18} /> Financeiro
        </Button>
        <Button variant="outline" onClick={handleCopyPix} className={pixCopied ? "border-green-500 text-green-500" : ""} title="PIX Mensalidade">
          {pixCopied ? <Check size={18} /> : <ArrowLeft size={18} className="rotate-180" />}
          {pixCopied ? 'Copiado!' : 'Mensalidade'}
        </Button>
        <a href="https://discord.gg/AY2kk9Ubk" target="_blank" rel="noopener noreferrer">
          <Button className="text-white border-none !bg-[#5865F2] hover:!bg-[#4752C4]" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4752C4'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5865F2'}>
            <MessageCircle size={18} /> Discord
          </Button>
        </a>
      </div>

      <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-sm bg-stone-900 rounded-lg p-6 border-l-4 overflow-hidden relative flex flex-col items-center text-center">
          <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: beltColors.mainColor }}></div>
          {beltColors.pontaColor && (
            <div className="absolute left-0 bottom-0 w-2 h-3 rounded-b" style={{ background: beltColors.pontaColor }}></div>
          )}
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Graduação Atual</p>
          <p className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Award className="text-orange-500" size={24} />
            {user.belt || 'Cordel Cinza'}
          </p>
        </div>

        <div className="w-full max-w-sm bg-green-900/20 rounded-lg p-6 border border-green-900/50 flex flex-col items-center text-center">
          <p className="text-xs text-green-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
            <GraduationCap size={16} /> Próxima Avaliação
          </p>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl font-bold text-white">R$ {Number(user.graduationCost || 0).toFixed(2).replace('.', ',')}</p>
            {user.nextEvaluationDate && (
              <span className="text-sm text-stone-400 bg-stone-900/50 px-3 py-1 rounded-full">
                Data: <span className="text-green-400">{user.nextEvaluationDate.split('-').reverse().join('/')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* --- UNIFORM VIEW --- */}
      {profView === 'uniform' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
          <h2 className="text-2xl font-bold text-white mb-6">Solicitar Uniforme (Professor)</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <form onSubmit={handleOrderUniform} className="space-y-4">
              <select value={orderForm.item} onChange={e => setOrderForm({ ...orderForm, item: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white">
                <option value="combo">Combo</option>
                <option value="shirt">Blusa</option>
                <option value="pants_roda">Calça Roda</option>
                <option value="pants_train">Calça de Treino</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Ex: M, G, GG"
                  value={orderForm.shirtSize}
                  onChange={(e) => setOrderForm({ ...orderForm, shirtSize: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Ex: 40, 42"
                  value={orderForm.pantsSize}
                  onChange={(e) => setOrderForm({ ...orderForm, pantsSize: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                />
              </div>
              <Button fullWidth type="submit">Fazer Pedido</Button>
            </form>
            <div className="bg-stone-900 p-4 rounded text-sm text-stone-400">
              <h3 className="text-white font-bold mb-2">Meus Pedidos</h3>
              {myOrders.length === 0 ? <p>Nenhum pedido.</p> : myOrders.map(o => (
                <div key={o.id} className="border-b border-stone-700 py-2">
                  <div className="flex justify-between">
                    <span className="text-white">{o.item}</span>
                    {o.status === 'pending' && <span className="text-yellow-500 text-xs">Pendente</span>}
                    {o.status === 'ready' && <span className="text-green-500 text-xs">Pago/Pronto</span>}
                    {o.status === 'delivered' && <span className="text-stone-500 text-xs">Entregue</span>}
                  </div>
                  <p className="text-xs">Total: R$ {o.total.toFixed(2).replace('.', ',')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGNMENTS VIEW --- */}
      {profView === 'assignments' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
          <h2 className="2xl font-bold text-white mb-6">Trabalhos</h2>
          <form onSubmit={handleAddAssignment} className="mb-6 space-y-4 bg-stone-900 p-4 rounded">
            <input type="text" placeholder="Título" value={newAssignment.title} onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" required />
            <textarea placeholder="Descrição" value={newAssignment.description} onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" />
            <input type="date" value={newAssignment.dueDate} onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white [color-scheme:dark]" required />
            <Button type="submit">Criar Tarefa</Button>
          </form>
          <div className="space-y-2">
            {profAssignments.map(a => (
              <div key={a.id} className="bg-stone-900 p-3 rounded border-l-4 border-blue-500">
                <p className="font-bold text-white">{a.title}</p>
                <p className="text-xs text-stone-400">Entrega: {a.due_date.split('-').reverse().join('/')}</p>
                {a.student_id && <p className="text-xs text-stone-500">Atribuído a: {myStudents.find(s => s.id === a.student_id)?.nickname || 'Aluno Desconhecido'}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MUSIC MANAGER VIEW --- */}
      {profView === 'music_manager' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
          <h2 className="2xl font-bold text-white mb-6">Adicionar Música</h2>
          <form onSubmit={handleSubmitMusic} className="space-y-4">
            <input type="text" placeholder="Título" value={musicForm.title} onChange={e => setMusicForm({ ...musicForm, title: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
            <input type="text" placeholder="Categoria" value={musicForm.category} onChange={e => setMusicForm({ ...musicForm, category: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
            <textarea placeholder="Letra..." value={musicForm.lyrics} onChange={e => setMusicForm({ ...musicForm, lyrics: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white h-32" />
            <Button fullWidth type="submit">Salvar no Acervo</Button>
          </form>
        </div>
      )}

      {/* --- GRADES VIEW --- */}
      {profView === 'grades' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Award className="text-green-500" /> Notas dos Alunos</h2>
          {!selectedStudentForGrades && (
            <div className="space-y-3">
              {myStudents.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 bg-stone-900 rounded">
                  <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold">
                    {s.nickname?.charAt(0) || s.name.charAt(0)}
                  </div>
                  <div className="flex-1"><p className="text-white text-sm font-bold">{s.nickname || s.name}</p></div>
                  <Button variant="secondary" className="text-xs h-7 px-2" onClick={() => setSelectedStudentForGrades(s.id)}>Avaliar</Button>
                </div>
              ))}
            </div>
          )}
          {selectedStudentForGrades && (
            <div className="space-y-4 bg-stone-900 p-4 rounded">
              <div className="flex items-center justify-between">
                <p className="text-white font-bold">{myStudents.find(u => u.id === selectedStudentForGrades)?.nickname || myStudents.find(u => u.id === selectedStudentForGrades)?.name}</p>
                <button onClick={() => setSelectedStudentForGrades(null)} className="text-stone-400 flex items-center gap-1 text-sm"><ArrowLeft size={14} /> Voltar</button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-stone-300 text-sm font-semibold">Teórica</p>
                  <textarea className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white h-24" placeholder="Avaliação escrita" value={gradesForm.theory.written} onChange={e => setGradesForm({ ...gradesForm, theory: { ...gradesForm.theory, written: e.target.value } })} />
                  <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" placeholder="Nota (0-10)" value={gradesForm.theory.numeric} onChange={e => setGradesForm({ ...gradesForm, theory: { ...gradesForm.theory, numeric: e.target.value } })} disabled={!gradesForm.theory.written.trim()} />
                </div>
                <div className="space-y-2">
                  <p className="text-stone-300 text-sm font-semibold">Movimentação</p>
                  <textarea className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white h-24" placeholder="Avaliação escrita" value={gradesForm.movement.written} onChange={e => setGradesForm({ ...gradesForm, movement: { ...gradesForm.movement, written: e.target.value } })} />
                  <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" placeholder="Nota (0-10)" value={gradesForm.movement.numeric} onChange={e => setGradesForm({ ...gradesForm, movement: { ...gradesForm.movement, numeric: e.target.value } })} disabled={!gradesForm.movement.written.trim()} />
                </div>
                <div className="space-y-2">
                  <p className="text-stone-300 text-sm font-semibold">Musicalidade</p>
                  <textarea className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white h-24" placeholder="Avaliação escrita" value={gradesForm.musicality.written} onChange={e => setGradesForm({ ...gradesForm, musicality: { ...gradesForm.musicality, written: e.target.value } })} />
                  <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" placeholder="Nota (0-10)" value={gradesForm.musicality.numeric} onChange={e => setGradesForm({ ...gradesForm, musicality: { ...gradesForm.musicality, numeric: e.target.value } })} disabled={!gradesForm.musicality.written.trim()} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGradesForm({ theory: { written: '', numeric: '' }, movement: { written: '', numeric: '' }, musicality: { written: '', numeric: '' } })}>Limpar</Button>
                <Button onClick={async () => {
                  const entries: { cat: GradeCategory; w: string; n: string }[] = [
                    { cat: 'theory', w: gradesForm.theory.written.trim(), n: gradesForm.theory.numeric },
                    { cat: 'movement', w: gradesForm.movement.written.trim(), n: gradesForm.movement.numeric },
                    { cat: 'musicality', w: gradesForm.musicality.written.trim(), n: gradesForm.musicality.numeric },
                  ];
                  const toSave = entries.filter(e => e.w.length > 0);
                  if (toSave.length === 0) { alert('Preencha ao menos uma avaliação escrita.'); return; }
                  if (toSave.some(e => !e.n || e.n.toString().trim() === '')) { alert('Para cada avaliação escrita, informe a nota numérica.'); return; }
                  setSavingGrades(true);
                  try {
                    await Promise.all(toSave.map(e => onAddStudentGrade({
                      student_id: selectedStudentForGrades!,
                      student_name: myStudents.find(u => u.id === selectedStudentForGrades!)?.nickname || myStudents.find(u => u.id === selectedStudentForGrades!)?.name || 'Aluno',
                      professor_id: user.id,
                      professor_name: user.nickname || user.name,
                      category: e.cat,
                      written: e.w,
                      numeric: parseFloat(e.n),
                    })));
                    onNotifyAdmin(`Avaliou notas do aluno: ${myStudents.find(u => u.id === selectedStudentForGrades!)?.nickname || 'Aluno'}`, user);
                    alert('Notas salvas com sucesso!');
                    setGradesForm({ theory: { written: '', numeric: '' }, movement: { written: '', numeric: '' }, musicality: { written: '', numeric: '' } });
                    setSelectedStudentForGrades(null);
                  } catch (err) {
                    console.error(err);
                    alert('Erro ao salvar notas.');
                  } finally {
                    setSavingGrades(false);
                  }
                }} disabled={savingGrades}>{savingGrades ? 'Salvando...' : 'Salvar Notas'}</Button>
              </div>
              <div className="mt-6">
                <h3 className="text-white font-bold mb-2">Histórico de Notas</h3>
                <div className="space-y-2">
                  {(studentGrades || []).filter(g => g.student_id === selectedStudentForGrades).map(g => (
                    <div key={g.id} className="bg-stone-800 p-3 rounded border border-stone-700 text-sm flex justify-between">
                      <span className="text-stone-300">{g.category === 'theory' ? 'Teórica' : g.category === 'movement' ? 'Movimentação' : 'Musicalidade'}</span>
                      <span className="text-white font-semibold">
                        {Number.isFinite(typeof g.numeric === 'number' ? g.numeric : Number(g.numeric))
                          ? (typeof g.numeric === 'number' ? g.numeric : Number(g.numeric)).toFixed(1)
                          : '-'}
                      </span>
                      <span className="text-stone-400 truncate max-w-[50%]">{g.written}</span>
                    </div>
                  ))}
                  {(studentGrades || []).filter(g => g.student_id === selectedStudentForGrades).length === 0 && (
                    <p className="text-stone-500 text-sm">Sem notas registradas.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- FINANCIAL VIEW --- */}
      {profView === 'financial' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar ao Painel</button>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Monthly Payments */}
            <div className="bg-stone-900/50 p-4 rounded-xl border border-stone-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Wallet className="text-green-500" />
                Minhas Mensalidades
              </h3>
              <div className="mb-4">
                <Button
                  fullWidth
                  variant="outline"
                  onClick={handleCopyPix}
                  className={pixCopied ? "border-green-500 text-green-500" : ""}
                >
                  {pixCopied ? <Check size={18} /> : <Copy size={18} />}
                  {pixCopied ? 'Chave Copiada!' : 'PIX Mensalidade'}
                </Button>
                <p className="text-xs text-stone-500 mt-2 text-center">soufilhodofogo@gmail.com</p>
              </div>
              <div className="space-y-3">
                {myMonthlyPayments.length > 0 ? (
                  myMonthlyPayments.map(payment => (
                    <div key={payment.id} className={`bg-stone-900 p-3 rounded border-l-2 ${payment.status === 'paid' ? 'border-green-500' : 'border-yellow-500'} flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
                      <div>
                        <p className="font-bold text-white text-sm">{payment.month} ({payment.due_date.split('-').reverse().join('/')})</p>
                        <p className="text-stone-500 text-xs">R$ {payment.amount.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {payment.status === 'paid' && (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <Check size={12} /> Pago
                          </span>
                        )}
                        {payment.status === 'pending' && !payment.proof_url && (
                          <>
                            <Button
                              variant="secondary"
                              className="text-xs h-auto px-2 py-1"
                              onClick={() => {
                                setSelectedPaymentToProof(payment);
                                fileInputRef.current?.click();
                              }}
                              disabled={uploadingPaymentProof}
                            >
                              {uploadingPaymentProof && selectedPaymentToProof?.id === payment.id ? 'Enviando...' : <><FileUp size={14} className="mr-1" /> Enviar Comprovante</>}
                            </Button>
                            <input
                              type="file"
                              accept="image/*, application/pdf"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleFileChangeForPaymentProof}
                              disabled={uploadingPaymentProof}
                            />
                          </>
                        )}
                        {payment.status === 'pending' && payment.proof_url && (
                          <span className="text-yellow-400 text-xs flex items-center gap-1">
                            <Clock size={12} /> Enviado
                          </span>
                        )}
                        {payment.proof_url && (
                          <button
                            onClick={() => handleViewPaymentProof(payment.proof_url!, payment.proof_name || 'Comprovante')}
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                          >
                            <Eye size={14} /> Ver
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 text-sm italic">Nenhuma mensalidade registrada.</p>
                )}
              </div>
            </div>

            {/* Events & Costs */}
            <div className="bg-stone-900/50 p-4 rounded-xl border border-stone-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Ticket className="text-purple-500" />
                Eventos e Avaliações
              </h3>
              <Button
                fullWidth
                variant="outline"
                onClick={handleCopyCostPix}
                className={costPixCopied ? "border-green-500 text-green-500 mb-4" : "mb-4"}
              >
                {costPixCopied ? <Check size={18} /> : <Copy size={18} />}
                {costPixCopied ? 'Chave Copiada!' : 'Copiar Chave PIX (Eventos/Avaliação)'}
              </Button>

              <h4 className="text-sm font-bold text-white mb-2">Avaliações</h4>
              <div className="space-y-3 mb-6">
                {myEvaluations.length > 0 ? (
                  myEvaluations.map(payment => (
                    <div key={payment.id} className={`bg-stone-900 p-3 rounded border-l-2 ${payment.status === 'paid' ? 'border-green-500' : 'border-yellow-500'} flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
                      <div>
                        <p className="font-bold text-white text-sm">Avaliação ({payment.due_date})</p>
                        <p className="text-stone-500 text-xs">R$ {payment.amount.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {payment.status === 'paid' && (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <Check size={12} /> Pago
                          </span>
                        )}
                        {payment.status === 'pending' && !payment.proof_url && (
                          <>
                            <Button
                              variant="secondary"
                              className="text-xs h-auto px-2 py-1"
                              onClick={() => {
                                setSelectedPaymentToProof(payment);
                                fileInputRef.current?.click();
                              }}
                              disabled={uploadingPaymentProof}
                            >
                              {uploadingPaymentProof && selectedPaymentToProof?.id === payment.id ? 'Enviando...' : <><FileUp size={14} className="mr-1" /> Enviar Comprovante</>}
                            </Button>
                            <input
                              type="file"
                              accept="image/*, application/pdf"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleFileChangeForPaymentProof}
                              disabled={uploadingPaymentProof}
                            />
                          </>
                        )}
                        {payment.status === 'pending' && payment.proof_url && (
                          <span className="text-yellow-400 text-xs flex items-center gap-1">
                            <Clock size={12} /> Enviado
                          </span>
                        )}
                        {payment.proof_url && (
                          <button
                            onClick={() => handleViewPaymentProof(payment.proof_url!, payment.proof_name || 'Comprovante')}
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                          >
                            <Eye size={14} /> Ver
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 text-sm italic">Nenhuma avaliação pendente.</p>
                )}
              </div>

              <h4 className="text-sm font-bold text-white mb-2">Inscrições em Eventos</h4>
              <div className="space-y-3">
                {myEventRegistrations.length > 0 ? (
                  myEventRegistrations.map(reg => (
                    <div key={reg.id} className={`bg-stone-900 p-3 rounded border-l-2 ${reg.status === 'paid' ? 'border-green-500' : 'border-yellow-500'} flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
                      <div>
                        <p className="font-bold text-white text-sm">{reg.event_title}</p>
                        <p className="text-stone-500 text-xs">R$ {reg.amount_paid.toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {reg.status === 'paid' && (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <Check size={12} /> Pago
                          </span>
                        )}
                        {reg.status === 'pending' && !reg.proof_url && (
                          <>
                            <Button
                              variant="secondary"
                              className="text-xs h-auto px-2 py-1"
                              onClick={() => {
                                setSelectedEventRegToProof(reg);
                                eventFileInputRef.current?.click();
                              }}
                              disabled={uploadingEventProof}
                            >
                              {uploadingEventProof && selectedEventRegToProof?.id === reg.id ? 'Enviando...' : <><FileUp size={14} className="mr-1" /> Enviar Comprovante</>}
                            </Button>
                            <input
                              type="file"
                              accept="image/*, application/pdf"
                              className="hidden"
                              ref={eventFileInputRef}
                              onChange={handleFileChangeForEventProof}
                              disabled={uploadingEventProof}
                            />
                          </>
                        )}
                        {reg.status === 'pending' && reg.proof_url && (
                          <span className="text-yellow-400 text-xs flex items-center gap-1">
                            <Clock size={12} /> Enviado
                          </span>
                        )}
                        {reg.proof_url && (
                          <button
                            onClick={() => handleViewPaymentProof(reg.proof_url!, reg.event_title + ' Comprovante')}
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                          >
                            <Eye size={14} /> Ver
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 text-sm italic">Nenhuma inscrição.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ATTENDANCE VIEW --- */}
      {/* --- ATTENDANCE / ALL STUDENTS VIEW --- */}
      {profView === 'all_students' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar ao Painel</button>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Meus Alunos ({myStudents.length})</h2>
            <div className="bg-stone-900 px-3 py-1 rounded-full text-xs text-stone-400 border border-stone-700">
              Total de Vídeos: {homeTrainings.filter(ht => myStudents.some(s => s.id === ht.user_id)).length}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {myStudents.map(student => {
              const studentVideos = homeTrainings.filter(ht => ht.user_id === student.id);
              const studentGradesList = studentGrades.filter(g => g.student_id === student.id);
              const avgGrade = (studentGradesList.reduce((acc, curr) => acc + (typeof curr.numeric === 'number' ? curr.numeric : parseFloat(curr.numeric as any) || 0), 0) / (studentGradesList.length || 1)).toFixed(1);

              return (
                <div key={student.id} className="bg-stone-900 p-6 rounded-xl border border-stone-700 flex flex-col gap-4">
                  {/* Header Info */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-800 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center text-2xl font-bold text-white border-2 border-stone-600 shadow-lg">
                        {student.nickname?.charAt(0) || student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{student.nickname || student.name}</h3>
                        <p className="text-stone-400 text-sm">{student.name}</p>
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="bg-stone-800 text-xs px-2 py-0.5 rounded border border-stone-700 text-stone-300 w-fit">{student.belt || 'Sem Graduação'}</span>
                          <div className="flex gap-2 items-center">
                            {student.nextEvaluationDate && (
                              <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                                <Calendar size={10} /> {new Date(student.nextEvaluationDate).toLocaleDateString()}
                              </span>
                            )}
                            {student.graduationCost !== undefined && student.graduationCost > 0 && (
                              <span className="text-[10px] text-green-400 font-mono">
                                R$ {student.graduationCost.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                          {student.phone && <span className="flex items-center gap-1 text-xs text-blue-400"><MessageCircle size={10} /> {student.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-stone-950/30 p-4 rounded-xl border border-stone-800 w-full md:w-auto">
                      <div className="flex flex-1 md:flex-initial divide-x divide-stone-800 items-center">
                        <div className="text-center px-4">
                          <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest mb-1">Média</p>
                          <p className="text-2xl font-black text-green-500 leading-none">{avgGrade}</p>
                        </div>
                        <div className="text-center px-4">
                          <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest mb-1">Vídeos</p>
                          <p className="text-2xl font-black text-purple-500 leading-none">{studentVideos.length}</p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        className="flex-1 md:flex-initial shadow-lg shadow-purple-900/20 font-bold h-11 px-6 px-4"
                        onClick={() => { setSelectedStudentForGrades(student.id); setProfView('grades'); }}
                      >
                        <Award size={18} /> Avaliar
                      </Button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Videos Section */}
                    <div className="bg-stone-950/50 rounded-lg p-4 border border-stone-800">
                      <h4 className="text-indigo-400 font-bold mb-3 flex items-center gap-2"><Video size={16} /> Vídeos de Treino</h4>
                      {studentVideos.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {studentVideos.map(video => (
                            <div key={video.id} className="flex justify-between items-center bg-stone-900 p-2 rounded text-sm border-l-2 border-indigo-500">
                              <div>
                                <p className="text-white font-medium truncate w-40">{video.video_name}</p>
                                <p className="text-xs text-stone-500">{video.date}</p>
                              </div>
                              <a href={video.video_url} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 p-1">
                                <PlayCircle size={18} />
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-stone-600 text-sm italic py-2">Nenhum vídeo enviado.</p>
                      )}
                    </div>

                    {/* Grades Section */}
                    <div className="bg-stone-950/50 rounded-lg p-4 border border-stone-800">
                      <h4 className="text-green-400 font-bold mb-3 flex items-center gap-2"><Award size={16} /> Últimas Notas</h4>
                      {studentGradesList.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {studentGradesList.slice(0, 5).map(grade => ( // Show last 5
                            <div key={grade.id} className="flex justify-between items-center bg-stone-900 p-2 rounded text-sm border-l-2 border-green-500">
                              <div>
                                <p className="text-stone-300 text-xs uppercase">{grade.category === 'theory' ? 'Teórica' : grade.category === 'movement' ? 'Movimentação' : 'Musicalidade'}</p>
                                {/* Show written feedback to professor */}
                                <p className="text-stone-500 text-xs truncate w-40" title={grade.written}>{grade.written || '-'}</p>
                              </div>
                              <span className="font-bold text-white text-lg">
                                {Number.isFinite(typeof grade.numeric === 'number' ? grade.numeric : Number(grade.numeric))
                                  ? (typeof grade.numeric === 'number' ? grade.numeric : Number(grade.numeric)).toFixed(1)
                                  : '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-stone-600 text-sm italic py-2">Nenhuma nota registrada.</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {myStudents.length === 0 && (
              <div className="text-center py-12 text-stone-500 bg-stone-900/50 rounded-xl border border-stone-800 border-dashed">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum aluno encontrado vinculado a este professor.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ATTENDANCE VIEW --- */}
      {profView === 'attendance' && selectedClassInfo && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setProfView('dashboard')} className="text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
            <h2 className="xl font-bold text-white">Chamada: {selectedClassInfo.title}</h2>
            <Button onClick={handleSaveAttendance} disabled={showSuccess}>{showSuccess ? 'Salvo!' : 'Salvar'}</Button>
          </div>
          <div className="space-y-4">
            {myStudents.map(s => (
              <div key={s.id} className="bg-stone-900 border border-stone-700 p-4 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <span className="text-white font-bold">{s.nickname || s.name}</span>
                  <div className="flex bg-stone-800 p-1 rounded-lg border border-stone-700">
                    {(['present', 'absent', 'justified'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setAttendanceData(prev => ({ ...prev, [s.id]: status }))}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${attendanceData[s.id] === status
                          ? status === 'present' ? 'bg-green-600 text-white' : status === 'absent' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                          : 'text-stone-400 hover:text-white'
                          }`}
                      >
                        {status === 'present' ? 'Presente' : status === 'absent' ? 'Ausente' : 'Justificado'}
                      </button>
                    ))}
                  </div>
                </div>
                {attendanceData[s.id] === 'justified' && (
                  <textarea
                    placeholder="Escreva a justificativa..."
                    value={justifications[s.id] || ''}
                    onChange={e => setJustifications(prev => ({ ...prev, [s.id]: e.target.value }))}
                    className="w-full mt-2 bg-stone-800 border border-stone-600 rounded p-2 text-sm text-white h-16 focus:border-yellow-500 outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- NEW CLASS VIEW --- */}
      {profView === 'new_class' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
          <h2 className="2xl font-bold text-white mb-6">Agendar Aula</h2>
          <form onSubmit={handleSaveNewClass} className="space-y-4">
            <input type="text" placeholder="Título" value={newClassData.title} onChange={e => setNewClassData({ ...newClassData, title: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
            <div className="grid grid-cols-2 gap-4">
              <input type="date" placeholder="Data" value={newClassData.date} onChange={e => setNewClassData({ ...newClassData, date: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white [color-scheme:dark]" required />
              <input type="time" value={newClassData.time} onChange={e => setNewClassData({ ...newClassData, time: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
            </div>
            <input type="text" placeholder="Local" value={newClassData.location} onChange={e => setNewClassData({ ...newClassData, location: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
            <Button fullWidth type="submit">Confirmar Agendamento</Button>
          </form>
        </div>
      )}

      {/* --- DEFAULT DASHBOARD --- */}
      {profView === 'dashboard' && (
        <div className="space-y-6">

          <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 relative mb-6">
            <h3 className="xl font-bold text-white mb-4 flex items-center gap-2"><Camera className="text-purple-500" /> Registrar Aula</h3>
            <div className="border-2 border-dashed border-stone-600 rounded-lg p-6 flex flex-col items-center justify-center bg-stone-900/50">
              {classPhoto ? (
                <div className="relative w-full h-32 rounded overflow-hidden"><img src={classPhoto} className="w-full h-full object-cover" /><button onClick={() => setClassPhoto(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={12} /></button></div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center"><Camera size={32} className="text-stone-500 mb-2" /><span className="text-purple-400 font-bold">Enviar Foto</span><input type="file" className="hidden" onChange={handlePhotoUpload} /></label>
              )}
            </div>
          </div>

          {/* MAIN ACTIONS BAR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Button onClick={() => setProfView('all_students')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-900 to-indigo-700 hover:from-indigo-800 hover:to-indigo-600 border border-indigo-500/30">
              <Users size={28} className="text-indigo-300" />
              <span className="text-sm font-bold">Meus Alunos</span>
              <span className="text-xs text-indigo-200">Ver Tudo</span>
            </Button>
            <Button onClick={() => setProfView('assignments')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-cyan-900 to-cyan-700 hover:from-cyan-800 hover:to-cyan-600 border border-cyan-500/30">
              <BookOpen size={28} className="text-cyan-300" />
              <span className="text-sm font-bold">Trabalhos</span>
              <span className="text-xs text-cyan-200">Gerenciar</span>
            </Button>
            <Button onClick={() => setProfView('music_manager')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-900 to-amber-700 hover:from-amber-800 hover:to-amber-600 border border-amber-500/30">
              <Music size={28} className="text-amber-300" />
              <span className="text-sm font-bold">Músicas</span>
              <span className="text-xs text-amber-200">Acervo</span>
            </Button>
            <Button onClick={() => setProfView('uniform')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-900 to-emerald-700 hover:from-emerald-800 hover:to-emerald-600 border border-emerald-500/30">
              <Shirt size={28} className="text-emerald-300" />
              <span className="text-sm font-bold">Uniforme</span>
              <span className="text-xs text-emerald-200">Pedidos</span>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
              <h3 className="text-xl font-bold text-white mb-4">Minhas Aulas</h3>
              <div className="space-y-4">
                {myClasses.map(cls => (
                  <div key={cls.id} className="bg-stone-900 p-4 rounded border-l-2 border-purple-500">
                    <div className="flex justify-between items-start mb-2">
                      <div><p className="font-bold text-white">{cls.title}</p><p className="text-stone-500 text-sm">{cls.date} - {cls.time} - {cls.location}</p></div>
                    </div>
                    <Button fullWidth onClick={() => handleOpenAttendance(cls.id)}>Realizar Chamada</Button>
                  </div>
                ))}
              </div>
            </div>

            {/* EVENTS CARD */}
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="text-yellow-500" /> Eventos
              </h3>
              <div className="space-y-4">
                {events.length > 0 ? (
                  events.map(event => (
                    <div key={event.id} className="bg-stone-900 p-4 rounded-lg border-l-4 border-yellow-500 relative overflow-hidden group">
                      <h4 className="font-bold text-white mb-1 relative z-10">{event.title}</h4>
                      <p className="text-orange-400 text-sm mb-2 relative z-10">{event.date}</p>
                      <p className="text-stone-400 text-xs relative z-10">{event.description}</p>
                      {event.price ? (
                        <span className="inline-block mt-2 bg-green-900/30 text-green-400 text-xs px-2 py-1 rounded border border-green-900/50">
                          Valor: R$ {event.price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="inline-block mt-2 bg-stone-800 text-stone-400 text-xs px-2 py-1 rounded">Gratuito</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 italic text-sm">Nenhum evento programado.</p>
                )}
              </div>
            </div>

            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
              <h3 className="text-xl font-bold text-white mb-4">Acompanhamento</h3>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-stone-900 p-2 rounded text-center">
                  <p className="text-[10px] text-stone-400 uppercase">Semanal</p>
                  <p className="text-lg font-bold text-green-400">{gradeStats.weekly.toFixed(1)}</p>
                </div>
                <div className="bg-stone-900 p-2 rounded text-center">
                  <p className="text-[10px] text-stone-400 uppercase">Mensal</p>
                  <p className="text-lg font-bold text-blue-400">{gradeStats.monthly.toFixed(1)}</p>
                </div>
                <div className="bg-stone-900 p-2 rounded text-center">
                  <p className="text-[10px] text-stone-400 uppercase">Anual</p>
                  <p className="text-lg font-bold text-purple-400">{gradeStats.annual.toFixed(1)}</p>
                </div>
              </div>

              <div className="space-y-3">
                {myStudents.slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 bg-stone-900 rounded">
                    <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold">
                      {s.name.charAt(0)} {/* Revertido para a inicial do nome */}
                    </div>
                    <div className="flex-1"><p className="text-white text-sm font-bold">{s.nickname || s.name}</p></div>
                    <Button variant="secondary" className="text-xs h-7 px-2" onClick={() => setProfView('all_students')}>Avaliar</Button>
                  </div>
                ))}
              </div>

              <button onClick={() => setProfView('all_students')} className="w-full text-center text-purple-400 text-sm mt-4 hover:underline">Ver todos os alunos</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};