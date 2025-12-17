import React, { useState, useEffect, useMemo } from 'react';
import { User, GroupEvent, MusicItem, UniformOrder, StudentAcademicData, ClassSession, Assignment as AssignmentType, StudentGrade, GradeCategory } from '../types'; // Renamed Assignment to AssignmentType to avoid conflict
import { Users, CalendarCheck, PlusCircle, Copy, Check, ArrowLeft, Save, X, UploadCloud, BookOpen, Paperclip, Calendar, Wallet, Info, Shirt, ShoppingBag, Music, Mic2, MessageCircle, AlertTriangle, Video, Clock, Camera, UserPlus, Shield, Award } from 'lucide-react'; // Adicionado Shield
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

type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager' | 'grades';

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
}) => {
  const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
  const [myClasses, setMyClasses] = useState<ClassSession[]>(classSessions.filter(cs => cs.professor_id === user.id)); // Use real class sessions
  const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '' });
  
  // Attendance State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null); // Changed to string
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
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

  // State for students managed by this professor
  const [myStudents, setMyStudents] = useState<User[]>([]);

  useEffect(() => {
    const fetchMyStudents = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nickname, belt, phone, graduation_cost')
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
          graduationCost: p.graduation_cost !== null ? Number(p.graduation_cost) : undefined,
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


  // Filter my orders
  const myOrders = uniformOrders.filter(o => o.user_id === user.id);

  // Belt Bar Style with Ponta support
  const beltColors = useMemo(() => {
    const b = (user.belt || '').toLowerCase();
    const colorMap: Record<string, string> = {
      'verde': '#22c55e',
      'amarelo': '#f59e0b',
      'azul': '#3b82f6',
      'branco': '#ffffff',
      'cinza': '#9ca3af',
    };
    
    let mainColor = user.beltColor || '#fff';
    let pontaColor: string | null = null;
    
    if (b.includes('verde, amarelo, azul e branco')) {
      mainColor = 'linear-gradient(to bottom,#22c55e,#f59e0b,#3b82f6,#ffffff)';
    } else if (b.includes('amarelo e azul')) {
      mainColor = 'linear-gradient(to bottom,#f59e0b,#3b82f6)';
    } else if (b.includes('verde e amarelo')) {
      mainColor = 'linear-gradient(to bottom,#22c55e,#f59e0b)';
    } else if (b.includes('verde e branco')) {
      mainColor = 'linear-gradient(to bottom,#22c55e,#ffffff)';
    } else if (b.includes('amarelo e branco')) {
      mainColor = 'linear-gradient(to bottom,#f59e0b,#ffffff)';
    } else if (b.includes('azul e branco')) {
      mainColor = 'linear-gradient(to bottom,#3b82f6,#ffffff)';
    } else if (b.includes('cinza')) {
      mainColor = '#9ca3af';
    } else if (b.includes('verde')) {
      mainColor = '#22c55e';
    } else if (b.includes('amarelo')) {
      mainColor = '#f59e0b';
    } else if (b.includes('azul')) {
      mainColor = '#3b82f6';
    } else if (b.includes('branco')) {
      mainColor = '#ffffff';
    }
    
    if (b.includes('ponta')) {
      const pontaMatch = b.match(/ponta\s+(\w+)/);
      if (pontaMatch) {
        const pontaName = pontaMatch[1];
        if (pontaName.includes('verde')) pontaColor = colorMap['verde'];
        else if (pontaName.includes('amarelo')) pontaColor = colorMap['amarelo'];
        else if (pontaName.includes('azul')) pontaColor = colorMap['azul'];
        else if (pontaName.includes('branco')) pontaColor = colorMap['branco'];
      }
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
    const initial: Record<string, boolean> = {};
    myStudents.forEach(s => initial[s.id] = true); // Use real students
    setAttendanceData(initial);
    setSelectedClassId(classId);
    setProfView('attendance');
  };

  const handleSaveAttendance = () => {
    setShowSuccess(true);
    setTimeout(() => {
        setSelectedClassId(null);
        setProfView('dashboard');
        setShowSuccess(false);
        onNotifyAdmin('Realizou chamada de aula', user);
    }, 1500);
  };

  const handleSaveNewClass = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newClassData.title || !newClassData.date || !newClassData.time || !newClassData.location) {
        alert('Por favor, preencha todos os campos da aula.');
        return;
      }
      const newSession = { 
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
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-stone-700 flex items-center justify-center border-4 border-white/10 overflow-hidden shadow-lg">
                        <Logo className="w-full h-full object-cover" />
                    </div>
                </div>
                
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

        {/* Top Actions */}
        <div className="flex flex-wrap gap-2 justify-end bg-stone-800 p-4 rounded-xl border border-stone-700">
            <Button variant="secondary" onClick={() => setProfView('music_manager')} className="border border-stone-600">
                <Music size={18} className="text-yellow-400" /> Músicas
            </Button>
            <Button variant="secondary" onClick={() => setProfView('assignments')} className="border border-stone-600">
                <BookOpen size={18} className="text-blue-400" /> Trabalhos
            </Button>
             <Button variant="secondary" onClick={() => setProfView('uniform')} className="border border-stone-600">
                <Shirt size={18} className="text-orange-400" /> Uniforme
            </Button>
            <Button variant="secondary" onClick={() => setProfView('grades')} className="border border-stone-600">
                <Award size={18} className="text-green-400" /> Notas
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
        
        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
          <div className="w-full bg-stone-900 rounded-lg p-4 mb-4 border-l-4 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: beltColors.mainColor }}></div>
            {beltColors.pontaColor && (
              <div className="absolute left-0 bottom-0 w-2 h-3 rounded-b" style={{ background: beltColors.pontaColor }}></div>
            )}
            <p className="text-xs text-stone-500 uppercase tracking-wider">Graduação Atual</p>
            <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
              <Award className="text-orange-500" />
              {user.belt || 'Cordel Cinza'}
            </p>
          </div>
        </div>

        {/* --- UNIFORM VIEW --- */}
        {profView === 'uniform' && (
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                <h2 className="text-2xl font-bold text-white mb-6">Solicitar Uniforme (Professor)</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <form onSubmit={handleOrderUniform} className="space-y-4">
                        <select value={orderForm.item} onChange={e => setOrderForm({...orderForm, item: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white">
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
                                onChange={(e) => setOrderForm({...orderForm, shirtSize: e.target.value})}
                                className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"
                            />
                            <input 
                                type="text"
                                placeholder="Ex: 40, 42"
                                value={orderForm.pantsSize}
                                onChange={(e) => setOrderForm({...orderForm, pantsSize: e.target.value})}
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
                 <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                 <h2 className="2xl font-bold text-white mb-6">Trabalhos</h2>
                 <form onSubmit={handleAddAssignment} className="mb-6 space-y-4 bg-stone-900 p-4 rounded">
                     <input type="text" placeholder="Título" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" required />
                     <textarea placeholder="Descrição" value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" />
                     <input type="date" value={newAssignment.dueDate} onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white [color-scheme:dark]" required />
                     <Button type="submit">Criar Tarefa</Button>
                 </form>
                 <div className="space-y-2">
                     {profAssignments.map(a => (
                         <div key={a.id} className="bg-stone-900 p-3 rounded border-l-4 border-blue-500">
                             <p className="font-bold text-white">{a.title}</p>
                             <p className="text-xs text-stone-400">Entrega: {a.due_date}</p>
                             {a.student_id && <p className="text-xs text-stone-500">Atribuído a: {myStudents.find(s => s.id === a.student_id)?.nickname || 'Aluno Desconhecido'}</p>}
                         </div>
                     ))}
                 </div>
             </div>
        )}

        {/* --- MUSIC MANAGER VIEW --- */}
        {profView === 'music_manager' && (
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                 <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                 <h2 className="2xl font-bold text-white mb-6">Adicionar Música</h2>
                 <form onSubmit={handleSubmitMusic} className="space-y-4">
                      <input type="text" placeholder="Título" value={musicForm.title} onChange={e => setMusicForm({...musicForm, title: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                      <input type="text" placeholder="Categoria" value={musicForm.category} onChange={e => setMusicForm({...musicForm, category: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                      <textarea placeholder="Letra..." value={musicForm.lyrics} onChange={e => setMusicForm({...musicForm, lyrics: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white h-32" />
                      <Button fullWidth type="submit">Salvar no Acervo</Button>
                 </form>
            </div>
        )}

        {/* --- GRADES VIEW --- */}
        {profView === 'grades' && (
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
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
                      <button onClick={() => setSelectedStudentForGrades(null)} className="text-stone-400 flex items-center gap-1 text-sm"><ArrowLeft size={14}/> Voltar</button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <p className="text-stone-300 text-sm font-semibold">Teórica</p>
                        <textarea className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white h-24" placeholder="Avaliação escrita" value={gradesForm.theory.written} onChange={e => setGradesForm({...gradesForm, theory: {...gradesForm.theory, written: e.target.value}})} />
                        <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" placeholder="Nota (0-10)" value={gradesForm.theory.numeric} onChange={e => setGradesForm({...gradesForm, theory: {...gradesForm.theory, numeric: e.target.value}})} disabled={!gradesForm.theory.written.trim()} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-stone-300 text-sm font-semibold">Movimentação</p>
                        <textarea className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white h-24" placeholder="Avaliação escrita" value={gradesForm.movement.written} onChange={e => setGradesForm({...gradesForm, movement: {...gradesForm.movement, written: e.target.value}})} />
                        <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" placeholder="Nota (0-10)" value={gradesForm.movement.numeric} onChange={e => setGradesForm({...gradesForm, movement: {...gradesForm.movement, numeric: e.target.value}})} disabled={!gradesForm.movement.written.trim()} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-stone-300 text-sm font-semibold">Musicalidade</p>
                        <textarea className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white h-24" placeholder="Avaliação escrita" value={gradesForm.musicality.written} onChange={e => setGradesForm({...gradesForm, musicality: {...gradesForm.musicality, written: e.target.value}})} />
                        <input type="number" min="0" max="10" step="0.1" className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" placeholder="Nota (0-10)" value={gradesForm.musicality.numeric} onChange={e => setGradesForm({...gradesForm, musicality: {...gradesForm.musicality, numeric: e.target.value}})} disabled={!gradesForm.musicality.written.trim()} />
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

        {/* --- ATTENDANCE VIEW --- */}
        {profView === 'attendance' && selectedClassInfo && (
             <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                 <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setProfView('dashboard')} className="text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                    <h2 className="xl font-bold text-white">Chamada: {selectedClassInfo.title}</h2>
                    <Button onClick={handleSaveAttendance} disabled={showSuccess}>{showSuccess ? 'Salvo!' : 'Salvar'}</Button>
                 </div>
                 <div className="space-y-2">
                     {myStudents.map(s => (
                         <div key={s.id} className={`flex justify-between items-center p-3 rounded cursor-pointer ${attendanceData[s.id] ? 'bg-green-900/20 border border-green-900' : 'bg-red-900/20 border border-red-900'}`} onClick={() => setAttendanceData({...attendanceData, [s.id]: !attendanceData[s.id]})}>
                             <span className="text-white">{s.nickname || s.name}</span>
                             <span className={`text-xs font-bold px-2 py-1 rounded ${attendanceData[s.id] ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{attendanceData[s.id] ? 'Presente' : 'Ausente'}</span>
                         </div>
                     ))}
                 </div>
             </div>
        )}

        {/* --- NEW CLASS VIEW --- */}
        {profView === 'new_class' && (
             <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                 <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                 <h2 className="2xl font-bold text-white mb-6">Agendar Aula</h2>
                 <form onSubmit={handleSaveNewClass} className="space-y-4">
                     <input type="text" placeholder="Título" value={newClassData.title} onChange={e => setNewClassData({...newClassData, title: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                     <div className="grid grid-cols-2 gap-4">
                         <input type="date" placeholder="Data" value={newClassData.date} onChange={e => setNewClassData({...newClassData, date: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white [color-scheme:dark]" required />
                         <input type="time" value={newClassData.time} onChange={e => setNewClassData({...newClassData, time: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                     </div>
                     <input type="text" placeholder="Local" value={newClassData.location} onChange={e => setNewClassData({...newClassData, location: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                     <Button fullWidth type="submit">Confirmar Agendamento</Button>
                 </form>
             </div>
        )}

        {/* --- DEFAULT DASHBOARD --- */}
        {profView === 'dashboard' && (
            <div className="space-y-6">
                {/* Graduation Cost Alert for Professor */}
                {/* MODIFIED: Always show graduationCost, default to 0 if undefined */}
                <div className="bg-green-900/30 border border-green-800 rounded-xl p-4 mb-4 animate-pulse">
                    <p className="text-xs text-green-400 uppercase tracking-wider font-bold mb-1 flex items-center justify-center gap-1">
                        <Wallet size={12}/> Sua Próxima Graduação
                    </p>
                    <p className="text-xl font-bold text-white text-center">R$ {(user.graduationCost ?? 0).toFixed(2).replace('.', ',')}</p>
                    {(user.graduationCost ?? 0) === 0 ? (
                        <p className="text-[10px] text-stone-400 mt-1 text-center">Custo definido pela coordenação (Gratuito)</p>
                    ) : (
                        <p className="text-[10px] text-stone-400 mt-1 text-center">Valor definido pela coordenação</p>
                    )}
                </div>

                {/* Photo Upload Card */}
                <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 relative mb-6">
                    <h3 className="xl font-bold text-white mb-4 flex items-center gap-2"><Camera className="text-purple-500" /> Registrar Aula</h3>
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
                                        <div><p className="font-bold text-white">{cls.title}</p><p className="text-stone-500 text-sm">{cls.date} - {cls.time} - {cls.location}</p></div>
                                    </div>
                                    <Button fullWidth onClick={() => handleOpenAttendance(cls.id)}>Realizar Chamada</Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                        <h3 className="text-xl font-bold text-white mb-4">Acompanhamento</h3>
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
                        {/* New Assignments Card Summary */}
                        <div 
                            onClick={() => setProfView('assignments')}
                            className="mt-4 bg-stone-900 p-3 rounded cursor-pointer hover:bg-stone-700 transition-colors border border-stone-600 flex justify-between items-center"
                        >
                            <div className="flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-400"/>
                                <span className="text-sm font-bold text-white">Trabalhos Pendentes</span>
                            </div>
                            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{profAssignments.filter(a => a.status === 'pending').length}</span>
                        </div>

                        <button onClick={() => setProfView('all_students')} className="w-full text-center text-purple-400 text-sm mt-4 hover:underline">Ver todos os alunos</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};