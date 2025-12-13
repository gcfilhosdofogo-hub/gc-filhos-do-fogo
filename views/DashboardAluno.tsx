import React, { useState, useEffect } from 'react';
import { User, ClassSession, GroupEvent, MusicItem, HomeTraining, UniformOrder, SchoolReport, EventRegistration, PaymentRecord } from '../types'; // Import PaymentRecord
import { Calendar, Award, Music, Video, Instagram, MapPin, Copy, Check, Ticket, Wallet, Info, X, UploadCloud, Clock, AlertTriangle, ArrowLeft, AlertCircle, GraduationCap, FileText, Shirt, ShoppingBag, Camera, Eye, PlayCircle, DollarSign, FileUp } from 'lucide-react'; // Import FileUp
import { Button } from '../components/Button';
import { supabase } from '../src/integrations/supabase/client'; // Import supabase client
import { Logo } from '../components/Logo'; // Import Logo component

interface Props {
  user: User;
  events: GroupEvent[];
  musicList: MusicItem[];
  uniformOrders: UniformOrder[];
  onAddOrder: (order: UniformOrder) => void;
  onNotifyAdmin: (action: string, user: User) => void;
  onUpdateProfile: (data: Partial<User>) => void;
  homeTrainings: HomeTraining[];
  onAddHomeTraining: (training: Omit<HomeTraining, 'id' | 'created_at'>) => Promise<void>;
  schoolReports: SchoolReport[]; // Now receiving from App.tsx
  onAddSchoolReport: (report: Omit<SchoolReport, 'id' | 'created_at'>) => Promise<void>; // Now receiving from App.tsx
  classSessions: ClassSession[]; // Use real class sessions
  assignments: any[]; // Assuming assignments are passed, but not directly used in this fix
  onUpdateAssignment: (assignment: any) => Promise<void>; // Assuming assignments are passed, but not directly used in this fix
  eventRegistrations: EventRegistration[]; // NEW: Event Registrations
  onAddEventRegistration: (newRegistration: Omit<EventRegistration, 'id' | 'registered_at'>) => Promise<void>; // NEW: Event Registrations
  allUsersProfiles: User[]; // NEW: All user profiles to find professor ID
  monthlyPayments?: PaymentRecord[]; // NEW: Pass monthly payments to student dashboard
  onUpdatePaymentRecord: (updatedPayment: PaymentRecord) => Promise<void>; // NEW: For updating payment proof
}

type ViewMode = 'dashboard' | 'music' | 'home_training' | 'school_report' | 'uniform' | 'event_registration';

const UNIFORM_PRICES = {
    shirt: 30,
    pants_roda: 80,
    pants_train: 80,
    combo: 110
};

export const DashboardAluno: React.FC<Props> = ({ 
  user, 
  events, 
  musicList, 
  uniformOrders, 
  onAddOrder, 
  onNotifyAdmin, 
  onUpdateProfile,
  homeTrainings,
  onAddHomeTraining,
  schoolReports, // Use prop
  onAddSchoolReport, // Use prop
  classSessions, // Use real class sessions
  assignments,
  onUpdateAssignment,
  eventRegistrations, // NEW: Event Registrations
  onAddEventRegistration, // NEW: Event Registrations
  allUsersProfiles, // NEW: All user profiles
  monthlyPayments = [], // NEW: Use prop for monthly payments, with default empty array
  onUpdatePaymentRecord, // NEW: Use prop for updating payment record
}) => {
  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [pixCopied, setPixCopied] = useState(false);
  const [costPixCopied, setCostPixCopied] = useState(false);
  const [showMyCosts, setShowMyCosts] = useState(false);
  
  // State for Video Pending Popup
  const [showPendingVideoPopup, setShowPendingVideoPopup] = useState(false);

  // Home Training State
  const [uploading, setUploading] = useState(false);

  // School Report State
  const [uploadingReport, setUploadingReport] = useState(false);

  // Uniform Order Form State
  const [orderForm, setOrderForm] = useState({
      item: 'combo',
      shirtSize: '',
      pantsSize: ''
  });

  // Event Registration State
  const [showEventRegisterModal, setShowEventRegisterModal] = useState(false);
  const [selectedEventToRegister, setSelectedEventToRegister] = useState<GroupEvent | null>(null);
  const [eventRegistrationAmount, setEventRegistrationAmount] = useState('');

  // Payment Proof Upload State
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const [selectedPaymentToProof, setSelectedPaymentToProof] = useState<PaymentRecord | null>(null);


  // Filter my orders from global state
  const myOrders = uniformOrders.filter(o => o.user_id === user.id);
  const myHomeTrainings = homeTrainings.filter(ht => ht.user_id === user.id);
  const mySchoolReports = schoolReports.filter(sr => sr.user_id === user.id);
  const myEventRegistrations = eventRegistrations.filter(reg => reg.user_id === user.id);
  const myMonthlyPayments = monthlyPayments.filter(p => p.student_id === user?.id); // Filter payments for the current user

  // NEW: Determine the professor's ID based on the student's professorName
  const studentProfessor = allUsersProfiles.find(
    (p) => (p.nickname === user.professorName || p.name === user.professorName) && (p.role === 'professor' || p.role === 'admin')
  );
  const studentProfessorId = studentProfessor?.id;

  // Debugging logs for class display
  // console.log('User Professor Name:', user.professorName);
  // console.log('Student Professor ID:', studentProfessorId);
  // classSessions.forEach(session => console.log(`Class Session ID: ${session.id}, Professor ID: ${session.professor_id}, Instructor: ${session.instructor}`));

  // NEW: Filter classes based on real data
  const myClasses = classSessions.filter(
    (session) => studentProfessorId && session.professor_id === studentProfessorId
  );
  const groupClasses = classSessions.filter(
    (session) => studentProfessorId && session.professor_id !== studentProfessorId
  );

  // Mock Logic: Today is NOT a class day, enforcing video upload logic
  const isClassDay = false; 

  // Check for pending video on mount
  useEffect(() => {
    // Se não for dia de aula e o aluno não tiver enviado vídeo hoje (simulação de lista vazia no inicio)
    if (!isClassDay && myHomeTrainings.length === 0) {
        // Pequeno delay para simular carregamento e ficar visualmente agradável
        const timer = setTimeout(() => {
            setShowPendingVideoPopup(true);
        }, 800);
        return () => clearTimeout(timer);
    }
  }, [isClassDay, myHomeTrainings.length]); // Run once on mount

  // Calculate Age
  const isOver18 = React.useMemo(() => {
    if (!user.birthDate) return false;
    const today = new Date();
    const birthDate = new Date(user.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  }, [user.birthDate]);

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
    onNotifyAdmin('Visualizou/Copiou PIX de Custos/Eventos', user);
    setTimeout(() => setCostPixCopied(false), 2000);
  };

  const handleUploadVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/home_trainings/${Date.now()}.${fileExt}`; // Unique path per user
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('home_training_videos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('home_training_videos')
            .getPublicUrl(filePath);

        const now = new Date();
        const expires = new Date(now.getTime() + (72 * 60 * 60 * 1000)); // 72 hours from now
        
        const newVideo: Omit<HomeTraining, 'id' | 'created_at'> = {
            user_id: user.id,
            date: now.toLocaleDateString('pt-BR'),
            video_name: file.name,
            video_url: publicUrlData.publicUrl,
            expires_at: expires.toISOString()
        };
        
        await onAddHomeTraining(newVideo); // Call prop to add to Supabase
        setUploading(false);
        setShowPendingVideoPopup(false); // Close popup if open
        onNotifyAdmin('Enviou vídeo de Treino em Casa', user);
        alert("Vídeo enviado com sucesso! Ele ficará disponível por 72 horas.");
    } catch (error: any) {
        console.error('Error uploading video:', error);
        alert("Erro ao enviar vídeo: " + error.message);
        setUploading(false);
    }
  };

  const handleUploadReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploadingReport(true);

    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/school_reports/${Date.now()}.${fileExt}`; // Unique path per user
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('school_reports_files')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // For private buckets, we store the path and generate a signed URL when needed for viewing
        const fileUrl = uploadData.path; 

        const now = new Date();
        
        const newReport: Omit<SchoolReport, 'id' | 'created_at'> = {
            user_id: user.id,
            date: now.toLocaleDateString('pt-BR'),
            file_name: file.name,
            file_url: fileUrl,
            period: 'Bimestre Atual', // Can be made dynamic if needed
            status: 'pending'
        };
        
        await onAddSchoolReport(newReport); // Call prop to add to Supabase
        setUploadingReport(false);
        onNotifyAdmin('Enviou Boletim Escolar', user); // Added notification
        alert("Boletim enviado com sucesso para a coordenação!");
    } catch (error: any) {
        console.error('Error uploading report:', error);
        alert("Erro ao enviar boletim: " + error.message);
        setUploadingReport(false);
    }
  };

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

  const handleGoToUpload = () => {
      setShowPendingVideoPopup(false);
      setActiveView('home_training');
  };

  const handleOrderUniform = (e: React.FormEvent) => {
    e.preventDefault();
    
    let price = 0;
    let itemName = '';
    let details = '';

    if (orderForm.item === 'shirt') {
        price = UNIFORM_PRICES.shirt;
        itemName = 'Blusa Oficial';
        if (!orderForm.shirtSize) return alert('Digite o tamanho da blusa');
        details = `Tamanho: ${orderForm.shirtSize}`;
    } else if (orderForm.item === 'pants_roda') {
        price = UNIFORM_PRICES.pants_roda;
        itemName = 'Calça de Roda';
        if (!orderForm.pantsSize) return alert('Digite o tamanho da calça');
        details = `Tamanho: ${orderForm.pantsSize}`;
    } else if (orderForm.item === 'pants_train') {
        price = UNIFORM_PRICES.pants_train;
        itemName = 'Calça de Treino';
        if (!orderForm.pantsSize) return alert('Digite o tamanho da calça');
        details = `Tamanho: ${orderForm.pantsSize}`;
    } else if (orderForm.item === 'combo') {
        price = UNIFORM_PRICES.combo;
        itemName = 'Combo (Blusa + Calça)';
        if (!orderForm.shirtSize || !orderForm.pantsSize) return alert('Digite os tamanhos');
        details = `Blusa: ${orderForm.shirtSize}, Calça: ${orderForm.pantsSize}`;
    }

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
    
    alert(`Solicitação enviada ao Admin! Valor Total: R$ ${price},00. O status ficará como Pendente até a confirmação do pagamento.`);
    setOrderForm({ item: 'combo', shirtSize: '', pantsSize: '' });
  };

  // Helper to get current price for display
  const getCurrentPrice = () => {
      switch(orderForm.item) {
          case 'shirt': return UNIFORM_PRICES.shirt;
          case 'pants_roda': return UNIFORM_PRICES.pants_roda;
          case 'pants_train': return UNIFORM_PRICES.pants_train;
          case 'combo': return UNIFORM_PRICES.combo;
          default: return 0;
      }
  };

  const handleOpenEventRegisterModal = (event: GroupEvent) => {
    setSelectedEventToRegister(event);
    setEventRegistrationAmount(event.price ? event.price.toString() : '0');
    setShowEventRegisterModal(true);
  };

  const handleRegisterForEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventToRegister || !eventRegistrationAmount) return;

    const amount = parseFloat(eventRegistrationAmount);
    if (isNaN(amount) || amount < 0) {
        alert('Por favor, insira um valor válido para o pagamento.');
        return;
    }

    const newRegistration: Omit<EventRegistration, 'id' | 'registered_at'> = {
        event_id: selectedEventToRegister.id,
        user_id: user.id,
        user_name: user.nickname || user.name,
        event_title: selectedEventToRegister.title,
        amount_paid: amount,
        status: amount > 0 ? 'pending' : 'paid', // If price is 0, mark as paid directly
    };

    await onAddEventRegistration(newRegistration);
    onNotifyAdmin(`Registrou-se no evento: ${selectedEventToRegister.title}`, user);
    alert(`Inscrição no evento "${selectedEventToRegister.title}" realizada com sucesso!`);
    setShowEventRegisterModal(false);
    setSelectedEventToRegister(null);
    setEventRegistrationAmount('');
  };

  const handleUploadPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedPaymentToProof) return;

    const file = e.target.files[0];
    setUploadingPaymentProof(true);

    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/payment_proofs/${selectedPaymentToProof.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payment_proofs') // Assuming a bucket named 'payment_proofs' exists
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // For private buckets, we store the path and generate a signed URL when needed for viewing
        const fileUrl = uploadData.path; 
        
        const updatedPayment: PaymentRecord = {
            ...selectedPaymentToProof,
            proof_url: fileUrl, // Store the path, not public URL for private buckets
            proof_name: file.name,
            status: 'pending', // Keep as pending until admin confirms
        };
        
        await onUpdatePaymentRecord(updatedPayment);
        setUploadingPaymentProof(false);
        setSelectedPaymentToProof(null);
        onNotifyAdmin(`Aluno ${user.nickname || user.name} enviou comprovante de pagamento para ${selectedPaymentToProof.month}`, user);
        alert("Comprovante enviado com sucesso! O Admin será notificado para confirmar o pagamento.");
    } catch (error: any) {
        console.error('Error uploading payment proof:', error);
        alert("Erro ao enviar comprovante: " + error.message);
        setUploadingPaymentProof(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">

      {/* PENDING VIDEO POPUP */}
      {showPendingVideoPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-stone-800 rounded-2xl border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)] max-w-md w-full p-6 relative">
                  <div className="flex flex-col items-center text-center">
                      <div className="bg-red-900/30 p-4 rounded-full mb-4 animate-pulse">
                          <Video size={48} className="text-red-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Treino Pendente!</h3>
                      <p className="text-stone-300 mb-6">
                          Hoje não é dia de aula presencial com seu professor. Para garantir sua presença e evolução, o envio do vídeo de treino é <strong>obrigatório</strong>.
                      </p>
                      <div className="flex flex-col w-full gap-3">
                          <Button fullWidth onClick={handleGoToUpload}>
                              Enviar Vídeo Agora
                          </Button>
                          <button 
                            onClick={() => setShowPendingVideoPopup(false)}
                            className="text-stone-500 hover:text-white text-sm py-2 transition-colors"
                          >
                              Vou enviar mais tarde
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MY COSTS MODAL (For All Students) */}
      {showMyCosts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
              <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative">
                  <button onClick={() => setShowMyCosts(false)} className="absolute top-4 right-4 text-stone-400 hover:text-white"><X size={20}/></button>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Wallet className="text-green-500" />
                      Meus Custos e Eventos
                  </h3>
                  
                  {/* Graduation Cost */}
                  <div className="bg-stone-900 rounded-lg p-4 mb-4 border border-stone-700">
                      <h4 className="text-stone-400 text-xs uppercase font-bold mb-2">Minha Próxima Graduação</h4>
                      {/* MODIFIED: Always show graduationCost, default to 0 if undefined */}
                      <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-green-400">R$ {(user.graduationCost ?? 0).toFixed(2).replace('.', ',')}</span>
                          {(user.graduationCost ?? 0) === 0 ? (
                              <span className="text-xs text-stone-500 bg-stone-800 px-2 py-1 rounded">Gratuito (Definido pela Coordenação)</span>
                          ) : (
                              <span className="text-xs text-stone-500 bg-stone-800 px-2 py-1 rounded">Valor definido pela coordenação</span>
                          )}
                      </div>
                  </div>

                  {/* Monthly Payments List */}
                  <div className="mb-6">
                      <h4 className="text-stone-400 text-xs uppercase font-bold mb-3">Minhas Mensalidades</h4>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                          {myMonthlyPayments.length > 0 ? (
                              myMonthlyPayments.map(payment => (
                                  <div key={payment.id} className={`bg-stone-900 p-3 rounded border-l-2 ${payment.status === 'paid' ? 'border-green-500' : 'border-yellow-500'} flex justify-between items-center`}>
                                      <div>
                                          <p className="font-bold text-white text-sm">{payment.month} ({payment.due_date})</p>
                                          <p className="text-stone-500 text-xs">R$ {payment.amount.toFixed(2).replace('.', ',')}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {payment.status === 'paid' && (
                                              <span className="text-green-400 text-xs flex items-center gap-1">
                                                  <Check size={12}/> Pago
                                              </span>
                                          )}
                                          {payment.status === 'pending' && !payment.proof_url && (
                                              <label className="cursor-pointer">
                                                  <span className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors inline-block">
                                                      {uploadingPaymentProof && selectedPaymentToProof?.id === payment.id ? 'Enviando...' : 'Enviar Comprovante'}
                                                  </span>
                                                  <input 
                                                      type="file" 
                                                      accept="image/*, application/pdf" 
                                                      className="hidden" 
                                                      onChange={handleUploadPaymentProof}
                                                      onClick={() => setSelectedPaymentToProof(payment)}
                                                      disabled={uploadingPaymentProof}
                                                  />
                                              </label>
                                          )}
                                          {payment.status === 'pending' && payment.proof_url && (
                                              <span className="text-yellow-400 text-xs flex items-center gap-1">
                                                  <Clock size={12}/> Comprovante Enviado
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <p className="text-stone-500 text-sm italic">Nenhuma mensalidade registrada.</p>
                          )}
                      </div>
                  </div>

                  {/* PIX Copy inside Modal */}
                  <div className="mb-6 bg-stone-900 p-4 rounded-lg border border-stone-700">
                      <h4 className="text-stone-400 text-xs uppercase font-bold mb-2">Pagar Custos</h4>
                      <Button 
                        fullWidth 
                        variant="outline" 
                        onClick={handleCopyCostPix}
                        className={costPixCopied ? "border-green-500 text-green-500" : ""}
                      >
                        {costPixCopied ? <Check size={18} /> : <Copy size={18} />}
                        {costPixCopied ? 'Chave Copiada!' : 'Copiar Chave PIX'}
                      </Button>
                      <p className="text-center text-stone-500 text-xs mt-2">soufilhodofogo@gmail.com</p>
                  </div>

                  {/* Events List */}
                  <div>
                      <h4 className="text-stone-400 text-xs uppercase font-bold mb-3">Eventos Disponíveis</h4>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {events.length > 0 ? (
                            events.map(event => (
                                <div key={event.id} className="bg-stone-900 p-3 rounded border-l-2 border-yellow-500 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-white text-sm">{event.title}</p>
                                        <p className="text-stone-500 text-xs">{event.date}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {event.price ? (
                                            <span className="text-green-400 text-xs font-bold border border-green-900/50 bg-green-900/20 px-2 py-1 rounded">R$ {event.price.toFixed(2).replace('.', ',')}</span>
                                        ) : (
                                            <span className="text-stone-400 text-xs">Grátis</span>
                                        )}
                                        {!myEventRegistrations.some(reg => reg.event_id === event.id) && (
                                            <Button 
                                                variant="secondary" 
                                                className="text-xs h-auto px-2 py-1"
                                                onClick={() => handleOpenEventRegisterModal(event)}
                                            >
                                                <Ticket size={14} className="mr-1"/> Inscrever
                                            </Button>
                                        )}
                                        {myEventRegistrations.some(reg => reg.event_id === event.id && reg.status === 'pending') && (
                                            <span className="text-yellow-400 text-xs flex items-center gap-1">
                                                <Clock size={12}/> Pendente
                                            </span>
                                        )}
                                        {myEventRegistrations.some(reg => reg.event_id === event.id && reg.status === 'paid') && (
                                            <span className="text-green-400 text-xs flex items-center gap-1">
                                                <Check size={12}/> Inscrito
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-stone-500 text-sm italic">Nenhum evento.</p>
                        )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* EVENT REGISTRATION MODAL */}
      {showEventRegisterModal && selectedEventToRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative">
                  <button onClick={() => setShowEventRegisterModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-white"><X size={20}/></button>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Ticket className="text-purple-500" />
                      Inscrever-se em Evento
                  </h3>
                  <form onSubmit={handleRegisterForEvent} className="space-y-4">
                      <div>
                          <label className="block text-sm text-stone-400 mb-1">Evento</label>
                          <input 
                              type="text" 
                              value={selectedEventToRegister.title} 
                              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white" 
                              disabled 
                          />
                      </div>
                      <div>
                          <label className="block text-sm text-stone-400 mb-1">Data</label>
                          <input 
                              type="text" 
                              value={selectedEventToRegister.date} 
                              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white" 
                              disabled 
                          />
                      </div>
                      <div>
                          <label className="block text-sm text-stone-400 mb-1">Valor</label>
                          <div className="relative">
                              <span className="absolute left-3 top-2.5 text-stone-400">R$</span>
                              <input 
                                  type="number" 
                                  value={eventRegistrationAmount}
                                  onChange={(e) => setEventRegistrationAmount(e.target.value)}
                                  className="w-full bg-stone-900 border border-stone-600 rounded pl-10 pr-3 py-2 text-white"
                                  min="0"
                                  step="0.01"
                                  required
                                  disabled={selectedEventToRegister.price === 0}
                              />
                          </div>
                          {selectedEventToRegister.price === 0 && (
                              <p className="text-xs text-stone-500 mt-1">Este evento é gratuito.</p>
                          )}
                      </div>
                      <div className="pt-4 flex justify-end gap-2 border-t border-stone-700 mt-4">
                          <button type="button" onClick={() => setShowEventRegisterModal(false)} className="px-4 py-2 text-stone-400 hover:text-white">Cancelar</button>
                          <Button type="submit">
                              <Ticket size={18} /> Confirmar Inscrição
                          </Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- DASHBOARD VIEW --- */}
      {activeView === 'dashboard' && (
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Profile Card */}
        <div className="w-full md:w-1/3 space-y-4">
          <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 shadow-xl">
            <div className="flex flex-col items-center text-center">
              {/* Profile Image with Upload */}
              <div className="relative group cursor-pointer mb-4">
                  <div className="w-24 h-24 rounded-full bg-stone-700 flex items-center justify-center border-4 border-orange-600 overflow-hidden">
                    <Logo className="w-full h-full object-cover" /> {/* Adicionado */}
                  </div>
              </div>

              <h2 className="text-2xl font-bold text-white">{user.nickname || user.name}</h2>
              {user.nickname && <p className="text-stone-400 text-sm">{user.name}</p>}
              <p className="text-stone-500 text-xs mb-4">{user.email}</p>
              
              <div className="w-full bg-stone-900 rounded-lg p-4 mb-4 border-l-4 overflow-hidden relative" >
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: user.beltColor || '#fff' }}></div>
                <p className="text-xs text-stone-500 uppercase tracking-wider">Graduação Atual</p>
                <p className="text-lg font-bold text-white flex items-center justify-center gap-2">
                  <Award className="text-orange-500" />
                  {user.belt || 'Cordel Cinza'}
                </p>
              </div>

              {/* Graduation Cost Alert */}
              {/* MODIFIED: Always show graduationCost, default to 0 if undefined */}
              <div className="w-full bg-green-900/30 border border-green-800 rounded-lg p-4 mb-4 animate-pulse">
                  <p className="text-xs text-green-400 uppercase tracking-wider font-bold mb-1 flex items-center justify-center gap-1">
                      <Wallet size={12}/> Próxima Graduação
                  </p>
                  <p className="text-xl font-bold text-white">R$ {(user.graduationCost ?? 0).toFixed(2).replace('.', ',')}</p>
                  {(user.graduationCost ?? 0) === 0 ? (
                      <p className="text-[10px] text-stone-400 mt-1">Custo definido pela coordenação (Gratuito)</p>
                  ) : (
                      <p className="text-[10px] text-stone-400 mt-1">Valor definido pela coordenação</p>
                  )}
              </div>
              
              {user.professorName && (
                <div className="mb-4">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Professor</p>
                  <p className="text-white font-semibold">{user.professorName}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 w-full">
                 <div className="bg-stone-900 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-white">12</p>
                    <p className="text-xs text-stone-500">Aulas no Mês</p>
                 </div>
                 <div className="bg-stone-900 p-3 rounded-lg">
                    <p className="2xl font-bold text-white">{events.length}</p>
                    <p className="text-xs text-stone-500">Eventos</p>
                 </div>
              </div>
            </div>
          </div>

          <a 
            href="https://www.instagram.com/filhosdofogo2005" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block"
          >
            <Button fullWidth className="bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 border-none mb-4">
              <Instagram size={20} />
              Siga @filhosdofogo2005
            </Button>
          </a>

          {/* Action Buttons */}
          <div className="space-y-3">
             {/* Meus Custos Button - For All Students */}
            <Button 
                fullWidth 
                variant="secondary" 
                onClick={() => setShowMyCosts(true)}
                className="border border-stone-600"
            >
                <Info size={18} className="text-blue-400" />
                Meus Custos & Eventos
            </Button>

            {/* Mensalidade Button - Only for > 18 */}
            {isOver18 && (
                <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                <p className="text-sm text-stone-400 mb-2 font-semibold">Mensalidade</p>
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
            )}
          </div>
        </div>

        {/* Schedule & Content */}
        <div className="w-full md:w-2/3 space-y-6">
          
          {/* Suas Próximas Aulas (Specific Professor) */}
          <div className="bg-stone-800 rounded-xl p-6 border-2 border-orange-600/50 shadow-[0_0_15px_rgba(234,88,12,0.1)]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-orange-500" />
              Suas Próximas Aulas
            </h3>
            <div className="space-y-3">
              {myClasses.length > 0 ? (
                  myClasses.map((session) => (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-stone-900/50 p-4 rounded-lg border-l-4 border-orange-500 relative overflow-hidden">
                      <div>
                        <p className="text-orange-400 font-bold text-lg">{session.date} • {session.time}</p>
                        <p className="text-white font-medium">{session.level}</p>
                        <p className="text-sm text-stone-400">{session.location} - {session.instructor}</p>
                      </div>
                      <div className="mt-3 sm:mt-0">
                         <span className="bg-red-900/40 text-red-400 border border-red-900/50 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                             <AlertCircle size={12}/> Obrigatório
                         </span>
                      </div>
                    </div>
                  ))
              ) : (
                  <p className="text-stone-500 italic">Nenhuma aula específica do seu professor agendada.</p>
              )}
            </div>
          </div>

          {/* Próximas Aulas do Grupo (Other Professors) */}
          <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Calendar className="text-stone-500" />
              Próximas Aulas do Grupo
            </h3>
            <p className="text-xs text-stone-400 mb-4 bg-stone-900/50 p-2 rounded border border-stone-600 inline-block">
                * Aulas com outros professores. Participação opcional, mas recomendada.
            </p>
            <div className="space-y-3">
              {groupClasses.length > 0 ? (
                  groupClasses.map((session) => (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-stone-900/30 p-4 rounded-lg border-l-2 border-stone-600 opacity-80 hover:opacity-100 transition-opacity">
                      <div>
                        <p className="text-stone-300 font-semibold">{session.date} • {session.time}</p>
                        <p className="text-stone-400 font-medium text-sm">{session.level}</p>
                        <p className="text-xs text-stone-500">{session.location} - {session.instructor}</p>
                      </div>
                      <div className="mt-2 sm:mt-0">
                         <span className="text-stone-500 text-xs font-bold border border-stone-700 px-2 py-1 rounded">
                             Opcional
                         </span>
                      </div>
                    </div>
                  ))
              ) : (
                  <p className="text-stone-500 italic">Nenhuma outra aula do grupo agendada.</p>
              )}
            </div>
          </div>

          {/* Events List */}
          <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="text-orange-500" />
              Mural de Eventos
            </h3>
             <div className="space-y-3">
               {events.length > 0 ? (
                 events.map((event) => (
                   <div key={event.id} className="flex flex-col p-4 bg-stone-900/50 rounded-lg border-l-2 border-yellow-500 hover:bg-stone-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <h4 className="text-white font-bold text-lg">{event.title}</h4>
                        <div className="flex flex-col items-end">
                            <span className="bg-stone-800 text-orange-400 px-2 py-1 rounded text-xs font-bold mb-1">{event.date}</span>
                            {event.price && (
                                <span className="flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                                    <DollarSign size={12}/> R$ {event.price.toFixed(2).replace('.', ',')}
                                </span>
                            )}
                        </div>
                      </div>
                      <p className="text-stone-400 text-sm mt-1">{event.description}</p>
                      <div className="mt-3 flex justify-end">
                          {!myEventRegistrations.some(reg => reg.event_id === event.id) && (
                              <Button 
                                  variant="primary" 
                                  className="text-sm h-auto px-3 py-1.5"
                                  onClick={() => handleOpenEventRegisterModal(event)}
                              >
                                  <Ticket size={16} className="mr-1"/> Inscrever-se
                              </Button>
                          )}
                          {myEventRegistrations.some(reg => reg.event_id === event.id && reg.status === 'pending') && (
                              <span className="text-yellow-400 text-sm flex items-center gap-1">
                                  <Clock size={14}/> Inscrição Pendente
                              </span>
                          )}
                          {myEventRegistrations.some(reg => reg.event_id === event.id && reg.status === 'paid') && (
                              <span className="text-green-400 text-sm flex items-center gap-1">
                                  <Check size={14}/> Já Inscrito
                              </span>
                          )}
                      </div>
                   </div>
                 ))
               ) : (
                 <p className="text-stone-500 italic">Nenhum evento programado.</p>
               )}
             </div>
          </div>

          {/* Resources & Training & Reports Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
                onClick={() => setActiveView('music')}
                className="bg-stone-800 p-6 rounded-xl border border-stone-700 hover:border-orange-500 transition-all text-left group flex flex-col items-start h-full"
            >
              <Music className="w-8 h-8 text-stone-400 group-hover:text-orange-500 mb-3 transition-colors" />
              <h4 className="text-lg font-bold text-white">Músicas</h4>
              <p className="text-xs text-stone-400 mt-1">Letras enviadas</p>
            </button>
            <button 
                onClick={() => setActiveView('home_training')}
                className="bg-stone-800 p-6 rounded-xl border border-stone-700 hover:border-orange-500 transition-all text-left group relative overflow-hidden flex flex-col items-start h-full"
            >
              <Video className="w-8 h-8 text-stone-400 group-hover:text-orange-500 mb-3 transition-colors" />
              <h4 className="text-lg font-bold text-white">Treino em Casa</h4>
              <p className="text-xs text-stone-400 mt-1">Envie seu vídeo</p>
              {!isClassDay && (
                  <div className="absolute top-2 right-2 text-red-500 animate-pulse" title="Envio obrigatório hoje">
                      <AlertTriangle size={20} />
                  </div>
              )}
            </button>
            <button 
                onClick={() => setActiveView('school_report')}
                className="bg-stone-800 p-6 rounded-xl border border-stone-700 hover:border-orange-500 transition-all text-left group flex flex-col items-start h-full"
            >
              <GraduationCap className="w-8 h-8 text-stone-400 group-hover:text-orange-500 mb-3 transition-colors" />
              <h4 className="text-lg font-bold text-white">Boletim</h4>
              <p className="text-xs text-stone-400 mt-1">Notas escolares</p>
            </button>
            <button 
                onClick={() => setActiveView('uniform')}
                className="bg-stone-800 p-6 rounded-xl border border-stone-700 hover:border-orange-500 transition-all text-left group flex flex-col items-start h-full"
            >
              <Shirt className="w-8 h-8 text-stone-400 group-hover:text-orange-500 mb-3 transition-colors" />
              <h4 className="text-lg font-bold text-white">Uniforme</h4>
              <p className="text-xs text-stone-400 mt-1">Solicitar peças</p>
            </button>
          </div>

        </div>
      </div>
      )}

      {/* --- MUSIC VIEW --- */}
      {activeView === 'music' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 flex justify-between items-center">
                  <div>
                    <button 
                        onClick={() => setActiveView('dashboard')}
                        className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Music className="text-orange-500" />
                        Músicas do Grupo
                    </h2>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {musicList.map((song) => (
                      <div key={song.id} className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="text-xl font-bold text-white">{song.title}</h3>
                              <span className="text-xs bg-stone-900 text-stone-400 px-2 py-1 rounded">{song.category}</span>
                          </div>
                          {song.lyrics && (
                            <div className="bg-stone-900/50 p-4 rounded-lg max-h-64 overflow-y-auto mb-4">
                                <pre className="font-sans text-stone-300 text-sm whitespace-pre-wrap">{song.lyrics}</pre>
                            </div>
                          )}
                          {song.file_url && (
                              <a href={song.file_url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                  <PlayCircle size={18} /> Ouvir Música
                              </a>
                          )}
                          {!song.lyrics && !song.file_url && (
                              <p className="text-stone-500 italic text-sm">Nenhuma letra ou arquivo de áudio disponível.</p>
                          )}
                      </div>
                  ))}
                  {musicList.length === 0 && (
                      <p className="text-stone-500 italic col-span-full text-center">Nenhuma música adicionada pelo professor ainda.</p>
                  )}
              </div>
          </div>
      )}

      {/* --- HOME TRAINING VIEW --- */}
      {activeView === 'home_training' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 flex justify-between items-center">
                  <div>
                    <button 
                        onClick={() => setActiveView('dashboard')}
                        className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <h2 className="2xl font-bold text-white flex items-center gap-2">
                        <Video className="text-orange-500" />
                        Treino em Casa
                    </h2>
                  </div>
              </div>

              {!isClassDay && (
                  <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle className="text-red-500 mt-1 flex-shrink-0" />
                      <div>
                          <h4 className="text-white font-bold">Atenção! Hoje não é dia de aula presencial.</h4>
                          <p className="text-stone-400 text-sm">O envio do vídeo do seu treino em casa é <strong>obrigatório</strong> para contabilizar presença e manter sua evolução.</p>
                      </div>
                  </div>
              )}

              {/* Upload Section */}
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                  <h3 className="text-lg font-bold text-white mb-4">Enviar Novo Vídeo</h3>
                  <div className="border-2 border-dashed border-stone-600 rounded-lg p-8 flex flex-col items-center justify-center bg-stone-900/50 hover:bg-stone-900 transition-colors">
                      {uploading ? (
                          <div className="text-center">
                              <UploadCloud size={40} className="text-orange-500 animate-bounce mx-auto mb-2" />
                              <p className="text-white">Enviando vídeo...</p>
                          </div>
                      ) : (
                          <>
                              <Video size={40} className="text-stone-500 mb-2" />
                              <label className="cursor-pointer">
                                  <span className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors inline-block shadow-lg">
                                      Selecionar Vídeo
                                  </span>
                                  <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} />
                              </label>
                              <p className="text-xs text-stone-500 mt-4">Formatos suportados: MP4, MOV. Máximo 100MB.</p>
                              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                  <Clock size={12}/> O vídeo ficará salvo no sistema por 72 horas.
                              </p>
                          </>
                      )}
                  </div>
              </div>

              {/* Active Videos List */}
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                  <h3 className="text-lg font-bold text-white mb-4">Seus Envios Ativos</h3>
                  <div className="space-y-3">
                      {myHomeTrainings.map((video) => (
                          <div key={video.id} className="bg-stone-900 p-4 rounded-lg border-l-2 border-green-500 flex justify-between items-center">
                              <div>
                                  <p className="text-white font-medium flex items-center gap-2">
                                      <Check size={16} className="text-green-500"/> Treino: {video.video_name}
                                  </p>
                                  <p className="text-xs text-stone-500 mt-1">Enviado em: {video.date}</p>
                              </div>
                              <div className="text-right">
                                  <span className="text-xs bg-stone-800 text-orange-400 px-2 py-1 rounded border border-stone-700">
                                      Expira em 72h
                                  </span>
                              </div>
                          </div>
                      ))}
                      {myHomeTrainings.length === 0 && (
                          <p className="text-stone-500 italic text-center py-4">Nenhum vídeo enviado nas últimas 72 horas.</p>
                      )}
                  </div>
              </div>
          </div>
      )}

       {/* --- SCHOOL REPORT VIEW --- */}
       {activeView === 'school_report' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 flex justify-between items-center">
                  <div>
                    <button 
                        onClick={() => setActiveView('dashboard')}
                        className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <h2 className="2xl font-bold text-white flex items-center gap-2">
                        <GraduationCap className="text-orange-500" />
                        Boletim Escolar
                    </h2>
                  </div>
              </div>

              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                  <h3 className="text-lg font-bold text-white mb-2">Enviar Boletim Atual</h3>
                  <p className="text-stone-400 text-sm mb-6">Mantenha sua situação acadêmica atualizada para não ter pendências na graduação.</p>
                  
                  <div className="border-2 border-dashed border-stone-600 rounded-lg p-8 flex flex-col items-center justify-center bg-stone-900/50 hover:bg-stone-900 transition-colors">
                      {uploadingReport ? (
                          <div className="text-center">
                              <UploadCloud size={40} className="text-blue-500 animate-bounce mx-auto mb-2" />
                              <p className="text-white">Enviando arquivo...</p>
                          </div>
                      ) : (
                          <>
                              <FileText size={40} className="text-stone-500 mb-2" />
                              <label className="cursor-pointer">
                                  <span className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors inline-block shadow-lg">
                                      Selecionar Foto ou PDF
                                  </span>
                                  <input type="file" accept="image/*, application/pdf" className="hidden" onChange={handleUploadReport} />
                              </label>
                              <p className="text-xs text-stone-500 mt-4">Formatos suportados: JPG, PNG, PDF. Máximo 5MB.</p>
                          </>
                      )}
                  </div>
              </div>

              {/* Uploaded Reports List */}
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                  <h3 className="text-lg font-bold text-white mb-4">Boletins Enviados</h3>
                  <div className="space-y-3">
                      {mySchoolReports.map((report) => (
                          <div key={report.id} className="bg-stone-900 p-4 rounded-lg border-l-2 border-blue-500 flex justify-between items-center">
                              <div>
                                  <p className="text-white font-medium flex items-center gap-2">
                                      <Check size={16} className="text-green-500"/> Arquivo: {report.file_name}
                                  </p>
                                  <p className="text-xs text-stone-500 mt-1">Enviado em: {report.date}</p>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                  <span className="text-xs bg-stone-800 text-blue-400 px-2 py-1 rounded border border-stone-700">
                                      Em Análise
                                  </span>
                                  <button 
                                    onClick={() => handleViewReport(report.file_url, report.file_name)}
                                    className="p-1.5 bg-stone-700 hover:bg-stone-600 rounded-full text-stone-400 hover:text-white transition-colors"
                                    title="Ver Arquivo"
                                  >
                                    <Eye size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                      {mySchoolReports.length === 0 && (
                          <p className="text-stone-500 italic text-center py-4">Nenhum boletim enviado recentemente.</p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* --- UNIFORM VIEW --- */}
      {activeView === 'uniform' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 flex justify-between items-center">
                  <div>
                    <button 
                        onClick={() => setActiveView('dashboard')}
                        className="flex items-center gap-2 text-stone-400 hover:text-white text-sm mb-2 transition-colors"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Shirt className="text-orange-500" />
                        Solicitar Uniforme
                    </h2>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Order Form */}
                <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 h-fit">
                    <h3 className="text-lg font-bold text-white mb-4">Novo Pedido</h3>
                    
                    {/* Price List Card */}
                    <div className="bg-stone-900/50 rounded-lg p-4 mb-6 text-sm border border-stone-600">
                        <h4 className="font-bold text-stone-300 mb-2 border-b border-stone-700 pb-1">Tabela de Preços</h4>
                        <div className="grid grid-cols-2 gap-y-2">
                            <span className="text-stone-400">Blusa Oficial:</span>
                            <span className="text-right text-green-400 font-bold">R$ 30,00</span>
                            
                            <span className="text-stone-400">Calça de Roda:</span>
                            <span className="text-right text-green-400 font-bold">R$ 80,00</span>
                            
                            <span className="text-stone-400">Calça de Treino:</span>
                            <span className="text-right text-green-400 font-bold">R$ 80,00</span>
                            
                            <span className="text-stone-200 font-bold">Combo (Blusa + Calça):</span>
                            <span className="text-right text-orange-400 font-bold">R$ 110,00</span>
                        </div>
                    </div>

                    <form onSubmit={handleOrderUniform} className="space-y-4">
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Item Desejado</label>
                            <select 
                                value={orderForm.item}
                                onChange={(e) => setOrderForm({...orderForm, item: e.target.value})}
                                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white focus:border-orange-500 outline-none"
                            >
                                <option value="combo">Combo (Blusa + Calça)</option>
                                <option value="shirt">Apenas Blusa</option>
                                <option value="pants_roda">Calça de Roda (Helanca)</option>
                                <option value="pants_train">Calça de Treino</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Tamanho Blusa</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: M, G, GG"
                                    value={orderForm.shirtSize}
                                    onChange={(e) => setOrderForm({...orderForm, shirtSize: e.target.value})}
                                    disabled={orderForm.item.includes('pants') && orderForm.item !== 'combo'}
                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white focus:border-orange-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Tamanho Calça</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: 40, 42"
                                    value={orderForm.pantsSize}
                                    onChange={(e) => setOrderForm({...orderForm, pantsSize: e.target.value})}
                                    disabled={orderForm.item === 'shirt'}
                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white focus:border-orange-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="bg-stone-900 p-4 rounded-lg flex justify-between items-center border border-stone-600">
                            <span className="text-white font-bold">Valor Total:</span>
                            <span className="2xl font-bold text-orange-500">R$ {getCurrentPrice()},00</span>
                        </div>

                        <div className="space-y-3">
                            <Button fullWidth type="submit">
                                <ShoppingBag size={18} />
                                Fazer Pedido
                            </Button>
                            <Button fullWidth type="button" variant="outline" onClick={handleCopyCostPix}>
                                <Copy size={18} />
                                Copiar Chave PIX
                            </Button>
                        </div>
                    </form>
                </div>

                {/* History */}
                <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                    <h3 className="text-lg font-bold text-white mb-4">Meus Pedidos</h3>
                    <div className="space-y-3">
                        {myOrders.map(order => (
                            <div key={order.id} className="bg-stone-900 p-4 rounded-lg border-l-2 border-blue-500">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-white">{order.item}</span>
                                    {order.status === 'pending' && <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-900/50">Pendente</span>}
                                    {order.status === 'ready' && <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">Pago/Liberado</span>}
                                    {order.status === 'delivered' && <span className="text-xs bg-stone-700 text-stone-400 px-2 py-1 rounded border border-stone-600">Entregue</span>}
                                </div>
                                <div className="text-sm text-stone-400 space-y-1">
                                    {order.shirt_size && <p>Tamanho Blusa: <span className="text-white">{order.shirt_size}</span></p>}
                                    {order.pants_size && <p>Tamanho Calça: <span className="text-white">{order.pants_size}</span></p>}
                                    <p className="pt-2 border-t border-stone-800 mt-2 flex justify-between text-xs">
                                        <span>Data: {order.date}</span>
                                        <span className="text-green-500 font-bold">R$ {order.total},00</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                        {myOrders.length === 0 && (
                            <p className="text-stone-500 italic text-center py-8 bg-stone-900/30 rounded-lg">
                                Nenhuma solicitação realizada.
                            </p>
                        )}
                    </div>
                </div>

              </div>
          </div>
      )}

    </div>
  );
};