import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, ClassSession, GroupEvent, MusicItem, HomeTraining, UniformOrder, SchoolReport, EventRegistration, PaymentRecord, StudentGrade } from '../types';
import { Calendar, Award, Music, Video, Instagram, MapPin, Copy, Check, Ticket, Wallet, Info, X, UploadCloud, Clock, AlertTriangle, ArrowLeft, AlertCircle, GraduationCap, FileText, Shirt, ShoppingBag, Camera, Eye, PlayCircle, DollarSign, FileUp, MessageCircle, PlusCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../src/integrations/supabase/client';
import { Logo } from '../components/Logo';

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
  schoolReports: SchoolReport[];
  onAddSchoolReport: (report: Omit<SchoolReport, 'id' | 'created_at'>) => Promise<void>;
  classSessions: ClassSession[];
  assignments: any[];
  onUpdateAssignment: (assignment: any) => Promise<void>;
  eventRegistrations: EventRegistration[];
  onAddEventRegistration: (newRegistration: Omit<EventRegistration, 'id' | 'registered_at'>) => Promise<void>;
  onUpdateEventRegistrationWithProof: (updatedRegistration: EventRegistration) => Promise<void>; // NEW PROP
  allUsersProfiles: User[];
  monthlyPayments?: PaymentRecord[];
  onUpdatePaymentRecord: (updatedPayment: PaymentRecord) => Promise<void>;
  studentGrades: StudentGrade[];
  onUpdateOrderWithProof: (orderId: string, proofUrl: string, proofName: string) => Promise<void>;
}


type MainTab = 'overview' | 'finance_resources' | 'grades' | 'assignments' | 'music' | 'home_training' | 'school_report' | 'uniform'; // Main tabs for student dashboard

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
  schoolReports,
  onAddSchoolReport,
  classSessions,
  assignments,
  onUpdateAssignment,
  eventRegistrations,
  onAddEventRegistration,
  onUpdateEventRegistrationWithProof, // NEW PROP
  allUsersProfiles,
  monthlyPayments = [],
  onUpdatePaymentRecord,
  studentGrades,
  onUpdateOrderWithProof,
}) => {

  const [activeMainTab, setActiveMainTab] = useState<MainTab>('overview'); // State for main tabs
  const [pixCopied, setPixCopied] = useState(false);
  const [costPixCopied, setCostPixCopied] = useState(false);

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
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input

  // Event Registration Proof Upload State
  const [uploadingEventProof, setUploadingEventProof] = useState(false);
  const [selectedEventRegToProof, setSelectedEventRegToProof] = useState<EventRegistration | null>(null);
  const eventFileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input for event proofs

  // Uniform Order Proof Upload State
  const [uploadingUniformProof, setUploadingUniformProof] = useState(false);
  const [selectedOrderToProof, setSelectedOrderToProof] = useState<UniformOrder | null>(null);
  const uniformFileInputRef = useRef<HTMLInputElement>(null);

  // Assignment Submission Upload State
  const [uploadingAssignment, setUploadingAssignment] = useState(false);
  const [selectedAssignmentToSubmit, setSelectedAssignmentToSubmit] = useState<any | null>(null);
  const assignmentFileInputRef = useRef<HTMLInputElement>(null);


  // Filter my orders from global state
  const myOrders = uniformOrders.filter(o => o.user_id === user.id);
  const myHomeTrainings = homeTrainings.filter(ht => ht.user_id === user.id);
  const mySchoolReports = schoolReports.filter(sr => sr.user_id === user.id);
  const myEventRegistrations = eventRegistrations.filter(reg => reg.user_id === user.id);
  const myRawPayments = monthlyPayments.filter(p => p.student_id === user?.id);
  const myMonthlyPayments = myRawPayments.filter(p => (!p.type || p.type === 'Mensalidade') && !p.month.toLowerCase().includes('avalia'));
  const evalPayment = useMemo(() => myRawPayments.find(p => (p.type === 'evaluation' || p.month.toLowerCase().includes('avalia'))), [myRawPayments]);
  const beltColors = useMemo(() => {
    const b = (user.belt || '').toLowerCase();
    const [mainPart, ...rest] = b.split('ponta');
    const pontaPart = rest.join('ponta');

    const colorMap: Record<string, string> = {
      'verde': '#22c55e',
      'amarelo': '#FDD835',
      'azul': '#0033CC', // Azul Caneta (Darker Blue)
      'branco': '#ffffff',
      'cinza': '#9ca3af',
    };

    let mainColor = user.beltColor || '#fff';
    let pontaColor: string | null = null;

    if (mainPart.includes('verde, amarelo, azul e branco')) {
      mainColor = 'linear-gradient(to bottom, #22c55e 0%, #22c55e 25%, #FDD835 25%, #FDD835 50%, #0033CC 50%, #0033CC 75%, #ffffff 75%, #ffffff 100%)';
    } else if (mainPart.includes('amarelo e azul')) {
      mainColor = 'linear-gradient(to bottom, #FDD835 0%, #FDD835 50%, #0033CC 50%, #0033CC 100%)';
    } else if (mainPart.includes('verde e amarelo')) {
      mainColor = 'linear-gradient(to bottom, #22c55e 0%, #22c55e 50%, #FDD835 50%, #FDD835 100%)';
    } else if (mainPart.includes('verde e branco')) {
      mainColor = 'linear-gradient(to bottom, #22c55e 0%, #22c55e 50%, #ffffff 50%, #ffffff 100%)';
    } else if (mainPart.includes('amarelo e branco')) {
      mainColor = 'linear-gradient(to bottom, #FDD835 0%, #FDD835 50%, #ffffff 50%, #ffffff 100%)';
    } else if (mainPart.includes('azul e branco')) {
      mainColor = 'linear-gradient(to bottom, #0033CC 0%, #0033CC 50%, #ffffff 50%, #ffffff 100%)';
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
    }

    if (pontaPart) {
      if (pontaPart.includes('verde') && pontaPart.includes('amarelo')) {
        pontaColor = 'linear-gradient(to bottom, #22c55e 0%, #22c55e 50%, #FDD835 50%, #FDD835 100%)';
      } else if (pontaPart.includes('verde')) pontaColor = colorMap['verde'];
      else if (pontaPart.includes('amarelo')) pontaColor = colorMap['amarelo'];
      else if (pontaPart.includes('azul')) pontaColor = colorMap['azul'];
      else if (pontaPart.includes('branco')) pontaColor = colorMap['branco'];
    }

    return { mainColor, pontaColor };
  }, [user.belt, user.beltColor]);

  // NEW: Determine the professor's ID based on the student's professorName
  const studentProfessor = useMemo(() => {
    return allUsersProfiles.find(
      (p) => (p.nickname === user.professorName || p.name === user.professorName) && (p.role === 'professor' || p.role === 'admin')
    );
  }, [allUsersProfiles, user.professorName, user.name]);

  const studentProfessorId = studentProfessor?.id;

  // NEW: Filter classes based on real data
  const myClasses = useMemo(() => {
    return classSessions.filter(
      (session) => studentProfessorId && session.professor_id === studentProfessorId
    );
  }, [classSessions, studentProfessorId]);

  // Filter group classes: not by my professor, and not by an admin
  const groupClasses = useMemo(() => {
    return classSessions.filter(
      (session) => session.professor_id !== studentProfessorId
    );
  }, [classSessions, studentProfessorId]);

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

  const isOver18 = useMemo(() => {
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

  const overdueStatus = useMemo(() => {
    const pending = myMonthlyPayments.filter(p => p.status === 'pending' || p.status === 'overdue');
    return {
      count: pending.length,
      isOverdue: pending.length >= 1,
      isCritical: pending.length >= 3,
      message: pending.length >= 3 ? "Atenção: Evite o bloqueio do seu acesso efetuando o pagamento!" : "Atraso no pagamento das mensalidades pode levar ao bloqueio do aplicativo!",
      color: pending.length >= 3 ? 'red' : pending.length === 2 ? 'orange' : 'yellow'
    };
  }, [myMonthlyPayments]);

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

      // Upload to 'avatars' bucket (create if needed or use public)
      // Assuming 'avatars' bucket exists or similar public bucket.
      // Ideally should be a public bucket for ease of access
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (error) {
        // Fallback to 'school_reports_files' temporarily if avatars missing, 
        // but strictly avatars is better. Let's assume avatars exists from previous steps or create it.
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      // Initialize updateData object
      const updateData: any = { photo_url: publicUrl };

      // Update auth metadata if possible (optional but good for consistency)
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      // Update profile in DB via onUpdateProfile (which handles the DB update usually)
      // But verify if onUpdateProfile does DB update or just local state.
      // Assuming onUpdateProfile triggers the DB update in App.tsx

      // Update profile table directly to be safe
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      onUpdateProfile({ photo_url: publicUrl }); // Update local state
      alert("Foto de perfil atualizada!");

    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      alert('Erro ao atualizar foto de perfil: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
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
    setActiveMainTab('home_training');
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
    switch (orderForm.item) {
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

  const handleFileChangeForPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedPaymentToProof) {
      setUploadingPaymentProof(false); // Ensure loading state is reset
      return;
    }

    const file = e.target.files[0];
    setUploadingPaymentProof(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/payment_proofs/${selectedPaymentToProof.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError; // Throw error to be caught by catch block

      const fileUrl = uploadData.path;

      const updatedPayment: PaymentRecord = {
        ...selectedPaymentToProof,
        proof_url: fileUrl,
        proof_name: file.name,
        status: 'pending',
      };

      await onUpdatePaymentRecord(updatedPayment);
      setUploadingPaymentProof(false);
      setSelectedPaymentToProof(null); // Clear selected payment after upload
      onNotifyAdmin(`Aluno ${user.nickname || user.name} enviou comprovante de pagamento para ${selectedPaymentToProof.month}`, user);
      alert("Comprovante enviado com sucesso! O Admin será notificado para confirmar o pagamento.");
    } catch (error: any) {
      console.error('Error uploading payment proof:', error);
      alert("Erro ao enviar comprovante: " + error.message);
      setUploadingPaymentProof(false);
    } finally {
      // Reset the file input value to allow re-uploading the same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChangeForEventProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedEventRegToProof) {
      setUploadingEventProof(false);
      return;
    }

    const file = e.target.files[0];
    setUploadingEventProof(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/event_proofs/${selectedEventRegToProof.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const fileUrl = uploadData.path;

      const updatedRegistration: EventRegistration = {
        ...selectedEventRegToProof,
        proof_url: fileUrl, // Assuming EventRegistration has a proof_url field
        proof_name: file.name, // Assuming EventRegistration has a proof_name field
        status: 'pending', // Mark as pending for admin review
      };

      // Call the new prop to update the event registration with proof
      await onUpdateEventRegistrationWithProof(updatedRegistration);

      setUploadingEventProof(false);
      setSelectedEventRegToProof(null);
      onNotifyAdmin(`Aluno ${user.nickname || user.name} enviou comprovante de pagamento para o evento ${selectedEventRegToProof.event_title}`, user);
      alert("Comprovante de evento enviado com sucesso! O Admin será notificado para confirmar o pagamento.");
    } catch (error: any) {
      console.error('Error uploading event proof:', error);
      alert("Erro ao enviar comprovante de evento: " + error.message);
      setUploadingEventProof(false);
    } finally {
      if (eventFileInputRef.current) {
        eventFileInputRef.current.value = '';
      }
    }
  };

  const handleFileChangeForAssignment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedAssignmentToSubmit) {
      setUploadingAssignment(false);
      return;
    }

    const file = e.target.files[0];
    setUploadingAssignment(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/assignments/${selectedAssignmentToSubmit.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assignments_files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('assignments_files')
        .getPublicUrl(filePath);

      const updatedAssignment = {
        ...selectedAssignmentToSubmit,
        status: 'completed',
        attachment_url: publicUrlData.publicUrl,
        student_id: user.id
      };

      await onUpdateAssignment(updatedAssignment);

      onNotifyAdmin(`Enviou resposta de trabalho: ${selectedAssignmentToSubmit.title}`, user);
      alert('Trabalho enviado com sucesso!');
      setSelectedAssignmentToSubmit(null);
    } catch (error: any) {
      console.error('Error uploading assignment:', error);
      alert('Erro ao enviar trabalho: ' + error.message);
    } finally {
      setUploadingAssignment(false);
      if (assignmentFileInputRef.current) assignmentFileInputRef.current.value = '';
    }
  };

  const handleViewPaymentProof = async (filePath: string, proofName: string, bucket: string) => {
    console.log('handleViewPaymentProof called in DashboardAluno');
    console.log('  filePath:', filePath);
    console.log('  proofName:', proofName);
    console.log('  bucket:', bucket);
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60); // URL valid for 60 seconds

      if (error) {
        console.error('Error generating signed URL in DashboardAluno:', error);
        alert('Erro ao visualizar o comprovante: ' + error.message);
        return;
      }
      console.log('  Signed URL generated in DashboardAluno:', data.signedUrl);
      window.open(data.signedUrl, '_blank');
      onNotifyAdmin(`Visualizou comprovante de pagamento: ${proofName}`, user);
    } catch (error: any) {
      console.error('Caught error in handleViewPaymentProof (DashboardAluno):', error);
      alert('Erro ao visualizar o comprovante: ' + error.message);
    }
  };

  const handleFileChangeForUniformProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedOrderToProof) {
      setUploadingUniformProof(false);
      return;
    }

    const file = e.target.files[0];
    setUploadingUniformProof(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/uniform_proofs/${selectedOrderToProof.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(filePath);

      await onUpdateOrderWithProof(selectedOrderToProof.id, publicUrlData.publicUrl, file.name);

      setUploadingUniformProof(false);
      setSelectedOrderToProof(null);
      onNotifyAdmin(`Aluno ${user.nickname || user.name} enviou comprovante de pagamento para uniforme: ${selectedOrderToProof.item}`, user);
      alert("Comprovante enviado com sucesso! O Admin será notificado para confirmar o pagamento.");
    } catch (error: any) {
      console.error('Error uploading uniform proof:', error);
      alert("Erro ao enviar comprovante: " + error.message);
      setUploadingUniformProof(false);
    } finally {
      if (uniformFileInputRef.current) {
        uniformFileInputRef.current.value = '';
      }
    }
  };

  const handleFileChangeForAssignment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedAssignmentToSubmit) {
      setUploadingAssignment(false);
      return;
    }

    const file = e.target.files[0];
    setUploadingAssignment(true);

    try {
      const fileExt = file.name.split('.').pop();
      // Using 'school_reports_files' as a general document bucket if assignment_submissions doesn't exist
      const filePath = `${user.id}/assignments/${selectedAssignmentToSubmit.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('school_reports_files') // Fallback bucket that likely exists
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const fileUrl = uploadData.path;

      // Update assignment with submission
      const updatedAssignment = {
        ...selectedAssignmentToSubmit,
        attachment_url: fileUrl,  // Using attachment_url as submission url per types
        attachment_name: file.name,
        status: 'completed'
      };

      // Call the parent update function
      await onUpdateAssignment(updatedAssignment);

      // Since assignments prop comes from parent, we rely on parent update via onUpdateAssignment to reflect changes.
      // However, for immediate feedback if parent doesn't auto-refresh quickly:
      // (This part depends on how 'assignments' prop is managed in App.tsx - it seems to be state-driven)

      setUploadingAssignment(false);
      setSelectedAssignmentToSubmit(null);
      onNotifyAdmin(`Aluno ${user.nickname || user.name} enviou trabalho: ${selectedAssignmentToSubmit.title}`, user);
      alert("Trabalho enviado com sucesso!");
    } catch (error: any) {
      console.error('Error uploading assignment:', error);
      alert("Erro ao enviar trabalho: " + error.message);
      setUploadingAssignment(false);
    } finally {
      if (assignmentFileInputRef.current) {
        assignmentFileInputRef.current.value = '';
      }
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

      {/* EVENT REGISTRATION MODAL (Mantido) */}
      {showEventRegisterModal && selectedEventToRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowEventRegisterModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-white"><X size={20} /></button>
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

      <div className="flex flex-col md:flex-row gap-6">

        {/* Profile Card */}
        <div className="w-full md:w-1/3 space-y-4">
          <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 shadow-xl">
            <div className="flex flex-col items-center text-center">
              {/* Profile Image with Upload */}
              <div className="relative group cursor-pointer mb-4" onClick={() => !uploadingPhoto && photoInputRef.current?.click()} title="Clique para alterar a foto">
                <div className="w-24 h-24 rounded-full bg-stone-700 flex items-center justify-center border-4 border-orange-600 overflow-hidden relative">
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
                {uploadingPhoto && <div className="absolute inset-0 flex items-center justify-center rounded-full"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
              </div>
              <input
                type="file"
                ref={photoInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleProfilePhotoUpload}
                disabled={uploadingPhoto}
              />

              <h2 className="text-2xl font-bold text-white">{user.nickname || user.name}</h2>
              {user.nickname && <p className="text-stone-400 text-sm">{user.name}</p>}
              <p className="text-stone-500 text-xs mb-4">{user.email}</p>

              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 flex flex-col items-center justify-center space-y-4 mb-6">
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
                              <p className="text-sm text-stone-400">Valor Restante:</p>
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
                    {(user.graduationCost ?? 0) === 0 ? (
                      <p className="text-[10px] text-stone-400 mt-1">Custo definido pela coordenação (Gratuito)</p>
                    ) : (
                      <p className="text-[10px] text-stone-400 mt-1">Valor definido pela coordenação</p>
                    )}
                  </div>
                </div>
              </div>

              {user.professorName && (
                <div className="mb-4">
                  <p className="text-xs text-stone-500 uppercase tracking-wider">Professor</p>
                  <p className="text-white font-semibold">{user.professorName}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="bg-stone-900 p-3 rounded-lg">
                  <p className="text-2xl font-bold text-white">{myClasses.length}</p> {/* Updated to myClasses.length */}
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

          <a
            href="https://discord.gg/AY2kk9Ubk"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button fullWidth className="mb-4 text-white border-none !bg-[#5865F2] hover:!bg-[#4752C4]" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4752C4'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5865F2'}>
              <MessageCircle size={20} />
              Discord
            </Button>
          </a>
        </div>

        {/* Schedule & Content */}
        <div className="w-full md:w-2/3 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-stone-700 pb-1 overflow-x-auto">
            <button
              onClick={() => setActiveMainTab('overview')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'overview' ? 'bg-stone-800 text-orange-500 border-t-2 border-orange-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveMainTab('finance_resources')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'finance_resources' ? 'bg-stone-800 text-green-500 border-t-2 border-green-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Financeiro
            </button>
            <button
              onClick={() => setActiveMainTab('assignments')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'assignments' ? 'bg-stone-800 text-cyan-500 border-t-2 border-cyan-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Trabalhos
            </button>
            <button
              onClick={() => setActiveMainTab('music')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'music' ? 'bg-stone-800 text-yellow-500 border-t-2 border-yellow-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Músicas
            </button>
            <button
              onClick={() => setActiveMainTab('home_training')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'home_training' ? 'bg-stone-800 text-purple-500 border-t-2 border-purple-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Treino em Casa
            </button>
            <button
              onClick={() => setActiveMainTab('school_report')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'school_report' ? 'bg-stone-800 text-indigo-500 border-t-2 border-indigo-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Boletim
            </button>
            <button
              onClick={() => setActiveMainTab('uniform')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'uniform' ? 'bg-stone-800 text-emerald-500 border-t-2 border-emerald-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Uniforme
            </button>
            <button
              onClick={() => setActiveMainTab('grades')}
              className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm whitespace-nowrap ${activeMainTab === 'grades' ? 'bg-stone-800 text-blue-500 border-t-2 border-blue-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
            >
              Notas
            </button>
          </div>

          {/* OVERDUE ALERT FOR ADULT STUDENTS */}
          {isOver18 && overdueStatus.isOverdue && (
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

          {/* --- TAB: OVERVIEW --- */}
          {activeMainTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
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
                            <AlertCircle size={12} /> Obrigatório
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
                    groupClasses.map((session) => {
                      // Find the professor's profile to get their nickname/name
                      const sessionProfessor = allUsersProfiles.find(p => p.id === session.professor_id);
                      const professorDisplayName = sessionProfessor?.nickname || sessionProfessor?.name || session.instructor;

                      return (
                        <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-stone-900/30 p-4 rounded-lg border-l-2 border-stone-600 opacity-80 hover:opacity-100 transition-opacity">
                          <div>
                            <p className="text-stone-300 font-semibold">{session.date} • {session.time}</p>
                            <p className="text-stone-400 font-medium text-sm">{session.level}</p>
                            <p className="text-xs text-stone-500">{session.location} - {professorDisplayName}</p> {/* Display professor name */}
                          </div>
                          <div className="mt-2 sm:mt-0">
                            <span className="text-stone-500 text-xs font-bold border border-stone-700 px-2 py-1 rounded">
                              Opcional
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-stone-500 italic">Nenhuma outra aula do grupo agendada.</p>
                  )}
                </div>
              </div>

              {/* Mural de Eventos */}
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <MapPin className="text-orange-500" />
                  Mural de Eventos
                </h3>
                <p className="text-xs text-red-400 mb-4 bg-red-900/20 p-2 rounded border border-red-900/50 inline-flex items-center gap-1">
                  <AlertCircle size={12} /> Todos os eventos são de participação obrigatória.
                </p>
                <div className="space-y-3">
                  {events.filter(e => !e.status || e.status === 'active').length > 0 ? (
                    events.filter(e => !e.status || e.status === 'active').map((event) => (
                      <div key={event.id} className="flex flex-col p-4 bg-stone-900/50 rounded-lg border-l-4 border-red-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-white font-bold text-lg">{event.title}</h4>
                            <p className="text-stone-400 text-sm mt-1">{event.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="bg-stone-800 text-orange-400 px-2 py-1 rounded text-xs font-bold">{event.date.split('-').reverse().join('/')}</span>
                            {event.price && event.price > 0 && (
                              <span className="flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                                <DollarSign size={12} /> R$ {event.price.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                            <span className="bg-red-900/40 text-red-400 border border-red-900/50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                              <AlertCircle size={12} /> Obrigatório
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-500 italic">Nenhum evento programado.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB: FINANCEIRO --- */}
          {activeMainTab === 'finance_resources' && (
            <div className="space-y-6 animate-fade-in">
              {/* Back button */}
              <button onClick={() => setActiveMainTab('overview')} className="text-stone-400 flex items-center gap-2 hover:text-white transition-colors">
                <ArrowLeft size={16} /> Voltar ao Painel
              </button>

              {/* Monthly Payments List */}
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet className="text-orange-500" />
                  Minhas Mensalidades
                </h3>
                <div className="mb-4">
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={handleCopyPix}
                    className={pixCopied ? "border-green-500 text-green-500" : "border-orange-500 text-orange-400"}
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
                              onClick={() => handleViewPaymentProof(payment.proof_url!, payment.proof_name || 'Comprovante', 'payment_proofs')}
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

              {/* Eventos e Avaliações */}
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="text-orange-500" />
                  Eventos e Avaliações
                </h3>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={handleCopyCostPix}
                  className={costPixCopied ? "border-green-500 text-green-500" : "border-orange-500 text-orange-400"}
                >
                  {costPixCopied ? <Check size={18} /> : <Copy size={18} />}
                  {costPixCopied ? 'Chave Copiada!' : 'Copiar Chave PIX (Eventos/Avaliação)'}
                </Button>

                {/* Avaliações */}
                <h4 className="text-sm font-bold text-white mb-2 mt-6">Avaliações</h4>
                <div className="space-y-3 mb-6">
                  {(() => {
                    const evalPayments = monthlyPayments.filter(p => p.student_id === user.id && (p.type === 'evaluation' || p.month?.includes('Avaliação') || p.month?.includes('Parcela')));
                    return evalPayments.length > 0 ? (
                      evalPayments.map(payment => (
                        <div key={payment.id} className={`bg-stone-900 p-3 rounded border-l-2 ${payment.status === 'paid' ? 'border-green-500' : 'border-yellow-500'} flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
                          <div>
                            <p className="font-bold text-white text-sm">{payment.month}</p>
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
                              </>
                            )}
                            {payment.status === 'pending' && payment.proof_url && (
                              <span className="text-yellow-400 text-xs flex items-center gap-1">
                                <Clock size={12} /> Enviado
                              </span>
                            )}
                            {payment.proof_url && (
                              <button
                                onClick={() => handleViewPaymentProof(payment.proof_url!, payment.proof_name || 'Comprovante', 'payment_proofs')}
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
                    );
                  })()}
                </div>

                {/* Inscrições em Eventos */}
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
                              onClick={() => handleViewPaymentProof(reg.proof_url!, reg.event_title + ' Comprovante', 'event_proofs')}
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

                {/* Meus Pedidos de Uniforme */}
                <h4 className="text-sm font-bold text-white mb-2 mt-6 flex items-center gap-2">
                  <Shirt className="text-orange-500" size={16} />
                  Meus Pedidos de Uniforme
                </h4>
                <div className="space-y-3">
                  <Button
                    fullWidth
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveMainTab('uniform')}
                    className="mb-2 border-dashed border-orange-500 text-orange-400"
                  >
                    <PlusCircle size={14} className="mr-1" /> Novo Pedido de Uniforme
                  </Button>
                  {uniformOrders.filter(o => o.user_id === user.id).length > 0 ? (
                    uniformOrders.filter(o => o.user_id === user.id).map(order => (
                      <div key={order.id} className={`bg-stone-900 p-3 rounded border-l-2 ${order.status !== 'pending' ? 'border-green-500' : 'border-yellow-500'} flex flex-col sm:flex-row justify-between items-start sm:items-center`}>
                        <div>
                          <p className="font-bold text-white text-sm">{order.item}</p>
                          <p className="text-stone-500 text-xs">R$ {order.total.toFixed(2).replace('.', ',')}</p>
                          <p className="text-[10px] text-stone-600">{order.date}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          {order.status !== 'pending' ? (
                            <span className="text-green-400 text-xs flex items-center gap-1">
                              <Check size={12} /> Pago/Entregue
                            </span>
                          ) : (
                            <>
                              {!order.proof_url ? (
                                <Button
                                  variant="secondary"
                                  className="text-[10px] h-auto px-2 py-1"
                                  onClick={() => {
                                    setSelectedOrderToProof(order);
                                    uniformFileInputRef.current?.click();
                                  }}
                                  disabled={uploadingUniformProof}
                                >
                                  {uploadingUniformProof && selectedOrderToProof?.id === order.id ? 'Enviando...' : <><FileUp size={12} className="mr-1" /> Pagar</>}
                                </Button>
                              ) : (
                                <span className="text-yellow-400 text-[10px] flex items-center gap-1">
                                  <Clock size={12} /> Enviado
                                </span>
                              )}
                            </>
                          )}
                          {order.proof_url && (
                            <button
                              onClick={() => handleViewPaymentProof(order.proof_url!, order.item + ' Comprovante', 'uniform_proofs')}
                              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                            >
                              <Eye size={14} /> Ver
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-500 text-sm italic">Nenhum pedido registrado.</p>
                  )}
                  <input
                    type="file"
                    accept="image/*, application/pdf"
                    className="hidden"
                    ref={uniformFileInputRef}
                    onChange={handleFileChangeForUniformProof}
                    disabled={uploadingUniformProof}
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- TAB: NOTAS --- */}
          {activeMainTab === 'grades' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="text-blue-500" />
                  Minhas Notas
                </h3>
                <div className="space-y-3">
                  {(studentGrades || []).length > 0 ? (
                    (studentGrades || []).map(g => (
                      <div key={g.id} className="flex items-center justify-between bg-stone-900 p-3 rounded border-l-2 border-blue-500">
                        <div className="flex items-center gap-3">
                          <span className="text-stone-300 text-sm">
                            {g.category === 'theory' ? 'Teórica' : g.category === 'movement' ? 'Movimentação' : 'Musicalidade'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">
                            {Number.isFinite(typeof g.numeric === 'number' ? g.numeric : Number(g.numeric))
                              ? (typeof g.numeric === 'number' ? g.numeric : Number(g.numeric)).toFixed(1)
                              : '-'}
                          </span>
                          {/* Written grades hidden for students as requested */}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-500 italic">Nenhuma nota registrada.</p>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-3">
                </p>
              </div>
            </div>
          )}

          {/* --- TAB: TRABALHOS --- */}
          {activeMainTab === 'assignments' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="text-cyan-500" />
                  Trabalhos do Professor
                </h3>
                <div className="space-y-3">
                  {assignments && assignments.length > 0 ? (
                    assignments.map(assignment => (
                      <div key={assignment.id} className="bg-stone-900 p-4 rounded border-l-2 border-cyan-500">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-sm mb-1">{assignment.title}</h4>
                            <p className="text-stone-400 text-xs mb-2">{assignment.description}</p>
                            <p className="text-stone-500 text-xs">Vencimento: {assignment.due_date.split('-').reverse().join('/')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {assignment.status === 'completed' ? (
                              <span className="text-green-400 text-xs flex items-center gap-1 whitespace-nowrap">
                                <Check size={12} /> Entregue
                              </span>
                            ) : (
                              <span className="text-yellow-400 text-xs flex items-center gap-1 whitespace-nowrap">
                                <Clock size={12} /> Pendente
                              </span>
                            )}
                          </div>
                        </div>
                        {assignment.attachment_url && assignment.status !== 'completed' && (
                          <Button
                            variant="secondary"
                            className="text-xs h-auto px-2 py-1 mt-2 w-full"
                            onClick={() => window.open(assignment.attachment_url, '_blank')}
                          >
                            <Eye size={14} className="mr-1" /> Ver Material
                          </Button>
                        )}
                        {/* Submission Button */}
                        {assignment.status !== 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              className="text-xs h-auto px-2 py-1 mt-2 w-full border-cyan-500 text-cyan-500 hover:bg-cyan-900/20"
                              onClick={() => {
                                setSelectedAssignmentToSubmit(assignment);
                                assignmentFileInputRef.current?.click();
                              }}
                              disabled={uploadingAssignment}
                            >
                              {uploadingAssignment && selectedAssignmentToSubmit?.id === assignment.id ? (
                                'Enviando...'
                              ) : (
                                <><UploadCloud size={14} className="mr-1" /> Enviar Resposta</>
                              )}
                            </Button>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.jpg,.png"
                              className="hidden"
                              ref={assignmentFileInputRef}
                              onChange={handleFileChangeForAssignment}
                              disabled={uploadingAssignment}
                            />
                          </>
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

          {/* --- TAB: MÚSICAS --- */}
          {activeMainTab === 'music' && (
            <div className="bg-stone-800 rounded-2xl p-8 border border-stone-700 animate-fade-in shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>

              <div className="relative z-10">
                <Button variant="ghost" className="mb-4 text-stone-400 p-0 hover:text-white" onClick={() => setActiveMainTab('overview')}>
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar ao Painel
                </Button>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-yellow-500">
                    <Music size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Acervo Musical</h2>
                    <p className="text-stone-400 text-sm">Pratique e aprenda as músicas do grupo</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {musicList.length > 0 ? (
                    musicList.map(m => (
                      <div key={m.id} className="bg-stone-900/80 backdrop-blur-sm p-5 rounded-2xl border-2 border-stone-800 hover:border-yellow-500/30 transition-all group flex flex-col justify-between h-full">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="max-w-[80%]">
                              <p className="text-white font-black leading-tight group-hover:text-yellow-400 transition-colors line-clamp-2">{m.title}</p>
                              <span className="text-[9px] font-black bg-stone-800 text-stone-500 px-2 py-0.5 rounded uppercase tracking-widest border border-stone-700 inline-block mt-1">
                                {m.category}
                              </span>
                            </div>
                            {m.file_url && (
                              <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl hover:bg-yellow-500 hover:text-black transition-all shadow-md">
                                <PlayCircle size={22} />
                              </a>
                            )}
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
                            <Clock size={10} /> {new Date(m.created_at || Date.now()).toLocaleDateString('pt-BR')}
                          </span>
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
          )}

          {/* --- TAB: TREINO EM CASA --- */}
          {activeMainTab === 'home_training' && (
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Video size={24} className="text-orange-500" /> Treino em Casa</h2>

              <div className="bg-stone-900 p-4 rounded-lg mb-6 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-white mb-3">Enviar Vídeo de Treino</h3>
                <div className="border-2 border-dashed border-stone-600 rounded-lg p-6 flex flex-col items-center justify-center bg-stone-900/50 hover:bg-stone-900 transition-colors">
                  {uploading ? (
                    <div className="text-center">
                      <UploadCloud size={32} className="text-orange-500 animate-bounce mx-auto mb-2" />
                      <p className="text-white">Enviando vídeo...</p>
                    </div>
                  ) : (
                    <>
                      <Video size={32} className="text-stone-500 mb-2" />
                      <label className="cursor-pointer">
                        <span className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block shadow-lg">
                          Selecionar Vídeo
                        </span>
                        <input type="file" accept="video/*" className="hidden" onChange={handleUploadVideo} disabled={uploading} />
                      </label>
                      <p className="text-xs text-stone-500 mt-2">MP4, MOV, etc. Máx 50MB.</p>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Clock size={20} className="text-stone-400" /> Meus Vídeos Enviados</h3>
              <div className="space-y-3">
                {myHomeTrainings.length > 0 ? (
                  myHomeTrainings.map(training => (
                    <div key={training.id} className="bg-stone-900 p-4 rounded-lg border-l-4 border-purple-500 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{training.video_name}</p>
                        <p className="text-stone-400 text-sm">Enviado em: {training.date}</p>
                        <p className="text-stone-500 text-xs">Expira em: {new Date(training.expires_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <a href={training.video_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" className="text-xs h-auto px-3 py-1.5">
                          <PlayCircle size={16} className="mr-1" /> Ver Vídeo
                        </Button>
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 italic text-center py-4">Nenhum vídeo de treino em casa enviado ainda.</p>
                )}
              </div>
            </div>
          )}

          {/* --- TAB: BOLETIM --- */}
          {activeMainTab === 'school_report' && (
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
              <Button variant="ghost" className="mb-4 text-stone-400 p-0 hover:text-white" onClick={() => setActiveMainTab('overview')}>
                <ArrowLeft size={16} className="mr-2" />
                Voltar ao Painel
              </Button>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><GraduationCap size={24} className="text-orange-500" /> Boletim Escolar</h2>

              <div className="bg-stone-900 p-4 rounded-lg mb-6 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-white mb-3">Enviar Boletim</h3>
                <div className="border-2 border-dashed border-stone-600 rounded-lg p-6 flex flex-col items-center justify-center bg-stone-900/50 hover:bg-stone-900 transition-colors">
                  {uploadingReport ? (
                    <div className="text-center">
                      <UploadCloud size={32} className="text-orange-500 animate-bounce mx-auto mb-2" />
                      <p className="text-white">Enviando boletim...</p>
                    </div>
                  ) : (
                    <>
                      <FileText size={32} className="text-stone-500 mb-2" />
                      <label className="cursor-pointer">
                        <span className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block shadow-lg">
                          Selecionar Arquivo
                        </span>
                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={handleUploadReport} disabled={uploadingReport} />
                      </label>
                      <p className="text-xs text-stone-500 mt-2">PDF, DOC, Imagem. Máx 10MB.</p>
                    </>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><FileText size={20} className="text-stone-400" /> Meus Boletins Enviados</h3>
              <div className="space-y-3">
                {mySchoolReports.length > 0 ? (
                  mySchoolReports.map(report => (
                    <div key={report.id} className="bg-stone-900 p-4 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white">{report.file_name}</p>
                        <p className="text-stone-400 text-sm">Período: {report.period}</p>
                        <p className="text-stone-500 text-xs">Enviado em: {report.date}</p>
                      </div>
                      <Button variant="secondary" className="text-xs h-auto px-3 py-1.5" onClick={() => handleViewReport(report.file_url, report.file_name)}>
                        <Eye size={16} className="mr-1" /> Ver Boletim
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 italic text-center py-4">Nenhum boletim escolar enviado ainda.</p>
                )}
              </div>
            </div>
          )}

          {/* --- TAB: UNIFORME --- */}
          {activeMainTab === 'uniform' && (
            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
              <Button variant="ghost" className="mb-4 text-stone-400 p-0 hover:text-white" onClick={() => setActiveMainTab('overview')}>
                <ArrowLeft size={16} className="mr-2" />
                Voltar ao Painel
              </Button>
              <div className="bg-stone-900 p-4 rounded-lg mb-6 border-l-4 border-orange-500">
                <h3 className="text-lg font-bold text-white mb-3">Fazer Novo Pedido</h3>
                <form onSubmit={handleOrderUniform} className="space-y-4">
                  <div>
                    <label htmlFor="item" className="block text-sm text-stone-400 mb-1">Item</label>
                    <select
                      id="item"
                      value={orderForm.item}
                      onChange={e => setOrderForm({ ...orderForm, item: e.target.value })}
                      className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white"
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
                        <label htmlFor="shirtSize" className="block text-sm text-stone-400 mb-1">Tamanho da Blusa</label>
                        <input
                          id="shirtSize"
                          type="text"
                          placeholder="Ex: P, M, G, GG"
                          value={orderForm.shirtSize}
                          onChange={(e) => setOrderForm({ ...orderForm, shirtSize: e.target.value })}
                          className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white"
                          required={orderForm.item === 'shirt' || orderForm.item === 'combo'}
                        />
                      </div>
                    )}
                    {(orderForm.item === 'pants_roda' || orderForm.item === 'pants_train' || orderForm.item === 'combo') && (
                      <div>
                        <label htmlFor="pantsSize" className="block text-sm text-stone-400 mb-1">Tamanho da Calça</label>
                        <input
                          id="pantsSize"
                          type="text"
                          placeholder="Ex: 38, 40, 42, 44"
                          value={orderForm.pantsSize}
                          onChange={(e) => setOrderForm({ ...orderForm, pantsSize: e.target.value })}
                          className="w-full bg-stone-800 border border-stone-600 rounded p-2 text-white"
                          required={orderForm.item === 'pants_roda' || orderForm.item === 'pants_train' || orderForm.item === 'combo'}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-right text-white font-bold text-lg">
                    Total: R$ {getCurrentPrice().toFixed(2).replace('.', ',')}
                  </div>
                  <Button fullWidth type="submit">
                    <ShoppingBag size={18} className="mr-1" /> Fazer Pedido
                  </Button>
                </form>
              </div>

              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><ShoppingBag size={20} className="text-stone-400" /> Meus Pedidos</h3>
              <div className="space-y-3">
                {myOrders.length > 0 ? (
                  myOrders.map(order => (
                    <div key={order.id} className="bg-stone-900 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white">{order.item}</p>
                          <p className="text-stone-400 text-sm">
                            {order.shirt_size && `Blusa: ${order.shirt_size}`}
                            {order.shirt_size && order.pants_size && ', '}
                            {order.pants_size && `Calça: ${order.pants_size}`}
                          </p>
                          <p className="text-stone-500 text-xs">Pedido em: {order.date}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-green-400 font-bold">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                          {order.status === 'pending' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs border border-yellow-900/50">Pendente</span>}
                          {order.status === 'ready' && <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs border border-blue-900/50">Pago/Pronto</span>}
                          {order.status === 'delivered' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs border border-green-900/50">Entregue</span>}
                        </div>
                      </div>

                      {/* Proof actions */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-stone-700">
                        {order.status === 'pending' && !order.proof_url && (
                          <>
                            <Button
                              variant="secondary"
                              className="text-xs h-auto px-3 py-1.5"
                              onClick={() => {
                                setSelectedOrderToProof(order);
                                uniformFileInputRef.current?.click();
                              }}
                              disabled={uploadingUniformProof}
                            >
                              {uploadingUniformProof && selectedOrderToProof?.id === order.id ? 'Enviando...' : <><FileUp size={14} className="mr-1" /> Enviar Comprovante</>}
                            </Button>
                            <input
                              type="file"
                              accept="image/*, application/pdf"
                              className="hidden"
                              ref={uniformFileInputRef}
                              onChange={handleFileChangeForUniformProof}
                              disabled={uploadingUniformProof}
                            />
                          </>
                        )}
                        {order.proof_url && (
                          <>
                            <button
                              onClick={() => window.open(order.proof_url, '_blank')}
                              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                            >
                              <Eye size={14} /> Ver Comprovante
                            </button>
                            {order.status === 'pending' && (
                              <span className="text-yellow-400 text-xs flex items-center gap-1">
                                <Clock size={12} /> Aguardando Confirmação
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 italic text-center py-4">Nenhum pedido de uniforme realizado ainda.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>



    </div>
  );
};
