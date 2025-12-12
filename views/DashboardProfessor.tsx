import React, { useState } from 'react';
import { User, GroupEvent, MusicItem, UniformOrder, StudentAcademicData } from '../types';
import { Users, CalendarCheck, PlusCircle, Copy, Check, ArrowLeft, Save, X, UploadCloud, BookOpen, Paperclip, Calendar, Wallet, Info, Shirt, ShoppingBag, Music, Mic2, MessageCircle, AlertTriangle, Video, Clock, Camera } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../src/integrations/supabase/client'; // Import supabase client

interface Props {
  user: User;
  events: GroupEvent[];
  musicList: MusicItem[];
  uniformOrders: UniformOrder[];
  onAddOrder: (order: UniformOrder) => void;
  onAddMusic: (music: MusicItem) => void;
  onNotifyAdmin: (action: string, user: User) => void;
  onUpdateProfile: (data: Partial<User>) => void;
  classSessions: any[]; // Assuming classSessions are passed, but not directly used in this fix
  onAddClassSession: (newSession: any) => Promise<void>;
  onUpdateClassSession: (updatedSession: any) => Promise<void>;
  assignments: any[];
  onAddAssignment: (newAssignment: any) => Promise<void>;
  onUpdateAssignment: (updatedAssignment: any) => Promise<void>;
  homeTrainings: any[];
  eventRegistrations: any[]; // Added for consistency, though not directly used in this component's logic
}

interface Assignment {
  id: string; // Changed to string for consistency with Supabase
  title: string;
  description: string;
  due_date: string; // Changed to due_date for consistency with Supabase
  status: 'pending' | 'completed';
  attachment_url?: string; // Changed to attachment_url for consistency with Supabase
}

const UNIFORM_PRICES = {
    shirt: 30,
    pants_roda: 80,
    pants_train: 80,
    combo: 110
};

type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager';

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
}) => {
  const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
  const [myClasses, setMyClasses] = useState(classSessions); // Use real class sessions
  const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '' });
  
  // Attendance State
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null); // Changed to string
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Assignments
  const [assignmentsState, setAssignmentsState] = useState<Assignment[]>(assignments); // Use real assignments

  // Music
  const [musicForm, setMusicForm] = useState({ title: '', category: '', lyrics: '' });

  // Uniform
  const [orderForm, setOrderForm] = useState({ item: 'combo', shirtSize: '', pantsSize: '' });
  const [costPixCopied, setCostPixCopied] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // Photo
  const [classPhoto, setClassPhoto] = useState<string | null>(null);

  // Evaluation
  const [selectedStudentForEval, setSelectedStudentForEval] = useState<string | null>(null);
  const [evalData, setEvalData] = useState({ positive: '', negative: '' });

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


  // Filter my orders
  const myOrders = uniformOrders.filter(o => o.user_id === user.id);

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
      if (!newAssignment.title || !newAssignment.due_date) { // Changed to due_date
        alert('Por favor, preencha o título e a data de entrega do trabalho.');
        return;
      }
      const assignmentPayload = {
        created_by: user.id,
        title: newAssignment.title,
        description: newAssignment.description,
        due_date: newAssignment.due_date, // Changed to due_date
        status: 'pending',
      };
      await onAddAssignment(assignmentPayload);
      setNewAssignment({ title: '', description: '', due_date: '' }); // Changed to due_date
      onNotifyAdmin(`Criou trabalho: ${newAssignment.title}`, user);
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
    onAddOrder(newOrder);
    alert('Pedido realizado! Aguarde a confirmação do Admin.');
    setOrderForm({ item: 'combo', shirtSize: '', pantsSize: '' });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => { if(ev.target?.result) setClassPhoto(ev.target.result as string); }
        reader.readAsDataURL(e.target.files[0]);
        onNotifyAdmin('Enviou foto da aula', user);
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
                     <input type="date" value={newAssignment.due_date} onChange={e => setNewAssignment({...newAssignment, due_date: e.target.value})} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white [color-scheme:dark]" required />
                     <Button type="submit">Criar Tarefa</Button>
                 </form>
                 <div className="space-y-2">
                     {assignmentsState.map(a => (
                         <div key={a.id} className="bg-stone-900 p-3 rounded border-l-4 border-blue-500">
                             <p className="font-bold text-white">{a.title}</p>
                             <p className="text-xs text-stone-400">Entrega: {a.due_date}</p>
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
                      <textarea placeholder="Letra..." value={musicForm.lyrics} onChange={e => setMusicForm({...musicForm, lyrics: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white h-32" required />
                      <Button fullWidth type="submit">Salvar no Acervo</Button>
                 </form>
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
                            {myStudents.slice(0,3).map(s => (
                                <div key={s.id} className="bg-stone-900 p-3 rounded flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold">{s.name.charAt(0)}</div>
                                    <span className="text-white text-sm">{s.nickname || s.name}</span>
                                </div>
                            ))}
                        </div>
                        <Button fullWidth variant="secondary" className="mt-4 text-xs" onClick={() => setProfView('all_students')}>Ver Todos</Button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};