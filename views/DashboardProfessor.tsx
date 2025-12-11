import React, { useState } from 'react';
import { User, GroupEvent, MusicItem, UniformOrder } from '../types';
import { Users, CalendarCheck, PlusCircle, Copy, Check, ArrowLeft, Save, X, UploadCloud, BookOpen, Paperclip, Calendar, Wallet, Info, Shirt, ShoppingBag, Music, Mic2, MessageCircle, AlertTriangle, Video, Clock, Camera } from 'lucide-react';
import { Button } from '../components/Button';

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
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'completed';
  attachment?: string;
}

const UNIFORM_PRICES = {
    shirt: 30,
    pants_roda: 80,
    pants_train: 80,
    combo: 110
};

// Mock Initial Data for classes
const INITIAL_CLASSES = [
  { id: 1, title: 'Treino Técnico - Intermediário', time: 'Hoje, 19:30', location: 'Sede' },
  { id: 2, title: 'Roda de Fundamentos', time: 'Amanhã, 20:00', location: 'Praça Central' },
  { id: 3, title: 'Música e Instrumentação', time: 'Sábado, 10:00', location: 'Sede' }
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
    { id: 101, title: 'Pesquisa: Mestre Bimba', description: 'Trazer resumo impresso sobre a criação da Regional.', dueDate: new Date().toISOString().split('T')[0], status: 'pending' }, 
];

// Removed MY_STUDENTS_LIST as it will be fetched from managedUsers in DashboardAdmin
// const MY_STUDENTS_LIST = [
//   { id: 's1', name: 'João "Gafanhoto" Silva', belt: 'Cordel Verde', phone: '5511999999999' },
//   { id: 's2', name: 'Maria "Vespa" Oliveira', belt: 'Cordel Amarelo', phone: '5511988888888' },
//   { id: 's3', name: 'Pedro "Ouriço" Santos', belt: 'Cordel Cinza', phone: '5511977777777' },
// ];

type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager';

export const DashboardProfessor: React.FC<Props> = ({ 
  user, 
  events, 
  musicList, 
  uniformOrders, 
  onAddOrder, 
  onAddMusic, 
  onNotifyAdmin,
  onUpdateProfile 
}) => {
  const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
  const [myClasses, setMyClasses] = useState(INITIAL_CLASSES);
  const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '' });
  
  // Attendance State
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Assignments
  const [assignmentsState, setAssignmentsState] = useState<Assignment[]>(INITIAL_ASSIGNMENTS); // Renamed to avoid conflict with prop
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '' });

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

  // Filter my orders
  const myOrders = uniformOrders.filter(o => o.userId === user.id);

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

  const handleOpenAttendance = (classId: number) => {
    // This list should come from a prop or fetched from Supabase based on the professor's students
    const mockStudents = [
      { id: 's1', name: 'João "Gafanhoto" Silva', belt: 'Cordel Verde', phone: '5511999999999' },
      { id: 's2', name: 'Maria "Vespa" Oliveira', belt: 'Cordel Amarelo', phone: '5511988888888' },
      { id: 's3', name: 'Pedro "Ouriço" Santos', belt: 'Cordel Cinza', phone: '5511977777777' },
    ];
    const initial: Record<string, boolean> = {};
    mockStudents.forEach(s => initial[s.id] = true);
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

  const handleSaveNewClass = (e: React.FormEvent) => {
      e.preventDefault();
      setMyClasses([...myClasses, { id: Date.now(), title: newClassData.title, time: `${newClassData.date} ${newClassData.time}`, location: newClassData.location }]);
      setProfView('dashboard');
      onNotifyAdmin(`Agendou nova aula: ${newClassData.title}`, user);
  };

  const handleSubmitMusic = (e: React.FormEvent) => {
    e.preventDefault();
    onAddMusic({ id: Date.now().toString(), title: musicForm.title, category: musicForm.category, lyrics: musicForm.lyrics });
    setMusicForm({ title: '', category: '', lyrics: '' });
    onNotifyAdmin(`Adicionou música: ${musicForm.title}`, user);
    alert('Música adicionada!');
  };

  const handleAddAssignment = (e: React.FormEvent) => {
      e.preventDefault();
      setAssignmentsState([...assignmentsState, { id: Date.now(), ...newAssignment, status: 'pending' }]);
      setNewAssignment({ title: '', description: '', dueDate: '' });
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
        userId: user.id,
        userName: user.nickname || user.name,
        userRole: user.role,
        date: new Date().toLocaleDateString('pt-BR'),
        item: itemName,
        shirtSize: orderForm.item.includes('pants') ? undefined : orderForm.shirtSize,
        pantsSize: orderForm.item === 'shirt' ? undefined : orderForm.pantsSize,
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
    // This list should come from a prop or fetched from Supabase based on the professor's students
    const mockStudents = [
      { id: 's1', name: 'João "Gafanhoto" Silva', belt: 'Cordel Verde', phone: '5511999999999' },
      { id: 's2', name: 'Maria "Vespa" Oliveira', belt: 'Cordel Amarelo', phone: '5511988888888' },
      { id: 's3', name: 'Pedro "Ouriço" Santos', belt: 'Cordel Cinza', phone: '5511977777777' },
    ];
    const studentName = mockStudents.find(s => s.id === selectedStudentForEval)?.name || 'Aluno';
    onNotifyAdmin(`Avaliou o aluno: ${studentName}`, user); // Added notification
  };

  const selectedClassInfo = myClasses.find(c => c.id === selectedClassId);

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
                                <p className="text-xs">Total: R$ {o.total},00</p>
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
                 <h2 className="text-2xl font-bold text-white mb-6">Trabalhos</h2>
                 <form onSubmit={handleAddAssignment} className="mb-6 space-y-4 bg-stone-900 p-4 rounded">
                     <input type="text" placeholder="Título" value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" required />
                     <textarea placeholder="Descrição" value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white" />
                     <input type="date" value={newAssignment.dueDate} onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})} className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white [color-scheme:dark]" required />
                     <Button type="submit">Criar Tarefa</Button>
                 </form>
                 <div className="space-y-2">
                     {assignmentsState.map(a => (
                         <div key={a.id} className="bg-stone-900 p-3 rounded border-l-4 border-blue-500">
                             <p className="font-bold text-white">{a.title}</p>
                             <p className="text-xs text-stone-400">Entrega: {a.dueDate}</p>
                         </div>
                     ))}
                 </div>
             </div>
        )}

        {/* --- MUSIC MANAGER VIEW --- */}
        {profView === 'music_manager' && (
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                 <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                 <h2 className="text-2xl font-bold text-white mb-6">Adicionar Música</h2>
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
                    <h2 className="text-xl font-bold text-white">Chamada: {selectedClassInfo.title}</h2>
                    <Button onClick={handleSaveAttendance} disabled={showSuccess}>{showSuccess ? 'Salvo!' : 'Salvar'}</Button>
                 </div>
                 <div className="space-y-2">
                     {/* This list should come from a prop or fetched from Supabase based on the professor's students */}
                     {/* For now, using a mock list for attendance */}
                     {[
                        { id: 's1', name: 'João "Gafanhoto" Silva', belt: 'Cordel Verde', phone: '5511999999999' },
                        { id: 's2', name: 'Maria "Vespa" Oliveira', belt: 'Cordel Amarelo', phone: '5511988888888' },
                        { id: 's3', name: 'Pedro "Ouriço" Santos', belt: 'Cordel Cinza', phone: '5511977777777' },
                     ].map(s => (
                         <div key={s.id} className={`flex justify-between items-center p-3 rounded cursor-pointer ${attendanceData[s.id] ? 'bg-green-900/20 border border-green-900' : 'bg-red-900/20 border border-red-900'}`} onClick={() => setAttendanceData({...attendanceData, [s.id]: !attendanceData[s.id]})}>
                             <span className="text-white">{s.name}</span>
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
                 <h2 className="text-2xl font-bold text-white mb-6">Agendar Aula</h2>
                 <form onSubmit={handleSaveNewClass} className="space-y-4">
                     <input type="text" placeholder="Título" value={newClassData.title} onChange={e => setNewClassData({...newClassData, title: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                     <div className="grid grid-cols-2 gap-4">
                         <select value={newClassData.date} onChange={e => setNewClassData({...newClassData, date: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"><option value="Hoje">Hoje</option><option value="Amanhã">Amanhã</option></select>
                         <input type="time" value={newClassData.time} onChange={e => setNewClassData({...newClassData, time: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                     </div>
                     <input type="text" placeholder="Local" value={newClassData.location} onChange={e => setNewClassData({...newClassData, location: e.target.value})} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" />
                     <Button fullWidth type="submit">Confirmar Agendamento</Button>
                 </form>
             </div>
        )}

        {/* --- DEFAULT DASHBOARD --- */}
        {profView === 'dashboard' && (
            <div className="space-y-6">
                {/* Photo Upload Card */}
                <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Camera className="text-purple-500" /> Registrar Aula</h3>
                    <div className="border-2 border-dashed border-stone-600 rounded-lg p-6 flex justify-center bg-stone-900/30">
                         {classPhoto ? (
                             <div className="relative"><img src={classPhoto} className="h-40 rounded" /><button onClick={() => setClassPhoto(null)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1"><X size={12}/></button></div>
                         ) : (
                             <label className="cursor-pointer text-stone-400 flex flex-col items-center hover:text-white"><UploadCloud size={32}/><span className="mt-2 text-sm">Enviar Foto da Turma</span><input type="file" className="hidden" onChange={handlePhotoUpload} /></label>
                         )}
                    </div>
                </div>

                {/* Classes List */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                        <h3 className="text-lg font-bold text-white mb-4">Minhas Aulas</h3>
                        <div className="space-y-3">
                            {myClasses.map(c => (
                                <div key={c.id} className="bg-stone-900 p-4 rounded border-l-2 border-purple-500 flex justify-between items-center">
                                    <div><p className="font-bold text-white">{c.title}</p><p className="text-xs text-stone-500">{c.time}</p></div>
                                    <Button onClick={() => handleOpenAttendance(c.id)}>Chamada</Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                        <h3 className="text-lg font-bold text-white mb-4">Acompanhamento</h3>
                        <div className="space-y-2">
                             {/* This list should come from a prop or fetched from Supabase based on the professor's students */}
                             {/* For now, using a mock list for display */}
                             {[
                                { id: 's1', name: 'João "Gafanhoto" Silva', belt: 'Cordel Verde', phone: '5511999999999' },
                                { id: 's2', name: 'Maria "Vespa" Oliveira', belt: 'Cordel Amarelo', phone: '5511988888888' },
                                { id: 's3', name: 'Pedro "Ouriço" Santos', belt: 'Cordel Cinza', phone: '5511977777777' },
                             ].slice(0,3).map(s => (
                                 <div key={s.id} className="bg-stone-900 p-3 rounded flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold text-white">{s.name.charAt(0)}</div>
                                     <span className="text-white text-sm">{s.name}</span>
                                 </div>
                             ))}
                        </div>
                        <Button fullWidth variant="secondary" className="mt-4 text-xs" onClick={() => setProfView('attendance')}>Ver Todos</Button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};