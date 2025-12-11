import React, { useState, useEffect, useCallback } from 'react';
import { User, GroupEvent, PaymentRecord, ProfessorClassData, AdminNotification, MusicItem, UserRole, UniformOrder, ALL_BELTS, HomeTraining, SchoolReport, Assignment } from '../types';
import { Shield, Users, Bell, DollarSign, CalendarPlus, Plus, PlusCircle, CheckCircle, AlertCircle, Clock, GraduationCap, BookOpen, ChevronDown, ChevronUp, Trash2, Edit2, X, Save, Activity, MessageCircle, ArrowLeft, CalendarCheck, Camera, FileWarning, Info, Mic2, Music, Paperclip, Search, Shirt, ShoppingBag, ThumbsDown, ThumbsUp, UploadCloud, MapPin, Wallet, Check, Calendar, Settings, UserPlus, Mail, Phone, Lock, Package, FileText, Video, PlayCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/components/SessionContextProvider'; // Import useSession

interface Props {
  user: User;
  onAddEvent: (event: Omit<GroupEvent, 'id' | 'created_at'>) => void;
  onEditEvent: (event: GroupEvent) => void;
  onCancelEvent: (eventId: string) => void;
  events: GroupEvent[];
  notifications?: AdminNotification[];
  // Props for the "Professor Mode" of the Admin
  musicList?: MusicItem[];
  onAddMusic?: (music: MusicItem) => void;
  onNotifyAdmin?: (action: string, user: User) => void;
  onUpdateProfile: (data: Partial<User>) => void;
  // Uniforms props
  uniformOrders: UniformOrder[];
  onUpdateOrderStatus: (orderId: string, status: 'pending' | 'ready' | 'delivered') => void;
  // New props for student details
  schoolReports: SchoolReport[];
  assignments: Assignment[];
  homeTrainings: HomeTraining[];
  monthlyPayments: PaymentRecord[]; // Now receiving from App.tsx
  onAddPaymentRecord: (newPayment: Omit<PaymentRecord, 'id' | 'created_at'>) => Promise<void>;
  onUpdatePaymentRecord: (updatedPayment: PaymentRecord) => Promise<void>;
}

// --- MOCK DATA FOR ADMIN (GLOBAL) ---
// Removed INITIAL_PAYMENTS as we will use the prop monthlyPayments

const INITIAL_PROFESSORS_DATA: ProfessorClassData[] = [
  {
    professorId: 'p1',
    professorName: 'Vicente "Anu Branco"',
    phone: '5511999999999',
    currentContent: 'Sequência de Bimba (1-4), Movimentação de Angola básica e Toques de Berimbau (São Bento Grande).',
    students: [
      { studentId: 's1', studentName: 'João "Gafanhoto"', attendanceRate: 92, technicalGrade: 8.5, musicalityGrade: 7.0, lastEvaluation: 'Bom desenvolvimento na ginga', graduationCost: 0, phone: '5511999999999' },
      { studentId: 's2', studentName: 'Pedro "Ouriço"', attendanceRate: 75, technicalGrade: 6.5, musicalityGrade: 8.0, lastEvaluation: 'Precisa melhorar a flexibilidade', graduationCost: 0, phone: '5511988888888' },
    ]
  },
  {
    professorId: 'p2',
    professorName: 'Jefferson "Zeus"',
    phone: '5511988888888',
    currentContent: 'Acrobacias intermediárias (Macaco, Au sem mão), Jogo de Iúna e Improvisação.',
    students: [
      { studentId: 's3', studentName: 'Maria "Vespa"', attendanceRate: 100, technicalGrade: 9.5, musicalityGrade: 9.0, lastEvaluation: 'Pronta para troca de corda', graduationCost: 0, phone: '5511977777777' },
      { studentId: 's4', studentName: 'Lucas "Sombra"', attendanceRate: 85, technicalGrade: 8.0, musicalityGrade: 6.5, lastEvaluation: 'Focar mais nos instrumentos', graduationCost: 0, phone: '5511966666666' },
    ]
  },
];

// --- MOCK DATA FOR PROFESSOR MODE (Admin's own classes) ---
const INITIAL_MY_CLASSES = [
  { id: 100, title: 'Treino Avançado - Graduados', time: 'Hoje, 20:30', location: 'Sede' },
  { id: 101, title: 'Roda de Mestres', time: 'Sábado, 15:00', location: 'Centro Cultural' }
];

const UNIFORM_PRICES = {
    shirt: 30,
    pants_roda: 80,
    pants_train: 80,
    combo: 110
};

type Tab = 'overview' | 'finance' | 'pedagogy' | 'my_classes' | 'users' | 'student_details';
type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager';

export const DashboardAdmin: React.FC<Props> = ({ 
    user, 
    onAddEvent, 
    onEditEvent, 
    onCancelEvent, 
    events, 
    notifications = [],
    musicList = [],
    onAddMusic = (_music: MusicItem) => {},
    onNotifyAdmin = (_action: string, _user: User) => {},
    onUpdateProfile,
    uniformOrders,
    onUpdateOrderStatus,
    schoolReports, // New prop
    assignments, // New prop
    homeTrainings, // New prop
    monthlyPayments, // Use prop for payments
    onAddPaymentRecord,
    onUpdatePaymentRecord,
}) => {
  const { session } = useSession(); // Get session from context
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eventFormData, setEventFormData] = useState({ title: '', date: '', description: '', price: '' });
  
  // Finance State
  // const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS); // Removed, use monthlyPayments prop
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [showBeltConfig, setShowBeltConfig] = useState(false);
  const [beltPrices, setBeltPrices] = useState<Record<string, number>>(() => {
      // Initialize with some default values mock
      const defaults: Record<string, number> = {};
      ALL_BELTS.forEach(b => defaults[b] = 0);
      defaults["Cordel Cinza"] = 120;
      defaults["Cordel Verde"] = 150;
      return defaults;
  });

  // Pedagogy State
  const [professorsData, setProfessorsData] = useState<ProfessorClassData[]>(INITIAL_PROFESSORS_DATA);
  const [expandedProfessor, setExpandedProfessor] = useState<string | null>(null);
  // Removed editingGradCost and handleSaveGradCost from here as they will be handled in Users tab
  // const [editingGradCost, setEditingGradCost] = useState<{studentId: string, cost: string} | null>(null);

  // Users Management State
  const [managedUsers, setManagedUsers] = useState<User[]>([]); // Initialize empty, will fetch from Supabase
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userForm, setUserForm] = useState({
      name: '',
      nickname: '',
      email: '',
      role: 'aluno' as UserRole,
      belt: ALL_BELTS[0],
      phone: '',
      professorName: '',
      birthDate: ''
  });
  // State for inline graduation cost editing
  const [editingGradCostId, setEditingGradCostId] = useState<string | null>(null);
  const [editingGradCostValue, setEditingGradCostValue] = useState<string>('');


  // --- PROFESSOR MODE STATE ---
  const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
  const [myClasses, setMyClasses] = useState(INITIAL_MY_CLASSES);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [confirmedClasses, setConfirmedClasses] = useState<number[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [classPhoto, setClassPhoto] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  
  // Evaluation State
  const [selectedStudentForEval, setSelectedStudentForEval] = useState<string | null>(null);
  const [evalData, setEvalData] = useState({ positive: '', negative: '' });

  // Assignments State (for Professor Mode)
  const [profModeAssignments, setProfModeAssignments] = useState<Assignment[]>([]); // Will be filtered from global assignments
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '' });

  // Uniform State (for Professor Mode)
  const [myOrders, setMyOrders] = useState<UniformOrder[]>([]);
  const [orderForm, setOrderForm] = useState({ item: 'combo', shirtSize: '', pantsSize: '' });
  const [costPixCopied, setCostPixCopied] = useState(false);

  // Music State (for Professor Mode)
  const [musicForm, setMusicForm] = useState({ title: '', category: '', lyrics: '', file: null as File | null });
  const [uploadingMusicFile, setUploadingMusicFile] = useState(false);
  
  // New Class Form State (for Professor Mode)
  const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '', adminSuggestion: '' });

  // Student Details Tab State
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [studentDetailsSearch, setStudentDetailsSearch] = useState('');

  // --- SUPABASE USER MANAGEMENT ---
  const fetchManagedUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, nickname, avatar_url, belt, belt_color, professor_name, birth_date, graduation_cost, phone, role'); // Explicitly select all fields
    if (error) {
      console.error('Error fetching managed users:', error);
      // Optionally show a toast notification
    } else {
      const fetchedUsers: User[] = data.map(profile => {
        return {
          id: profile.id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Usuário',
          nickname: profile.nickname || undefined,
          email: session?.user.email || '', // Use session email if profile doesn't have it
          role: profile.role as UserRole, // This is where the role is read
          avatarUrl: profile.avatar_url || undefined,
          belt: profile.belt || undefined,
          beltColor: profile.belt_color || undefined,
          professorName: profile.professor_name || undefined,
          birthDate: profile.birth_date || undefined,
          // MODIFIED: Ensure 0 is kept as a number, or default to 0 if null
          graduationCost: profile.graduation_cost !== null ? Number(profile.graduation_cost) : 0,
          phone: profile.phone || undefined,
          first_name: profile.first_name || undefined,
          last_name: profile.last_name || undefined,
        };
      });
      setManagedUsers(fetchedUsers);
    }
  }, [session]); // Add session to dependency array

  useEffect(() => {
    fetchManagedUsers();
    // Filter assignments for professor mode based on the admin's user ID
    setProfModeAssignments(assignments.filter(a => a.created_by === user.id));
  }, [fetchManagedUsers, assignments, user.id]);

  // --- ADMIN HANDLERS ---
  const totalRevenue = monthlyPayments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingRevenue = monthlyPayments.filter(p => p.status !== 'paid').reduce((acc, curr) => acc + curr.amount, 0);

  const pendingUniformOrders = uniformOrders.filter(o => o.status === 'pending');

  const handleStartEdit = (e: React.MouseEvent, event: GroupEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEventFormData({
      title: event.title,
      date: event.date,
      description: event.description,
      price: event.price ? event.price.toString() : ''
    });
    setEditingId(event.id);
    setShowEventForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setShowEventForm(false);
    setEditingId(null);
    setEventFormData({ title: '', date: '', description: '', price: '' });
  };

  const handleDeleteEvent = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (editingId === id) handleCancelEdit();
    onCancelEvent(id);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title || !eventFormData.date) return;
    const eventPrice = eventFormData.price ? parseFloat(eventFormData.price) : 0;
    const eventPayload = {
        title: eventFormData.title,
        date: eventFormData.date,
        description: eventFormData.description,
        price: eventPrice
    };

    if (editingId) {
      onEditEvent({ id: editingId, ...eventPayload });
      setEditingId(null);
    } else {
      // When adding a new event, do NOT provide an ID. Supabase will generate it.
      onAddEvent(eventPayload); 
    }
    setEventFormData({ title: '', date: '', description: '', price: '' });
    setShowEventForm(false);
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    const paymentToUpdate = monthlyPayments.find(p => p.id === paymentId);
    if (paymentToUpdate) {
        await onUpdatePaymentRecord({ ...paymentToUpdate, status: 'paid', paid_at: new Date().toISOString().split('T')[0] });
        onNotifyAdmin(`Marcar pagamento de ${paymentToUpdate.student_name} como pago`, user);
    }
  };

  // Removed handleEditGradCost and handleSaveGradCost from here as they will be handled in Users tab
  // const handleEditGradCost = (studentId: string, currentCost: number = 0) => {
  //     setEditingGradCost({ studentId, cost: currentCost.toString() });
  // };

  // const handleSaveGradCost = (professorId: string, studentId: string) => {
  //     if (!editingGradCost) return;
  //     const newCost = parseFloat(editingGradCost.cost) || 0;
  //     setProfessorsData(prev => prev.map(prof => {
  //         if (prof.professorId !== professorId) return prof;
  //         return {
  //             ...prof,
  //             students: prof.students.map(std => 
  //                 std.studentId === studentId ? { ...std, graduationCost: newCost } : std
  //             )
  //         };
  //     }));
  //     setEditingGradCost(null);
  // };

  const handleUpdateBeltPrice = (belt: string, value: string) => {
      const numValue = parseFloat(value) || 0;
      setBeltPrices(prev => ({ ...prev, [belt]: numValue }));
  };

  const handleWhatsApp = (phone?: string) => {
    if (!phone) {
        alert('Telefone não cadastrado.');
        return;
    }
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  // --- USER MANAGEMENT HANDLERS ---
  const handleOpenUserModal = (userToEdit?: User) => {
      if (userToEdit) {
          setEditingUser(userToEdit);
          setUserForm({
              name: userToEdit.first_name || userToEdit.name,
              nickname: userToEdit.nickname || '',
              email: userToEdit.email,
              role: userToEdit.role,
              belt: userToEdit.belt || ALL_BELTS[0],
              phone: userToEdit.phone || '',
              professorName: userToEdit.professorName || '',
              birthDate: userToEdit.birthDate || ''
          });
          setShowUserModal(true);
      } else {
          // Prevent creating new users directly from this form.
          // New users should sign up via the Auth UI, or be created via Supabase console.
          // Then their profile can be edited here.
          alert('Para adicionar um novo usuário, o usuário deve primeiro se cadastrar na plataforma ou ser criado via console Supabase. Você pode então editar o perfil dele aqui.');
      }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!editingUser) {
          alert('Erro: Não é possível criar um novo usuário diretamente por este formulário. Edite um perfil existente.');
          return;
      }

      const userDataToSave = {
          first_name: userForm.name.split(' ')[0] || null,
          last_name: userForm.name.split(' ').slice(1).join(' ') || null,
          nickname: userForm.nickname || null,
          // email is typically from auth.users, not updated here
          role: userForm.role,
          belt: userForm.belt || null,
          phone: userForm.phone || null,
          professor_name: userForm.professorName || null,
          birth_date: userForm.birthDate || null,
          updated_at: new Date().toISOString(), // Add updated_at timestamp
      };

      const { error } = await supabase
          .from('profiles')
          .update(userDataToSave)
          .eq('id', editingUser.id);

      if (error) {
          console.error('Error updating user:', error);
          alert('Erro ao atualizar usuário.');
      } else {
          alert('Usuário atualizado com sucesso!');
          setShowUserModal(false);
          fetchManagedUsers(); // Re-fetch to update the list
          onNotifyAdmin(`Atualizou perfil do usuário: ${editingUser.nickname || editingUser.name}`, user);
      }
  };

  const handleDeleteUser = async (userId: string) => {
      if (window.confirm("Tem certeza que deseja excluir este usuário? Esta ação remove APENAS o perfil do usuário, não a conta de autenticação no Supabase.")) {
          const { error } = await supabase
              .from('profiles')
              .delete()
              .eq('id', userId);

          if (error) {
              console.error('Error deleting user profile:', error);
              alert('Erro ao excluir perfil do usuário.');
          } else {
              alert('Perfil do usuário excluído com sucesso!');
              fetchManagedUsers(); // Re-fetch to update the list
              onNotifyAdmin(`Excluiu perfil do usuário ID: ${userId}`, user);
          }
      }
  };

  const handleUpdateUserGraduationCost = async (userIdToUpdate: string) => { // Renamed function
    const newCost = parseFloat(editingGradCostValue);
    if (isNaN(newCost) || newCost < 0) {
        alert('Por favor, insira um valor numérico válido para o custo de graduação.');
        return;
    }

    const { error } = await supabase
        .from('profiles')
        .update({ graduation_cost: newCost })
        .eq('id', userIdToUpdate);

    if (error) {
        console.error('Error updating graduation cost:', error);
        alert('Erro ao atualizar custo de graduação.');
    } else {
        alert('Custo de graduação atualizado com sucesso!');
        setEditingGradCostId(null);
        setEditingGradCostValue('');
        fetchManagedUsers(); // Re-fetch to update the list
        const userName = managedUsers.find(u => u.id === userIdToUpdate)?.nickname || 'Usuário';
        onNotifyAdmin(`Atualizou custo de graduação do usuário: ${userName} para R$ ${newCost.toFixed(2)}`, user);
    }
  };

  // --- PROFESSOR MODE HANDLERS ---
  const handleCopyPix = () => {
    const pixKey = 'soufilhodofogo@gmail.com';
    navigator.clipboard.writeText(pixKey);
    setPixCopied(true);
    onNotifyAdmin('Visualizou/Copiou PIX Mensalidade', user);
    setTimeout(() => setPixCopied(false), 2000);
  };

  const handleCopyCostPix = () => {
    const pixKey = 'soufilhodofogo@gmail.com';
    navigator.clipboard.writeText(pixKey);
    setCostPixCopied(true);
    setTimeout(() => setCostPixCopied(false), 2000);
  };

  const handleConfirmClass = (classId: number) => {
    setConfirmedClasses([...confirmedClasses, classId]);
    onNotifyAdmin(`Admin confirmou presença na aula ID: ${classId}`, user);
  };

  const handleOpenAttendance = (classId: number) => {
    const initialAttendance: Record<string, boolean> = {};
    const studentsInClass = managedUsers.filter(u => u.role === 'aluno' && u.professorName === user.nickname); // Filter by admin's nickname as professor
    studentsInClass.forEach(s => initialAttendance[s.id] = true);
    setAttendanceData(initialAttendance);
    setSelectedClassId(classId);
    setProfView('attendance');
    setShowSuccess(false);
  };

  const togglePresence = (studentId: string) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    if (!attendanceData[studentId] === true) {
        setJustifications(prev => {
            const newJust = { ...prev };
            delete newJust[studentId];
            return newJust;
        });
    }
  };

  const handleSaveAttendance = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setSelectedClassId(null);
      setProfView('dashboard');
      setShowSuccess(false);
      setJustifications({});
      onNotifyAdmin('Realizou chamada de aula', user); // Added notification
    }, 1500);
  };

  const handleSaveNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassData.title || !newClassData.time) return;
    const newClass = {
        id: Date.now(),
        title: newClassData.title,
        time: `${newClassData.date ? newClassData.date + ', ' : ''}${newClassData.time}`,
        location: newClassData.location || 'Sede'
    };
    setMyClasses([...myClasses, newClass]);
    setNewClassData({ title: '', date: '', time: '', location: '', adminSuggestion: '' });
    setProfView('dashboard');
    onNotifyAdmin(`Agendou nova aula: ${newClassData.title}`, user); // Added notification
  };

  const handleOpenEvaluation = (studentId: string) => {
    setSelectedStudentForEval(studentId);
    setEvalData({ positive: '', negative: '' });
    setProfView('evaluate');
  };

  const handleSaveEvaluation = () => {
    alert("Avaliação salva com sucesso!");
    setProfView('all_students');
    setSelectedStudentForEval(null);
    const studentName = managedUsers.find(s => s.id === selectedStudentForEval)?.nickname || 'Aluno';
    onNotifyAdmin(`Avaliou o aluno: ${studentName}`, user); // Added notification
  };

  const handleMusicFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMusicForm(prev => ({ ...prev, file: e.target.files![0] }));
    } else {
      setMusicForm(prev => ({ ...prev, file: null }));
    }
  };

  const handleSubmitMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicForm.title || (!musicForm.lyrics && !musicForm.file)) {
      alert('Por favor, preencha o título e a letra ou faça upload de um arquivo.');
      return;
    }

    setUploadingMusicFile(true);
    let fileUrl: string | undefined;

    if (musicForm.file && session) {
      try {
        const file = musicForm.file;
        const fileExt = file.name.split('.').pop();
        const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('music_files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('music_files')
          .getPublicUrl(filePath);
        
        fileUrl = publicUrlData.publicUrl;

      } catch (error: any) {
        console.error('Error uploading music file:', error);
        alert('Erro ao fazer upload do arquivo de música: ' + error.message);
        setUploadingMusicFile(false);
        return;
      }
    }

    onAddMusic({
        id: Date.now().toString(),
        title: musicForm.title,
        category: musicForm.category,
        lyrics: musicForm.lyrics,
        file_url: fileUrl
    });
    onNotifyAdmin(`Admin adicionou nova música: ${musicForm.title}`, user);
    setMusicForm({ title: '', category: '', lyrics: '', file: null });
    setUploadingMusicFile(false);
    alert('Música adicionada!');
  };

  const handleAddAssignment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAssignment.title || !newAssignment.dueDate) return;
      
      const assignment: Assignment = {
          id: Date.now().toString(), // Changed to string for consistency with Supabase
          created_by: user.id, // Admin is creating it
          title: newAssignment.title,
          description: newAssignment.description,
          due_date: newAssignment.dueDate,
          status: 'pending'
      };

      setProfModeAssignments([...profModeAssignments, assignment]);
      setNewAssignment({ title: '', description: '', dueDate: '' });
      onNotifyAdmin(`Admin criou trabalho: ${newAssignment.title}`, user);
  };

  const handleCompleteAssignment = (id: string, file: File) => { // Changed id type to string
      const reader = new FileReader();
      reader.onload = (ev) => {
          if (ev.target?.result) {
              setProfModeAssignments(prev => prev.map(a => 
                  a.id === id ? { ...a, status: 'completed', attachment_url: ev.target?.result as string } : a
              ));
          }
      };
      reader.readAsDataURL(file);
  };

  const handleOrderUniform = (e: React.FormEvent) => {
    e.preventDefault();
    let price = 0;
    let itemName = '';
    
    if (orderForm.item === 'shirt') { price = UNIFORM_PRICES.shirt; itemName = 'Blusa Oficial'; }
    else if (orderForm.item === 'pants_roda') { price = UNIFORM_PRICES.pants_roda; itemName = 'Calça de Roda'; }
    else if (orderForm.item === 'pants_train') { price = UNIFORM_PRICES.pants_train; itemName = 'Calça de Treino'; }
    else if (orderForm.item === 'combo') { price = UNIFORM_PRICES.combo; itemName = 'Combo'; }

    const newOrder: UniformOrder = {
        id: Date.now().toString(),
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
    setMyOrders([newOrder, ...myOrders]);
    onNotifyAdmin(`Admin solicitou uniforme: ${itemName}`, user);
    alert('Pedido registrado!');
    setOrderForm({ item: 'combo', shirtSize: '', pantsSize: '' });
  };
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => { if (ev.target?.result) setClassPhoto(ev.target.result as string); };
        reader.readAsDataURL(e.target.files[0]);
        onNotifyAdmin('Enviou foto da aula', user); // Added notification
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                onUpdateProfile({ avatarUrl: ev.target.result as string });
                onNotifyAdmin('Atualizou foto de perfil', user); // Added notification
            }
        };
        reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- Student Details Handlers ---
  const handleViewReport = async (fileUrl: string, fileName: string) => {
    try {
        const { data, error } = await supabase.storage
            .from('school_reports_files')
            .createSignedUrl(fileUrl, 60); // URL valid for 60 seconds

        if (error) throw error;

        window.open(data.signedUrl, '_blank');
        onNotifyAdmin(`Visualizou boletim: ${fileName}`, user); // Added notification
    } catch (error: any) {
        console.error('Error generating signed URL:', error);
        alert('Erro ao visualizar o arquivo: ' + error.message);
    }
  };

  const handleViewHomeTrainingVideo = async (videoUrl: string) => {
    // For public URLs, we can directly open them.
    // If it were a private bucket, we'd need a signed URL.
    window.open(videoUrl, '_blank');
    onNotifyAdmin(`Visualizou vídeo de treino em casa: ${videoUrl}`, user); // Added notification
  };

  const filteredPayments = monthlyPayments.filter(p => paymentFilter === 'all' ? true : p.status === paymentFilter);
  const selectedClassInfo = myClasses.find(c => c.id === selectedClassId);
  const studentsForAttendance = managedUsers.filter(u => u.role === 'aluno' && u.professorName === user.nickname); // Filter by admin's nickname as professor
  const studentBeingEvaluated = studentsForAttendance.find(s => s.id === selectedStudentForEval);
  const today = new Date().toISOString().split('T')[0];

  const filteredManagedUsers = managedUsers.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.nickname && u.nickname.toLowerCase().includes(userSearch.toLowerCase())) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredStudentsForDetails = managedUsers.filter(u => 
    u.role === 'aluno' && 
    (u.name.toLowerCase().includes(studentDetailsSearch.toLowerCase()) || 
     (u.nickname && u.nickname.toLowerCase().includes(studentDetailsSearch.toLowerCase())) ||
     u.email.toLowerCase().includes(studentDetailsSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-stone-900 p-8 rounded-2xl border border-red-900/50 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
           <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-stone-700 flex items-center justify-center border-4 border-white/10 overflow-hidden shadow-lg">
                <img 
                    src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/200`} 
                    alt="Admin Avatar" 
                    className="w-full h-full object-cover"
                />
              </div>
              <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera size={24} className="text-white" />
                  <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange} 
                      className="hidden" 
                  />
              </label>
           </div>
           
           <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold text-white flex items-center justify-center md:justify-start gap-3">
                <Shield className="text-red-500" />
                Administração Filhos do Fogo
              </h1>
              <p className="text-red-200 mt-2">Painel de Controle Geral</p>
           </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-red-600 rounded-full filter blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-stone-700 pb-1">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-stone-800 text-orange-500 border-t-2 border-orange-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
        >
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-stone-800 text-pink-500 border-t-2 border-pink-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
        >
          Gerenciar Usuários
        </button>
        <button 
          onClick={() => setActiveTab('student_details')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'student_details' ? 'bg-stone-800 text-blue-500 border-t-2 border-blue-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
        >
          <Users size={16}/> Alunos Detalhes
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'bg-stone-800 text-green-500 border-t-2 border-green-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
        >
          Financeiro
          {pendingUniformOrders.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{pendingUniformOrders.length}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('pedagogy')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'pedagogy' ? 'bg-stone-800 text-blue-500 border-t-2 border-blue-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
        >
          Pedagógico
        </button>
        <button 
          onClick={() => setActiveTab('my_classes')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'my_classes' ? 'bg-stone-800 text-purple-500 border-t-2 border-purple-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
        >
          <Users size={16}/> Minhas Aulas
        </button>
      </div>

      {/* --- TAB: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Alunos', value: managedUsers.filter(u => u.role === 'aluno').length.toString(), icon: Users, color: 'text-blue-500' },
              { label: 'Receita Confirmada', value: `R$ ${totalRevenue},00`, icon: DollarSign, color: 'text-green-500' },
              { label: 'Eventos Ativos', value: events.length.toString(), icon: CalendarPlus, color: 'text-orange-500' },
              { label: 'Notificações', value: notifications.length.toString(), icon: Bell, color: 'text-yellow-500' },
            ].map((item, idx) => (
              <div key={idx} className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg bg-stone-900 ${item.color}`}>
                    <item.icon size={24} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white">{item.value}</h3>
                <p className="text-stone-400 text-sm">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Notifications Feed */}
              <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 lg:col-span-1">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                      <Activity className="text-yellow-500" />
                      Atividades Recentes
                  </h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {notifications.length > 0 ? (
                          notifications.map(notif => (
                              <div key={notif.id} className="bg-stone-900 p-3 rounded-lg border-l-2 border-yellow-500">
                                  <p className="text-sm font-bold text-white">{notif.user_name}</p>
                                  <p className="text-xs text-stone-300">{notif.action}</p>
                                  <p className="text-[10px] text-stone-500 mt-1">{notif.timestamp}</p>
                              </div>
                          ))
                      ) : (
                          <p className="text-stone-500 text-sm italic">Nenhuma atividade recente.</p>
                      )}
                  </div>
              </div>

              {/* Event Management */}
              <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <CalendarPlus className="text-orange-500" />
                    Gerenciar Eventos
                </h3>
                <button 
                    onClick={() => {
                    setEditingId(null);
                    setEventFormData({ title: '', date: '', description: '', price: '' });
                    setShowEventForm(!showEventForm);
                    }}
                    className="text-sm bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    {showEventForm && !editingId ? <X size={16} /> : <Plus size={16} />}
                    {showEventForm && !editingId ? 'Fechar' : 'Novo Evento'}
                </button>
                </div>

                {showEventForm && (
                <form onSubmit={handleSaveEvent} className="bg-stone-900 p-4 rounded-lg mb-6 border border-stone-700 border-l-4 border-l-orange-500">
                    <div className="flex justify-between items-center mb-4">
                    <h4 className="text-white font-bold">{editingId ? 'Editar Evento' : 'Criar Novo Evento'}</h4>
                    {editingId && (
                        <button type="button" onClick={handleCancelEdit} className="text-xs text-stone-400 hover:text-white">Cancelar Edição</button>
                    )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Título</label>
                        <input 
                            type="text" 
                            value={eventFormData.title}
                            onChange={e => setEventFormData({...eventFormData, title: e.target.value})}
                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-stone-400 mb-1">Data</label>
                        <input 
                            type="text" 
                            value={eventFormData.date}
                            onChange={e => setEventFormData({...eventFormData, date: e.target.value})}
                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-stone-400 block mb-1">Valor do Evento (R$)</label>
                        <input 
                            type="number" 
                            value={eventFormData.price}
                            onChange={e => setEventFormData({...eventFormData, price: e.target.value})}
                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                            placeholder="Ex: 50.00"
                            min="0"
                            step="0.01"
                        />
                        <p className="text-[10px] text-stone-500 mt-1">* Se for gratuito, deixe em branco ou 0.</p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-stone-400 block mb-1">Descrição</label>
                        <textarea 
                            value={eventFormData.description}
                            onChange={e => setEventFormData({...eventFormData, description: e.target.value})}
                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                            rows={2}
                        />
                    </div>
                    </div>
                    <div className="flex justify-end gap-2">
                    <button type="button" onClick={handleCancelEdit} className="text-stone-400 px-4 py-2 hover:text-white">Cancelar</button>
                    <Button type="submit">{editingId ? 'Atualizar Evento' : 'Salvar Evento'}</Button>
                    </div>
                </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map(event => (
                    <div key={event.id} className="bg-stone-900 p-4 rounded-lg border-l-4 border-yellow-500 relative group">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white">{event.title}</h4>
                        <div className="flex gap-2">
                        <button 
                            type="button"
                            onClick={(e) => handleStartEdit(e, event)}
                            className="bg-stone-800 p-2 rounded text-stone-400 hover:text-blue-500 hover:bg-stone-700 active:bg-stone-600 transition-colors z-20 cursor-pointer"
                            title="Editar"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => handleDeleteEvent(e, event.id)}
                            className="bg-stone-800 p-2 rounded text-stone-400 hover:text-red-500 hover:bg-stone-700 active:bg-stone-600 transition-colors z-20 cursor-pointer"
                            title="Excluir"
                        >
                            <Trash2 size={18} />
                        </button>
                        </div>
                    </div>
                    <p className="text-orange-400 text-sm mb-1">{event.date}</p>
                    {event.price ? (
                        <span className="text-green-400 text-xs font-bold bg-green-900/30 px-2 py-0.5 rounded border border-green-900/50 mb-2 inline-block">
                            R$ {event.price.toFixed(2).replace('.', ',')}
                        </span>
                    ) : (
                        <span className="text-stone-500 text-xs font-bold bg-stone-800 px-2 py-0.5 rounded mb-2 inline-block">
                            Gratuito
                        </span>
                    )}
                    <p className="text-stone-400 text-xs mt-2">{event.description}</p>
                    </div>
                ))}
                {events.length === 0 && (
                    <div className="text-stone-500 text-sm col-span-full text-center py-4">Nenhum evento ativo.</div>
                )}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* --- TAB: FINANCEIRO --- */}
      {activeTab === 'finance' && (
        <div className="space-y-6 animate-fade-in relative">
          
          {/* BELT CONFIGURATION MODAL */}
          {showBeltConfig && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                  <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh]">
                      <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <Settings className="text-orange-500" />
                              Configurar Valores de Graduação
                          </h3>
                          <button onClick={() => setShowBeltConfig(false)} className="text-stone-400 hover:text-white"><X size={24}/></button>
                      </div>
                      
                      <div className="overflow-y-auto flex-1 pr-2 space-y-2">
                          <p className="text-sm text-stone-400 mb-4 bg-stone-900/50 p-3 rounded">
                              Defina o valor base para cada cordel. Este valor servirá de referência para os custos de troca de cordel.
                          </p>
                          <div className="grid gap-2">
                              {ALL_BELTS.map((belt) => (
                                  <div key={belt} className="flex items-center justify-between bg-stone-900 p-3 rounded border border-stone-700 hover:border-orange-500/30 transition-colors">
                                      <span className="text-stone-300 text-sm font-medium">{belt}</span>
                                      <div className="flex items-center gap-2">
                                          <span className="text-stone-500 text-sm">R$</span>
                                          <input 
                                              type="number" 
                                              value={beltPrices[belt] || ''}
                                              onChange={(e) => handleUpdateBeltPrice(belt, e.target.value)}
                                              placeholder="0.00"
                                              className="w-24 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-white text-right focus:border-orange-500 outline-none"
                                          />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-stone-700 flex justify-end">
                          <Button onClick={() => setShowBeltConfig(false)}>
                              <Save size={18} /> Salvar Alterações
                          </Button>
                      </div>
                  </div>
              </div>
          )}

          {/* UNIFORM ORDERS PANEL */}
          <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
             <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                <Shirt className="text-orange-500" />
                Pedidos de Uniforme
                {pendingUniformOrders.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingUniformOrders.length} pendentes</span>}
             </h2>

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                            <th className="p-4">Solicitante</th>
                            <th className="p-4">Data</th>
                            <th className="p-4">Item</th>
                            <th className="p-4">Detalhes</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-700 text-sm">
                        {uniformOrders.map(order => (
                            <tr key={order.id} className={`hover:bg-stone-700/30 ${order.status === 'pending' ? 'bg-orange-900/10' : ''}`}>
                                <td className="p-4">
                                    <div className="font-bold text-white">{order.user_name}</div>
                                    <div className="text-xs text-stone-500 capitalize">{order.user_role}</div>
                                </td>
                                <td className="p-4 text-stone-300">{order.date}</td>
                                <td className="p-4 text-white font-medium">{order.item}</td>
                                <td className="p-4 text-stone-400 text-xs">
                                    {order.shirt_size && <div>Blusa: {order.shirt_size}</div>}
                                    {order.pants_size && <div>Calça: {order.pants_size}</div>}
                                </td>
                                <td className="p-4 text-green-400 font-bold">R$ {order.total},00</td>
                                <td className="p-4">
                                    {order.status === 'pending' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs border border-yellow-900/50">Pendente Pagamento</span>}
                                    {order.status === 'ready' && <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs border border-blue-900/50">Pago / Preparar</span>}
                                    {order.status === 'delivered' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs border border-green-900/50">Entregue</span>}
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {order.status === 'pending' && (
                                            <Button 
                                                className="text-xs px-2 py-1 h-auto" 
                                                variant="secondary"
                                                onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                                                title="Confirmar Pagamento e Disponibilidade"
                                            >
                                                <DollarSign size={14} className="mr-1"/> Confirmar Pagto
                                            </Button>
                                        )}
                                        {order.status === 'ready' && (
                                            <Button 
                                                className="text-xs px-2 py-1 h-auto" 
                                                onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                                title="Marcar como Entregue ao Aluno"
                                            >
                                                <Package size={14} className="mr-1"/> Entregar
                                            </Button>
                                        )}
                                        {order.status === 'delivered' && (
                                            <span className="text-stone-600 text-xs flex items-center justify-end gap-1"><CheckCircle size={12}/> Finalizado</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {uniformOrders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-stone-500 italic">Nenhum pedido de uniforme registrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
          </div>

          <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 mt-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <DollarSign className="text-green-500" />
                    Controle de Mensalidades
                  </h2>
                  <p className="text-stone-400 text-sm">Vencimento: Dia 10 de cada mês</p>
               </div>
               
               <div className="flex items-center gap-4">
                   <div className="bg-stone-900 p-3 rounded-lg border border-stone-600">
                      <span className="text-stone-400 text-xs uppercase font-bold">Pendente a Receber</span>
                      <p className="text-2xl font-bold text-red-500">R$ {pendingRevenue},00</p>
                   </div>
                   <button 
                        onClick={() => setShowBeltConfig(true)}
                        className="bg-stone-700 hover:bg-stone-600 text-white p-3 rounded-lg border border-stone-500 transition-colors shadow-lg"
                        title="Configurar Valores de Graduação"
                   >
                       <Settings size={24} />
                   </button>
               </div>
             </div>

             {/* Filters */}
             <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
               {['all', 'paid', 'pending', 'overdue'].map(status => (
                 <button
                    key={status}
                    onClick={() => setPaymentFilter(status as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                      paymentFilter === status 
                      ? 'bg-stone-200 text-stone-900' 
                      : 'bg-stone-900 text-stone-500 hover:bg-stone-700'
                    }`}
                 >
                   {status === 'all' ? 'Todos' : status === 'paid' ? 'Pagos' : status === 'pending' ? 'Pendentes' : 'Atrasados'}
                 </button>
               ))}
             </div>

             {/* Table */}
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                     <th className="p-4">Aluno</th>
                     <th className="p-4">Mês Ref.</th>
                     <th className="p-4">Vencimento</th>
                     <th className="p-4">Valor</th>
                     <th className="p-4">Status</th>
                     <th className="p-4 text-right">Ação</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-700 text-sm">
                   {filteredPayments.map((payment) => (
                     <tr key={payment.id} className="hover:bg-stone-700/30">
                       <td className="p-4 font-medium text-white">{payment.student_name}</td>
                       <td className="p-4 text-stone-300">{payment.month}</td>
                       <td className="p-4 text-stone-300">{payment.due_date}</td>
                       <td className="p-4 text-white font-mono">R$ {payment.amount},00</td>
                       <td className="p-4">
                         {payment.status === 'paid' && (
                           <span className="inline-flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                             <CheckCircle size={12} /> Pago em {payment.paid_at}
                           </span>
                         )}
                         {payment.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold border border-yellow-900/50">
                              <Clock size={12} /> Pendente
                            </span>
                         )}
                         {payment.status === 'overdue' && (
                            <span className="inline-flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded text-xs font-bold border border-red-900/50">
                              <AlertCircle size={12} /> Atrasado
                            </span>
                         )}
                       </td>
                       <td className="p-4 text-right">
                          {payment.status !== 'paid' && (
                            <button 
                              onClick={() => handleMarkAsPaid(payment.id)}
                              className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition-colors"
                            >
                              Dar Baixa
                            </button>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               {filteredPayments.length === 0 && (
                 <div className="text-center py-8 text-stone-500">Nenhum registro encontrado.</div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* --- TAB: USERS MANAGEMENT (CRUD) --- */}
      {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in relative">
              
              {/* USER MODAL */}
              {showUserModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                      <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh]">
                          <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                  {editingUser ? <Edit2 size={20} className="text-blue-500" /> : <UserPlus size={20} className="text-green-500" />}
                                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                              </h3>
                              <button onClick={() => setShowUserModal(false)} className="text-stone-400 hover:text-white"><X size={24}/></button>
                          </div>
                          
                          <form onSubmit={handleSaveUser} className="overflow-y-auto flex-1 pr-2 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm text-stone-400 mb-1">Nome Completo</label>
                                      <input 
                                          type="text" 
                                          required
                                          value={userForm.name}
                                          onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                                          className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm text-stone-400 mb-1">Apelido (Capoeira)</label>
                                      <input 
                                          type="text" 
                                          value={userForm.nickname}
                                          onChange={(e) => setUserForm({...userForm, nickname: e.target.value})}
                                          className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                      />
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm text-stone-400 mb-1">Email</label>
                                      <input 
                                          type="email" 
                                          required
                                          value={userForm.email}
                                          onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                                          className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                          disabled // Email should not be editable from here, it comes from auth.users
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm text-stone-400 mb-1">WhatsApp</label>
                                      <input 
                                          type="text" 
                                          value={userForm.phone}
                                          onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                                          className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                          placeholder="5511999999999"
                                      />
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm text-stone-400 mb-1">Função (Role)</label>
                                      <select 
                                          value={userForm.role}
                                          onChange={(e) => setUserForm({...userForm, role: e.target.value as UserRole})}
                                          className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                      >
                                          <option value="aluno">Aluno</option>
                                          <option value="professor">Professor</option>
                                          <option value="admin">Admin</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-sm text-stone-400 mb-1">Data de Nascimento</label>
                                      <input 
                                          type="date" 
                                          value={userForm.birthDate}
                                          onChange={(e) => setUserForm({...userForm, birthDate: e.target.value})}
                                          className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-sm text-stone-400 mb-1">Cordel / Graduação</label>
                                  <select 
                                      value={userForm.belt}
                                      onChange={(e) => setUserForm({...userForm, belt: e.target.value})}
                                      className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                  >
                                      {ALL_BELTS.map(belt => (
                                          <option key={belt} value={belt}>{belt}</option>
                                      ))}
                                  </select>
                              </div>

                              {userForm.role === 'aluno' && (
                                  <div>
                                      <label className="block text-sm text-stone-400 mb-1">Professor Responsável</label>
                                      <select 
                                          id="professor_name"
                                          name="professor_name"
                                          value={userForm.professorName}
                                          onChange={(e) => setUserForm({...userForm, professorName: e.target.value})}
                                          className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                      >
                                        <option value="">Selecione um professor</option>
                                        {managedUsers.filter(u => u.role === 'professor' || u.role === 'admin').map(prof => (
                                            <option key={prof.id} value={prof.nickname || prof.first_name || prof.name}>
                                                {prof.nickname ? `${prof.nickname} (${prof.first_name || prof.name})` : prof.first_name || prof.name}
                                            </option>
                                        ))}
                                      </select>
                                  </div>
                              )}

                              {!editingUser && (
                                  <div className="bg-stone-900 p-3 rounded border border-stone-700 text-sm text-stone-400 flex items-center gap-2">
                                      <Lock size={16} />
                                      Senha padrão inicial: <span className="text-white font-mono font-bold">123456</span>
                                  </div>
                              )}

                              <div className="pt-4 flex justify-end gap-2 border-t border-stone-700 mt-4">
                                  <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-stone-400 hover:text-white">Cancelar</button>
                                  <Button type="submit">
                                      <Save size={18} /> {editingUser ? 'Atualizar Usuário' : 'Criar Usuário'}
                                  </Button>
                              </div>
                          </form>
                      </div>
                  </div>
              )}

              {/* Main Content */}
              <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                      <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                              <Users className="text-pink-500" />
                              Gerenciar Usuários
                          </h2>
                          <p className="text-stone-400 text-sm">Edite ou remova membros da plataforma.</p>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto">
                          <div className="relative flex-1 md:w-64">
                              <Search className="absolute left-3 top-2.5 text-stone-500" size={16} />
                              <input 
                                  type="text" 
                                  placeholder="Buscar por nome ou email..."
                                  value={userSearch}
                                  onChange={(e) => setUserSearch(e.target.value)}
                                  className="w-full bg-stone-900 border border-stone-600 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:border-pink-500 outline-none"
                              />
                          </div>
                          {/* Removed "Novo" button as new user creation is handled by Auth UI or Supabase console */}
                          {/* <Button onClick={() => handleOpenUserModal()}>
                              <UserPlus size={18} /> <span className="hidden sm:inline">Novo</span>
                          </Button> */}
                      </div>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                  <th className="p-4 rounded-tl-lg">Usuário</th>
                                  <th className="p-4">Função</th>
                                  <th className="p-4">Contato</th>
                                  <th className="p-4">Graduação</th>
                                  <th className="p-4">Custo Graduação (R$)</th> {/* New column */}
                                  <th className="p-4 rounded-tr-lg text-right">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-700 text-sm">
                              {filteredManagedUsers.map(u => (
                                  <tr key={u.id} className="hover:bg-stone-700/30 group">
                                      <td className="p-4">
                                          <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                                  {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover"/> : u.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <p className="font-bold text-white">{u.nickname || u.name}</p>
                                                  <p className="text-xs text-stone-500">{u.name}</p>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="p-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                              u.role === 'admin' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 
                                              u.role === 'professor' ? 'bg-purple-900/30 text-purple-400 border border-purple-900/50' : 
                                              'bg-stone-700 text-stone-300'
                                          }`}>
                                              {u.role}
                                          </span>
                                      </td>
                                      <td className="p-4">
                                          <div className="flex flex-col gap-1">
                                              <span className="flex items-center gap-1 text-xs text-stone-300"><Mail size={12}/> {u.email}</span>
                                              {u.phone && <span className="flex items-center gap-1 text-xs text-stone-400"><Phone size={12}/> {u.phone}</span>}
                                          </div>
                                      </td>
                                      <td className="p-4 text-stone-300 text-xs">
                                          {u.belt}
                                      </td>
                                      <td className="p-4"> {/* Graduation Cost Column */}
                                          {editingGradCostId === u.id ? (
                                              <div className="flex items-center gap-1">
                                                  <input
                                                      type="number"
                                                      value={editingGradCostValue}
                                                      onChange={(e) => setEditingGradCostValue(e.target.value)}
                                                      className="w-24 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-white text-xs"
                                                      placeholder="0.00"
                                                      min="0"
                                                      step="0.01"
                                                  />
                                                  <button
                                                      onClick={() => handleUpdateUserGraduationCost(u.id)} // Use generic function
                                                      className="text-green-500 hover:text-green-400 p-1 rounded"
                                                      title="Salvar Custo"
                                                  >
                                                      <Save size={16} />
                                                  </button>
                                                  <button
                                                      onClick={() => { setEditingGradCostId(null); setEditingGradCostValue(''); }}
                                                      className="text-stone-500 hover:text-red-500 p-1 rounded"
                                                      title="Cancelar"
                                                  >
                                                      <X size={16} />
                                                  </button>
                                              </div>
                                          ) : (
                                              <div className="flex items-center gap-2 group">
                                                  <span className={`${u.graduationCost !== undefined && u.graduationCost > 0 ? 'text-green-400 font-bold' : 'text-stone-500 italic'}`}>
                                                      {u.graduationCost !== undefined ? `R$ ${u.graduationCost.toFixed(2).replace('.', ',')}` : 'Não definido'}
                                                  </span>
                                                  <button
                                                      onClick={() => { setEditingGradCostId(u.id); setEditingGradCostValue(u.graduationCost?.toString() || '0'); }}
                                                      className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-blue-500 transition-opacity p-1 rounded"
                                                      title="Editar Custo"
                                                  >
                                                      <Edit2 size={12} />
                                                  </button>
                                              </div>
                                          )}
                                      </td>
                                      <td className="p-4 text-right">
                                          <div className="flex justify-end gap-2">
                                              <button 
                                                  onClick={() => handleOpenUserModal(u)}
                                                  className="p-2 bg-stone-900 hover:bg-stone-700 text-stone-400 hover:text-blue-500 rounded transition-colors"
                                                  title="Editar"
                                              >
                                                  <Edit2 size={16} />
                                              </button>
                                              <button 
                                                  onClick={() => handleDeleteUser(u.id)}
                                                  className="p-2 bg-stone-900 hover:bg-stone-700 text-stone-400 hover:text-red-500 rounded transition-colors"
                                                  title="Excluir"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                              {filteredManagedUsers.length === 0 && (
                                  <tr>
                                      <td colSpan={6} className="p-8 text-center text-stone-500 italic"> {/* Updated colspan */}
                                          Nenhum usuário encontrado.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB: STUDENT DETAILS --- */}
      {activeTab === 'student_details' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                      <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                              <Users className="text-blue-500" />
                              Detalhes dos Alunos
                          </h2>
                          <p className="text-stone-400 text-sm">Visualize informações detalhadas de cada aluno.</p>
                      </div>
                      <div className="relative flex-1 md:w-64">
                          <Search className="absolute left-3 top-2.5 text-stone-500" size={16} />
                          <input 
                              type="text" 
                              placeholder="Buscar aluno por nome ou apelido..."
                              value={studentDetailsSearch}
                              onChange={(e) => setStudentDetailsSearch(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-600 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                          />
                      </div>
                  </div>

                  <div className="space-y-4">
                      {filteredStudentsForDetails.length > 0 ? (
                          filteredStudentsForDetails.map(student => (
                              <div key={student.id} className="bg-stone-900 rounded-lg border border-stone-700 overflow-hidden">
                                  <div 
                                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-800 transition-colors"
                                      onClick={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
                                  >
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                              {student.avatarUrl ? <img src={student.avatarUrl} className="w-full h-full object-cover"/> : student.name.charAt(0)}
                                          </div>
                                          <div>
                                              <h3 className="font-bold text-white text-lg">{student.nickname || student.name}</h3>
                                              <p className="text-xs text-stone-400">{student.belt || 'Sem Cordel'}</p>
                                          </div>
                                      </div>
                                      {expandedStudent === student.id ? <ChevronUp className="text-stone-400"/> : <ChevronDown className="text-stone-400"/>}
                                  </div>

                                  {expandedStudent === student.id && (
                                      <div className="border-t border-stone-700 bg-stone-900/50 p-4 animate-fade-in-down">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                              <div>
                                                  <p className="text-stone-400 text-xs uppercase font-bold mb-2">Informações Pessoais</p>
                                                  <p className="text-white text-sm mb-1"><span className="text-stone-500">Nome:</span> {student.first_name} {student.last_name}</p>
                                                  <p className="text-white text-sm mb-1"><span className="text-stone-500">Email:</span> {student.email}</p>
                                                  {student.phone && <p className="text-white text-sm mb-1"><span className="text-stone-500">Telefone:</span> {student.phone}</p>}
                                                  {student.birthDate && <p className="text-white text-sm mb-1"><span className="text-stone-500">Nascimento:</span> {new Date(student.birthDate).toLocaleDateString('pt-BR')}</p>}
                                                  {student.professorName && <p className="text-white text-sm mb-1"><span className="text-stone-500">Professor:</span> {student.professorName}</p>}
                                              </div>
                                              <div>
                                                  <p className="text-stone-400 text-xs uppercase font-bold mb-2">Status Acadêmico</p>
                                                  <p className="text-white text-sm mb-1"><span className="text-stone-500">Cordel:</span> {student.belt || 'Não Definido'}</p>
                                                  {student.graduationCost !== undefined && <p className="text-white text-sm mb-1"><span className="text-stone-500">Custo Graduação:</span> R$ {student.graduationCost.toFixed(2).replace('.', ',')}</p>}
                                              </div>
                                          </div>

                                          {/* School Reports */}
                                          <div className="mb-6">
                                              <h4 className="text-orange-400 font-bold text-sm mb-3 flex items-center gap-2">
                                                  <FileText size={16} /> Boletins Escolares
                                              </h4>
                                              <div className="space-y-2">
                                                  {schoolReports.filter(report => report.user_id === student.id).length > 0 ? (
                                                      schoolReports.filter(report => report.user_id === student.id).map(report => (
                                                          <div key={report.id} className="bg-stone-800 p-3 rounded border border-stone-700 flex justify-between items-center">
                                                              <div>
                                                                  <p className="text-white font-medium">{report.file_name}</p>
                                                                  <p className="text-xs text-stone-500">Período: {report.period} • Enviado em: {report.date}</p>
                                                              </div>
                                                              <Button 
                                                                  variant="secondary" 
                                                                  className="text-xs h-auto px-2 py-1"
                                                                  onClick={() => handleViewReport(report.file_url, report.file_name)}
                                                              >
                                                                  <FileText size={14} className="mr-1"/> Ver
                                                              </Button>
                                                          </div>
                                                      ))
                                                  ) : (
                                                      <p className="text-stone-500 text-sm italic">Nenhum boletim enviado.</p>
                                                  )}
                                              </div>
                                          </div>

                                          {/* Home Trainings */}
                                          <div className="mb-6">
                                              <h4 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
                                                  <Video size={16} /> Treinos em Casa
                                              </h4>
                                              <div className="space-y-2">
                                                  {homeTrainings.filter(training => training.user_id === student.id).length > 0 ? (
                                                      homeTrainings.filter(training => training.user_id === student.id).map(training => (
                                                          <div key={training.id} className="bg-stone-800 p-3 rounded border border-stone-700 flex justify-between items-center">
                                                              <div>
                                                                  <p className="text-white font-medium">{training.video_name}</p>
                                                                  <p className="text-xs text-stone-500">Enviado em: {training.date} • Expira em: {new Date(training.expires_at).toLocaleDateString('pt-BR')}</p>
                                                              </div>
                                                              <Button 
                                                                  variant="secondary" 
                                                                  className="text-xs h-auto px-2 py-1"
                                                                  onClick={() => handleViewHomeTrainingVideo(training.video_url)}
                                                              >
                                                                  <Video size={14} className="mr-1"/> Ver
                                                              </Button>
                                                          </div>
                                                      ))
                                                  ) : (
                                                      <p className="text-stone-500 text-sm italic">Nenhum treino em casa enviado.</p>
                                                  )}
                                              </div>
                                          </div>

                                          {/* Assignments */}
                                          <div>
                                              <h4 className="text-blue-400 font-bold text-sm mb-3 flex items-center gap-2">
                                                  <BookOpen size={16} /> Trabalhos e Tarefas
                                              </h4>
                                              <div className="space-y-2">
                                                  {assignments.filter(assign => assign.student_id === student.id || assign.student_id === null).length > 0 ? (
                                                      assignments.filter(assign => assign.student_id === student.id || assign.student_id === null).map(assign => (
                                                          <div key={assign.id} className="bg-stone-800 p-3 rounded border border-stone-700">
                                                              <p className="text-white font-medium">{assign.title}</p>
                                                              <p className="text-xs text-stone-500">Entrega: {assign.due_date} • Status: {assign.status === 'pending' ? 'Pendente' : 'Concluído'}</p>
                                                              {assign.attachment_url && (
                                                                  <a href={assign.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs flex items-center gap-1 mt-1 hover:underline">
                                                                      <Paperclip size={12}/> Ver Anexo
                                                                  </a>
                                                              )}
                                                          </div>
                                                      ))
                                                  ) : (
                                                      <p className="text-stone-500 text-sm italic">Nenhum trabalho atribuído.</p>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          ))
                      ) : (
                          <p className="text-stone-500 italic text-center py-8 bg-stone-900/30 rounded-lg">
                              Nenhum aluno encontrado com os critérios de busca.
                          </p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB: PEDAGOGY --- */}
      {activeTab === 'pedagogy' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
             <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                <GraduationCap className="text-blue-500" />
                Acompanhamento Pedagógico
                <span className="text-sm font-normal text-stone-400 ml-2">(Supervisão de Professores)</span>
             </h2>

             <div className="space-y-4">
               {professorsData.map((prof) => (
                 <div key={prof.professorId} className="bg-stone-900 rounded-lg border border-stone-700 overflow-hidden">
                   {/* Professor Header */}
                   <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-800 transition-colors"
                      onClick={() => setExpandedProfessor(expandedProfessor === prof.professorId ? null : prof.professorId)}
                   >
                     <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400">
                         <Users size={20} />
                       </div>
                       <div>
                         <div className="flex items-center gap-2">
                             <h3 className="font-bold text-white text-lg">{prof.professorName}</h3>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleWhatsApp(prof.phone);
                                }}
                                className="text-green-500 hover:text-green-400 transition-colors p-1"
                                title="Enviar WhatsApp"
                             >
                                <MessageCircle size={18} />
                             </button>
                         </div>
                         <p className="text-xs text-stone-400">{prof.students.length} Alunos Ativos</p>
                       </div>
                     </div>
                     {expandedProfessor === prof.professorId ? <ChevronUp className="text-stone-400"/> : <ChevronDown className="text-stone-400"/>}
                   </div>

                   {/* Expanded Details */}
                   {expandedProfessor === prof.professorId && (
                     <div className="border-t border-stone-700 bg-stone-900/50 p-4 animate-fade-in-down">
                       
                       {/* Content Section */}
                       <div className="mb-6 bg-stone-800/50 p-4 rounded border border-stone-700">
                         <h4 className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
                           <BookOpen size={16} /> Conteúdo Sendo Ministrado
                         </h4>
                         <p className="text-stone-300 text-sm leading-relaxed">{prof.currentContent}</p>
                       </div>

                       {/* Students Table */}
                       <h4 className="text-stone-400 font-bold text-xs uppercase mb-3">Desempenho e Custos de Graduação</h4>
                       <div className="overflow-x-auto">
                         <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-stone-700 text-xs text-stone-500">
                                <th className="pb-2">Aluno</th>
                                <th className="pb-2">Presença</th>
                                <th className="pb-2">Nota Téc.</th>
                                <th className="pb-2">Observação</th>
                                <th className="pb-2">Custo Grad. (R$)</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {prof.students.map(student => (
                                <tr key={student.studentId} className="border-b border-stone-800 last:border-0">
                                  <td className="py-3 text-white font-medium">
                                    <div className="flex items-center gap-2">
                                        {student.studentName}
                                        <button 
                                            onClick={() => handleWhatsApp(student.phone)}
                                            className="text-green-500 hover:text-green-400 ml-1 transition-colors"
                                            title="WhatsApp"
                                        >
                                            <MessageCircle size={14} />
                                        </button>
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-2 bg-stone-700 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${student.attendanceRate > 85 ? 'bg-green-500' : student.attendanceRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                          style={{ width: `${student.attendanceRate}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-xs text-stone-400">{student.attendanceRate}%</span>
                                    </div>
                                  </td>
                                  <td className="py-3 text-stone-300">{student.technicalGrade.toFixed(1)}</td>
                                  <td className="py-3 text-stone-400 text-xs italic">"{student.lastEvaluation}"</td>
                                  <td className="py-3">
                                      {/* This section is now handled in the 'Gerenciar Usuários' tab */}
                                      <span className={`${student.graduationCost !== undefined && student.graduationCost > 0 ? 'text-green-400' : 'text-stone-500'}`}>
                                          {student.graduationCost !== undefined ? `R$ ${student.graduationCost.toFixed(2)}` : '-'}
                                      </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                         </table>
                       </div>
                     </div>
                   )}
                 </div>
               ))}
             </div>
           </div>
        </div>
      )}

      {/* --- TAB: MY CLASSES (PROFESSOR MODE) --- */}
      {activeTab === 'my_classes' && (
        <div className="space-y-6 animate-fade-in relative">
          
           {/* Top Actions Bar (Similar to Professor) */}
           <div className="flex flex-wrap gap-2 justify-end bg-stone-800 p-4 rounded-xl border border-stone-700">
               <Button variant="secondary" onClick={() => setProfView('music_manager')} className="border border-stone-600">
                  <Music size={18} className="text-yellow-400" /> Músicas
               </Button>
               <Button variant="secondary" onClick={() => setProfView('assignments')} className="border border-stone-600">
                  <BookOpen size={18} className="text-blue-400" /> Trabalhos
               </Button>
               {profView === 'dashboard' && (
                <Button onClick={() => setProfView('new_class')}>
                    <PlusCircle size={18} /> Nova Aula
                </Button>
               )}
               <Button variant="outline" onClick={handleCopyPix} className={pixCopied ? "border-green-500 text-green-500" : ""} title="PIX Mensalidade">
                   {pixCopied ? <Check size={18} /> : <ArrowLeft size={18} className="rotate-180" />} 
                   {pixCopied ? 'Copiado!' : 'Mensalidade'}
               </Button>
           </div>

           {/* --- PROF MODE: ATTENDANCE --- */}
           {profView === 'attendance' && selectedClassId && (
            <div className="bg-stone-800 rounded-xl border border-stone-700 overflow-hidden animate-fade-in">
              <div className="bg-stone-900 p-6 border-b border-stone-700 flex justify-between items-center sticky top-0 z-10">
                <div>
                   <button onClick={() => setProfView('dashboard')} className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors">
                     <ArrowLeft size={16} /> Voltar
                   </button>
                   <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                     <CalendarCheck className="text-purple-500" /> Chamada - {selectedClassInfo?.title}
                   </h2>
                </div>
                <div className="flex gap-2">
                   <Button onClick={handleSaveAttendance} disabled={showSuccess}>
                     {showSuccess ? <Check size={18} /> : <Save size={18} />}
                     {showSuccess ? 'Salvo!' : 'Salvar Chamada'}
                   </Button>
                </div>
              </div>
              <div className="p-6 grid gap-3">
                 {studentsForAttendance.map((student) => { // Use real students here
                   const isPresent = attendanceData[student.id];
                   return (
                     <div key={student.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border transition-all duration-200 ${isPresent ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                       <div className="flex items-center gap-4 cursor-pointer mb-3 md:mb-0" onClick={() => togglePresence(student.id)}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors ${isPresent ? 'bg-green-600' : 'bg-red-900'}`}>{student.name.charAt(0)}</div>
                          <div><p className={`font-medium ${isPresent ? 'text-white' : 'text-stone-300'}`}>{student.nickname || student.name}</p><p className="text-xs text-stone-500">{student.belt}</p></div>
                       </div>
                       <div className="flex items-center gap-4 pl-14 md:pl-0">
                          <div onClick={() => togglePresence(student.id)} className={`px-4 py-1 rounded-full text-xs font-bold uppercase cursor-pointer ${isPresent ? 'bg-green-500 text-stone-900' : 'bg-stone-700 text-stone-400'}`}>{isPresent ? 'Presente' : 'Ausente'}</div>
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

           {/* --- PROF MODE: NEW CLASS --- */}
           {profView === 'new_class' && (
              <div className="max-w-2xl mx-auto bg-stone-800 rounded-xl border border-stone-700 overflow-hidden animate-fade-in">
                  <div className="bg-stone-900 p-6 border-b border-stone-700">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2"><PlusCircle className="text-purple-500" /> Agendar Nova Aula</h2>
                  </div>
                  <form onSubmit={handleSaveNewClass} className="p-6 space-y-4">
                      <div><label className="block text-sm text-stone-400 mb-1">Título</label><input type="text" required value={newClassData.title} onChange={e => setNewClassData({...newClassData, title: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white" /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-sm text-stone-400 mb-1">Dia</label><select value={newClassData.date} onChange={e => setNewClassData({...newClassData, date: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"><option value="">Hoje</option><option value="Amanhã">Amanhã</option></select></div>
                          <div><label className="block text-sm text-stone-400 mb-1">Horário</label><input type="time" required value={newClassData.time} onChange={e => setNewClassData({...newClassData, time: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white" /></div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setProfView('dashboard')} className="text-stone-400 hover:text-white">Cancelar</button><Button type="submit">Agendar Aula</Button></div>
                  </form>
              </div>
           )}

           {/* --- PROF MODE: ASSIGNMENTS --- */}
           {profView === 'assignments' && (
              <div className="space-y-6 animate-fade-in">
                  {/* Header */}
                  <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 flex justify-between items-center">
                      <div>
                        <button 
                            onClick={() => setProfView('dashboard')}
                            className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <BookOpen className="text-blue-500" />
                            Trabalhos e Tarefas
                        </h2>
                      </div>
                  </div>

                  {/* Create New Assignment */}
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
                                    onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                                    placeholder="Ex: Pesquisa sobre Mestre Bimba"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-stone-400 mb-1">Data de Entrega</label>
                                <input 
                                    type="date"
                                    required 
                                    value={newAssignment.dueDate}
                                    onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                                />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm text-stone-400 mb-1">Descrição / Instruções</label>
                              <textarea 
                                 value={newAssignment.description}
                                 onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                                 className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white focus:border-blue-500 outline-none h-20"
                                 placeholder="Detalhes sobre o trabalho..."
                              />
                          </div>
                          <div className="flex justify-end">
                              <Button type="submit">Criar Trabalho</Button>
                          </div>
                      </form>
                  </div>

                  {/* Assignment Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Pending */}
                      <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <Clock className="text-yellow-500" size={18} /> Pendentes
                          </h3>
                          <div className="space-y-3">
                              {profModeAssignments.filter(a => a.status === 'pending').map(assign => (
                                  <div key={assign.id} className="bg-stone-900 p-4 rounded-lg border-l-4 border-yellow-500">
                                      <div className="mb-2">
                                          <h4 className="font-bold text-white">{assign.title}</h4>
                                      </div>
                                      <p className="text-xs text-stone-400 mb-3">{assign.description}</p>
                                      <div className="flex justify-between items-center text-xs text-stone-500 mb-3">
                                          <span className="flex items-center gap-1">
                                              <Calendar size={12}/> Entrega: {assign.due_date}
                                          </span>
                                          {assign.due_date === today && (
                                              <span className="text-red-500 font-bold flex items-center gap-1 animate-pulse">
                                                  <AlertCircle size={12}/> Vence Hoje!
                                              </span>
                                          )}
                                      </div>
                                      
                                      <label className="cursor-pointer block w-full">
                                          <div className="w-full bg-stone-800 hover:bg-stone-700 border border-stone-600 border-dashed rounded-lg py-2 text-center transition-colors flex items-center justify-center gap-2 text-sm text-stone-300">
                                              <UploadCloud size={16} /> 
                                              Subir Entrega dos Alunos
                                          </div>
                                          <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={(e) => e.target.files && e.target.files[0] && handleCompleteAssignment(assign.id, e.target.files[0])}
                                          />
                                      </label>
                                  </div>
                              ))}
                              {profModeAssignments.filter(a => a.status === 'pending').length === 0 && (
                                  <p className="text-stone-500 text-sm text-center py-4">Nenhum trabalho pendente.</p>
                              )}
                          </div>
                      </div>

                      {/* Completed */}
                      <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                              <Check className="text-green-500" size={18} /> Concluídos
                          </h3>
                          <div className="space-y-3">
                              {profModeAssignments.filter(a => a.status === 'completed').map(assign => (
                                  <div key={assign.id} className="bg-stone-900/50 p-4 rounded-lg border border-stone-700 opacity-80">
                                      <h4 className="font-bold text-stone-300 line-through decoration-stone-500">{assign.title}</h4>
                                      <p className="text-xs text-stone-500 mb-2">Entregue em: {assign.due_date}</p>
                                      {assign.attachment_url && (
                                          <div className="flex items-center gap-2 text-xs text-green-500 bg-green-900/10 p-2 rounded">
                                              <Paperclip size={12} /> Arquivo Anexado
                                          </div>
                                      )}
                                  </div>
                              ))}
                               {profModeAssignments.filter(a => a.status === 'completed').length === 0 && (
                                  <p className="text-stone-500 text-sm text-center py-4">Nenhum trabalho concluído ainda.</p>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
           )}

           {/* --- PROF MODE: EVALUATE --- */}
           {profView === 'evaluate' && studentBeingEvaluated && (
             <div className="max-w-2xl mx-auto bg-stone-800 rounded-xl border border-stone-700 animate-fade-in p-6">
                 <h2 className="text-2xl font-bold text-white mb-4">Avaliar {studentBeingEvaluated.nickname || studentBeingEvaluated.name}</h2>
                 <div className="space-y-4">
                    <textarea className="w-full bg-stone-900 border border-stone-600 rounded p-3 text-white" placeholder="Pontos Positivos" value={evalData.positive} onChange={e => setEvalData({...evalData, positive: e.target.value})} />
                    <textarea className="w-full bg-stone-900 border border-stone-600 rounded p-3 text-white" placeholder="Pontos a Melhorar" value={evalData.negative} onChange={e => setEvalData({...evalData, negative: e.target.value})} />
                    <Button fullWidth onClick={handleSaveEvaluation}>Salvar Avaliação</Button>
                    <button onClick={() => setProfView('all_students')} className="block w-full text-center text-stone-500 mt-2">Cancelar</button>
                 </div>
             </div>
           )}

           {/* --- PROF MODE: UNIFORM --- */}
           {profView === 'uniform' && (
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                  <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                  <h2 className="text-2xl font-bold text-white mb-6">Solicitar Uniforme (Admin/Prof)</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                      <form onSubmit={handleOrderUniform} className="space-y-4">
                          <select value={orderForm.item} onChange={e => setOrderForm({...orderForm, item: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"><option value="combo">Combo</option><option value="shirt">Blusa</option><option value="pants_roda">Calça Roda</option></select>
                          <div className="grid grid-cols-2 gap-4">
                             <select value={orderForm.shirtSize} onChange={e => setOrderForm({...orderForm, shirtSize: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"><option value="">Tam. Blusa</option><option value="M">M</option><option value="G">G</option></select>
                             <select value={orderForm.pantsSize} onChange={e => setOrderForm({...orderForm, pantsSize: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"><option value="">Tam. Calça</option><option value="40">40</option><option value="42">42</option></select>
                          </div>
                          <Button fullWidth type="submit">Fazer Pedido</Button>
                      </form>
                      <div className="bg-stone-900 p-4 rounded text-sm text-stone-400">
                          <h3 className="text-white font-bold mb-2">Meus Pedidos</h3>
                          {myOrders.length === 0 ? <p>Nenhum pedido.</p> : myOrders.map(o => <div key={o.id} className="border-b border-stone-700 py-1">{o.item} - R$ {o.total}</div>)}
                      </div>
                  </div>
              </div>
           )}

           {/* --- PROF MODE: MUSIC --- */}
           {profView === 'music_manager' && (
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                  <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                  <h2 className="text-2xl font-bold text-white mb-6">Acervo Musical</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                      <form onSubmit={handleSubmitMusic} className="space-y-4">
                          <input type="text" placeholder="Título" value={musicForm.title} onChange={e => setMusicForm({...musicForm, title: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                          <input type="text" placeholder="Categoria" value={musicForm.category} onChange={e => setMusicForm({...musicForm, category: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                          <textarea placeholder="Letra..." value={musicForm.lyrics} onChange={e => setMusicForm({...musicForm, lyrics: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white h-32" />
                          
                          {/* Music File Upload */}
                          <div className="border-2 border-dashed border-stone-600 rounded-lg p-4 flex flex-col items-center justify-center bg-stone-900/50 hover:bg-stone-900 transition-colors">
                              {uploadingMusicFile ? (
                                  <div className="text-center">
                                      <UploadCloud size={32} className="text-orange-500 animate-bounce mx-auto mb-2" />
                                      <p className="text-white">Enviando arquivo...</p>
                                  </div>
                              ) : (
                                  <>
                                      <Mic2 size={32} className="text-stone-500 mb-2" />
                                      <label className="cursor-pointer">
                                          <span className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block shadow-lg">
                                              {musicForm.file ? musicForm.file.name : 'Selecionar Arquivo de Áudio'}
                                          </span>
                                          <input type="file" accept="audio/*" className="hidden" onChange={handleMusicFileChange} />
                                      </label>
                                      <p className="text-xs text-stone-500 mt-2">Opcional: MP3, WAV, etc. Máx 10MB.</p>
                                  </>
                              )}
                          </div>

                          <Button fullWidth type="submit" disabled={uploadingMusicFile}>
                            {uploadingMusicFile ? 'Enviando...' : 'Adicionar Música'}
                          </Button>
                      </form>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                          <h3 className="text-white font-bold mb-2">Histórico de Músicas</h3>
                          {musicList.length > 0 ? (
                              musicList.map(m => (
                                  <div key={m.id} className="bg-stone-900 p-3 rounded text-sm border-l-2 border-yellow-500">
                                      <p className="text-white font-bold">{m.title}</p>
                                      <p className="text-stone-500 text-xs">{m.category}</p>
                                      {m.lyrics && <p className="text-stone-300 text-xs mt-1 truncate">{m.lyrics}</p>}
                                      {m.file_url && (
                                          <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs flex items-center gap-1 mt-2 hover:underline">
                                              <PlayCircle size={14} /> Ouvir Áudio
                                          </a>
                                      )}
                                  </div>
                              ))
                          ) : (
                              <p className="text-stone-500 italic">Nenhuma música no acervo.</p>
                          )}
                      </div>
                  </div>
              </div>
           )}

           {/* --- PROF MODE: ALL STUDENTS --- */}
           {profView === 'all_students' && (
              <div className="bg-stone-800 rounded-xl border border-stone-700 animate-fade-in p-6">
                  <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                  <h2 className="text-2xl font-bold text-white mb-6">Meus Alunos (Admin Class)</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                      {studentsForAttendance.map(student => ( // Use real students here
                          <div key={student.id} className="bg-stone-900 p-4 rounded border border-stone-700 flex justify-between items-center">
                              <div><p className="text-white font-bold">{student.nickname || student.name}</p><p className="text-stone-500 text-sm">{student.belt}</p></div>
                              <div className="flex gap-2">
                                  <Button variant="secondary" className="text-xs h-8" onClick={() => handleOpenEvaluation(student.id)}>Avaliar</Button>
                                  <button onClick={() => handleWhatsApp(student.phone)} className="bg-green-600 text-white p-2 rounded hover:bg-green-500"><MessageCircle size={16}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
           )}

           {/* --- PROF MODE: DASHBOARD (DEFAULT) --- */}
           {profView === 'dashboard' && (
              <>
                <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 relative mb-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><UploadCloud className="text-purple-500" /> Registro de Aula</h3>
                    <div className="border-2 border-dashed border-stone-600 rounded-lg p-6 flex flex-col items-center justify-center bg-stone-900/50">
                        {classPhoto ? (
                            <div className="relative w-full h-32 rounded overflow-hidden"><img src={classPhoto} className="w-full h-full object-cover" /><button onClick={() => setClassPhoto(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={12}/></button></div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center"><Camera size={32} className="text-stone-500 mb-2"/><span className="text-purple-400 font-bold">Enviar Foto</span><input type="file" className="hidden" onChange={handlePhotoUpload} /></label>
                        )}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                        <h3 className="text-xl font-bold text-white mb-4">Minhas Aulas</h3>
                        <div className="space-y-4">
                            {myClasses.map(cls => (
                                <div key={cls.id} className="bg-stone-900 p-4 rounded border-l-2 border-purple-500">
                                    <div className="flex justify-between items-start mb-2">
                                        <div><p className="font-bold text-white">{cls.title}</p><p className="text-stone-500 text-sm">{cls.time} - {cls.location}</p></div>
                                        {/* Removed confirmedClasses logic for simplicity, can be re-added if needed */}
                                        {/* {!confirmedClasses.includes(cls.id) && <button onClick={() => handleConfirmClass(cls.id)} className="text-xs bg-yellow-600 text-white px-2 py-1 rounded animate-pulse">Confirmar</button>}
                                        {confirmedClasses.includes(cls.id) && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12}/> OK</span>} */}
                                    </div>
                                    <Button fullWidth onClick={() => handleOpenAttendance(cls.id)}>Realizar Chamada</Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                        <h3 className="text-xl font-bold text-white mb-4">Acompanhamento</h3>
                        <div className="space-y-3">
                            {studentsForAttendance.slice(0, 3).map(student => ( // Use real students here
                                <div key={student.id} className="flex items-center gap-3 p-2 bg-stone-900 rounded">
                                    <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold">{student.name.charAt(0)}</div>
                                    <div className="flex-1"><p className="text-white text-sm font-bold">{student.nickname || student.name}</p></div>
                                    <Button variant="secondary" className="text-xs h-7 px-2" onClick={() => handleOpenEvaluation(student.id)}>Avaliar</Button>
                                </div>
                            ))}
                        </div>
                        {/* New Assignments Card Summary */}
                        <div 
                            onClick={() => setProfView('assignments')}
                            className="mt-4 bg-stone-900 p-3 rounded cursor-pointer hover:bg-stone-700 transition-colors border border-stone-600 flex justify-between items-center"
                        >
                            <div className="flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-400"/>
                                <span className="text-sm font-bold text-white">Trabalhos Pendentes</span>
                            </div>
                            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{profModeAssignments.filter(a => a.status === 'pending').length}</span>
                        </div>

                        <button onClick={() => setProfView('all_students')} className="w-full text-center text-purple-400 text-sm mt-4 hover:underline">Ver todos os alunos</button>
                    </div>
                </div>
              </>
           )}
        </div>
      )}

    </div>
  );
};