import React, { useState, useEffect, useMemo, useRef } from 'react';
import heic2any from "heic2any";
import { User, GroupEvent, MusicItem, UniformOrder, StudentAcademicData, ClassSession, Assignment as AssignmentType, StudentGrade, GradeCategory, ALL_BELTS } from '../types'; // Renamed Assignment to AssignmentType to avoid conflict
import { Users, CalendarCheck, PlusCircle, Copy, Check, ArrowLeft, Save, X, UploadCloud, BookOpen, Paperclip, Calendar, Wallet, Info, Shirt, ShoppingBag, Music, Mic2, MessageCircle, AlertTriangle, Video, Clock, Camera, UserPlus, Shield, Award, GraduationCap, PlayCircle, FileUp, Eye, DollarSign, FileText, Ticket, Trash2, Activity, Instagram, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../src/integrations/supabase/client'; // Import supabase client
import { Logo } from '../components/Logo'; // Import Logo component

interface Props {
  user: User;
  events: GroupEvent[];
  musicList: MusicItem[];
  uniformOrders: UniformOrder[];
  onAddOrder: (order: UniformOrder) => void;
  onAddMusic: (music: Omit<MusicItem, 'id' | 'created_at'>) => void;
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
  onAddClassRecord: (record: { photo_url: string; created_by: string; description?: string }) => Promise<void>;
  allUsersProfiles: User[];
  onDeleteMusic?: (musicId: string) => Promise<void>;
}

const BELT_COLOR_MAPPING: Record<string, { main: string, ponta?: string }> = {
  "Cordel Cinza": { main: "#808080" },
  "Cordel Verde": { main: "#008000" },
  "Cordel Verde ponta Amarelo": { main: "#008000", ponta: "#FFFF00" },
  "Cordel Verde ponta Azul": { main: "#008000", ponta: "#0000FF" },
  "Cordel Verde e Amarelo": { main: "#008000", ponta: "#FFFF00" },
  "Cordel Verde e Amarelo ponta Verde": { main: "#FFFF00", ponta: "#008000" },
  "Cordel Verde e Amarelo ponta Amarelo": { main: "#008000", ponta: "#FFFF00" },
  "Cordel Verde e Amarelo ponta Azul": { main: "#008000", ponta: "#0000FF" },
  "Cordel Amarelo": { main: "#FFFF00" },
  "Cordel Amarelo ponta Verde": { main: "#FFFF00", ponta: "#008000" },
  "Cordel Amarelo ponta Azul": { main: "#FFFF00", ponta: "#0000FF" },
  "Cordel Amarelo e Azul (Instrutor)": { main: "#FFFF00", ponta: "#0000FF" },
  "Cordel Azul (Professor)": { main: "#0000FF" },
  "Cordel Branco (Grão-Mestre)": { main: "#FFFFFF" }
};

interface AssignmentFormState {
  title: string;
  description: string;
  dueDate: string; // Changed to dueDate for consistency with Supabase
  studentId: string; // Added for specific student assignment
  file: File | null; // Added for attachments
}

const UNIFORM_PRICES = {
  combo: 110.00,
  shirt: 30.00,
  pants_roda: 80.00,
  pants_train: 80.00
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
  eventRegistrations,
  onAddClassRecord = async (record: { photo_url: string; created_by: string; description?: string }) => { },
  allUsersProfiles = [],
  onDeleteMusic = async (_id: string) => { }
}) => {
  const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
  const [selectedAssignmentTarget, setSelectedAssignmentTarget] = useState<'mine' | 'all'>('mine');
  const myClasses = useMemo(() => classSessions.filter(cs => cs.professor_id === user.id), [classSessions, user.id]);
  const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '' });

  // Attendance State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null); // Changed to string
  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'justified'>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Assignments
  const profAssignments = useMemo(() => assignments.filter(a => a.created_by === user.id), [assignments, user.id]);
  const [newAssignment, setNewAssignment] = useState<AssignmentFormState>({ title: '', description: '', dueDate: '', studentId: '', file: null }); // Added studentId and file
  const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false);
  const [selectedAssignmentToAssign, setSelectedAssignmentToAssign] = useState<AssignmentType | null>(null);
  const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<string>('');


  // Music
  const [musicForm, setMusicForm] = useState({ title: '', category: '', lyrics: '' });
  const [uploadingMusicFile, setUploadingMusicFile] = useState(false);

  // Uniform
  const [orderForm, setOrderForm] = useState({ item: 'combo', shirtSize: '', pantsSize: '' });
  const [costPixCopied, setCostPixCopied] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // Photo
  const [classPhoto, setClassPhoto] = useState<string | null>(null);

  // Evaluation
  const [studentName, setStudentName] = useState('');
  const [evalData, setEvalData] = useState({
    theory: { written: '', numeric: '' },
    movement: { written: '', numeric: '' },
    musicality: { written: '', numeric: '' }
  });
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<string | null>(null);
  const [gradesForm, setGradesForm] = useState({
    theory: { written: '', numeric: '' },
    movement: { written: '', numeric: '' },
    musicality: { written: '', numeric: '' },
  });
  const [savingGrades, setSavingGrades] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<{ id: string; session_id: string; student_name: string; status: 'present' | 'absent' | 'justified'; justification?: string }[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Financial & Uploads
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const [uploadingEventProof, setUploadingEventProof] = useState(false);
  const [selectedPaymentToProof, setSelectedPaymentToProof] = useState<any | null>(null);
  const [selectedEventRegToProof, setSelectedEventRegToProof] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventFileInputRef = useRef<HTMLInputElement>(null);
  const uniformFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingUniformProof, setUploadingUniformProof] = useState(false);
  const [selectedOrderToProof, setSelectedOrderToProof] = useState<UniformOrder | null>(null);

  const myFilteredPayments = (monthlyPayments || []).filter(p => p.student_id === user.id);
  const myMonthlyPayments = myFilteredPayments.filter(p => (!p.type || p.type === 'Mensalidade') && !p.month.toLowerCase().includes('avalia'));
  const myEvaluations = myFilteredPayments.filter(p => p.type === 'evaluation' || p.month.toLowerCase().includes('avalia'));
  const myEventRegistrations = useMemo(() => eventRegistrations ? eventRegistrations.filter(r => r.user_id === user.id) : [], [eventRegistrations, user.id]);
  const myOrders = useMemo(() => uniformOrders.filter(o => o.user_id === user.id), [uniformOrders, user.id]);

  const overdueStatus = useMemo(() => {
    const pending = myMonthlyPayments.filter(p => p.status === 'pending' || p.status === 'overdue');
    return {
      count: pending.length,
      isOverdue: pending.length >= 1,
      message: pending.length >= 3 ? "Atenção: Evite o bloqueio do seu acesso efetuando o pagamento!" : "Atraso no pagamento das mensalidades pode levar ao bloqueio do aplicativo!",
      color: pending.length >= 3 ? 'red' : pending.length === 2 ? 'orange' : 'yellow'
    };
  }, [myMonthlyPayments]);
  const convertToStandardImage = async (file: File): Promise<File> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let processingFile = file;

    // Skip non-image files
    if (!file.type.startsWith('image/')) {
      return file;
    }

    // 1. Convert HEIC/HEIF
    if (extension === 'heic' || extension === 'heif') {
      try {
        const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 }) as Blob;
        const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        processingFile = new File([convertedBlob], newFileName, { type: 'image/jpeg' });
      } catch (error) {
        console.error('HEIC conversion failed:', error);
        return file;
      }
    }

    // 2. Compress and resize all images
    const isImage = processingFile.type.startsWith('image/') && !processingFile.type.includes('gif');
    if (isImage) {
      try {
        return await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('Image processing timeout, using original');
            resolve(processingFile);
          }, 15000);

          const reader = new FileReader();
          reader.onerror = () => { clearTimeout(timeout); resolve(processingFile); };
          reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => { clearTimeout(timeout); resolve(processingFile); };
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1600;
                const MAX_HEIGHT = 1600;

                if (width > height) {
                  if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                  if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                  clearTimeout(timeout);
                  if (blob) {
                    const newName = processingFile.name.replace(/\.[^/.]+$/, "") + ".jpg";
                    resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }));
                  } else {
                    resolve(processingFile);
                  }
                }, 'image/jpeg', 0.8);
              } catch (err) {
                clearTimeout(timeout);
                resolve(processingFile);
              }
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(processingFile);
        });
      } catch (err) {
        console.error('Compression failed:', err);
        return processingFile;
      }
    }

    return processingFile;
  };

  const handleFileChangeForPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.target.files || e.target.files.length === 0 || !selectedPaymentToProof) return;
    let file = e.target.files[0];
    setUploadingPaymentProof(true);
    try {
      file = await convertToStandardImage(file);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/payment_proofs/${selectedPaymentToProof.id}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await onUpdatePaymentRecord({
        ...selectedPaymentToProof,
        status: 'pending',
        proof_url: uploadData.path,
        proof_name: file.name
      });
      alert('Comprovante enviado com sucesso!');
      setSelectedPaymentToProof(null);
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      alert('Erro ao enviar comprovante: ' + error.message);
    } finally {
      setUploadingPaymentProof(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChangeForUniformProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.target.files || e.target.files.length === 0 || !selectedOrderToProof) return;
    let file = e.target.files[0];
    setUploadingUniformProof(true);
    try {
      file = await convertToStandardImage(file);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/uniform_proofs/${selectedOrderToProof.id}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await onUpdateOrderWithProof(selectedOrderToProof.id, uploadData.path, file.name);

      onNotifyAdmin(`Professor ${user.nickname || user.name} enviou comprovante de uniforme: ${selectedOrderToProof.item}`, user);
      alert("Comprovante enviado com sucesso!");
      setSelectedOrderToProof(null);
    } catch (error: any) {
      console.error('Error uploading uniform proof:', error);
      alert("Erro ao enviar comprovante: " + error.message);
    } finally {
      setUploadingUniformProof(false);
      if (uniformFileInputRef.current) uniformFileInputRef.current.value = '';
    }
  };

  const handleFileChangeForEventProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.target.files || e.target.files.length === 0 || !selectedEventRegToProof) return;
    let file = e.target.files[0];
    setUploadingEventProof(true);
    try {
      file = await convertToStandardImage(file);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/event_proofs/${selectedEventRegToProof.id}_event_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await onUpdateEventRegistrationWithProof({
        ...selectedEventRegToProof,
        proof_url: uploadData.path,
        proof_name: file.name,
        status: 'pending'
      });
      alert('Comprovante de evento enviado com sucesso!');
      setSelectedEventRegToProof(null);
    } catch (error: any) {
      console.error('Error uploading event proof:', error);
      alert('Erro ao enviar comprovante: ' + error.message);
    } finally {
      setUploadingEventProof(false);
      if (eventFileInputRef.current) eventFileInputRef.current.value = '';
    }
  };

  const handleViewPaymentProof = async (filePath: string, proofName: string) => {
    const newWindow = window.open('', '_blank');

    // Attempt multiple buckets if needed, or use a specific one
    // Uniform proofs and payments were previously mixed in payment_proofs
    let bucket = 'payment_proofs';
    if (filePath.includes('event_proofs')) bucket = 'event_proofs';

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60);

      if (error) throw error;

      if (newWindow) {
        newWindow.location.href = data.signedUrl;
      }
      onNotifyAdmin(`Visualizou comprovante: ${proofName}`, user);
    } catch (error: any) {
      if (newWindow) newWindow.close();
      console.error('Error generating signed URL:', error);
      alert('Erro ao visualizar o arquivo: ' + error.message);
    }
  };


  // Filter students managed by this professor from allUsersProfiles prop
  const myStudents = useMemo(() => {
    return allUsersProfiles.filter(p =>
      p.role === 'aluno' &&
      p.status !== 'archived' &&
      p.professorName === (user.nickname || user.first_name || user.name)
    );
  }, [allUsersProfiles, user.nickname, user.first_name, user.name]);

  const activeGraduandoCount = useMemo(() => {
    return allUsersProfiles.filter(p => p.role === 'aluno' && p.status !== 'archived').length;
  }, [allUsersProfiles]);

  const activeProfessorCount = useMemo(() => {
    return allUsersProfiles.filter(p => p.role === 'professor' && p.status !== 'archived').length;
  }, [allUsersProfiles]);

  useEffect(() => {
    const fetchAttendanceHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            id,
            status,
            justification,
            session_id,
            profiles:student_id (
              nickname,
              first_name,
              last_name
            )
          `)
          .in('session_id', myClasses.map(c => c.id));

        if (error) throw error;
        if (data) {
          const formatted = data.map((record: any) => ({
            id: record.id,
            session_id: record.session_id,
            student_name: record.profiles?.nickname || record.profiles?.first_name || 'Aluno',
            status: record.status as 'present' | 'absent' | 'justified',
            justification: record.justification
          }));
          setAttendanceHistory(formatted);
        }
      } catch (err) {
        console.error("Error fetching attendance history", err);
      }
    };

    if (myClasses.length > 0) {
      fetchAttendanceHistory();
    }
  }, [myClasses]);

  // Removed redundant useEffect for myClasses, profAssignments, and myOrders as they now use useMemo

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


  // Filter my orders - removed duplicate const to keep useState version



  const getCurrentPrice = () => {
    switch (orderForm.item) {
      case 'shirt': return UNIFORM_PRICES.shirt;
      case 'pants_roda': return UNIFORM_PRICES.pants_roda;
      case 'pants_train': return UNIFORM_PRICES.pants_train;
      case 'combo': return UNIFORM_PRICES.combo;
      default: return 0;
    }
  };

  // Belt Bar Style with Ponta support
  const beltColors = useMemo(() => {
    const b = (user.belt || '').toLowerCase();
    const [mainPart, ...rest] = b.split('ponta');
    const pontaPart = rest.join('ponta');

    // Main colors
    const colorMap: Record<string, string> = {
      'verde': '#22c55e',
      'amarelo': '#FDD835',
      'azul': '#0033CC', // Azul Caneta (Darker Blue)
      'branco': '#ffffff',
      'cinza': '#9ca3af',
    };

    // Ponta colors - lighter/brighter shades for highlight effect
    const pontaColorMap: Record<string, string> = {
      'verde': '#4ade80',    // Lighter green
      'amarelo': '#FFEB3B',  // Brighter yellow
      'azul': '#1E90FF',     // Lighter blue (Dodger Blue)
      'branco': '#f0f0f0',   // Slightly off-white
    };

    // Calculate mainColor from belt name - don't use beltColor as initial value
    let mainColor = '#fff';
    let pontaColor: string | null = null;

    // Smooth gradients - colors blend together
    if (mainPart.includes('verde, amarelo, azul e branco')) {
      mainColor = 'linear-gradient(to bottom, #22c55e, #FDD835, #0033CC, #ffffff)';
    } else if (mainPart.includes('amarelo e azul')) {
      mainColor = 'linear-gradient(to bottom, #FDD835, #0033CC)';
    } else if (mainPart.includes('verde e amarelo')) {
      mainColor = 'linear-gradient(to bottom, #22c55e, #FDD835)';
    } else if (mainPart.includes('verde e branco')) {
      mainColor = 'linear-gradient(to bottom, #22c55e, #ffffff)';
    } else if (mainPart.includes('amarelo e branco')) {
      mainColor = 'linear-gradient(to bottom, #FDD835, #ffffff)';
    } else if (mainPart.includes('azul e branco')) {
      mainColor = 'linear-gradient(to bottom, #0033CC, #ffffff)';
    } else if (mainPart.includes('cinza')) {
      mainColor = '#9ca3af';
    } else if (mainPart.includes('verde')) {
      mainColor = '#22c55e';
    } else if (mainPart.includes('amarelo')) {
      mainColor = '#FDD835';
    } else if (mainPart.includes('azul')) {
      mainColor = '#0033CC';
    } else if (mainPart.includes('branco')) {
      mainColor = '#ffffff';
    } else if (user.beltColor) {
      // Only use beltColor as fallback if no match found
      mainColor = user.beltColor;
    }

    // Ponta uses highlighted (lighter) colors for visual distinction
    if (pontaPart) {
      if (pontaPart.includes('verde') && pontaPart.includes('amarelo')) {
        pontaColor = 'linear-gradient(to bottom, #4ade80, #FFEB3B)';
      } else if (pontaPart.includes('verde')) pontaColor = pontaColorMap['verde'];
      else if (pontaPart.includes('amarelo')) pontaColor = pontaColorMap['amarelo'];
      else if (pontaPart.includes('azul')) pontaColor = pontaColorMap['azul'];
      else if (pontaPart.includes('branco')) pontaColor = pontaColorMap['branco'];
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
      justification: status === 'justified' ? justifications[studentId] : null,
      created_at: new Date().toISOString()
    }));

    if (records.length === 0) {
      alert('Não há alunos nesta chamada.');
      return;
    }

    try {
      await onAddAttendance(records);

      // Update session status to completed
      const session = myClasses.find(c => c.id === selectedClassId);
      if (session) {
        await onUpdateClassSession({ ...session, status: 'completed' });
      }

      setShowSuccess(true);
      setTimeout(() => {
        setSelectedClassId(null);
        // setProfView('dashboard'); // Removed to keep user context
        setShowSuccess(false);
        setAttendanceData({});
        setJustifications({});
        onNotifyAdmin('Realizou chamada de aula', user);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      alert('Erro ao salvar chamada: ' + (err.message || err.details || 'Erro desconhecido'));
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
    // setProfView('dashboard'); // Removed to keep user context
    onNotifyAdmin(`Agendou nova aula: ${newClassData.title}`, user);
  };


  const handleSubmitMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingMusicFile(true);

    try {
      const newMusic: Omit<MusicItem, 'id' | 'created_at'> = {
        title: musicForm.title,
        category: musicForm.category,
        lyrics: musicForm.lyrics,
        file_url: '',
        created_by: user.id
      };

      await onAddMusic(newMusic);
      setMusicForm({ title: '', category: '', lyrics: '' });
      onNotifyAdmin(`Adicionou música: ${musicForm.title}`, user);
      alert('Música adicionada!');
    } catch (err: any) {
      console.error('Error adding music:', err);
      alert('Erro ao adicionar música: ' + err.message);
    } finally {
      setUploadingMusicFile(false);
    }
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignment.title || !newAssignment.dueDate) {
      alert('Por favor, preencha o título e a data de entrega do trabalho.');
      return;
    }

    const professorIdentity = user.nickname || user.first_name || user.name;
    const targetStudents = selectedAssignmentTarget === 'all'
      ? allUsersProfiles.filter(u => u.role === 'aluno')
      : allUsersProfiles.filter(u => u.role === 'aluno' && u.professorName === professorIdentity);

    if (targetStudents.length === 0 && !newAssignment.studentId) {
      alert('Não há alunos para receber este trabalho.');
      return;
    }

    // Upload attachment if exists
    let attachmentUrl = '';
    let attachmentName = '';
    if (newAssignment.file) {
      try {
        let file = newAssignment.file;
        file = await convertToStandardImage(file);
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/assignments_source/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('assignment_attachments').upload(filePath, file);
        if (uploadError) throw uploadError;
        attachmentUrl = uploadData.path;
        attachmentName = file.name;
      } catch (err: any) {
        console.error('Error uploading assignment attachment:', err);
        alert('Erro ao enviar anexo do trabalho. O trabalho será criado sem anexo.');
      }
    }

    if (newAssignment.studentId) {
      const assignmentPayload: Omit<AssignmentType, 'id' | 'created_at'> = {
        created_by: user.id,
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: newAssignment.dueDate,
        status: 'pending',
        student_id: newAssignment.studentId,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName
      };
      await onAddAssignment(assignmentPayload);
    } else {
      for (const student of targetStudents) {
        const assignmentPayload: Omit<AssignmentType, 'id' | 'created_at'> = {
          created_by: user.id,
          title: newAssignment.title,
          description: newAssignment.description,
          due_date: newAssignment.dueDate,
          status: 'pending',
          student_id: student.id,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName
        };
        await onAddAssignment(assignmentPayload);
      }
    }

    setNewAssignment({ title: '', description: '', dueDate: '', studentId: '', file: null });
    alert(`Trabalho "${newAssignment.title}" criado e enviado com sucesso!`);
    onNotifyAdmin(`Criou trabalho: ${newAssignment.title}`, user);
    setShowAssignToStudentModal(false);
    setSelectedAssignmentTarget('mine');
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
      alert('Telefone não cadastrado.');
      return;
    }
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleOpenEvaluation = (studentId: string) => {
    const student = myStudents.find(u => u.id === studentId);
    if (student) {
      setStudentName(student.nickname || student.name);
    }
    setSelectedStudentForGrades(studentId);
    setEvalData({
      theory: { written: '', numeric: '' },
      movement: { written: '', numeric: '' },
      musicality: { written: '', numeric: '' }
    });
    setProfView('grades');
  };

  const handleSaveEvaluation = async () => {
    if (!selectedStudentForGrades) return;

    const entries: { cat: GradeCategory; w: string; n: string }[] = [
      { cat: 'theory', w: evalData.theory.written.trim(), n: evalData.theory.numeric },
      { cat: 'movement', w: evalData.movement.written.trim(), n: evalData.movement.numeric },
      { cat: 'musicality', w: evalData.musicality.written.trim(), n: evalData.musicality.numeric },
    ];

    const toSave = entries.filter(e => e.w.length > 0);
    if (toSave.length === 0) {
      alert('Preencha ao menos uma avaliação escrita.');
      return;
    }
    if (toSave.some(e => !e.n || e.n.toString().trim() === '')) {
      alert('Para cada avaliação escrita, informe a nota numérica.');
      return;
    }

    setSavingGrades(true);
    try {
      await Promise.all(toSave.map(e => onAddStudentGrade({
        student_id: selectedStudentForGrades,
        student_name: studentName,
        professor_id: user.id,
        professor_name: user.nickname || user.name,
        category: e.cat,
        written: e.w,
        numeric: parseFloat(e.n),
      })));

      alert("Avaliações salvas com sucesso!");
      setProfView('all_students');
      setSelectedStudentForGrades(null);
      setEvalData({
        theory: { written: '', numeric: '' },
        movement: { written: '', numeric: '' },
        musicality: { written: '', numeric: '' }
      });
      onNotifyAdmin(`Avaliou notas do aluno: ${studentName}`, user);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar notas.');
    } finally {
      setSavingGrades(false);
    }
  };

  const handleViewAssignment = async (fileUrl: string, fileName: string) => {
    // Open window immediately to avoid pop-up blocking on mobile
    const newWindow = window.open('', '_blank');
    try {
      const { data, error } = await supabase.storage
        .from('assignment_submissions')
        .createSignedUrl(fileUrl, 60); // URL valid for 60 seconds

      if (error) throw error;

      if (newWindow) {
        newWindow.location.href = data.signedUrl;
      }
      onNotifyAdmin(`Visualizou resposta de trabalho: ${fileName}`, user);
    } catch (error: any) {
      if (newWindow) newWindow.close();
      console.error('Error generating signed URL for assignment:', error);
      alert('Erro ao visualizar o arquivo: ' + error.message);
    }
  };

  const handleViewAssignmentSource = async (fileUrl: string) => {
    const newWindow = window.open('', '_blank');
    try {
      const { data, error } = await supabase.storage
        .from('assignment_attachments')
        .createSignedUrl(fileUrl, 300);

      if (error) throw error;
      if (newWindow) newWindow.location.href = data.signedUrl;
    } catch (error: any) {
      if (newWindow) newWindow.close();
      alert('Erro ao visualizar o anexo do trabalho: ' + error.message);
    }
  };

  const handleViewReport = async (fileUrl: string, fileName: string) => {
    const newWindow = window.open('', '_blank');
    try {
      const { data, error } = await supabase.storage
        .from('school_reports_files')
        .createSignedUrl(fileUrl, 60);

      if (error) throw error;

      if (newWindow) {
        newWindow.location.href = data.signedUrl;
      }
      onNotifyAdmin(`Visualizou boletim: ${fileName}`, user);
    } catch (error: any) {
      if (newWindow) newWindow.close();
      console.error('Error generating signed URL:', error);
      alert('Erro ao visualizar o arquivo: ' + error.message);
    }
  };

  const handleViewHomeTrainingVideo = async (videoUrl: string) => {
    let path = videoUrl;

    // If it's a external link (YouTube/Drive), open directly
    // But if it's a Supabase URL, we need to extract the path to sign it (since bucket is private)
    if (videoUrl.startsWith('http')) {
      if (videoUrl.includes('supabase.co/storage/v1/object/')) {
        // Extract path after bucket name
        const segments = videoUrl.split('/');
        const bucketIndex = segments.indexOf('home_training_videos');
        if (bucketIndex !== -1) {
          path = segments.slice(bucketIndex + 1).join('/');
        } else {
          // Fallback to direct open if bucket name not found in URL
          window.open(videoUrl, '_blank');
          return;
        }
      } else {
        window.open(videoUrl, '_blank');
        onNotifyAdmin(`Visualizou link de treino em casa`, user);
        return;
      }
    }

    const newWindow = window.open('', '_blank');
    try {
      const { data, error } = await supabase.storage
        .from('home_training_videos')
        .createSignedUrl(path, 300);

      if (error) throw error;

      if (newWindow) {
        newWindow.location.href = data.signedUrl;
      }
      onNotifyAdmin(`Visualizou vídeo de treino em casa`, user);
    } catch (error: any) {
      if (newWindow) newWindow.close();
      console.error('Error generating signed URL:', error);
      alert('Erro ao visualizar vídeo: ' + error.message);
    }
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

      // For private buckets, we store the path and generate a signed URL when needed for viewing
      const fileUrl = uploadData.path;

      const updatedAssignment: AssignmentType = {
        ...assignments.find(a => a.id === assignmentId)!,
        status: 'completed',
        submission_url: fileUrl,
        submission_name: file.name,
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
      total: price,
      status: 'pending',
      shirt_size: (orderForm.item === 'shirt' || orderForm.item === 'combo') ? orderForm.shirtSize : undefined,
      pants_size: (orderForm.item !== 'shirt') ? orderForm.pantsSize : undefined,
    };
    onAddOrder(newOrder as UniformOrder);
    onNotifyAdmin(`${user.role === 'admin' ? 'Admin' : 'Professor'} solicitou uniforme: ${itemName}`, user);
    alert('Pedido registrado!');
    setOrderForm({ item: 'combo', shirtSize: '', pantsSize: '' });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.target.files || !e.target.files[0]) return;
    let file = e.target.files[0];
    try {
      file = await convertToStandardImage(file);
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/class_records/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('class_records').upload(filePath, file);
      if (uploadError) throw uploadError;

      await onAddClassRecord({
        photo_url: uploadData.path,
        created_by: user.id,
        description: `Registro de aula por ${user.nickname || user.name}`
      });

      setClassPhoto(null);
      onNotifyAdmin(`Registro de aula enviado`, user);
      alert('Registro de aula enviado e salvo com sucesso!');
    } catch (err: any) {
      console.error('Error uploading class record:', err);
      alert('Erro ao enviar registro de aula.');
    } finally {
      if (e.target) e.target.value = '';
    }
  }

  // PROFILE PHOTO UPLOAD
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.target.files || e.target.files.length === 0) return;
    let file = e.target.files[0];
    setUploadingPhoto(true);

    try {
      file = await convertToStandardImage(file);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      if (dbError) throw dbError;

      onUpdateProfile({ photo_url: publicUrl });
      alert("Foto de perfil atualizada!");
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      alert('Erro ao atualizar foto de perfil: ' + error.message);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };



  const selectedClassInfo = myClasses.find(c => c.id === selectedClassId);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fade-in relative">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 to-stone-900 p-8 rounded-2xl border border-purple-900/50 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => {
            if (!uploadingPhoto) {
              // Delay for mobile PWA
              setTimeout(() => photoInputRef.current?.click(), 100);
            }
          }} title="Clique para alterar a foto">
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
            onClick={(e) => { e.stopPropagation(); }}
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
        <a href="https://www.instagram.com/filhosdofogo2005" target="_blank" rel="noopener noreferrer">
          <Button className="bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 border-none text-white">
            <Instagram size={18} /> Instagram
          </Button>
        </a>
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
            {(() => {
              const userInstallments = monthlyPayments.filter(p =>
                p.student_id === user.id &&
                p.month?.includes('Parcela')
              );
              const paidInstallments = userInstallments.filter(p => p.status === 'paid');
              const pendingInstallments = userInstallments.filter(p => p.status !== 'paid');
              const remainingValue = pendingInstallments.reduce((sum, p) => sum + (p.amount || 0), 0);
              const totalPaid = paidInstallments.reduce((sum, p) => sum + (p.amount || 0), 0);

              return (
                <>
                  {remainingValue > 0 ? (
                    <>
                      <p className="text-sm text-stone-400">Valor Restante Parcelas:</p>
                      <p className="text-2xl font-bold text-white">R$ {remainingValue.toFixed(2).replace('.', ',')}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="text-green-400">{paidInstallments.length} pagas</span>
                        <span className="text-stone-600">|</span>
                        <span className="text-orange-400">{pendingInstallments.length} pendentes</span>
                      </div>
                      <div className="w-full bg-stone-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${userInstallments.length > 0 ? (paidInstallments.length / userInstallments.length) * 100 : 0}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-white">R$ {Number(user.graduationCost || 0).toFixed(2).replace('.', ',')}</p>
                      {totalPaid > 0 && (
                        <span className="text-xs text-green-400">✓ Parcelas quitadas</span>
                      )}
                    </>
                  )}
                </>
              );
            })()}

            {user.nextEvaluationDate && (
              <span className="text-sm text-stone-400 bg-stone-900/50 px-3 py-1 rounded-full mt-2">
                Data: <span className="text-green-400">{user.nextEvaluationDate.split('-').reverse().join('/')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* NEW CLASS VIEW */}
      {profView === 'new_class' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in relative">
          <Button
            variant="ghost"
            className="absolute top-4 right-4 text-stone-400 hover:text-white"
            onClick={() => setProfView('dashboard')}
          >
            <X size={20} />
          </Button>

          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <PlusCircle className="text-purple-500" />
            Agendar Nova Aula
          </h3>

          <form onSubmit={handleSaveNewClass} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">Título / Tema</label>
                <input
                  type="text"
                  value={newClassData.title}
                  onChange={e => setNewClassData({ ...newClassData, title: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white focus:border-purple-500 transition-colors"
                  required
                  placeholder="Ex: Capoeira Angola"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">Data</label>
                <input
                  type="date"
                  value={newClassData.date}
                  onChange={e => setNewClassData({ ...newClassData, date: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white focus:border-purple-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-stone-400 mb-1">Horário</label>
                <input
                  type="time"
                  value={newClassData.time}
                  onChange={e => setNewClassData({ ...newClassData, time: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white focus:border-purple-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-stone-400 mb-1">Local</label>
                <input
                  type="text"
                  value={newClassData.location}
                  onChange={e => setNewClassData({ ...newClassData, location: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white focus:border-purple-500 transition-colors"
                  required
                  placeholder="Ex: Sede"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-stone-700 mt-4">
              <Button variant="outline" onClick={() => setProfView('dashboard')} type="button" className="flex-1">
                <ArrowLeft size={18} /> Voltar ao Painel
              </Button>
              <Button fullWidth type="submit" className="flex-[2] bg-purple-600 hover:bg-purple-500">
                <Save size={18} /> Confirmar Agendamento
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* --- PROF VIEW: ATTENDANCE --- */}
      {profView === 'attendance' && selectedClassId && (
        <div className="bg-stone-800 rounded-xl border border-stone-700 overflow-hidden animate-fade-in relative">
          <div className="bg-stone-900 p-6 border-b border-stone-700 flex justify-between items-center sticky top-0 z-10">
            <div>
              <button onClick={() => setProfView('dashboard')} className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors">
                <ArrowLeft size={16} /> Voltar ao Painel
              </button>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <CalendarCheck className="text-purple-500" /> Chamada - {selectedClassInfo?.title}
              </h2>
            </div>
            <Button onClick={handleSaveAttendance} disabled={showSuccess}>
              {showSuccess ? <Check size={18} /> : <Save size={18} />}
              {showSuccess ? 'Salvo!' : 'Salvar Chamada'}
            </Button>
          </div>
          <div className="p-6 grid gap-3">
            {myStudents.map((student) => {
              const isPresent = attendanceData[student.id] === 'present';
              return (
                <div key={student.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all duration-200 ${isPresent ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                  <div className="flex items-center gap-4 cursor-pointer mb-3 md:mb-0" onClick={() => setAttendanceData(prev => ({ ...prev, [student.id]: prev[student.id] === 'present' ? 'absent' : 'present' }))}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors ${isPresent ? 'bg-green-600' : 'bg-red-900'}`}>
                      {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover rounded-full" /> : student.nickname?.[0] || student.name[0]}
                    </div>
                    <div>
                      <p className={`font-medium ${isPresent ? 'text-white' : 'text-stone-300'}`}>{student.nickname || student.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-14 md:pl-0">
                    <div onClick={() => setAttendanceData(prev => ({ ...prev, [student.id]: prev[student.id] === 'present' ? 'absent' : 'present' }))} className={`px-4 py-1 rounded-full text-xs font-bold uppercase cursor-pointer ${isPresent ? 'bg-green-500 text-stone-900' : 'bg-stone-700 text-stone-400'}`}>
                      {isPresent ? 'Presente' : 'Ausente'}
                    </div>
                    {!isPresent && (
                      <input type="text" placeholder="Motivo da falta" className="flex-1 md:w-64 bg-stone-900 border border-stone-600 rounded px-3 py-1.5 text-sm text-white outline-none" value={justifications[student.id] || ''} onChange={(e) => setJustifications(prev => ({ ...prev, [student.id]: e.target.value }))} onClick={(e) => e.stopPropagation()} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* --- PROF VIEW: ALL STUDENTS --- */}
      {profView === 'all_students' && (
        <div className="bg-stone-800 rounded-3xl p-8 border border-stone-700/50 animate-fade-in text-left shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>

          <div className="relative z-10">
            <button onClick={() => setProfView('dashboard')} className="mb-6 text-stone-400 flex items-center gap-2 hover:text-white transition-all hover:-translate-x-1">
              <ArrowLeft size={16} /> Voltar ao Painel
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                  <Users className="text-indigo-500" size={32} />
                  Meus Alunos
                </h2>
                <p className="text-stone-400 text-sm">{myStudents.length} alunos vinculados ao seu perfil</p>
              </div>
              <div className="flex items-center gap-3 bg-stone-900 border border-stone-700 px-4 py-2 rounded-2xl">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <Video size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest">Total de Envios</p>
                  <p className="text-lg font-black text-white leading-none">
                    {homeTrainings.filter(ht => myStudents.some(s => s.id === ht.user_id)).length} Vídeos
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {myStudents.map(student => {
                const studentVideos = homeTrainings.filter(ht => ht.user_id === student.id);
                const studentGradesList = studentGrades.filter(g => g.student_id === student.id);
                const avgGrade = (studentGradesList.reduce((acc, curr) => acc + (typeof curr.numeric === 'number' ? curr.numeric : parseFloat(curr.numeric as any) || 0), 0) / (studentGradesList.length || 1)).toFixed(1);

                // Visual belt color calculation
                const getBeltColors = (beltName: string) => {
                  const b = (beltName || '').toLowerCase();
                  const [mainPart, ...rest] = b.split('ponta');
                  const pontaPart = rest.join('ponta');

                  const colorMap: Record<string, string> = {
                    'verde': '#22c55e',
                    'amarelo': '#FDD835',
                    'azul': '#0033CC',
                    'branco': '#ffffff',
                    'cinza': '#9ca3af',
                  };

                  let main = '#444';
                  let ponta = undefined;

                  if (mainPart.includes('verde, amarelo, azul e branco')) main = 'linear-gradient(to right, #22c55e, #FDD835, #0033CC, #ffffff)';
                  else if (mainPart.includes('amarelo e azul')) main = 'linear-gradient(to right, #FDD835, #0033CC)';
                  else if (mainPart.includes('verde e amarelo')) main = 'linear-gradient(to right, #22c55e, #FDD835)';
                  else if (mainPart.includes('verde e branco')) main = 'linear-gradient(to right, #22c55e, #ffffff)';
                  else if (mainPart.includes('amarelo e branco')) main = 'linear-gradient(to right, #FDD835, #ffffff)';
                  else if (mainPart.includes('azul e branco')) main = 'linear-gradient(to right, #0033CC, #ffffff)';
                  else if (mainPart.includes('cinza')) main = '#9ca3af';
                  else if (mainPart.includes('verde')) main = '#22c55e';
                  else if (mainPart.includes('amarelo')) main = '#FDD835';
                  else if (mainPart.includes('azul')) main = '#0033CC';
                  else if (mainPart.includes('branco')) main = '#ffffff';

                  if (pontaPart.includes('verde')) ponta = '#22c55e';
                  else if (pontaPart.includes('amarelo')) ponta = '#FDD835';
                  else if (pontaPart.includes('azul')) ponta = '#0033CC';
                  else if (pontaPart.includes('branco')) ponta = '#ffffff';

                  return { main, ponta };
                };

                const beltColors = getBeltColors(student.belt || "");

                return (
                  <div key={student.id} className="group bg-stone-900/40 hover:bg-stone-900/60 transition-all rounded-3xl border border-stone-700/50 hover:border-indigo-500/30 overflow-hidden shadow-xl">
                    <div className="p-6">
                      <div className="flex gap-5">
                        {/* Student Avatar/Photo */}
                        <div className="relative shrink-0">
                          <div className="w-20 h-20 rounded-2xl bg-stone-800 border-2 border-stone-700 overflow-hidden shadow-inner group-hover:border-indigo-500/50 transition-colors">
                            {student.photo_url ? (
                              <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-600 bg-stone-800">
                                <Users size={32} />
                              </div>
                            )}
                          </div>
                          {/* Online indicator or status */}
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-green-500 border-4 border-stone-900 flex items-center justify-center">
                            <Check size={10} className="text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="truncate">
                              <h3 className="text-xl font-black text-white truncate group-hover:text-indigo-400 transition-colors">
                                {student.nickname || student.name}
                              </h3>
                              <p className="text-stone-500 text-xs font-medium truncate uppercase tracking-widest">{student.name}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleWhatsApp(student.phone)}
                                className="p-2.5 bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all"
                                title="WhatsApp"
                              >
                                <MessageCircle size={18} />
                              </button>
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-10 px-4 rounded-xl shadow-lg shadow-indigo-500/20"
                                onClick={() => handleOpenEvaluation(student.id)}
                              >
                                <Award size={16} className="mr-2" /> Avaliar
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            {/* Belt Visual */}
                            <div className="bg-stone-950/40 p-3 rounded-2xl border border-stone-800/50">
                              <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1.5">Graduação</p>
                              <div className="flex items-center gap-2">
                                <div className="w-full h-2 rounded-full overflow-hidden flex border border-stone-800">
                                  <div className="h-full flex-1" style={{ background: beltColors.main }}></div>
                                  {beltColors.ponta && <div className="h-full w-4" style={{ backgroundColor: beltColors.ponta }}></div>}
                                </div>
                                <span className="text-[10px] font-bold text-stone-300 truncate">{student.belt || 'Sem Cordel'}</span>
                              </div>
                            </div>

                            {/* Next Eval Visual */}
                            <div className="bg-stone-950/40 p-3 rounded-2xl border border-stone-800/50">
                              <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1.5">Próxima Avaliação</p>
                              <div className="flex items-center gap-2 text-orange-400">
                                <Calendar size={12} />
                                <span className="text-xs font-bold">
                                  {student.nextEvaluationDate ? new Date(student.nextEvaluationDate).toLocaleDateString() : 'A definir'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-stone-800/50 pt-5 gap-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-0.5">Média</p>
                            <p className="text-lg font-black text-green-500 leading-none">{avgGrade}</p>
                          </div>
                          <div className="w-px h-8 bg-stone-800"></div>
                          <div className="text-center">
                            <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-0.5">Vídeos</p>
                            <p className="text-lg font-black text-purple-500 leading-none">{studentVideos.length}</p>
                          </div>
                        </div>

                        {student.graduationCost !== undefined && student.graduationCost > 0 && (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                            <DollarSign size={12} className="text-emerald-500" />
                            <span className="text-xs font-black text-emerald-400">R$ {student.graduationCost.toFixed(2).replace('.', ',')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable Activity Section */}
                    <div className="bg-stone-950/30 p-4 border-t border-stone-800/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-[10px] uppercase font-black text-stone-500 flex items-center gap-2">
                            <Video size={12} className="text-indigo-500" /> Últimos Vídeos
                          </h4>
                          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                            {studentVideos.length > 0 ? studentVideos.slice(0, 3).map((v: any) => (
                              <div key={v.id} className="flex items-center justify-between bg-stone-900/50 p-2 rounded-lg border border-stone-800">
                                <span className="text-[10px] text-stone-300 truncate w-24">{v.video_name}</span>
                                <button
                                  onClick={() => handleViewHomeTrainingVideo(v.video_url)}
                                  className="text-indigo-400 hover:text-white transition-colors"
                                >
                                  <PlayCircle size={14} />
                                </button>
                              </div>
                            )) : <p className="text-[10px] text-stone-600 italic">Nenhum vídeo</p>}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-[10px] uppercase font-black text-stone-500 flex items-center gap-2">
                            <Award size={12} className="text-green-500" /> Últimas Notas
                          </h4>
                          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                            {studentGradesList.length > 0 ? studentGradesList.slice(0, 3).map(g => (
                              <div key={g.id} className="flex items-center justify-between bg-stone-900/50 p-2 rounded-lg border border-stone-800">
                                <span className="text-[10px] text-stone-400 truncate w-20">
                                  {g.category === 'theory' ? 'Teo' : g.category === 'movement' ? 'Mov' : 'Mus'}
                                </span>
                                <span className="text-[10px] font-bold text-white bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
                                  {Number(g.numeric).toFixed(1)}
                                </span>
                              </div>
                            )) : <p className="text-[10px] text-stone-600 italic">Nenhuma nota</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {myStudents.length === 0 && (
                <div className="col-span-full text-center py-20 text-stone-500 bg-stone-900/30 rounded-3xl border-2 border-dashed border-stone-800 flex flex-col items-center justify-center animate-pulse">
                  <Users size={64} className="mb-4 opacity-20" />
                  <p className="text-lg font-bold uppercase tracking-widest opacity-50">Nenhum aluno encontrado vinculado a você.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PROF VIEW: GRADES / EVALUATION --- */}
      {profView === 'grades' && selectedStudentForGrades && (
        <div className="max-w-4xl mx-auto bg-stone-800 rounded-xl border border-stone-700 animate-fade-in p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Award className="text-yellow-500" /> Avaliar {myStudents.find(s => s.id === selectedStudentForGrades)?.nickname || 'Aluno'}
            </h2>
            <button onClick={() => setProfView('all_students')} className="text-stone-400 hover:text-white flex items-center gap-1 transition-colors">
              <ArrowLeft size={18} /> Voltar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* THEORY */}
            <div className="bg-stone-900 p-5 rounded-xl border border-stone-700 space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">Teórica</h3>
              <textarea className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white h-32 text-sm focus:border-yellow-500 outline-none" placeholder="Observações..." value={evalData.theory.written} onChange={e => setEvalData({ ...evalData, theory: { ...evalData.theory, written: e.target.value } })} />
              <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white text-xl font-bold text-center focus:border-yellow-500 outline-none" placeholder="0.0" value={evalData.theory.numeric} onChange={e => setEvalData({ ...evalData, theory: { ...evalData.theory, numeric: e.target.value } })} />
            </div>
            {/* MOVEMENT */}
            <div className="bg-stone-900 p-5 rounded-xl border border-stone-700 space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">Movimentação</h3>
              <textarea className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white h-32 text-sm focus:border-yellow-500 outline-none" placeholder="Observações..." value={evalData.movement.written} onChange={e => setEvalData({ ...evalData, movement: { ...evalData.movement, written: e.target.value } })} />
              <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white text-xl font-bold text-center focus:border-yellow-500 outline-none" placeholder="0.0" value={evalData.movement.numeric} onChange={e => setEvalData({ ...evalData, movement: { ...evalData.movement, numeric: e.target.value } })} />
            </div>
            {/* MUSICALITY */}
            <div className="bg-stone-900 p-5 rounded-xl border border-stone-700 space-y-4">
              <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">Musicalidade</h3>
              <textarea className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white h-32 text-sm focus:border-yellow-500 outline-none" placeholder="Observações..." value={evalData.musicality.written} onChange={e => setEvalData({ ...evalData, musicality: { ...evalData.musicality, written: e.target.value } })} />
              <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white text-xl font-bold text-center focus:border-yellow-500 outline-none" placeholder="0.0" value={evalData.musicality.numeric} onChange={e => setEvalData({ ...evalData, musicality: { ...evalData.musicality, numeric: e.target.value } })} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={handleSaveEvaluation} disabled={savingGrades} className="px-8 bg-yellow-600 hover:bg-yellow-500">
              {savingGrades ? 'Salvando...' : 'Salvar Avaliação'}
            </Button>
          </div>
        </div>
      )}

      {/* --- PROF VIEW: ASSIGNMENTS --- */}
      {profView === 'assignments' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between bg-stone-800 p-6 rounded-xl border border-stone-700">
            <div>
              <button onClick={() => setProfView('dashboard')} className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors">
                <ArrowLeft size={16} /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="text-blue-500" /> Trabalhos e Tarefas
              </h2>
            </div>
          </div>

          <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
            <h3 className="text-lg font-bold text-white mb-4">Passar Novo Trabalho</h3>
            <form onSubmit={handleAddAssignment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-stone-400 mb-1">Título do Trabalho</label>
                  <input
                    type="text"
                    required
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
                    placeholder="Ex: História da Capoeira"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1">Data de Entrega</label>
                  <input
                    type="date"
                    required
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="bg-stone-900 p-4 rounded-lg border border-stone-700">
                <label className="block text-sm text-stone-300 font-bold mb-3">Público Alvo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="assign_target"
                      checked={selectedAssignmentTarget === 'mine'}
                      onChange={() => setSelectedAssignmentTarget('mine')}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className={`text-sm ${selectedAssignmentTarget === 'mine' ? 'text-blue-400 font-bold' : 'text-stone-400'}`}>Meus Alunos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-not-allowed group opacity-50" title="Apenas administradores podem passar trabalhos para todo o grupo">
                    <input
                      type="radio"
                      name="assign_target"
                      disabled
                      checked={selectedAssignmentTarget === 'all'}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-stone-500">Todos do Grupo (Bloqueado)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm text-stone-400 mb-1">Descrição / Instruções</label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white h-24 outline-none focus:border-blue-500"
                  placeholder="Detalhes sobre o que o aluno deve fazer..."
                />
              </div>

              <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pt-2">
                <div className="w-full sm:max-w-xs">
                  <label className="text-[10px] text-stone-500 uppercase font-black mb-1 block">Anexar Material (Opcional)</label>
                  <input
                    type="file"
                    onChange={(e) => setNewAssignment({ ...newAssignment, file: e.target.files?.[0] || null })}
                    className="w-full bg-stone-900 border border-stone-600 rounded px-2 py-1.5 text-white text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-black file:bg-stone-700 file:text-stone-300 hover:file:bg-stone-600 cursor-pointer"
                  />
                  {newAssignment.file && <p className="text-[10px] text-green-500 mt-1 font-bold italic">✓ Selecionado: {newAssignment.file.name}</p>}
                </div>
                <Button type="submit" className="w-full sm:w-auto h-10 px-8">
                  <PlusCircle size={18} className="mr-2" /> Criar Trabalho
                </Button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* List Assignments Logic Simplified */}
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
              <h3 className="text-lg font-bold text-white mb-4">Meus Trabalhos Ativos</h3>
              <div className="space-y-4">
                {profAssignments.map(assign => (
                  <div key={assign.id} className={`bg-stone-900 p-4 rounded-lg border-l-4 ${assign.status === 'completed' ? 'border-green-500' : 'border-blue-500'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-white">{assign.title}</h4>
                        <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest">
                          Aluno: {allUsersProfiles.find(u => u.id === assign.student_id)?.nickname || allUsersProfiles.find(u => u.id === assign.student_id)?.name || 'Todos'}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${assign.status === 'completed' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'}`}>
                        {assign.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-sm text-stone-400 mb-3">{assign.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {assign.attachment_url && (
                        <button
                          onClick={() => handleViewAssignmentSource(assign.attachment_url!)}
                          className="text-[10px] bg-stone-800 text-stone-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-stone-700 transition-colors"
                        >
                          <Paperclip size={10} /> Material
                        </button>
                      )}
                      {assign.submission_url && (
                        <button
                          onClick={() => handleViewAssignment(assign.submission_url!, assign.submission_name || 'Trabalho')}
                          className="text-[10px] bg-green-900/20 text-green-400 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-900/40 transition-colors border border-green-500/20"
                        >
                          <CheckCircle size={10} /> Ver Resposta
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] text-stone-600 block mt-2 pt-2 border-t border-stone-800">Vence: {assign.due_date}</span>
                  </div>
                ))}
                {profAssignments.length === 0 && <p className="text-stone-500 text-sm">Nenhum trabalho criado.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PROF VIEW: MUSIC --- */}
      {/* --- PROF VIEW: MUSIC --- */}
      {profView === 'music_manager' && (
        <div className="bg-stone-800 rounded-2xl p-8 border border-stone-700 animate-fade-in shadow-2xl relative overflow-hidden">
          <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2 hover:text-white transition-colors relative z-20"><ArrowLeft size={16} /> Voltar ao Painel</button>

          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-yellow-500">
                <Music size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Acervo Musical</h2>
                <p className="text-stone-400 text-sm">Gerencie o repertório da aula</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-700/50 sticky top-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <PlusCircle size={20} className="text-yellow-500" />
                    Nova Música
                  </h3>
                  <form onSubmit={handleSubmitMusic} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-stone-500 ml-1 tracking-widest">Título da Obra</label>
                      <input type="text" placeholder="Ex: Capoeira é Luta" value={musicForm.title} onChange={e => setMusicForm({ ...musicForm, title: e.target.value })} className="w-full bg-stone-800 border-2 border-stone-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all placeholder:text-stone-600 font-medium" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-stone-500 ml-1 tracking-widest">Categoria</label>
                      <input type="text" placeholder="Ex: Regional, Angola, Maculelê" value={musicForm.category} onChange={e => setMusicForm({ ...musicForm, category: e.target.value })} className="w-full bg-stone-800 border-2 border-stone-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all placeholder:text-stone-600 font-medium" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-stone-500 ml-1 tracking-widest">Letra da Música</label>
                      <textarea placeholder="Cole a letra completa aqui..." value={musicForm.lyrics} onChange={e => setMusicForm({ ...musicForm, lyrics: e.target.value })} className="w-full bg-stone-800 border-2 border-stone-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all placeholder:text-stone-600 h-40 font-medium custom-scrollbar" />
                    </div>

                    <Button fullWidth type="submit" className="h-14 font-black uppercase tracking-tighter text-lg shadow-xl shadow-yellow-500/10 hover:shadow-yellow-500/20">
                      Lançar no Acervo
                    </Button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity size={20} className="text-yellow-500" />
                    Músicas Registradas
                  </h3>
                  <span className="text-[10px] font-black bg-stone-900 border border-stone-700 px-3 py-1 rounded-full text-stone-400">
                    {musicList.length} ITENS
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar content-start">
                  {musicList.length > 0 ? (
                    musicList.map(m => (
                      <div key={m.id} className="bg-stone-900/80 backdrop-blur-sm p-5 rounded-2xl border-2 border-stone-800 hover:border-yellow-500/30 transition-all group flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="max-w-[80%]">
                              <p className="text-white font-black leading-tight group-hover:text-yellow-400 transition-colors">{m.title}</p>
                              <span className="text-[9px] font-black bg-stone-800 text-stone-500 px-2 py-0.5 rounded uppercase tracking-widest border border-stone-700 inline-block mt-1">
                                {m.category}
                              </span>
                            </div>
                            {/* Audio player removed */}
                          </div>
                          {m.lyrics && (
                            <div className="mt-2 p-3 bg-black/40 rounded-xl border border-stone-800 group-hover:border-stone-700 transition-all">
                              <p className="text-stone-400 text-[11px] leading-relaxed whitespace-pre-line line-clamp-4 font-medium italic">
                                {m.lyrics}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-stone-800">
                          <span className="text-[9px] font-bold text-stone-600 flex items-center gap-1">
                            <Clock size={10} /> {new Date(m.created_at || new Date().toISOString()).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1.5 text-stone-600 hover:text-red-500 transition-colors"
                              title="Remover"
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja remover esta música do acervo?')) {
                                  onDeleteMusic(m.id);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 bg-stone-900/30 rounded-3xl border-2 border-dashed border-stone-800 flex flex-col items-center justify-center">
                      <Music size={48} className="text-stone-700 mb-4 animate-pulse" />
                      <p className="text-stone-500 font-bold uppercase tracking-widest text-sm">Nenhuma música no acervo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PROF VIEW: UNIFORM --- */}
      {profView === 'uniform' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <Button variant="ghost" className="mb-4 text-stone-400 p-0 hover:text-white" onClick={() => setProfView('dashboard')}>
            <ArrowLeft size={16} className="mr-2" />
            Voltar ao Painel
          </Button>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-stone-900 p-6 rounded-xl border border-stone-700 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <PlusCircle className="text-emerald-500" /> Fazer Novo Pedido
              </h3>
              <form onSubmit={handleOrderUniform} className="space-y-4">
                <div>
                  <label htmlFor="item" className="block text-sm text-stone-400 mb-1">Item</label>
                  <select
                    id="item"
                    value={orderForm.item}
                    onChange={e => setOrderForm({ ...orderForm, item: e.target.value })}
                    className="w-full bg-stone-800 border border-stone-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="combo">Combo (Blusa + Calça)</option>
                    <option value="shirt">Blusa Oficial</option>
                    <option value="pants_roda">Calça de Roda</option>
                    <option value="pants_train">Calça de Treino</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(orderForm.item === 'shirt' || orderForm.item === 'combo') && (
                    <div>
                      <label htmlFor="shirtSize" className="block text-sm text-stone-400 mb-1">Tamanho Blusa</label>
                      <input
                        id="shirtSize"
                        type="text"
                        placeholder="Ex: P, M, G..."
                        value={orderForm.shirtSize}
                        onChange={(e) => setOrderForm({ ...orderForm, shirtSize: e.target.value })}
                        className="w-full bg-stone-800 border border-stone-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                        required={orderForm.item === 'shirt' || orderForm.item === 'combo'}
                      />
                    </div>
                  )}
                  {(orderForm.item === 'pants_roda' || orderForm.item === 'pants_train' || orderForm.item === 'combo') && (
                    <div>
                      <label htmlFor="pantsSize" className="block text-sm text-stone-400 mb-1">Tamanho Calça</label>
                      <input
                        id="pantsSize"
                        type="text"
                        placeholder="Ex: 38, 40..."
                        value={orderForm.pantsSize}
                        onChange={(e) => setOrderForm({ ...orderForm, pantsSize: e.target.value })}
                        className="w-full bg-stone-800 border border-stone-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500"
                        required={orderForm.item === 'pants_roda' || orderForm.item === 'pants_train' || orderForm.item === 'combo'}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center bg-stone-800 p-4 rounded-xl border border-stone-700 mt-2">
                  <span className="text-stone-400 text-sm font-bold">Total a pagar:</span>
                  <span className="text-xl font-black text-white">R$ {getCurrentPrice().toFixed(2).replace('.', ',')}</span>
                </div>
                <Button fullWidth type="submit" className="h-12 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20">
                  <ShoppingBag size={18} className="mr-2" /> Finalizar Pedido
                </Button>
              </form>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="text-emerald-400" /> Meus Pedidos
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {myOrders.length > 0 ? (
                  myOrders.map(order => (
                    <div key={order.id} className={`bg-stone-900 p-4 rounded-xl border-l-4 ${order.status !== 'pending' ? 'border-green-500' : 'border-yellow-500'} flex flex-col gap-3 shadow-lg`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white">{order.item}</p>
                          <p className="text-stone-500 text-xs">R$ {order.total.toFixed(2).replace('.', ',')} - {order.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.status === 'pending' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-[10px] font-black uppercase border border-yellow-900/50">Pendente</span>}
                          {order.status === 'ready' && <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-[10px] font-black uppercase border border-blue-900/50">Pago/Pronto</span>}
                          {order.status === 'delivered' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-[10px] font-black uppercase border border-green-900/50">Entregue</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {order.status === 'pending' && !order.proof_url && (
                          <>
                            <Button
                              variant="secondary"
                              className="text-[10px] h-auto px-2 py-1 flex-1 bg-stone-800 border-stone-700"
                              onClick={() => {
                                setSelectedOrderToProof(order);
                                // Delay for mobile PWA
                                setTimeout(() => uniformFileInputRef.current?.click(), 100);
                              }}
                              disabled={uploadingUniformProof}
                            >
                              {uploadingUniformProof && selectedOrderToProof?.id === order.id ? 'Enviando...' : <><FileUp size={12} className="mr-1" /> Pagar/Enviar Comprovante</>}
                            </Button>
                            <input
                              type="file"
                              accept="image/*, application/pdf"
                              className="hidden"
                              ref={uniformFileInputRef}
                              onChange={handleFileChangeForUniformProof}
                              onClick={(e) => { e.stopPropagation(); }}
                              disabled={uploadingUniformProof}
                            />
                          </>
                        )}
                        {order.status === 'pending' && order.proof_url && (
                          <span className="text-yellow-400 text-[10px] flex items-center gap-1 font-bold italic">
                            <Clock size={12} /> Comprovante em análise
                          </span>
                        )}
                        {order.proof_url && (
                          <button
                            onClick={() => handleViewPaymentProof(order.proof_url!, order.item + ' Comprovante')}
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-medium bg-blue-400/5 px-2 py-1 rounded border border-blue-400/20"
                          >
                            <Eye size={12} /> Ver Comprovante
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 text-sm italic py-8 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800">Nenhum pedido registrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PROF VIEW: FINANCIAL (Self) --- */}
      {profView === 'financial' && (
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
          <Button variant="ghost" className="mb-6 text-stone-400 p-0 hover:text-white" onClick={() => setProfView('dashboard')}>
            <ArrowLeft size={16} className="mr-2" />
            Voltar ao Painel
          </Button>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Mensalidades Card */}
            <div className="space-y-6">
              <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-700 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Wallet className="text-orange-500" />
                  Minhas Mensalidades
                </h3>

                <div className="mb-6 space-y-3">
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={handleCopyPix}
                    className={`h-12 border-2 transition-all ${pixCopied ? "border-green-500 text-green-500 bg-green-500/5" : "border-orange-500/30 text-orange-400 hover:border-orange-500 hover:bg-orange-500/5"}`}
                  >
                    {pixCopied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                    {pixCopied ? 'Chave Copiada!' : 'Copiar PIX Mensalidade'}
                  </Button>
                  <p className="text-[10px] text-stone-500 text-center font-bold tracking-widest uppercase">Chave: soufilhodofogo@gmail.com</p>
                </div>

                <div className="space-y-3">
                  {myMonthlyPayments.length > 0 ? (
                    myMonthlyPayments.map(payment => (
                      <div key={payment.id} className={`bg-stone-900 p-4 rounded-xl border-l-4 ${payment.status === 'paid' ? 'border-green-500' : 'border-yellow-500'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md`}>
                        <div>
                          <p className="font-bold text-white text-sm uppercase tracking-tight">{payment.month}</p>
                          <p className="text-stone-500 text-xs font-mono">R$ {payment.amount?.toFixed(2).replace('.', ',')} • Venc: {payment.due_date?.split('-').reverse().join('/')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {payment.status === 'paid' ? (
                            <span className="bg-green-500/10 text-green-400 text-[10px] font-black px-2 py-1 rounded border border-green-500/20 uppercase">Pago</span>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                className="text-[10px] h-auto px-2 py-1 bg-stone-800 border-stone-700"
                                onClick={() => {
                                  setSelectedPaymentToProof(payment);
                                  // Delay for mobile PWA
                                  setTimeout(() => fileInputRef.current?.click(), 100);
                                }}
                                disabled={uploadingPaymentProof}
                              >
                                {uploadingPaymentProof && selectedPaymentToProof?.id === payment.id ? 'Enviando...' : <><FileUp size={12} className="mr-1" /> Enviar Comprovante</>}
                              </Button>
                              <input
                                type="file"
                                accept="image/*, application/pdf"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChangeForPaymentProof}
                                onClick={(e) => { e.stopPropagation(); }}
                                disabled={uploadingPaymentProof}
                              />
                            </>
                          )}
                          {payment.proof_url && (
                            <button
                              onClick={() => handleViewPaymentProof(payment.proof_url!, payment.proof_name || 'Comprovante')}
                              className="text-blue-400 hover:text-blue-300 text-xs p-1 rounded hover:bg-blue-400/5 transition-all"
                              title="Ver Comprovante"
                            >
                              <Eye size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-500 text-sm italic text-center py-6 bg-stone-800/50 rounded-xl border border-dashed border-stone-700">Nenhuma mensalidade registrada.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Eventos e Avaliações Card */}
            <div className="space-y-6">
              <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-700 shadow-xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <DollarSign className="text-yellow-500" />
                  Eventos e Avaliações
                </h3>

                <Button
                  fullWidth
                  variant="outline"
                  onClick={handleCopyCostPix}
                  className={`h-12 border-2 transition-all mb-6 ${costPixCopied ? "border-green-500 text-green-500 bg-green-500/5" : "border-yellow-500/30 text-yellow-400 hover:border-yellow-500 hover:bg-yellow-500/5"}`}
                >
                  {costPixCopied ? <Check size={18} className="mr-2" /> : <Copy size={18} className="mr-2" />}
                  {costPixCopied ? 'Chave Copiada!' : 'PIX Eventos/Avaliação'}
                </Button>

                <div className="space-y-6">
                  {/* Avaliações Section */}
                  <div>
                    <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">Avaliações de Cordel</h4>
                    <div className="space-y-3">
                      {myEvaluations.length > 0 ? (
                        myEvaluations.map(payment => (
                          <div key={payment.id} className="bg-stone-900/80 p-4 rounded-xl border border-stone-800 flex justify-between items-center shadow-sm">
                            <div>
                              <p className="text-sm font-bold text-white">{payment.month}</p>
                              <p className="text-[10px] text-stone-500 font-mono">VALOR: R$ {payment.amount?.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {payment.status === 'paid' ? (
                                <CheckCircle className="text-green-500" size={20} />
                              ) : (
                                <button
                                  onClick={() => { setSelectedPaymentToProof(payment); fileInputRef.current?.click(); }}
                                  className="text-[10px] font-black uppercase text-yellow-500 hover:text-yellow-400 bg-yellow-500/5 px-2 py-1 rounded border border-yellow-500/20"
                                >
                                  {payment.proof_url ? 'Alterar Comprovante' : 'Pagar Agora'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-stone-500 text-[10px] italic ml-1">Nenhuma avaliação registrada.</p>
                      )}
                    </div>
                  </div>

                  {/* EventRegistrations Section */}
                  <div>
                    <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-3 ml-1">Eventos Inscritos</h4>
                    <div className="space-y-3">
                      {myEventRegistrations.length > 0 ? (
                        myEventRegistrations.map(reg => (
                          <div key={reg.id} className="bg-stone-900/80 p-4 rounded-xl border border-stone-800 flex justify-between items-center shadow-sm">
                            <div>
                              <p className="text-sm font-bold text-white truncate max-w-[150px]">{reg.event_title}</p>
                              <p className="text-[10px] text-stone-500 font-mono uppercase">{reg.status === 'paid' ? 'Inscrição Confirmada' : 'Aguardando Pagamento'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {reg.status === 'paid' ? (
                                <div className="bg-green-500/20 p-1 rounded-full"><Check className="text-green-500" size={14} /></div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedEventRegToProof(reg);
                                    // Delay for mobile PWA
                                    setTimeout(() => eventFileInputRef.current?.click(), 100);
                                  }}
                                  className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 bg-orange-500/5 px-2 py-1 rounded border border-orange-500/20"
                                >
                                  {reg.proof_url ? 'Novo Comprovante' : 'Enviar PIX'}
                                </button>
                              )}
                              <input type="file" ref={eventFileInputRef} className="hidden" onChange={handleFileChangeForEventProof} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-stone-500 text-[10px] italic ml-1">Nenhuma inscrição em eventos.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DEFAULT DASHBOARD --- */
        profView === 'dashboard' && (
          <div className="space-y-6">

            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 relative mb-6">
              <h3 className="xl font-bold text-white mb-4 flex items-center gap-2"><Camera className="text-purple-500" /> Registrar Aula</h3>
              <div className="border-2 border-dashed border-stone-600 rounded-lg p-6 flex flex-col items-center justify-center bg-stone-900/50">
                {classPhoto ? (
                  <div className="relative w-full h-32 rounded overflow-hidden">
                    <img src={classPhoto} className="w-full h-full object-cover" />
                    <button onClick={() => setClassPhoto(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="cursor-pointer flex flex-col items-center"
                    onClick={() => {
                      setTimeout(() => {
                        const input = document.getElementById('class-photo-input');
                        if (input) (input as HTMLInputElement).click();
                      }, 100);
                    }}
                  >
                    <Camera size={32} className="text-stone-500 mb-2" />
                    <span className="text-purple-400 font-bold">Enviar Foto</span>
                    <input
                      id="class-photo-input"
                      type="file"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
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
              <Button onClick={() => setProfView('financial')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-900 to-stone-700 hover:from-stone-800 hover:to-stone-600 border border-stone-500/30">
                <Wallet size={28} className="text-stone-300" />
                <span className="text-sm font-bold">Financeiro</span>
                <span className="text-xs text-stone-200">Minha Conta</span>
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                <h3 className="text-xl font-bold text-white mb-4">Minhas Aulas (Pendentes)</h3>
                <div className="space-y-4">
                  {myClasses.filter(cls => cls.status !== 'completed').map(cls => {
                    const now = new Date();
                    const classDate = new Date(`${cls.date}T${cls.time}`);
                    // Window: from class start until 30 minutes later
                    const classEndTime = new Date(classDate.getTime() + 30 * 60 * 1000);
                    const isWithinClassWindow = now >= classDate && now <= classEndTime;

                    return (
                      <div key={cls.id} className="bg-stone-900 p-4 rounded border-l-2 border-purple-500">
                        <div className="flex justify-between items-start mb-2">
                          <div><p className="font-bold text-white">{cls.title}</p><p className="text-stone-500 text-sm">{cls.date} - {cls.time} - {cls.location}</p></div>
                        </div>
                        {isWithinClassWindow ? (
                          <Button fullWidth onClick={() => handleOpenAttendance(cls.id)}>
                            <CalendarCheck size={16} className="mr-2" /> Realizar Chamada
                          </Button>
                        ) : (
                          <div className="text-xs text-stone-500 text-center py-2 bg-stone-800 rounded">
                            <Clock size={14} className="inline mr-1" />
                            {classDate > now
                              ? `Chamada disponível às ${cls.time}`
                              : 'Janela de chamada encerrada'}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

                {/* Attendance History */}
                <div className="mt-6 border-t border-stone-700 pt-6">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <CalendarCheck size={16} className="text-stone-400" /> Histórico de Chamadas
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {myClasses.filter(cls => cls.status === 'completed' || (new Date(cls.date + 'T' + cls.time) < new Date() && cls.status !== 'cancelled')).length > 0 ? (
                      myClasses.filter(cls => cls.status === 'completed' || (new Date(cls.date + 'T' + cls.time) < new Date() && cls.status !== 'cancelled'))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10).map(cls => {
                          const isCompleted = cls.status === 'completed';
                          const isExpanded = expandedSessionId === cls.id;
                          const sessionAttendance = attendanceHistory.filter(h => h.session_id === cls.id);

                          return (
                            <div key={cls.id} className="space-y-1">
                              <div
                                onClick={() => isCompleted && setExpandedSessionId(isExpanded ? null : cls.id)}
                                className={`flex justify-between items-center bg-stone-900/40 p-2 rounded text-xs border-l-2 ${isCompleted ? 'border-green-500 hover:bg-stone-900/60 cursor-pointer' : 'border-stone-600'} transition-all`}
                              >
                                <div className="flex-1">
                                  <span className="text-stone-300 font-bold block">{cls.title}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-stone-500 font-mono">
                                      {cls.date.split('-').reverse().join('/')}
                                    </span>
                                    {!isCompleted && <span className="text-orange-400 text-[10px] font-bold">(Pendente)</span>}
                                    {isCompleted && sessionAttendance.length > 0 && (
                                      <span className="text-green-500/70 text-[10px]">{sessionAttendance.length} registros</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isCompleted ? (
                                    <>
                                      <Check size={12} className="text-green-500" />
                                      {isExpanded ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
                                    </>
                                  ) : (
                                    <Clock size={12} className="text-stone-500" />
                                  )}
                                </div>
                              </div>

                              {isExpanded && isCompleted && (
                                <div className="ml-2 pl-2 border-l border-stone-700 space-y-1 pb-2 animate-fade-in">
                                  {sessionAttendance.length > 0 ? (
                                    sessionAttendance.map(record => (
                                      <div key={record.id} className="bg-stone-900/20 p-2 rounded flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                          <span className="text-stone-400 font-medium">{record.student_name}</span>
                                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${record.status === 'present' ? 'bg-green-900/30 text-green-500' :
                                            record.status === 'justified' ? 'bg-blue-900/30 text-blue-400' :
                                              'bg-red-900/30 text-red-500'
                                            }`}>
                                            {record.status === 'present' ? 'Presente' : record.status === 'justified' ? 'Justificado' : 'Ausente'}
                                          </span>
                                        </div>
                                        {record.status === 'justified' && record.justification && (
                                          <p className="text-[10px] text-stone-500 italic flex items-start gap-1">
                                            <MessageCircle size={10} className="mt-0.5" />
                                            "{record.justification}"
                                          </p>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-[10px] text-stone-600 italic p-2">Dados da chamada não carregados ou indisponíveis.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-stone-500 text-[10px] italic">Nenhuma chamada realizada.</p>
                    )}
                  </div>
                </div>

                {/* Evaluation History */}
                <div className="mt-4 border-t border-stone-700 pt-4">
                  <h4 className="text-sm font-bold text-white mb-3">Histórico de Avaliações</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {studentGrades.filter(g => myStudents.some(s => s.id === g.student_id)).length > 0 ? (
                      studentGrades.filter(g => myStudents.some(s => s.id === g.student_id))
                        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                        .slice(0, 5).map(g => (
                          <div key={g.id} className="flex justify-between items-center bg-stone-900/30 p-2 rounded text-[10px] border-l-2 border-green-900/50">
                            <div className="flex-1">
                              <p className="text-stone-200 font-bold">{myStudents.find(s => s.id === g.student_id)?.nickname || 'Aluno'}</p>
                              <p className="text-stone-500">{g.category === 'theory' ? 'Teórica' : g.category === 'movement' ? 'Movimentação' : 'Musicalidade'}</p>
                            </div>
                            <span className="text-green-400 font-black ml-2">{Number(g.numeric).toFixed(1)}</span>
                          </div>
                        ))
                    ) : (
                      <p className="text-stone-500 text-[10px] italic">Sem avaliações recentes.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Atalhos dos Alunos</h4>
                  {myStudents.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-2 bg-stone-900 rounded">
                      <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div className="flex-1"><p className="text-white text-sm font-bold">{s.nickname || s.name}</p></div>
                      <Button variant="secondary" className="text-xs h-7 px-2" onClick={() => { setSelectedStudentForGrades(s.id); setProfView('grades'); }}>Avaliar</Button>
                    </div>
                  ))}
                </div>

                <button onClick={() => setProfView('all_students')} className="w-full text-center text-stone-500 text-[10px] mt-4 hover:text-white transition-colors">Ver todos os alunos</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal: Atribuir Trabalho a Aluno Específico */}
      {
        showAssignToStudentModal && selectedAssignmentToAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-stone-900 border border-stone-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6">
              <h3 className="text-xl font-bold text-white mb-2">Atribuir a Aluno</h3>
              <p className="text-stone-400 text-sm mb-6">Trabalho: <span className="text-blue-400 font-semibold">{selectedAssignmentToAssign.title}</span></p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-stone-400 mb-2">Selecione o Aluno</label>
                  <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {allUsersProfiles.filter(u => u.role === 'aluno').map(student => (
                      <label key={student.id} className="flex items-center gap-3 p-3 rounded-lg bg-stone-800 border border-stone-700 hover:border-blue-500/50 cursor-pointer transition-colors group">
                        <input
                          type="radio"
                          name="student_select"
                          className="w-4 h-4 accent-blue-500"
                          checked={selectedStudentForAssignment === student.id}
                          onChange={() => setSelectedStudentForAssignment(student.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{student.nickname || student.name}</p>
                          <p className="text-[10px] text-stone-500">{student.professorName || 'Sem professor'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAssignToStudentModal(false);
                      setSelectedAssignmentToAssign(null);
                      setSelectedStudentForAssignment('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-500"
                    disabled={!selectedStudentForAssignment}
                    onClick={async () => {
                      const payload: AssignmentType = {
                        ...selectedAssignmentToAssign,
                        student_id: selectedStudentForAssignment,
                      };
                      await onUpdateAssignment(payload);
                      setShowAssignToStudentModal(false);
                      setSelectedAssignmentToAssign(null);
                      setSelectedStudentForAssignment('');
                      alert(`Trabalho atribuído com sucesso!`);
                    }}
                  >
                    Confirmar Transferência
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};
