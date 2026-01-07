import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, GroupEvent, PaymentRecord, ProfessorClassData, StudentAcademicData, AdminNotification, MusicItem, UserRole, UniformOrder, ALL_BELTS, HomeTraining, SchoolReport, Assignment, EventRegistration, ClassSession, StudentGrade } from '../types';
import { Shield, Users, Bell, DollarSign, CalendarPlus, Plus, PlusCircle, CheckCircle, AlertCircle, Clock, GraduationCap, BookOpen, ChevronDown, ChevronUp, Trash2, Edit2, X, Save, Activity, MessageCircle, ArrowLeft, CalendarCheck, Camera, FileWarning, Info, Mic2, Music, Paperclip, Search, Shirt, ShoppingBag, ThumbsDown, ThumbsUp, UploadCloud, MapPin, Wallet, Check, Calendar, Settings, UserPlus, Mail, Phone, Lock, Package, FileText, Video, PlayCircle, Ticket, FileUp, Eye, Award } from 'lucide-react'; // Import FileUp, Eye and Award
import { Button } from '../components/Button';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/components/SessionContextProvider'; // Import useSession
import { Logo } from '../components/Logo'; // Import Logo component

interface Props {
    user: User;
    onAddEvent: (event: Omit<GroupEvent, 'id' | 'created_at'>) => Promise<any>;
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
    onAddOrder: (newOrder: Omit<UniformOrder, 'id' | 'created_at'>) => Promise<void>;
    onUpdateOrderStatus: (orderId: string, status: 'pending' | 'ready' | 'delivered') => void;
    // New props for student details
    schoolReports: SchoolReport[];
    assignments: Assignment[];
    onAddAssignment: (newAssignment: Omit<Assignment, 'id' | 'created_at'>) => Promise<void>;
    onUpdateAssignment: (updatedAssignment: Assignment) => Promise<void>;
    homeTrainings: HomeTraining[];
    monthlyPayments: PaymentRecord[]; // Now receiving from App.tsx
    onAddPaymentRecord: (newPayment: Omit<PaymentRecord, 'id' | 'created_at'>) => Promise<void>;
    onUpdatePaymentRecord: (updatedPayment: PaymentRecord) => Promise<void>;
    // New props for Event Registrations
    eventRegistrations: EventRegistration[];
    onAddEventRegistration: (newRegistration: Omit<EventRegistration, 'id' | 'registered_at'>) => Promise<void>;
    onUpdateEventRegistrationStatus: (registrationId: string, status: 'pending' | 'paid' | 'cancelled') => Promise<void>;
    onNavigate: (view: string) => void; // Added for card navigation
    classSessions: ClassSession[]; // Pass class sessions to admin dashboard
    onAddClassSession: (newSession: Omit<ClassSession, 'id' | 'created_at'>) => Promise<void>;
    onUpdateClassSession: (updatedSession: ClassSession) => Promise<void>;
    studentGrades: StudentGrade[];
    onClearNotifications: () => void;
}

const UNIFORM_PRICES = {
    shirt: 30,
    pants_roda: 80,
    pants_train: 80,
    combo: 110
};

type Tab = 'overview' | 'events' | 'finance' | 'pedagogy' | 'my_classes' | 'users' | 'student_details' | 'grades' | 'reports';
type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager';

export const DashboardAdmin: React.FC<Props> = ({
    user,
    onAddEvent,
    onEditEvent,
    onCancelEvent,
    events,
    notifications = [],
    musicList = [],
    onAddMusic = (_music: MusicItem) => { },
    onNotifyAdmin = (_action: string, _user: User) => { },
    onUpdateProfile,
    uniformOrders,
    onAddOrder,
    onUpdateOrderStatus,
    schoolReports, // New prop
    assignments, // New prop
    onAddAssignment,
    onUpdateAssignment,
    homeTrainings, // New prop
    monthlyPayments, // Use prop for payments
    onAddPaymentRecord,
    onUpdatePaymentRecord,
    eventRegistrations, // New prop
    onAddEventRegistration,
    onUpdateEventRegistrationStatus,
    onNavigate, // New prop
    classSessions, // Use prop for class sessions
    onAddClassSession,
    onUpdateClassSession,
    studentGrades,
    onClearNotifications,
}) => {
    const { session } = useSession(); // Get session from context
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Event Management State
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [eventFormData, setEventFormData] = useState({ title: '', date: '', description: '', price: '' });
    const [expandedEventParticipants, setExpandedEventParticipants] = useState<string | null>(null); // New state for event participants

    // Finance State
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
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [newPaymentForm, setNewPaymentForm] = useState({
        studentId: '',
        month: '',
        dueDate: '',
        amount: '',
    });

    // Pedagogy State
    // Pedagogy State - converted to useMemo below
    const [expandedProfessor, setExpandedProfessor] = useState<string | null>(null);

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

    // State for evaluation modal
    const [showEvalModal, setShowEvalModal] = useState(false);
    const [evalModalStudent, setEvalModalStudent] = useState<User | null>(null);
    const [evalModalAmount, setEvalModalAmount] = useState<string>('');
    const [evalModalDueDate, setEvalModalDueDate] = useState<string>('');

    // State for inline evaluation editing
    const [editingEvaluationDate, setEditingEvaluationDate] = useState<string>('');



    // --- PROFESSOR MODE STATE (Admin acting as Professor) ---
    const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
    const [myClasses, setMyClasses] = useState<ClassSession[]>(classSessions.filter(cs => cs.professor_id === user.id)); // Filter classes for this admin acting as professor
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null); // Changed to string
    const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [classPhoto, setClassPhoto] = useState<string | null>(null);
    const [pixCopied, setPixCopied] = useState(false);
    const [classRecords, setClassRecords] = useState<{ name: string; url: string; created_at?: string }[]>([]);
    const beltColors = useMemo(() => {
        const b = (user.belt || '').toLowerCase();
        const colorMap: Record<string, string> = {
            'verde': '#22c55e',
            'amarelo': '#FDD835',
            'azul': '#3b82f6',
            'branco': '#ffffff',
            'cinza': '#9ca3af',
        };

        let mainColor = user.beltColor || '#fff';
        let pontaColor: string | null = null;

        if (b.includes('verde, amarelo, azul e branco')) {
            mainColor = 'linear-gradient(to bottom,#22c55e,#FDD835,#3b82f6,#ffffff)';
        } else if (b.includes('amarelo e azul')) {
            mainColor = 'linear-gradient(to bottom,#FDD835,#3b82f6)';
        } else if (b.includes('verde e amarelo')) {
            mainColor = 'linear-gradient(to bottom,#22c55e,#FDD835)';
        } else if (b.includes('verde e branco')) {
            mainColor = 'linear-gradient(to bottom,#22c55e,#ffffff)';
        } else if (b.includes('amarelo e branco')) {
            mainColor = 'linear-gradient(to bottom,#FDD835,#ffffff)';
        } else if (b.includes('azul e branco')) {
            mainColor = 'linear-gradient(to bottom,#3b82f6,#ffffff)';
        } else if (b.includes('cinza')) {
            mainColor = '#9ca3af';
        } else if (b.includes('verde')) {
            mainColor = '#22c55e';
        } else if (b.includes('amarelo')) {
            mainColor = '#FDD835';
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



    // Evaluation State
    const [selectedStudentForEval, setSelectedStudentForEval] = useState<string | null>(null);
    const [evalData, setEvalData] = useState({ positive: '', negative: '' });

    // Assignments State (for Professor Mode)
    const [profModeAssignments, setProfModeAssignments] = useState<Assignment[]>(assignments.filter(a => a.created_by === user.id)); // Filter assignments created by this admin
    const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '', studentId: '' }); // Added studentId
    const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false);
    const [selectedAssignmentToAssign, setSelectedAssignmentToAssign] = useState<Assignment | null>(null);
    const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<string>('');


    // Uniform State (for Professor Mode)
    const [myOrders, setMyOrders] = useState<UniformOrder[]>(uniformOrders.filter(o => o.user_id === user.id)); // Filter orders for this admin
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
        const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, nickname, belt, belt_color, professor_name, birth_date, graduation_cost, phone, role, next_evaluation_date'); // Removed avatar_url and email from select
        if (error) {
            console.error('Error fetching managed users:', error);
            // Optionally show a toast notification
        } else {
            const fetchedUsers: User[] = data.map(profile => {
                return {
                    id: profile.id,
                    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.nickname || 'Usuário',
                    nickname: profile.nickname || undefined,
                    email: '', // Email will be populated from auth.users if needed
                    role: profile.role as UserRole, // This is where the role is read
                    belt: profile.belt || undefined,
                    beltColor: profile.belt_color || undefined,
                    professorName: profile.professor_name || undefined,
                    birthDate: profile.birth_date || undefined,
                    // MODIFIED: Ensure 0 is kept as a number, or default to 0 if null
                    graduationCost: profile.graduation_cost !== null ? Number(profile.graduation_cost) : 0,
                    phone: profile.phone || undefined,
                    first_name: profile.first_name || undefined,
                    last_name: profile.last_name || undefined,
                    nextEvaluationDate: profile.next_evaluation_date || undefined
                };
            });
            setManagedUsers(fetchedUsers);

            // Process for Pedagogy tab replaced by useMemo hook below
        }
    }, [session]); // Add session to dependency array

    useEffect(() => {
        fetchManagedUsers();
        // Filter assignments for professor mode based on the admin's user ID
        setProfModeAssignments(assignments.filter(a => a.created_by === user.id));
        setMyClasses(classSessions.filter(cs => cs.professor_id === user.id)); // Update myClasses when classSessions change
        setMyOrders(uniformOrders.filter(o => o.user_id === user.id)); // Update myOrders when uniformOrders change
    }, [fetchManagedUsers, assignments, user.id, classSessions, uniformOrders]);

    // --- CUSTOM ADMIN DISPLAY NAME ---
    const getAdminDisplayName = () => {
        if (user.nickname === 'Aquiles') return 'Administração Filhos do Fogo Argentina';
        if (user.nickname === 'Wolverine') return 'Administração Filhos do Fogo Brasil';
        if (user.nickname === 'Anjo de Fogo') return 'Administração Filhos do Fogo Geral';
        return user.nickname || user.first_name || user.name || 'Admin';
    };

    // --- ADMIN HANDLERS ---
    const totalMonthlyPayments = monthlyPayments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
    const pendingMonthlyPayments = monthlyPayments.filter(p => p.status !== 'paid').reduce((acc, curr) => acc + curr.amount, 0);

    const totalUniformRevenue = uniformOrders.filter(o => o.status !== 'pending').reduce((acc, curr) => acc + curr.total, 0);
    const pendingUniformRevenue = uniformOrders.filter(o => o.status === 'pending').reduce((acc, curr) => acc + curr.total, 0);

    const totalEventRevenue = eventRegistrations.filter(reg => reg.status === 'paid').reduce((acc, curr) => acc + curr.amount_paid, 0);
    const pendingEventRevenue = eventRegistrations.filter(reg => reg.status === 'pending').reduce((acc, curr) => acc + curr.amount_paid, 0);

    const totalRevenue = totalMonthlyPayments + totalUniformRevenue + totalEventRevenue;
    const pendingRevenue = pendingMonthlyPayments + pendingUniformRevenue + pendingEventRevenue;

    const financialMovements = useMemo(() => {
        const movements: any[] = [];

        // Monthly Payments
        monthlyPayments.forEach(p => {
            movements.push({
                date: p.status === 'paid' ? p.paid_at || '-' : p.due_date,
                description: `Mensalidade - ${p.month}`,
                student: p.student_name,
                type: 'Mensalidade',
                value: p.amount,
                status: p.status === 'paid' ? 'Pago' : 'Pendente'
            });
        });

        // Uniform Orders
        uniformOrders.forEach(o => {
            movements.push({
                date: o.date,
                description: `Uniforme - ${o.item}`,
                student: o.user_name,
                type: 'Uniforme',
                value: o.total,
                status: o.status === 'ready' || o.status === 'delivered' ? 'Pago' : 'Pendente'
            });
        });

        // Event Registrations
        eventRegistrations.forEach(reg => {
            movements.push({
                date: '-',
                description: `Evento - ${reg.event_title}`,
                student: reg.user_name,
                type: 'Evento',
                value: reg.amount_paid,
                status: reg.status === 'paid' ? 'Pago' : 'Pendente'
            });
        });

        return movements.sort((a, b) => {
            if (a.date === '-' || b.date === '-') return 0;
            return new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime();
        });
    }, [monthlyPayments, uniformOrders, eventRegistrations]);

    const handleDownloadFinancialReport = () => {
        const headers = ["Data", "Descrição", "Aluno", "Tipo", "Valor", "Status"];
        const csvContent = [
            headers.join(";"),
            ...financialMovements.map(m => [
                m.date,
                m.description,
                m.student,
                m.type,
                m.value.toFixed(2).replace('.', ','),
                m.status
            ].join(";"))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const pendingUniformOrders = uniformOrders.filter(o => o.status === 'pending');
    const pendingEventRegistrations = eventRegistrations.filter(reg => reg.status === 'pending');

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

    const handleSaveEvent = async (e: React.FormEvent) => {
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
            // Updated to await the response and create debts
            const newEvent = await onAddEvent(eventPayload);

            // If event has a cost, create pending registrations for ALL active users (Students and Professors)
            if (newEvent && eventPrice > 0) {
                const targets = managedUsers.filter(u => u.role === 'aluno' || u.role === 'professor');

                // We'll iterate and add them. Note: In a real app, this should be a batch insert or DB trigger.
                // For now, we do it client-side as requested.
                for (const targetUser of targets) {
                    await onAddEventRegistration({
                        event_id: newEvent.id,
                        user_id: targetUser.id,
                        user_name: targetUser.nickname || targetUser.name,
                        event_title: newEvent.title,
                        amount_paid: eventPrice,
                        status: 'pending', // Debt created
                    });
                }
                alert(`Evento criado com débito de R$ ${eventPrice} para todos os alunos e professores.`);
            }
        }
        setEventFormData({ title: '', date: '', description: '', price: '' });
        setShowEventForm(false);
    };

    // --- MONTHLY PAYMENT AUTO-GENERATION ---
    const handleGenerateMonthlyPayments = async () => {
        if (!confirm('Deseja gerar as mensalidades deste mês para todos os alunos ativos?\n\nIsso criará registros pendentes de R$ 50,00 para quem ainda não tem mensalidade gerada para o mês atual.\nVencimento: Dia 10.')) return;

        const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const currentMonthIndex = new Date().getMonth();
        const targetMonth = MONTHS[currentMonthIndex]; // Gets current month name in Portuguese

        const now = new Date();
        const currentYear = now.getFullYear();
        // Create due date for 10th of current month
        const dueDate = new Date(currentYear, currentMonthIndex, 10);

        // Formatted due date string YYYY-MM-DD
        const formattedDueDate = dueDate.toISOString().split('T')[0];

        let createdCount = 0;

        // Fetch all active students and professors
        const activeStudents = managedUsers.filter(u => u.role === 'aluno' || u.role === 'professor');

        try {
            for (const student of activeStudents) {
                // Check if payment exists for this student and month (case insensitive check)
                const exists = monthlyPayments.some(p =>
                    p.student_id === student.id &&
                    p.month.toLowerCase() === targetMonth.toLowerCase()
                );

                // Calculate age
                let isUnder18 = false;
                if (student.birthDate) {
                    const birth = new Date(student.birthDate);
                    let age = currentYear - birth.getFullYear();
                    const m = now.getMonth() - birth.getMonth();
                    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                        age--;
                    }
                    if (age < 18) isUnder18 = true;
                } else {
                    // If no birthdate, assume over 18 or decide default behavior? 
                    // Implicitly assuming over 18 if data missing, or maybe force check. 
                    // For now, let's treat missing birthrate as valid for payment to be safe (or strict?)
                    // User request: "Aluno deve ser maior de 18 anos". 
                    // Usually if no birthdate, we can't verify. Let's assume strict compliance.
                    // But most existing users might not have birthdate set. 
                    // "Aluno deve ser maior de 18 anos" -> if < 18, don't charge. 
                    // If role is professor, usually > 18.
                }

                // Skip if student is under 18. Professors are exempt from this check based on "Aluno" wording, but usually > 18.
                // Assuming request applies to Students specifically.
                if (student.role === 'aluno' && isUnder18) {
                    continue;
                }

                if (!exists) {
                    const newPayment = {
                        student_id: student.id,
                        student_name: student.nickname || student.name,
                        month: targetMonth,
                        due_date: formattedDueDate,
                        amount: 50.00,
                        status: 'pending' as const
                    };
                    await onAddPaymentRecord(newPayment);
                    createdCount++;
                }
            }
            alert(`Processo concluído!\nForam geradas ${createdCount} novas mensalidades para ${targetMonth}.`);
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar mensalidades. Verifique o console.');
        }
    };

    const handleMarkAsPaid = async (paymentId: string) => {
        const paymentToUpdate = monthlyPayments.find(p => p.id === paymentId);
        if (paymentToUpdate) {
            await onUpdatePaymentRecord({ ...paymentToUpdate, status: 'paid', paid_at: new Date().toISOString().split('T')[0] });
            onNotifyAdmin(`Marcar pagamento de ${paymentToUpdate.student_name} como pago`, user);
        }
    };

    const handleViewPaymentProof = async (filePath: string, proofName: string) => {
        console.log('handleViewPaymentProof called in DashboardAdmin');
        console.log('  filePath:', filePath);
        console.log('  proofName:', proofName);
        const bucket = 'payment_proofs'; // Explicitly define bucket here
        console.log('  bucket:', bucket);
        try {
            // Generate a signed URL for private buckets
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 60); // URL valid for 60 seconds

            if (error) {
                console.error('Error generating signed URL in DashboardAdmin (Payment Proof):', error);
                alert('Erro ao visualizar o comprovante: ' + error.message);
                return;
            }
            console.log('  Signed URL generated in DashboardAdmin (Payment Proof):', data.signedUrl);
            window.open(data.signedUrl, '_blank');
            onNotifyAdmin(`Visualizou comprovante de pagamento: ${proofName}`, user);
        } catch (error: any) {
            console.error('Caught error in handleViewPaymentProof (DashboardAdmin):', error);
            alert('Erro ao visualizar o comprovante: ' + error.message);
        }
    };

    const handleViewEventRegistrationProof = async (filePath: string, proofName: string) => {
        console.log('handleViewEventRegistrationProof called in DashboardAdmin');
        console.log('  filePath:', filePath);
        console.log('  proofName:', proofName);
        const bucket = 'event_proofs'; // Explicitly define bucket here
        console.log('  bucket:', bucket);
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 60); // URL valid for 60 seconds

            if (error) {
                console.error('Error generating signed URL in DashboardAdmin (Event Proof):', error);
                alert('Erro ao visualizar o comprovante de evento: ' + error.message);
                return;
            }
            console.log('  Signed URL generated in DashboardAdmin (Event Proof):', data.signedUrl);
            window.open(data.signedUrl, '_blank');
            onNotifyAdmin(`Visualizou comprovante de evento: ${proofName}`, user);
        } catch (error: any) {
            console.error('Caught error in handleViewEventRegistrationProof (DashboardAdmin):', error);
            alert('Erro ao visualizar o comprovante de evento: ' + error.message);
        }
    };

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
                name: `${userToEdit.first_name || ''} ${userToEdit.last_name || ''}`.trim(),
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

    const handleUpdateEvaluationInfo = async (userIdToUpdate: string) => { // Renamed function
        const newCost = parseFloat(editingGradCostValue);
        if (isNaN(newCost) || newCost < 0) {
            alert('Por favor, insira um valor numérico válido para o custo de avaliação.');
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                graduation_cost: newCost,
                next_evaluation_date: editingEvaluationDate || null
            })
            .eq('id', userIdToUpdate);

        if (error) {
            console.error('Error updating evaluation info:', error);
            alert('Erro ao atualizar informações de avaliação.');
        } else {
            alert('Informações de avaliação atualizadas com sucesso!');
            setEditingGradCostId(null);
            setEditingGradCostValue('');
            setEditingEvaluationDate('');
            fetchManagedUsers(); // Re-fetch to update the list
            const userName = managedUsers.find(u => u.id === userIdToUpdate)?.nickname || 'Usuário';
            onNotifyAdmin(`Atualizou avaliação do usuário: ${userName} para Data: ${editingEvaluationDate} / Valor: R$ ${newCost.toFixed(2)}`, user);
        }
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

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            await supabase.auth.updateUser({ data: { photo_url: publicUrl } });

            // For Admin/Professor, update their own profile in 'profiles' table same as students
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ photo_url: publicUrl })
                .eq('id', user.id); // Update own ID

            if (dbError) throw dbError;

            onUpdateProfile({ photo_url: publicUrl }); // Update local state for consistency
            alert("Foto de perfil atualizada!");

        } catch (error: any) {
            console.error('Error uploading profile photo:', error);
            alert('Erro ao atualizar foto de perfil: ' + error.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // --- FINANCE TAB HANDLERS ---
    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPaymentForm.studentId || !newPaymentForm.month || !newPaymentForm.dueDate || !newPaymentForm.amount) {
            alert('Por favor, preencha todos os campos para adicionar um pagamento.');
            return;
        }
        const student = managedUsers.find(u => u.id === newPaymentForm.studentId);
        if (!student) {
            alert('Aluno não encontrado.');
            return;
        }

        const newPayment: Omit<PaymentRecord, 'id' | 'created_at'> = {
            student_id: student.id,
            student_name: student.nickname || student.name,
            month: newPaymentForm.month,
            due_date: newPaymentForm.dueDate,
            amount: parseFloat(newPaymentForm.amount),
            status: 'pending',
        };

        await onAddPaymentRecord(newPayment);
        onNotifyAdmin(`Adicionou registro de pagamento para ${student.nickname || student.name}`, user);
        setShowAddPaymentModal(false);
        setNewPaymentForm({ studentId: '', month: '', dueDate: '', 'amount': '' });
    };

    const handleUpdateEventRegistration = async (registrationId: string, status: 'pending' | 'paid' | 'cancelled') => {
        await onUpdateEventRegistrationStatus(registrationId, status);
        const registration = eventRegistrations.find(reg => reg.id === registrationId);
        if (registration) {
            onNotifyAdmin(`Atualizou status de registro de evento para ${registration.user_name} no evento ${registration.event_title} para ${status}`, user);
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

    const handleConfirmClass = (classId: string) => { // Changed to string
        // This logic is not used with real class sessions, attendance is handled differently
        // setConfirmedClasses([...confirmedClasses, classId]);
        // onNotifyAdmin(`Admin confirmou presença na aula ID: ${classId}`, user);
    };

    const handleOpenAttendance = (classId: string) => {
        const initialAttendance: Record<string, boolean> = {};
        const studentsInClass = managedUsers.filter(u => u.role === 'aluno' && u.professorName === (user.nickname || user.first_name || user.name)); // Filter by admin's nickname as professor
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

    const handleSaveNewClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassData.title || !newClassData.date || !newClassData.time || !newClassData.location) {
            alert('Por favor, preencha todos os campos da aula.');
            return;
        }
        const newSessionPayload: Omit<ClassSession, 'id' | 'created_at'> = {
            date: newClassData.date,
            time: newClassData.time,
            instructor: user.nickname || user.name,
            location: newClassData.location,
            level: 'Todos os Níveis', // Default level
            professor_id: user.id,
        };
        await onAddClassSession(newSessionPayload);
        setNewClassData({ title: '', date: '', time: '', location: '', adminSuggestion: '' });
        setProfView('dashboard');
        onNotifyAdmin(`Agendou nova aula: ${newClassData.title}`, user);
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
                const filePath = `${session.user.id}/music_files/${Date.now()}.${fileExt}`;

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

    const handleAddAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAssignment.title || !newAssignment.dueDate) {
            alert('Por favor, preencha o título e a data de entrega do trabalho.');
            return;
        }

        const assignmentPayload: Omit<Assignment, 'id' | 'created_at'> = {
            created_by: user.id,
            title: newAssignment.title,
            description: newAssignment.description,
            due_date: newAssignment.dueDate,
            status: 'pending',
            student_id: newAssignment.studentId || null, // Assign to specific student or null for general
        };

        await onAddAssignment(assignmentPayload);
        setNewAssignment({ title: '', description: '', dueDate: '', studentId: '' });
        onNotifyAdmin(`Admin criou trabalho: ${newAssignment.title}`, user);
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

            const updatedAssignment: Assignment = {
                ...assignments.find(a => a.id === assignmentId)!,
                status: 'completed',
                attachment_url: publicUrlData.publicUrl,
                attachment_name: file.name,
                student_id: studentId, // Ensure student_id is set for submission
            };
            await onUpdateAssignment(updatedAssignment);
            onNotifyAdmin(`Aluno ${managedUsers.find(u => u.id === studentId)?.nickname || 'desconhecido'} entregou trabalho: ${updatedAssignment.title}`, user);
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
        setMyOrders([newOrder as UniformOrder, ...myOrders]); // Add to local state for immediate display
        onNotifyAdmin(`Admin solicitou uniforme: ${itemName}`, user);
        alert('Pedido registrado!');
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
    };

    useEffect(() => {
        const fetchClassRecords = async () => {
            try {
                const { data, error } = await supabase.storage.from('class_records').list('', { limit: 20 });
                if (error) throw error;
                const items = data || [];
                const withUrls = items.map((it: any) => {
                    const { data: pub } = supabase.storage.from('class_records').getPublicUrl(it.name);
                    return { name: it.name, url: pub.publicUrl, created_at: it.created_at };
                });
                setClassRecords(withUrls);
            } catch (err) {
                console.error('Error listing class records:', err);
            }
        };
        fetchClassRecords();
    }, []);

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

    // --- CALCULATED PROFESSORS DATA (Pedagogical Tab) ---
    const professorsData: ProfessorClassData[] = useMemo(() => {
        const professors = managedUsers.filter(u => u.role === 'professor' || u.role === 'admin');
        return professors.map(prof => {
            const profStudents = managedUsers.filter(u => u.role === 'aluno' && u.professorName === (prof.nickname || prof.first_name || prof.name));

            const studentsData: StudentAcademicData[] = profStudents.map(s => {
                const sGrades = studentGrades.filter(g => g.student_id === s.id);
                const techGrade = sGrades.find(g => g.category === 'movement')?.numeric || 0;
                return {
                    studentId: s.id,
                    studentName: s.nickname || s.name,
                    attendanceRate: 85, // Mock data or derive from attendance table if available
                    technicalGrade: techGrade,
                    musicalityGrade: sGrades.find(g => g.category === 'musicality')?.numeric || 0,
                    lastEvaluation: sGrades.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.written || 'S/A',
                    graduationCost: s.graduationCost,
                    phone: s.phone
                };
            });

            return {
                professorId: prof.id,
                professorName: prof.nickname || prof.name,
                phone: prof.phone,
                currentContent: "Fundamentos e Sequências", // Static for now as not tracked
                students: studentsData
            };
        });
    }, [managedUsers, studentGrades]);

    const filteredPayments = monthlyPayments.filter(p => paymentFilter === 'all' ? true : p.status === paymentFilter);
    const selectedClassInfo = myClasses.find(c => c.id === selectedClassId);
    const studentsForAttendance = managedUsers.filter(u => u.role === 'aluno' && u.professorName === (user.nickname || user.first_name || user.name)); // Filter by admin's nickname as professor
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
                        {uploadingPhoto && <div className="absolute inset-0 flex items-center justify-center rounded-full"><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div></div>}
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
                            <Shield className="text-red-500" />
                            Painel do Admin
                        </h1>
                        <p className="text-red-200 mt-2">Olá, {user.nickname || user.first_name || user.name}!</p>
                    </div>
                </div>
                <div className="absolute right-0 top-0 w-64 h-64 bg-red-600 rounded-full filter blur-[100px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
            </div>

            {/* Graduation Cost Alert for Admin (Moved here) */}
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

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-stone-700 pb-1">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'overview' ? 'bg-stone-800 text-orange-500 border-t-2 border-orange-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    Visão Geral
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'events' ? 'bg-stone-800 text-yellow-500 border-t-2 border-yellow-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    <CalendarPlus size={16} /> Eventos
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
                    <Users size={16} /> Alunos Detalhes
                </button>
                <button
                    onClick={() => setActiveTab('finance')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'finance' ? 'bg-stone-800 text-green-500 border-t-2 border-green-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    Financeiro
                    {(pendingUniformOrders.length > 0 || pendingEventRegistrations.length > 0) && (
                        <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                            {pendingUniformOrders.length + pendingEventRegistrations.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pedagogy')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${activeTab === 'pedagogy' ? 'bg-stone-800 text-blue-500 border-t-2 border-blue-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    Pedagógico
                </button>
                <button
                    onClick={() => setActiveTab('grades')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'grades' ? 'bg-stone-800 text-green-500 border-t-2 border-green-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    <Award size={16} /> Notas
                </button>
                <button
                    onClick={() => setActiveTab('my_classes')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'my_classes' ? 'bg-stone-800 text-purple-500 border-t-2 border-purple-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    <BookOpen size={16} /> Minhas Aulas
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'reports' ? 'bg-stone-800 text-orange-500 border-t-2 border-orange-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    <FileText size={16} /> Relatórios
                </button>
                <a href="https://discord.gg/AY2kk9Ubk" target="_blank" rel="noopener noreferrer" className="ml-auto">
                    <button className="px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 text-white border-b-2" style={{ backgroundColor: '#5865F2', borderColor: '#5865F2' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4752C4'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5865F2'}>
                        <MessageCircle size={16} /> Discord
                    </button>
                </a>
            </div>

            {/* --- TAB: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <button
                            onClick={() => setActiveTab('users')}
                            className="bg-stone-800 p-6 rounded-xl border border-stone-700 text-left hover:border-blue-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-blue-500`}>
                                    <Users size={24} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white">{managedUsers.filter(u => u.role === 'aluno').length}</h3>
                            <p className="text-stone-400 text-sm">Total Alunos</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className="bg-stone-800 p-6 rounded-xl border border-stone-700 text-left hover:border-green-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-green-500`}>
                                    <DollarSign size={24} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white">R$ {totalRevenue.toFixed(2).replace('.', ',')}</h3>
                            <p className="text-stone-400 text-sm">Receita Confirmada</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className="bg-stone-800 p-6 rounded-xl border border-stone-700 text-left hover:border-red-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-red-500`}>
                                    <Wallet size={24} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white">R$ {pendingRevenue.toFixed(2).replace('.', ',')}</h3>
                            <p className="text-stone-400 text-sm">Receita Pendente</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('events')}
                            className="bg-stone-800 p-6 rounded-xl border border-stone-700 text-left hover:border-orange-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-orange-500`}>
                                    <CalendarPlus size={24} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white">{events.length}</h3>
                            <p className="text-stone-400 text-sm">Eventos Ativos</p>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Notifications Feed */}
                        <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 lg:col-span-1">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Activity className="text-yellow-500" />
                                    Atividades Recentes
                                </h3>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={onClearNotifications}
                                        className="text-[10px] uppercase font-bold text-stone-500 hover:text-red-500 transition-colors"
                                    >
                                        Limpar
                                    </button>
                                )}
                            </div>
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

                    </div>
                </div>
            )}

            {/* --- TAB: GRADES --- */}
            {activeTab === 'grades' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Award className="text-green-500" /> Notas de Alunos</h2>
                                <p className="text-stone-400 text-sm">Visualize avaliações escritas e notas numéricas por aluno.</p>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-2.5 text-stone-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar aluno por nome/apelido..."
                                    value={studentDetailsSearch}
                                    onChange={(e) => setStudentDetailsSearch(e.target.value)}
                                    className="w-full bg-stone-900 border border-stone-600 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:border-green-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {(studentGrades || [])
                                .filter(g => {
                                    if (!studentDetailsSearch.trim()) return true;
                                    const st = managedUsers.find(u => u.id === g.student_id);
                                    const name = st?.nickname || st?.name || g.student_name || '';
                                    return name.toLowerCase().includes(studentDetailsSearch.toLowerCase());
                                })
                                .map(g => {
                                    const st = managedUsers.find(u => u.id === g.student_id);
                                    const name = st?.nickname || st?.name || g.student_name;
                                    const categoryLabel = g.category === 'theory' ? 'Teórica' : g.category === 'movement' ? 'Movimentação' : 'Musicalidade';
                                    const numericVal = typeof g.numeric === 'number' ? g.numeric : Number(g.numeric);
                                    return (
                                        <div key={g.id} className="bg-stone-900 p-3 rounded border-l-2 border-green-500">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="text-white font-semibold">{name}</p>
                                                    <p className="text-stone-400 text-xs">{categoryLabel}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-white font-bold">{Number.isFinite(numericVal) ? numericVal.toFixed(1) : '-'}</p>
                                                    <p className="text-stone-500 text-[10px]">{new Date(g.created_at).toLocaleString('pt-BR')}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-stone-300 text-sm">
                                                {g.written || <span className="text-stone-500 italic">Sem avaliação escrita.</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            {(studentGrades || []).length === 0 && (
                                <p className="text-stone-500 italic">Nenhuma nota registrada.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* --- TAB: EVENTS --- */}
            {activeTab === 'events' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6">
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
                                            onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Data</label>
                                        <input
                                            type="text"
                                            value={eventFormData.date}
                                            onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400 block mb-1">Valor do Evento (R$)</label>
                                        <input
                                            type="number"
                                            value={eventFormData.price}
                                            onChange={e => setEventFormData({ ...eventFormData, price: e.target.value })}
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
                                            onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
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

                                    {/* Participants List */}
                                    <div className="mt-4 border-t border-stone-700 pt-4">
                                        <button
                                            onClick={() => setExpandedEventParticipants(expandedEventParticipants === event.id ? null : event.id)}
                                            className="flex items-center gap-2 text-stone-400 hover:text-white text-sm font-medium"
                                        >
                                            <Users size={16} />
                                            Participantes ({eventRegistrations.filter(reg => reg.event_id === event.id).length})
                                            {expandedEventParticipants === event.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {expandedEventParticipants === event.id && (
                                            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-2">
                                                {eventRegistrations.filter(reg => reg.event_id === event.id).length > 0 ? (
                                                    eventRegistrations.filter(reg => reg.event_id === event.id).map(reg => (
                                                        <div key={reg.id} className="flex items-center justify-between bg-stone-800 p-2 rounded">
                                                            <span className="text-white text-sm">{reg.user_name}</span>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${reg.status === 'paid' ? 'bg-green-900/30 text-green-400' :
                                                                reg.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                                                                    'bg-red-900/30 text-red-400'
                                                                }`}>
                                                                {reg.status === 'paid' ? 'Pago' : reg.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-stone-500 text-xs italic">Nenhum participante registrado ainda.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="text-stone-500 text-sm col-span-full text-center py-4">Nenhum evento ativo.</div>
                            )}
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
                                    <button onClick={() => setShowBeltConfig(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
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

                    {/* ADD PAYMENT MODAL */}
                    {showAddPaymentModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                            <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative flex flex-col max-h-[90vh]">
                                <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <PlusCircle className="text-green-500" />
                                        Adicionar Novo Pagamento
                                    </h3>
                                    <button onClick={() => setShowAddPaymentModal(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleAddPayment} className="space-y-4">
                                    <div>
                                        <label htmlFor="studentId" className="block text-sm text-stone-400 mb-1">Aluno</label>
                                        <select
                                            id="studentId"
                                            name="studentId"
                                            value={newPaymentForm.studentId}
                                            onChange={(e) => setNewPaymentForm({ ...newPaymentForm, studentId: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        >
                                            <option value="">Selecione um aluno</option>
                                            {managedUsers.map(userItem => (
                                                <option key={userItem.id} value={userItem.id}>{userItem.nickname || userItem.name} ({userItem.role})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="month" className="block text-sm text-stone-400 mb-1">Mês de Referência</label>
                                        <input
                                            type="text"
                                            id="month"
                                            name="month"
                                            value={newPaymentForm.month}
                                            onChange={(e) => setNewPaymentForm({ ...newPaymentForm, month: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            placeholder="Ex: Outubro"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="dueDate" className="block text-sm text-stone-400 mb-1">Data de Vencimento</label>
                                        <input
                                            type="date"
                                            id="dueDate"
                                            name="dueDate"
                                            value={newPaymentForm.dueDate}
                                            onChange={(e) => setNewPaymentForm({ ...newPaymentForm, dueDate: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="amount" className="block text-sm text-stone-400 mb-1">Valor (R$)</label>
                                        <input
                                            type="number"
                                            id="amount"
                                            name="amount"
                                            value={newPaymentForm.amount}
                                            onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            placeholder="Ex: 100.00"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="pt-4 flex justify-end gap-2 border-t border-stone-700 mt-4">
                                        <button type="button" onClick={() => setShowAddPaymentModal(false)} className="px-4 py-2 text-stone-400 hover:text-white">Cancelar</button>
                                        <Button type="submit">
                                            <Plus size={18} /> Adicionar Pagamento
                                        </Button>
                                    </div>
                                </form>
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
                                            <td className="p-4 text-green-400 font-bold">R$ {order.total.toFixed(2).replace('.', ',')}</td>
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
                                                            <DollarSign size={14} className="mr-1" /> Confirmar Pagto
                                                        </Button>
                                                    )}
                                                    {order.status === 'ready' && (
                                                        <Button
                                                            className="text-xs px-2 py-1 h-auto"
                                                            onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                                            title="Marcar como Entregue ao Aluno"
                                                        >
                                                            <Package size={14} className="mr-1" /> Entregar
                                                        </Button>
                                                    )}
                                                    {order.status === 'delivered' && (
                                                        <span className="text-stone-600 text-xs flex items-center justify-end gap-1"><CheckCircle size={12} /> Finalizado</span>
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

                    {/* EVENT REGISTRATIONS PANEL */}
                    <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                            <Ticket className="text-purple-500" />
                            Registros de Eventos
                            {pendingEventRegistrations.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingEventRegistrations.length} pendentes</span>}
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                        <th className="p-4">Participante</th>
                                        <th className="p-4">Evento</th>
                                        <th className="p-4">Valor Pago</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Comprovante</th> {/* NEW COLUMN */}
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700 text-sm">
                                    {eventRegistrations.map(reg => (
                                        <tr key={reg.id} className={`hover:bg-stone-700/30 ${reg.status === 'pending' ? 'bg-purple-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold text-white">{reg.user_name}</div>
                                                <div className="text-xs text-stone-500">Registrado em: {new Date(reg.registered_at).toLocaleDateString('pt-BR')}</div>
                                            </td>
                                            <td className="p-4 text-white font-medium">{reg.event_title}</td>
                                            <td className="p-4 text-green-400 font-bold">R$ {reg.amount_paid.toFixed(2).replace('.', ',')}</td>
                                            <td className="p-4">
                                                {reg.status === 'pending' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs border border-yellow-900/50">Pendente Pagamento</span>}
                                                {reg.status === 'paid' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs border border-green-900/50">Pago</span>}
                                                {reg.status === 'cancelled' && <span className="px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs border border-red-900/50">Cancelado</span>}
                                            </td>
                                            <td className="p-4"> {/* NEW: Comprovante Column */}
                                                {reg.proof_url ? (
                                                    <button
                                                        onClick={() => handleViewEventRegistrationProof(reg.proof_url!, reg.event_title + ' Comprovante')}
                                                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                                    >
                                                        <Eye size={14} /> Ver Comprovante
                                                    </button>
                                                ) : (
                                                    <span className="text-stone-500 text-xs italic">Nenhum</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {reg.status === 'pending' && (
                                                        <Button
                                                            className="text-xs px-2 py-1 h-auto"
                                                            variant="secondary"
                                                            onClick={() => handleUpdateEventRegistration(reg.id, 'paid')}
                                                            title="Confirmar Pagamento"
                                                        >
                                                            <DollarSign size={14} className="mr-1" /> Confirmar Pagto
                                                        </Button>
                                                    )}
                                                    {reg.status === 'paid' && (
                                                        <span className="text-stone-600 text-xs flex items-center justify-end gap-1"><CheckCircle size={12} /> Finalizado</span>
                                                    )}
                                                    {reg.status !== 'cancelled' && (
                                                        <button
                                                            onClick={() => handleUpdateEventRegistration(reg.id, 'cancelled')}
                                                            className="p-2 bg-stone-900 hover:bg-stone-700 text-stone-400 hover:text-red-500 rounded transition-colors"
                                                            title="Cancelar Registro"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {eventRegistrations.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-stone-500 italic">Nenhum registro de evento.</td> {/* Updated colspan */}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-stone-800 rounded-2xl border border-stone-700 mt-6 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-stone-700/50 bg-stone-900/10">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-green-500/10 rounded-xl border border-green-500/20 text-green-500">
                                        <DollarSign size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight">Controle de Mensalidades</h2>
                                        <p className="text-stone-400 text-sm">Vencimento sugerido: Dia 10 de cada mês</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                    <div className="bg-stone-900/50 px-4 py-2 rounded-xl border border-stone-700 flex flex-col justify-center min-w-[150px]">
                                        <span className="text-stone-500 text-[10px] uppercase font-black tracking-wider">A Receber</span>
                                        <p className="text-lg font-black text-red-500 leading-none">R$ {pendingMonthlyPayments.toFixed(2).replace('.', ',')}</p>
                                    </div>

                                    <div className="flex items-center gap-2 ml-auto lg:ml-0">
                                        <button
                                            onClick={() => setShowBeltConfig(true)}
                                            className="p-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg border border-stone-600 transition-all shadow-md"
                                            title="Configurar Valores de Graduação"
                                        >
                                            <Settings size={20} />
                                        </button>
                                        <Button
                                            onClick={handleGenerateMonthlyPayments}
                                            variant="secondary"
                                            className="border border-green-900/50 text-green-400 hover:bg-green-900/20 px-4 py-2 text-sm h-11"
                                        >
                                            <CalendarCheck size={16} /> <span className="hidden sm:inline">Gerar Mês</span>
                                        </Button>
                                        <Button
                                            onClick={() => setShowAddPaymentModal(true)}
                                            className="px-4 py-2 text-sm font-bold h-11 shadow-lg shadow-orange-900/20"
                                        >
                                            <Plus size={18} /> Adicionar Pagamento
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">

                            {/* Filters */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {['all', 'paid', 'pending', 'overdue'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setPaymentFilter(status as any)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${paymentFilter === status
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
                                            <th className="p-4">Comprovante</th> {/* New column for proof */}
                                            <th className="p-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-700 text-sm">
                                        {filteredPayments.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-stone-700/30">
                                                <td className="p-4 font-medium text-white">{payment.student_name}</td>
                                                <td className="p-4 text-stone-300">{payment.month}</td>
                                                <td className="p-4 text-stone-300">{payment.due_date}</td>
                                                <td className="p-4 text-white font-mono">R$ {payment.amount.toFixed(2).replace('.', ',')}</td>
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
                                                <td className="p-4"> {/* Proof Column */}
                                                    {payment.proof_url ? (
                                                        <button
                                                            onClick={() => handleViewPaymentProof(payment.proof_url!, payment.proof_name || 'Comprovante')}
                                                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                                        >
                                                            <FileUp size={14} /> Ver Comprovante
                                                        </button>
                                                    ) : (
                                                        <span className="text-stone-500 text-xs italic">Nenhum</span>
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

                    <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 mt-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <GraduationCap className="text-purple-500" />
                                Gerenciamento de Avaliações
                            </h2>
                        </div>
                        <p className="text-stone-400 text-sm mb-4">Controle os custos e geração de boletos para trocas de graduação.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                        <th className="p-4">Aluno</th>
                                        <th className="p-4">Graduação Atual</th>
                                        <th className="p-4">Custo Padrão</th>
                                        <th className="p-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700 text-sm">
                                    {managedUsers.map(student => (
                                        <tr key={student.id} className="hover:bg-stone-700/30">
                                            <td className="p-4 font-medium text-white">{student.nickname || student.name}</td>
                                            <td className="p-4 text-stone-300">{student.belt || 'Sem Cordel'}</td>
                                            <td className="p-4 text-white font-mono">R$ {(student.graduationCost ?? 0).toFixed(2).replace('.', ',')}</td>
                                            <td className="p-4 text-right">
                                                <Button
                                                    className="text-xs h-8"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setEvalModalStudent(student);
                                                        setEvalModalAmount((student.graduationCost ?? 0).toString());
                                                        // Default due date: 15 days from now
                                                        const dueDate = new Date();
                                                        dueDate.setDate(dueDate.getDate() + 15);
                                                        setEvalModalDueDate(dueDate.toISOString().split('T')[0]);
                                                        setShowEvalModal(true);
                                                    }}
                                                >
                                                    Gerar Boleto
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* EVALUATION MODAL */}
                    {showEvalModal && evalModalStudent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                            <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative">
                                <button
                                    onClick={() => {
                                        setShowEvalModal(false);
                                        setEvalModalStudent(null);
                                        setEvalModalAmount('');
                                        setEvalModalDueDate('');
                                    }}
                                    className="absolute top-4 right-4 text-stone-400 hover:text-white"
                                >
                                    <X size={24} />
                                </button>

                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <GraduationCap size={20} className="text-purple-500" />
                                    Gerar Boleto de Avaliação
                                </h3>

                                <div className="space-y-4">
                                    <div className="bg-stone-900 p-4 rounded-lg border border-stone-700">
                                        <p className="text-stone-400 text-sm">Aluno</p>
                                        <p className="text-white font-bold text-lg">{evalModalStudent.nickname || evalModalStudent.name}</p>
                                        <p className="text-stone-500 text-xs mt-1">Graduação: {evalModalStudent.belt || 'Sem Cordel'}</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-stone-400 mb-2">Valor do Boleto (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={evalModalAmount}
                                            onChange={(e) => setEvalModalAmount(e.target.value)}
                                            className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white text-lg font-mono focus:border-purple-500 outline-none"
                                            placeholder="0,00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-stone-400 mb-2">Data de Vencimento</label>
                                        <input
                                            type="date"
                                            value={evalModalDueDate}
                                            onChange={(e) => setEvalModalDueDate(e.target.value)}
                                            className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowEvalModal(false);
                                                setEvalModalStudent(null);
                                                setEvalModalAmount('');
                                                setEvalModalDueDate('');
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            className="flex-1 bg-purple-600 hover:bg-purple-500"
                                            onClick={async () => {
                                                const amount = parseFloat(evalModalAmount);
                                                if (isNaN(amount) || amount <= 0) {
                                                    alert('Por favor, insira um valor válido.');
                                                    return;
                                                }
                                                if (!evalModalDueDate) {
                                                    alert('Por favor, selecione a data de vencimento.');
                                                    return;
                                                }

                                                await onAddPaymentRecord({
                                                    student_id: evalModalStudent.id,
                                                    student_name: evalModalStudent.nickname || evalModalStudent.name,
                                                    month: `Avaliação - ${new Date().getFullYear()}`,
                                                    due_date: evalModalDueDate,
                                                    amount: amount,
                                                    status: 'pending',
                                                    type: 'evaluation'
                                                });

                                                alert(`Boleto de R$ ${amount.toFixed(2).replace('.', ',')} gerado com sucesso para ${evalModalStudent.nickname || evalModalStudent.name}!`);

                                                setShowEvalModal(false);
                                                setEvalModalStudent(null);
                                                setEvalModalAmount('');
                                                setEvalModalDueDate('');
                                            }}
                                            disabled={!evalModalAmount || parseFloat(evalModalAmount) <= 0}
                                        >
                                            Confirmar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                                    <button onClick={() => setShowUserModal(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
                                </div>

                                <form onSubmit={handleSaveUser} className="overflow-y-auto flex-1 pr-2 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-stone-400 mb-1">Nome Completo</label>
                                            <input
                                                type="text"
                                                required
                                                value={userForm.name}
                                                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-stone-400 mb-1">Apelido (Capoeira)</label>
                                            <input
                                                type="text"
                                                value={userForm.nickname}
                                                onChange={(e) => setUserForm({ ...userForm, nickname: e.target.value })}
                                                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-stone-400 mb-1">WhatsApp</label>
                                            <input
                                                type="text"
                                                value={userForm.phone}
                                                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
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
                                                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
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
                                                onChange={(e) => setUserForm({ ...userForm, birthDate: e.target.value })}
                                                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Cordel / Graduação</label>
                                        <select
                                            value={userForm.belt}
                                            onChange={(e) => setUserForm({ ...userForm, belt: e.target.value })}
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
                                                onChange={(e) => setUserForm({ ...userForm, professorName: e.target.value })}
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
                                        <th className="p-4">Próxima Avaliação</th> {/* New column */}
                                        <th className="p-4 rounded-tr-lg text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700 text-sm">
                                    {filteredManagedUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-stone-700/30 group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                                                        <Logo className="w-full h-full object-cover" /> {/* Adicionado */}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{u.nickname || u.name}</p>
                                                        <p className="text-xs text-stone-500">{u.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-red-900/30 text-red-400 border border-red-900/50' :
                                                    u.role === 'professor' ? 'bg-purple-900/30 text-purple-400 border border-purple-900/50' :
                                                        'bg-stone-700 text-stone-300'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="flex items-center gap-1 text-xs text-stone-300"><Mail size={12} /> {u.email}</span>
                                                    {u.phone && <span className="flex items-center gap-1 text-xs text-stone-400"><Phone size={12} /> {u.phone}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-stone-300 text-xs">
                                                {u.belt}
                                            </td>
                                            <td className="p-4"> {/* Evaluation Info Column */}
                                                {editingGradCostId === u.id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-stone-400 w-8">Valor:</span>
                                                            <input
                                                                type="number"
                                                                value={editingGradCostValue}
                                                                onChange={(e) => setEditingGradCostValue(e.target.value)}
                                                                className="w-24 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-white text-xs"
                                                                placeholder="0.00"
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-stone-400 w-8">Data:</span>
                                                            <input
                                                                type="date"
                                                                value={editingEvaluationDate}
                                                                onChange={(e) => setEditingEvaluationDate(e.target.value)}
                                                                className="w-24 bg-stone-900 border border-stone-600 rounded px-2 py-1 text-white text-xs"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-1 mt-1">
                                                            <button
                                                                onClick={() => handleUpdateEvaluationInfo(u.id)} // Use generic function
                                                                className="text-green-500 hover:text-green-400 p-1 rounded bg-stone-800 border border-stone-700 hover:bg-stone-700"
                                                                title="Salvar"
                                                            >
                                                                <Save size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingGradCostId(null); setEditingGradCostValue(''); setEditingEvaluationDate(''); }}
                                                                className="text-stone-500 hover:text-red-500 p-1 rounded bg-stone-800 border border-stone-700 hover:bg-stone-700"
                                                                title="Cancelar"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1 group">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-stone-400 w-8">Valor:</span>
                                                            <span className={`${u.graduationCost !== undefined && u.graduationCost > 0 ? 'text-green-400 font-bold' : 'text-stone-500 italic'}`}>
                                                                {u.graduationCost !== undefined ? `R$ ${u.graduationCost.toFixed(2).replace('.', ',')}` : 'ND'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-stone-400 w-8">Data:</span>
                                                            <span className={`${u.nextEvaluationDate ? 'text-white' : 'text-stone-500 italic'}`}>
                                                                {u.nextEvaluationDate ? new Date(u.nextEvaluationDate).toLocaleDateString() : 'ND'}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingGradCostId(u.id);
                                                                    setEditingGradCostValue(u.graduationCost?.toString() || '0');
                                                                    setEditingEvaluationDate(u.nextEvaluationDate || '');
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-blue-500 transition-opacity p-1 rounded ml-auto"
                                                                title="Editar Avaliação"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                        </div>
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
                                                    <Logo className="w-full h-full object-cover" /> {/* Adicionado */}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white text-lg">{student.nickname || student.name}</h3>
                                                    <p className="text-xs text-stone-400">{student.belt || 'Sem Cordel'}</p>
                                                </div>
                                            </div>
                                            {expandedStudent === student.id ? <ChevronUp className="text-stone-400" /> : <ChevronDown className="text-stone-400" />}
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
                                                                        <FileText size={14} className="mr-1" /> Ver
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
                                                                        <Video size={14} className="mr-1" /> Ver
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
                                                                            <Paperclip size={12} /> Ver Anexo
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
                            {professorsData.length > 0 ? (
                                professorsData.map((prof) => (
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
                                            {expandedProfessor === prof.professorId ? <ChevronUp className="text-stone-400" /> : <ChevronDown className="text-stone-400" />}
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
                                                                        <div className="w-16 h-2 bg-stone-700 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full ${student.attendanceRate > 85 ? 'bg-green-500' : student.attendanceRate > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                                style={{ width: `${student.attendanceRate}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-stone-400">{student.attendanceRate}%</span>
                                                                    </td>
                                                                    <td className="py-3 text-stone-300">
                                                                        {Number.isFinite(typeof student.technicalGrade === 'number' ? student.technicalGrade : Number(student.technicalGrade))
                                                                            ? (typeof student.technicalGrade === 'number' ? student.technicalGrade : Number(student.technicalGrade)).toFixed(1)
                                                                            : '-'}
                                                                    </td>
                                                                    <td className="py-3 text-stone-400 text-xs italic">"{student.lastEvaluation}"</td>
                                                                    <td className="py-3">
                                                                        {/* This section is now handled in the 'Gerenciar Usuários' tab */}
                                                                        <span className={`${student.graduationCost !== undefined && student.graduationCost > 0 ? 'text-green-400' : 'text-stone-500'}`}>
                                                                            {student.graduationCost !== undefined ? `R$ ${student.graduationCost.toFixed(2).replace('.', ',')}` : '-'}
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
                                ))
                            ) : (
                                <p className="text-stone-500 italic text-center py-4">Nenhum professor encontrado ou dados de alunos não carregados.</p>
                            )}
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

                    {/* --- PROF MODE: ASSIGN TO STUDENT MODAL --- */}
                    {showAssignToStudentModal && selectedAssignmentToAssign && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                            <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative">
                                <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <BookOpen className="text-blue-500" />
                                        Atribuir Trabalho
                                    </h3>
                                    <button onClick={() => setShowAssignToStudentModal(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleAddAssignment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Trabalho</label>
                                        <input
                                            type="text"
                                            value={selectedAssignmentToAssign.title}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Atribuir a Aluno</label>
                                        <select
                                            value={newAssignment.studentId} // Use newAssignment.studentId here
                                            onChange={(e) => setNewAssignment(prev => ({ ...prev, studentId: e.target.value }))} // Update newAssignment state
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        >
                                            <option value="">Selecione um aluno</option>
                                            {managedUsers.filter(u => u.role === 'aluno' && u.professorName === (user.nickname || user.first_name || user.name)).map(student => (
                                                <option key={student.id} value={student.id}>{student.nickname || student.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="pt-4 flex justify-end gap-2 border-t border-stone-700 mt-4">
                                        <button type="button" onClick={() => setShowAssignToStudentModal(false)} className="px-4 py-2 text-stone-400 hover:text-white">Cancelar</button>
                                        <Button type="submit">
                                            <Plus size={18} /> Atribuir
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

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
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors ${isPresent ? 'bg-green-600' : 'bg-red-900'}`}>
                                                    <Logo className="w-full h-full object-cover" /> {/* Adicionado */}
                                                </div>
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
                                <div><label className="block text-sm text-stone-400 mb-1">Título</label><input type="text" required value={newClassData.title} onChange={e => setNewClassData({ ...newClassData, title: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm text-stone-400 mb-1">Data</label><input type="date" required value={newClassData.date} onChange={e => setNewClassData({ ...newClassData, date: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]" /></div>
                                    <div><label className="block text-sm text-stone-400 mb-1">Horário</label><input type="time" required value={newClassData.time} onChange={e => setNewClassData({ ...newClassData, time: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white" /></div>
                                </div>
                                <div><label className="block text-sm text-stone-400 mb-1">Local</label><input type="text" required value={newClassData.location} onChange={e => setNewClassData({ ...newClassData, location: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white" /></div>
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
                                                onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
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
                                                onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                                                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Descrição / Instruções</label>
                                        <textarea
                                            value={newAssignment.description}
                                            onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
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
                                                        <Calendar size={12} /> Entrega: {assign.due_date}
                                                    </span>
                                                    {assign.due_date === today && (
                                                        <span className="text-red-500 font-bold flex items-center gap-1 animate-pulse">
                                                            <AlertCircle size={12} /> Vence Hoje!
                                                        </span>
                                                    )}
                                                </div>

                                                {/* List of students for this assignment */}
                                                <div className="mb-3">
                                                    <p className="text-xs text-stone-400 mb-1">Alunos para entrega:</p>
                                                    <div className="space-y-1">
                                                        {managedUsers.filter(u => u.role === 'aluno' && (assign.student_id === null || assign.student_id === u.id)).map(student => {
                                                            const studentAssignment = assignments.find(a => a.id === assign.id && a.student_id === student.id);
                                                            const isSubmitted = studentAssignment?.status === 'completed';
                                                            return (
                                                                <div key={student.id} className="flex items-center justify-between bg-stone-800 p-2 rounded">
                                                                    <span className="text-white text-sm">{student.nickname || student.name}</span>
                                                                    {isSubmitted ? (
                                                                        <span className="text-green-400 text-xs flex items-center gap-1">
                                                                            <Check size={12} /> Entregue
                                                                        </span>
                                                                    ) : (
                                                                        <label className="cursor-pointer">
                                                                            <span className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors inline-block">
                                                                                {uploadingMusicFile ? 'Enviando...' : 'Subir Entrega'}
                                                                            </span>
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                onChange={(e) => e.target.files && e.target.files[0] && handleCompleteAssignment(assign.id, student.id, e.target.files[0])}
                                                                                disabled={uploadingMusicFile}
                                                                            />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="secondary"
                                                    className="w-full mt-3"
                                                    onClick={() => {
                                                        setSelectedAssignmentToAssign(assign);
                                                        setShowAssignToStudentModal(true);
                                                    }}
                                                >
                                                    <UserPlus size={16} /> Atribuir a Aluno Específico
                                                </Button>
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
                                <textarea className="w-full bg-stone-900 border border-stone-600 rounded p-3 text-white" placeholder="Pontos Positivos" value={evalData.positive} onChange={e => setEvalData({ ...evalData, positive: e.target.value })} />
                                <textarea className="w-full bg-stone-900 border border-stone-600 rounded p-3 text-white" placeholder="Pontos a Melhorar" value={evalData.negative} onChange={e => setEvalData({ ...evalData, negative: e.target.value })} />
                                <Button fullWidth onClick={handleSaveEvaluation}>Salvar Avaliação</Button>
                                <button onClick={() => setProfView('all_students')} className="block w-full text-center text-stone-500 mt-2">Cancelar</button>
                            </div>
                        </div>
                    )}

                    {/* --- PROF MODE: UNIFORM --- */}
                    {profView === 'uniform' && (
                        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                            <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
                            <h2 className="text-2xl font-bold text-white mb-6">Solicitar Uniforme (Admin/Prof)</h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <form onSubmit={handleOrderUniform} className="space-y-4">
                                    <select value={orderForm.item} onChange={e => setOrderForm({ ...orderForm, item: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"><option value="combo">Combo</option><option value="shirt">Blusa</option><option value="pants_roda">Calça Roda</option></select>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select value={orderForm.shirtSize} onChange={e => setOrderForm({ ...orderForm, shirtSize: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"><option value="">Tam. Blusa</option><option value="M">M</option><option value="G">G</option></select>
                                        <select value={orderForm.pantsSize} onChange={e => setOrderForm({ ...orderForm, pantsSize: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white"><option value="">Tam. Calça</option><option value="40">40</option><option value="42">42</option></select>
                                    </div>
                                    <Button fullWidth type="submit">Fazer Pedido</Button>
                                </form>
                                <div className="bg-stone-900 p-4 rounded text-sm text-stone-400">
                                    <h3 className="text-white font-bold mb-2">Meus Pedidos</h3>
                                    {myOrders.length === 0 ? <p>Nenhum pedido.</p> : myOrders.map(o => <div key={o.id} className="border-b border-stone-700 py-1">{o.item} - R$ {o.total.toFixed(2).replace('.', ',')}</div>)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PROF MODE: MUSIC --- */}
                    {profView === 'music_manager' && (
                        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                            <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
                            <h2 className="2xl font-bold text-white mb-6">Acervo Musical</h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <form onSubmit={handleSubmitMusic} className="space-y-4">
                                    <input type="text" placeholder="Título" value={musicForm.title} onChange={e => setMusicForm({ ...musicForm, title: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                                    <input type="text" placeholder="Categoria" value={musicForm.category} onChange={e => setMusicForm({ ...musicForm, category: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white" required />
                                    <textarea placeholder="Letra..." value={musicForm.lyrics} onChange={e => setMusicForm({ ...musicForm, lyrics: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded p-2 text-white h-32" />

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
                        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in p-6">
                            <button onClick={() => setProfView('dashboard')} className="mb-4 text-stone-400 flex items-center gap-2"><ArrowLeft size={16} /> Voltar</button>
                            <h2 className="2xl font-bold text-white mb-6">Meus Alunos (Admin Class)</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                {studentsForAttendance.map(student => ( // Use real students here
                                    <div key={student.id} className="bg-stone-900 p-4 rounded border border-stone-700 flex justify-between items-center">
                                        <div><p className="text-white font-bold">{student.nickname || student.name}</p><p className="text-stone-500 text-sm">{student.belt}</p></div>
                                        <div className="flex gap-2">
                                            <Button variant="secondary" className="text-xs h-8" onClick={() => handleOpenEvaluation(student.id)}>Avaliar</Button>
                                            <button onClick={() => handleWhatsApp(student.phone)} className="bg-green-600 text-white p-2 rounded hover:bg-green-500"><MessageCircle size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- DEFAULT DASHBOARD --- */}
                    {profView === 'dashboard' && (
                        <>
                            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 relative mb-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><UploadCloud className="text-purple-500" /> Registro de Aula</h3>
                                <div className="border-2 border-dashed border-stone-600 rounded-lg p-6 flex flex-col items-center justify-center bg-stone-900/50">
                                    {classPhoto ? (
                                        <div className="relative w-full h-32 rounded overflow-hidden"><img src={classPhoto} className="w-full h-full object-cover" /><button onClick={() => setClassPhoto(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X size={12} /></button></div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center"><Camera size={32} className="text-stone-500 mb-2" /><span className="text-purple-400 font-bold">Enviar Foto</span><input type="file" className="hidden" onChange={handlePhotoUpload} /></label>
                                    )}
                                </div>
                            </div>
                            <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                                <h3 className="text-xl font-bold text-white mb-4">Registros de Aula Recebidos</h3>
                                <div className="space-y-2">
                                    {classRecords.length > 0 ? classRecords.map(rec => (
                                        <div key={rec.name} className="flex justify-between items-center bg-stone-900 p-3 rounded border-l-2 border-purple-500">
                                            <span className="text-stone-300 text-sm truncate max-w-[60%]">{rec.name}</span>
                                            <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 text-xs hover:underline">Abrir</a>
                                        </div>
                                    )) : (
                                        <p className="text-stone-500 text-sm">Nenhum registro enviado ainda.</p>
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
                                        {studentsForAttendance.slice(0, 3).map(student => ( // Use real students here
                                            <div key={student.id} className="flex items-center gap-3 p-2 bg-stone-900 rounded">
                                                <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold">
                                                    <Logo className="w-full h-full object-cover" /> {/* Adicionado */}
                                                </div>
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
                                            <BookOpen size={16} className="text-blue-400" />
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

            {activeTab === 'grades' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                        <h3 className="text-xl font-bold text-white mb-4">Notas dos Alunos</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-stone-700 text-xs text-stone-500">
                                        <th className="pb-2">Aluno</th>
                                        <th className="pb-2">Categoria</th>
                                        <th className="pb-2">Nota</th>
                                        <th className="pb-2">Avaliação Escrita</th>
                                        <th className="pb-2">Professor</th>
                                        <th className="pb-2">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {(studentGrades || []).length > 0 ? (
                                        (studentGrades || []).map(g => {
                                            const numericVal = typeof g.numeric === 'number' ? g.numeric : Number(g.numeric);
                                            return (
                                                <tr key={g.id} className="border-b border-stone-800">
                                                    <td className="py-2 text-white">{g.student_name}</td>
                                                    <td className="py-2 text-stone-300">
                                                        {g.category === 'theory' ? 'Teórica' : g.category === 'movement' ? 'Movimentação' : 'Musicalidade'}
                                                    </td>
                                                    <td className="py-2 text-white font-bold">{Number.isFinite(numericVal) ? numericVal.toFixed(1) : '-'}</td>
                                                    <td className="py-2 text-stone-400">{g.written}</td>
                                                    <td className="py-2 text-stone-300">{g.professor_name}</td>
                                                    <td className="py-2 text-stone-500">{g.created_at?.split('T')[0] || ''}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td className="py-4 text-stone-500" colSpan={6}>Nenhuma nota registrada.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-6 animate-fade-in relative">
                    <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <FileText className="text-orange-500" />
                                    Relatório Financeiro Detalhado
                                </h2>
                                <p className="text-stone-400 text-sm">Visão geral de todas as receitas confirmadas e pendentes.</p>
                            </div>
                            <Button onClick={handleDownloadFinancialReport}>
                                <FileText size={18} className="mr-2" /> Baixar Relatório (CSV)
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-stone-900 p-4 rounded-xl border border-stone-700">
                                <p className="text-stone-500 text-xs uppercase font-bold mb-1">Total Recebido</p>
                                <p className="text-2xl font-bold text-green-500">R$ {totalRevenue.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div className="bg-stone-900 p-4 rounded-xl border border-stone-700">
                                <p className="text-stone-500 text-xs uppercase font-bold mb-1">Pendente Total</p>
                                <p className="text-2xl font-bold text-red-500">R$ {pendingRevenue.toFixed(2).replace('.', ',')}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                        <th className="p-4 rounded-tl-lg">Data</th>
                                        <th className="p-4">Descrição</th>
                                        <th className="p-4">Aluno</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4">Valor</th>
                                        <th className="p-4 rounded-tr-lg">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700 text-sm">
                                    {financialMovements.map((move, idx) => (
                                        <tr key={idx} className="hover:bg-stone-700/30">
                                            <td className="p-4 text-stone-300">{move.date}</td>
                                            <td className="p-4 font-medium text-white">{move.description}</td>
                                            <td className="p-4 text-stone-300">{move.student}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${move.type === 'Mensalidade' ? 'border-blue-900/50 text-blue-400 bg-blue-900/10' :
                                                    move.type === 'Uniforme' ? 'border-orange-900/50 text-orange-400 bg-orange-900/10' :
                                                        move.type === 'Evento' ? 'border-green-900/50 text-green-400 bg-green-900/10' :
                                                            'border-purple-900/50 text-purple-400 bg-purple-900/10'
                                                    }`}>
                                                    {move.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-white font-mono">R$ {move.value.toFixed(2).replace('.', ',')}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${move.status === 'Pago' ? 'text-green-400 bg-green-950/40' : 'text-yellow-400 bg-yellow-950/40'}`}>
                                                    {move.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {financialMovements.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-stone-500 italic">Nenhuma movimentação financeira encontrada.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};