import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import heic2any from "heic2any";
import { User, GroupEvent, PaymentRecord, ProfessorClassData, StudentAcademicData, AdminNotification, MusicItem, UserRole, UniformOrder, ALL_BELTS, HomeTraining, SchoolReport, Assignment, EventRegistration, ClassSession, StudentGrade, GradeCategory } from '../types';
import { Shield, Users, Bell, DollarSign, CalendarPlus, Plus, PlusCircle, CheckCircle, AlertCircle, Clock, GraduationCap, BookOpen, ChevronDown, ChevronUp, Trash2, Edit2, X, Save, Activity, MessageCircle, ArrowLeft, CalendarCheck, Camera, FileWarning, Info, Mic2, Music, Paperclip, Search, Shirt, ShoppingBag, ThumbsDown, ThumbsUp, UploadCloud, MapPin, Wallet, Check, Calendar, Settings, UserPlus, Mail, Phone, Lock, Package, FileText, Video, PlayCircle, Ticket, FileUp, Eye, Award, Instagram, Archive } from 'lucide-react'; // Import Archive
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
    onAddAttendance: (records: any[]) => Promise<void>;
    onAddClassRecord: (record: { photo_url: string; created_by: string; description?: string }) => Promise<void>;
    onAddStudentGrade: (payload: any) => Promise<void>;
    allUsersProfiles: User[];
    onToggleBlockUser: (userId: string, currentStatus?: 'active' | 'blocked' | 'archived') => Promise<void>;
    onToggleArchiveUser: (userId: string, currentStatus?: 'active' | 'blocked' | 'archived') => Promise<void>;
    onUpdateOrderWithProof: (orderId: string, proofUrl: string, proofName: string) => Promise<void>;
    onUpdateEventRegistrationWithProof: (updatedRegistration: EventRegistration) => Promise<void>;
    onDeleteMusic?: (musicId: string) => Promise<void>;
}

const UNIFORM_PRICES = {
    combo: 110.00,
    shirt: 30.00,
    pants_roda: 80.00,
    pants_train: 80.00
};

type Tab = 'overview' | 'events' | 'finance' | 'pedagogy' | 'my_classes' | 'users' | 'student_details' | 'grades' | 'reports' | 'music';
type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager';

export const DashboardAdmin: React.FC<Props> = ({
    user,
    onAddEvent,
    onEditEvent,
    onCancelEvent,
    events = [],
    notifications = [],
    musicList = [],
    onAddMusic = (_music: MusicItem) => { },
    onNotifyAdmin = (_action: string, _user: User) => { },
    onUpdateProfile,
    uniformOrders = [],
    onAddOrder,
    onUpdateOrderStatus,
    schoolReports = [],
    assignments = [],
    onAddAssignment,
    onUpdateAssignment,
    homeTrainings = [],
    monthlyPayments = [],
    onAddPaymentRecord,
    onUpdatePaymentRecord,
    eventRegistrations = [],
    onAddEventRegistration,
    onUpdateEventRegistrationStatus,
    onNavigate,
    classSessions = [],
    onAddClassSession,
    onUpdateClassSession,
    studentGrades = [],
    onClearNotifications = () => { },
    onAddAttendance,
    onAddClassRecord,
    onAddStudentGrade,
    allUsersProfiles = [],
    onToggleBlockUser,
    onToggleArchiveUser,
    onUpdateOrderWithProof,
    onUpdateEventRegistrationWithProof,
    onDeleteMusic = async (_id: string) => { }
}) => {
    const { session } = useSession();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
    const [selectedAssignmentTarget, setSelectedAssignmentTarget] = useState<'mine' | 'all'>('all');

    // Event Management State
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [eventFormData, setEventFormData] = useState({ title: '', date: '', description: '', price: '' });
    const [expandedEventParticipants, setExpandedEventParticipants] = useState<string | null>(null); // New state for event participants

    // Uniform State
    const [orderForm, setOrderForm] = useState({ item: 'combo', shirtSize: '', pantsSize: '' });
    const uniformFileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingUniformProof, setUploadingUniformProof] = useState(false);
    const [selectedOrderToProof, setSelectedOrderToProof] = useState<UniformOrder | null>(null);
    const [costPixCopied, setCostPixCopied] = useState(false);
    const getCurrentPrice = () => {
        switch (orderForm.item) {
            case 'shirt': return UNIFORM_PRICES.shirt;
            case 'pants_roda': return UNIFORM_PRICES.pants_roda;
            case 'pants_train': return UNIFORM_PRICES.pants_train;
            case 'combo': return UNIFORM_PRICES.combo;
            default: return 0;
        }
    };
    const [myOrders, setMyOrders] = useState<UniformOrder[]>([]);
    useEffect(() => {
        setMyOrders(uniformOrders.filter(o => o.user_id === user.id));
    }, [uniformOrders, user.id]);

    // Assignments State
    const [newAssignment, setNewAssignment] = useState<{ title: string, description: string, dueDate: string, studentId: string, file: File | null }>({ title: '', description: '', dueDate: '', studentId: '', file: null });
    const [showAssignToStudentModal, setShowAssignToStudentModal] = useState(false);
    const [selectedAssignmentToAssign, setSelectedAssignmentToAssign] = useState<Assignment | null>(null);
    const [selectedStudentForAssignment, setSelectedStudentForAssignment] = useState<string>('');
    const profModeAssignments = useMemo(() => (assignments || []).filter(a => a.created_by === user.id), [assignments, user.id]);
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
            }
        }

        // 2. Compress and resize
        const isImage = processingFile.type.startsWith('image/') && !processingFile.type.includes('gif');
        if (isImage) {
            try {
                return await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn('Image processing timeout, using original file');
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
                                console.error('Canvas processing failed:', err);
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

    // Finance State
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
    const [showBeltConfig, setShowBeltConfig] = useState(false);
    const [overdueSummary, setOverdueSummary] = useState<{ id: string; name: string; months: number }[]>([]);
    const [liberatedUsers, setLiberatedUsers] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('liberated_overdue_users');
        if (!saved) return {};
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                const obj: Record<string, number> = {};
                parsed.forEach((id: string) => { obj[id] = 3; });
                return obj;
            }
            return parsed;
        } catch { return {}; }
    });
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

    // Edit Payment State
    const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
    const [editPaymentForm, setEditPaymentForm] = useState({
        month: '',
        dueDate: '',
        amount: '',
        status: 'pending' as 'pending' | 'paid' | 'overdue',
    });

    // Pedagogy State
    // Pedagogy State - converted to useMemo below
    const [expandedProfessor, setExpandedProfessor] = useState<string | null>(null);

    // Users Management State
    // --- USERS MANAGEMENT ---
    // Instead of fetching again, derive from allUsersProfiles prop
    const [managedUsers, setManagedUsers] = useState<User[]>([]);

    useEffect(() => {
        if (allUsersProfiles && allUsersProfiles.length > 0) {
            const sorted = [...allUsersProfiles].sort((a, b) => {
                const indexA = ALL_BELTS.indexOf(a.belt || 'Cordel Cinza');
                const indexB = ALL_BELTS.indexOf(b.belt || 'Cordel Cinza');
                return indexB - indexA;
            });
            setManagedUsers(sorted);
        } else {
            setManagedUsers([]);
        }
    }, [allUsersProfiles]);
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
        birthDate: '',
        status: 'active' as 'active' | 'blocked'
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

    // State for manual installment (parcelado)
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const [installmentStudent, setInstallmentStudent] = useState<User | null>(null);
    const [installmentCount, setInstallmentCount] = useState<number>(1);
    const [installmentDueDate, setInstallmentDueDate] = useState<string>('');
    const today = new Date().toISOString().split('T')[0];
    const studentsForAttendance = (managedUsers || []).filter(u => u.role === 'aluno' && u.professorName === (user.nickname || user.first_name || user.name));

    const formatDatePTBR = (isoString: string | null | undefined): string => {
        if (!isoString) return '-';
        // Se já estiver no formato DD/MM/AAAA, retorna como está
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoString)) return isoString;

        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();

            return `${day}/${month}/${year}`;
        } catch (e) {
            return isoString;
        }
    };



    // --- PROFESSOR MODE STATE (Admin acting as Professor) ---
    const myClasses = useMemo(() => (classSessions || []).filter(cs => cs.professor_id === user.id), [classSessions, user.id]);

    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [classPhoto, setClassPhoto] = useState<string | null>(null);
    const [pixCopied, setPixCopied] = useState(false);
    const [classRecords, setClassRecords] = useState<{ name: string; url: string; created_at?: string }[]>([]);
    const [musicForm, setMusicForm] = useState<{ title: string; category: string; lyrics: string; url: string }>({ title: '', category: '', lyrics: '', url: '' });
    const [uploadingMusicFile, setUploadingMusicFile] = useState(false);
    const [evalData, setEvalData] = useState({
        theory: { written: '', numeric: '' },
        movement: { written: '', numeric: '' },
        musicality: { written: '', numeric: '' }
    });
    const [selectedStudentForEval, setSelectedStudentForEval] = useState<string | null>(null);
    const [studentName, setStudentName] = useState('');
    const [attendanceHistory, setAttendanceHistory] = useState<{ id: string; class_date: string; session_id: string; student_id: string; student_name: string; status: 'present' | 'absent' | 'justified'; justification?: string }[]>([]);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [savingGrades, setSavingGrades] = useState(false);

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




    // New Class Form State (for Professor Mode)
    const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '', adminSuggestion: '' });

    // Student Details Tab State
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
    const [studentDetailsSearch, setStudentDetailsSearch] = useState('');



    // --- OVERDUE MONITORING LOGIC ---
    useEffect(() => {
        const checkOverdue = () => {
            let liberationChanged = false;
            const newLiberated = { ...liberatedUsers };

            const usersWithSignificantOverdue = managedUsers.filter(u => {
                // Calculate pending/overdue monthly payments
                const unpaid = monthlyPayments.filter(p =>
                    p.student_id === u.id &&
                    (p.status === 'pending' || p.status === 'overdue') &&
                    (!p.type || p.type === 'Mensalidade')
                );

                const currentCount = unpaid.length;

                // Cleanup: If debt is less than 3, they are no longer in "acknowledged liberation"
                if (currentCount < 3 && newLiberated[u.id]) {
                    delete newLiberated[u.id];
                    liberationChanged = true;
                }

                if (currentCount < 3) return false;

                // Check age if student
                let isTarget = true;
                if (u.role === 'aluno' && u.birthDate) {
                    const birth = new Date(u.birthDate);
                    const today = new Date();
                    let age = today.getFullYear() - birth.getFullYear();
                    const m = today.getMonth() - birth.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                    if (age < 18) isTarget = false;
                }

                if (!isTarget) return false;

                // TRIGGER ALERT IF:
                // 1. User is not in the liberated list
                // 2. OR currentCount is GREATER than what was last acknowledged/liberated
                const lastAcknowledgedCount = liberatedUsers[u.id] || 0;
                return currentCount > lastAcknowledgedCount;
            }).map(u => ({
                id: u.id,
                name: u.nickname || u.name,
                months: monthlyPayments.filter(p => p.student_id === u.id && (p.status === 'pending' || p.status === 'overdue') && (!p.type || p.type === 'Mensalidade')).length
            }));

            if (liberationChanged) {
                setLiberatedUsers(newLiberated);
                localStorage.setItem('liberated_overdue_users', JSON.stringify(newLiberated));
            }

            setOverdueSummary(usersWithSignificantOverdue);
        };

        if (managedUsers.length > 0 && monthlyPayments.length > 0) {
            checkOverdue();
        }
    }, [managedUsers, monthlyPayments, liberatedUsers]);

    const handleLiberateUser = (userId: string) => {
        const unpaidCount = monthlyPayments.filter(p =>
            p.student_id === userId &&
            (p.status === 'pending' || p.status === 'overdue') &&
            (!p.type || p.type === 'Mensalidade')
        ).length;

        const updated = { ...liberatedUsers, [userId]: unpaidCount };
        setLiberatedUsers(updated);
        localStorage.setItem('liberated_overdue_users', JSON.stringify(updated));
    };

    const handleBlockUser = (userId: string) => {
        const foundUser = managedUsers.find(u => u.id === userId);
        if (foundUser && foundUser.status !== 'blocked') {
            onToggleBlockUser(userId, foundUser.status || 'active');
        }
        alert(`O acesso do usuário ${foundUser?.nickname || foundUser?.name || userId} foi bloqueado temporariamente.`);
        handleLiberateUser(userId); // Also clear it from the popup
    };

    // --- CUSTOM ADMIN DISPLAY NAME ---
    const getAdminDisplayName = () => {
        if (user.nickname === 'Aquiles') return 'Administração Filhos do Fogo Argentina';
        if (user.nickname === 'Wolverine') return 'Administração Filhos do Fogo Brasil';
        if (user.nickname === 'Anjo de Fogo') return 'Administração Filhos do Fogo Geral';
        return user.nickname || user.first_name || user.name || 'Admin';
    };

    // --- ADMIN HANDLERS ---
    const totalMonthlyPayments = (monthlyPayments || []).filter(p => p.status === 'paid').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const pendingMonthlyPayments = (monthlyPayments || []).filter(p => p.status !== 'paid').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const totalUniformRevenue = (uniformOrders || []).filter(o => o.status !== 'pending').reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const pendingUniformRevenue = (uniformOrders || []).filter(o => o.status === 'pending').reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    const totalEventRevenue = (eventRegistrations || []).filter(reg => reg.status === 'paid').reduce((acc, curr) => acc + (Number(curr.amount_paid) || 0), 0);
    const pendingEventRevenue = (eventRegistrations || []).filter(reg => reg.status === 'pending').reduce((acc, curr) => acc + (Number(curr.amount_paid) || 0), 0);

    const totalRevenue = totalMonthlyPayments + totalUniformRevenue + totalEventRevenue;
    const pendingRevenue = pendingMonthlyPayments + pendingUniformRevenue + pendingEventRevenue;

    // Calculate Grade Averages for Admin's students (same as Professor)
    const gradeStats = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const relevantGrades = (studentGrades || []).filter(g =>
            studentsForAttendance.some(s => s.id === g.student_id)
        );

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
    }, [studentGrades, studentsForAttendance]);

    const financialMovements = useMemo(() => {
        const movements: any[] = [];

        const getBelt = (userId: string) => {
            const u = managedUsers.find(user => (user.id === userId));
            return u?.belt || '-';
        };

        // Monthly Payments
        monthlyPayments.forEach(p => {
            const isEval = p.type === 'evaluation' || p.month.toLowerCase().includes('avalia');
            const student = managedUsers.find(u => u.id === p.student_id);
            movements.push({
                date: p.status === 'paid' ? formatDatePTBR(p.paid_at) : formatDatePTBR(p.due_date),
                description: isEval ? `Avaliação - ${p.student_name}` : `Mensalidade - ${p.month}`,
                student: p.student_name,
                professor: student?.professorName || '-',
                belt: getBelt(p.student_id),
                type: isEval ? 'Avaliação' : 'Mensalidade',
                value: p.amount,
                status: p.status === 'paid' ? 'Pago' : p.status === 'overdue' ? 'Atrasado' : 'Pendente'
            });
        });

        // Uniform Orders
        uniformOrders.forEach(o => {
            const student = managedUsers.find(u => u.id === o.user_id);
            movements.push({
                date: formatDatePTBR(o.date),
                description: `Uniforme - ${o.item}`,
                student: o.user_name,
                professor: student?.professorName || '-',
                belt: getBelt(o.user_id),
                type: 'Uniforme',
                value: o.total,
                status: o.status === 'ready' || o.status === 'delivered' ? 'Pago' : 'Pendente'
            });
        });

        // Event Registrations
        eventRegistrations.forEach(reg => {
            const linkedEvent = events.find(e => e.id === reg.event_id);
            const dateDisplay = linkedEvent ? formatDatePTBR(linkedEvent.date) : '-';
            const student = managedUsers.find(u => u.id === reg.user_id);
            movements.push({
                date: dateDisplay,
                description: `Evento - ${reg.event_title}`,
                student: reg.user_name,
                professor: student?.professorName || '-',
                belt: getBelt(reg.user_id),
                type: 'Evento',
                value: reg.amount_paid,
                status: reg.status === 'paid' ? 'Pago' : 'Pendente'
            });
        });

        return movements.sort((a, b) => {
            // Sort by Belt Rank Descending (Higher Index First)
            const indexA = ALL_BELTS.indexOf(a.belt);
            const indexB = ALL_BELTS.indexOf(b.belt);
            if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
                return indexB - indexA;
            } else if (indexA !== -1 && indexB === -1) {
                return -1; // A has belt, B doesn't -> A first
            } else if (indexA === -1 && indexB !== -1) {
                return 1; // B has belt, A doesn't -> B first
            }

            // Secondary: Date Descending
            const parseDate = (d: string) => {
                if (d === '-') return 0;
                if (d.includes('/')) {
                    const [day, month, year] = d.split('/');
                    return new Date(`${year}-${month}-${day}`).getTime();
                }
                return 0;
            };
            return parseDate(b.date) - parseDate(a.date);
        });
    }, [monthlyPayments, uniformOrders, eventRegistrations, events, managedUsers]);

    const handleDownloadFinancialReport = () => {
        const headers = ["Data", "Descrição", "Aluno", "Professor", "Graduação", "Tipo", "Valor", "Status"];
        const csvContent = [
            headers.join(";"),
            ...financialMovements.map(m => [
                m.date,
                m.description,
                m.student,
                m.professor || '-',
                m.belt,
                m.type,
                m.value.toFixed(2).replace('.', ','),
                m.status
            ].join(";"))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();

        link.setAttribute("download", `relatorio_financeiro_${dd}-${mm}-${yyyy}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPedagogicalReport = () => {
        const headers = ["Professor", "Aluno", "Presença", "Teórica", "Movimentação", "Musicalidade", "Última Avaliação", "Custo Graduação (R$)"];
        const rows: string[] = [];

        professorsData.forEach(prof => {
            prof.students.forEach(s => {
                rows.push([
                    prof.professorName,
                    s.studentName,
                    `${s.attendanceRate}%`,
                    (s.theoryGrade || 0).toFixed(1).replace('.', ','),
                    (s.movementGrade || 0).toFixed(1).replace('.', ','),
                    (s.musicalityGrade || 0).toFixed(1).replace('.', ','),
                    s.lastEvaluation || 'S/A',
                    (s.graduationCost || 0).toFixed(2).replace('.', ',')
                ].join(";"));
            });
        });

        const csvContent = [headers.join(";"), ...rows].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);

        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();

        link.setAttribute("download", `relatorio_pedagogico_${dd}-${mm}-${yyyy}.csv`);
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
        const event = events.find(ev => ev.id === id);
        if (editingId === id) handleCancelEdit();
        onCancelEvent(id);
        if (event) {
            onNotifyAdmin(`Cancelou o evento: ${event.title}`, user);
        }
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

            // Create pending registrations for ALL active users (Students, Professors, and Admins)
            if (newEvent) {
                const targets = managedUsers.filter(u => u.role === 'aluno' || u.role === 'professor' || u.role === 'admin');

                // We'll iterate and add them. Note: In a real app, this should be a batch insert or DB trigger.
                // For now, we do it client-side as requested.
                for (const targetUser of targets) {
                    await onAddEventRegistration({
                        event_id: newEvent.id,
                        user_id: targetUser.id,
                        user_name: targetUser.nickname || targetUser.name,
                        event_title: newEvent.title,
                        amount_paid: eventPrice,
                        status: eventPrice > 0 ? 'pending' : 'paid', // Mark as paid if free
                    });
                }
                alert(`Evento criado com ${targets.length} participantes registrados.`);
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

        // Fetch all active students and professors (User requested to exclude EVERYONE from auto-gen)
        const activeStudents: User[] = []; // managedUsers.filter(u => false); 

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
                        status: 'pending' as const,
                        type: 'Mensalidade'
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

    // Delete handlers for Finance tab
    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm('Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.')) return;
        try {
            const { error } = await supabase.from('monthly_payments').delete().eq('id', paymentId);
            if (error) throw error;
            onNotifyAdmin(`Excluiu pagamento ID: ${paymentId}`, user);
            alert('Pagamento excluído com sucesso!');
        } catch (err: any) {
            console.error('Error deleting payment:', err);
            alert('Erro ao excluir pagamento: ' + err.message);
        }
    };

    const handleOpenEditPayment = (payment: PaymentRecord) => {
        setEditingPayment(payment);
        setEditPaymentForm({
            month: payment.month,
            dueDate: payment.due_date,
            amount: payment.amount.toString(),
            status: payment.status
        });
        setShowEditPaymentModal(true);
    };

    const handleUpdatePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPayment) return;

        try {
            const updatedPayment = {
                ...editingPayment,
                month: editPaymentForm.month,
                due_date: editPaymentForm.dueDate,
                amount: parseFloat(editPaymentForm.amount),
                status: editPaymentForm.status,
            };

            await onUpdatePaymentRecord(updatedPayment);
            setShowEditPaymentModal(false);
            setEditingPayment(null);
            alert('Pagamento atualizado com sucesso!');
            onNotifyAdmin(`Editou pagamento de ${editingPayment.student_name} (${editPaymentForm.month})`, user);
        } catch (err: any) {
            console.error('Error updating payment:', err);
            alert('Erro ao atualizar pagamento: ' + err.message);
        }
    };

    const handleDeleteUniformOrder = async (orderId: string) => {
        if (!confirm('Tem certeza que deseja excluir este pedido de uniforme? Esta ação não pode ser desfeita.')) return;
        try {
            const { error } = await supabase.from('uniform_orders').delete().eq('id', orderId);
            if (error) throw error;
            onNotifyAdmin(`Excluiu pedido de uniforme ID: ${orderId}`, user);
            alert('Pedido de uniforme excluído com sucesso!');
        } catch (err: any) {
            console.error('Error deleting uniform order:', err);
            alert('Erro ao excluir pedido de uniforme: ' + err.message);
        }
    };

    const handleDeleteEventRegistration = async (registrationId: string) => {
        if (!confirm('Tem certeza que deseja excluir este registro de evento? Esta ação não pode ser desfeita.')) return;
        try {
            const { error } = await supabase.from('event_registrations').delete().eq('id', registrationId);
            if (error) throw error;
            onNotifyAdmin(`Excluiu registro de evento ID: ${registrationId}`, user);
            alert('Registro de evento excluído com sucesso!');
        } catch (err: any) {
            console.error('Error deleting event registration:', err);
            alert('Erro ao excluir registro de evento: ' + err.message);
        }
    };

    const handleViewPaymentProof = async (filePath: string, proofName: string) => {
        // Open window immediately to avoid pop-up blocking on mobile
        const newWindow = window.open('', '_blank');

        // Decide bucket based on path
        let bucket = 'payment_proofs';
        if (filePath.includes('event_proofs')) bucket = 'event_proofs';
        if (filePath.includes('uniform_proofs')) bucket = 'payment_proofs'; // Uniforms use payment_proofs for now

        try {
            // Generate a signed URL for private buckets
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 60); // URL valid for 60 seconds

            if (error) {
                if (newWindow) newWindow.close();
                console.error('Error generating signed URL in DashboardAdmin (Payment Proof):', error);
                alert('Erro ao visualizar o comprovante: ' + error.message);
                return;
            }

            if (newWindow) {
                newWindow.location.href = data.signedUrl;
            }
            onNotifyAdmin(`Visualizou comprovante de pagamento: ${proofName}`, user);
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Caught error in handleViewPaymentProof (DashboardAdmin):', error);
            alert('Erro ao visualizar o comprovante: ' + error.message);
        }
    };

    const handleViewEventRegistrationProof = async (filePath: string, proofName: string) => {
        // Open window immediately to avoid pop-up blocking on mobile
        const newWindow = window.open('', '_blank');
        const bucket = 'event_proofs';
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 60);

            if (error) {
                const { data: retryData, error: retryError } = await supabase.storage
                    .from('payment_proofs')
                    .createSignedUrl(filePath, 60);

                if (retryError) {
                    if (newWindow) newWindow.close();
                    console.error('Error generating signed URL in DashboardAdmin (Event Proof):', error);
                    alert('Erro ao visualizar o comprovante de evento: ' + error.message);
                    return;
                }
                if (newWindow) newWindow.location.href = retryData.signedUrl;
            } else {
                if (newWindow) newWindow.location.href = data.signedUrl;
            }
            onNotifyAdmin(`Visualizou comprovante de evento: ${proofName}`, user);
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Caught error in handleViewEventRegistrationProof (DashboardAdmin):', error);
            alert('Erro ao visualizar o comprovante: ' + error.message);
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
            if (newWindow) newWindow.location.href = data.signedUrl;
            onNotifyAdmin(`Visualizou vídeo de treino em casa`, user);
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Error generating signed URL for home training:', error);
            alert('Erro ao visualizar vídeo: ' + error.message);
        }
    };

    const handleViewSchoolReport = async (reportUrl: string) => {
        const newWindow = window.open('', '_blank');
        try {
            const { data, error } = await supabase.storage
                .from('school_reports_files')
                .createSignedUrl(reportUrl, 60);

            if (error) throw error;
            if (newWindow) newWindow.location.href = data.signedUrl;
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Error generating signed URL for report:', error);
            alert('Erro ao visualizar o boletim: ' + error.message);
        }
    };

    const handleViewAssignment = async (fileUrl: string) => {
        const newWindow = window.open('', '_blank');
        try {
            const { data, error } = await supabase.storage
                .from('assignment_submissions')
                .createSignedUrl(fileUrl, 60);

            if (error) throw error;
            if (newWindow) newWindow.location.href = data.signedUrl;
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Error generating signed URL for assignment submission:', error);
            alert('Erro ao visualizar a resposta do trabalho: ' + error.message);
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
            console.error('Error generating signed URL for assignment source:', error);
            alert('Erro ao visualizar o anexo do trabalho: ' + error.message);
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

    const handleFileChangeForUniformProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.target.files || e.target.files.length === 0 || !selectedOrderToProof) return;
        const file = e.target.files[0];
        setUploadingUniformProof(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/uniform_proofs/${selectedOrderToProof.id}_${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('payment_proofs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            await onUpdateOrderWithProof(selectedOrderToProof.id, uploadData.path, file.name);

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
                birthDate: userToEdit.birthDate || '',
                status: userToEdit.status || 'active'
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
            role: userForm.role,
            belt: userForm.belt || null,
            phone: userForm.phone || null,
            professor_name: userForm.professorName || null,
            birth_date: userForm.birthDate || null,
            status: userForm.status
        };

        const { error } = await supabase
            .from('profiles')
            .update(userDataToSave)
            .eq('id', editingUser.id);

        if (error) {
            console.error('Error updating user:', error);
            if (error.message?.includes('schema cache')) {
                alert('Erro de Cache no Supabase: A coluna "status" não foi reconhecida pelo servidor. Por favor, acesse o painel do Supabase -> API Settings e clique em "Reload PostgREST config".');
            } else if (error.message?.includes('row-level security')) {
                alert('Erro de Permissão (RLS): O banco de dados não permitiu a alteração. Rodar script SQL de Admin no Supabase.');
            } else {
                alert('Erro ao atualizar usuário: ' + error.message);
            }
        } else {
            alert('Usuário atualizado com sucesso!');
            setShowUserModal(false);
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
            const userName = managedUsers.find(u => u.id === userIdToUpdate)?.nickname || 'Usuário';
            onNotifyAdmin(`Atualizou avaliação do usuário: ${userName} para Data: ${editingEvaluationDate} / Valor: R$ ${newCost.toFixed(2)}`, user);
        }
    };

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

            // Update auth metadata
            await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
            // Update profile table
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

    // --- FINANCE TAB HANDLERS ---
    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPaymentForm.studentId || !newPaymentForm.month || !newPaymentForm.dueDate || !newPaymentForm.amount) {
            alert('Por favor, preencha todos os campos para adicionar um pagamento.');
            return;
        }
        const student = managedUsers.find(u => u.id === newPaymentForm.studentId);
        if (!student) {
            alert('Usuário não encontrado.');
            return;
        }

        const newPayment: Omit<PaymentRecord, 'id' | 'created_at'> = {
            student_id: student.id,
            student_name: student.nickname || student.name,
            month: newPaymentForm.month,
            due_date: newPaymentForm.dueDate,
            amount: parseFloat(newPaymentForm.amount),
            status: 'pending',
            type: 'Mensalidade'
        };

        await onAddPaymentRecord(newPayment);
        onNotifyAdmin(`Adicionou registro de pagamento para ${student.nickname || student.name}`, user);
        setShowAddPaymentModal(false);
        setNewPaymentForm({ studentId: '', month: '', dueDate: '', amount: '' });
    };

    const handleCreateInstallment = async () => {
        if (!installmentStudent) return;
        const totalAmount = installmentStudent.graduationCost || 0;

        if (totalAmount <= 0) {
            alert('Este aluno não possui saldo devedor para parcelar.');
            return;
        }

        if (!installmentDueDate) {
            alert('Por favor, selecione a data de vencimento da primeira parcela.');
            return;
        }

        const installmentValue = totalAmount / installmentCount;
        const baseDate = new Date(installmentDueDate + 'T12:00:00'); // Prevent timezone shift

        try {
            // Create N installment records
            for (let i = 0; i < installmentCount; i++) {
                const dueDate = new Date(baseDate);
                dueDate.setMonth(dueDate.getMonth() + i);

                await onAddPaymentRecord({
                    student_id: installmentStudent.id,
                    student_name: installmentStudent.nickname || installmentStudent.name,
                    month: `Parcela ${i + 1}/${installmentCount} - Avaliação`,
                    due_date: dueDate.toISOString().split('T')[0],
                    amount: installmentValue,
                    status: 'pending',
                    type: 'evaluation'
                });
            }

            // Update profile to clear "unbilled" graduation cost, as it's now billed in installments
            // OR we can keep it and reduce it as they pay. 
            // The user requested: "tendo o valor do total em aberto como referencia".
            // Typically, if we generate boletos, we might want toゼロ out the "unbilled" cost or leave it?
            // Existing logic zeroed/reduced it. Let's set it to 0 as it's now fully "billed" via installments.

            // logic update: User wants to see "1/10" and reduce total as they pay.
            // So we do NOT zero out the graduationCost. We leave it as the "Original Debt Reference".
            // The UI will calculate "Remaining" by subtracting PAID installments from this Total.
            /*
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    graduation_cost: 0 
                })
                .eq('id', installmentStudent.id);
            */

            alert(`${installmentCount} parcelas de R$ ${installmentValue.toFixed(2).replace('.', ',')} geradas com sucesso!`);

            setShowInstallmentModal(false);
            setInstallmentStudent(null);
            setInstallmentCount(1);
            setInstallmentDueDate('');

        } catch (error) {
            console.error(error);
            alert('Erro ao gerar parcelas.');
        }
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
        const professorIdentity = user.nickname || user.first_name || user.name;
        const studentsInClass = managedUsers.filter(u => u.role === 'aluno' && u.professorName === professorIdentity);
        studentsInClass.forEach(s => initialAttendance[s.id] = true);
        setAttendanceData(initialAttendance);
        setSelectedClassId(classId);
        setProfView('attendance');
        setShowSuccess(false);
    };

    const togglePresence = (studentId: string) => {
        setAttendanceData(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    };

    const handleSaveAttendance = async () => {
        if (!selectedClassId) return;

        const records = studentsForAttendance.map(student => {
            const isPresent = !!attendanceData[student.id];
            return {
                session_id: selectedClassId,
                student_id: student.id,
                status: isPresent ? 'present' : 'absent',
                justification: !isPresent ? justifications[student.id] : null
            };
        });

        if (records.length === 0) return;

        try {
            await onAddAttendance(records);

            const session = myClasses.find(c => c.id === selectedClassId);
            if (session) {
                await onUpdateClassSession({ ...session, status: 'completed' });
            }

            setShowSuccess(true);
            setTimeout(() => {
                setSelectedClassId(null);
                // setProfView('dashboard'); // Removed for consistency
                setShowSuccess(false);
                setJustifications({});
                onNotifyAdmin('Realizou chamada de aula', user);
                fetchAttendanceHistory();
            }, 1000);
        } catch (err: any) {
            console.error('Error saving attendance:', err);
            alert('Erro ao salvar chamada no banco de dados.');
        }
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
        // setProfView('dashboard'); // Removed for consistency
        onNotifyAdmin(`Agendou nova aula: ${newClassData.title}`, user);
    };

    const handleOpenEvaluation = (studentId: string) => {
        const student = managedUsers.find(u => u.id === studentId);
        if (student) {
            setStudentName(student.nickname || student.name);
        }
        setSelectedStudentForEval(studentId);
        setEvalData({
            theory: { written: '', numeric: '' },
            movement: { written: '', numeric: '' },
            musicality: { written: '', numeric: '' }
        });
        setProfView('evaluate');
    };

    const handleSaveEvaluation = async () => {
        if (!selectedStudentForEval) return;

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
                student_id: selectedStudentForEval,
                student_name: studentName,
                professor_id: user.id,
                professor_name: user.nickname || user.name,
                category: e.cat,
                written: e.w,
                numeric: parseFloat(e.n),
            })));

            alert("Avaliações salvas com sucesso!");
            setProfView('all_students');
            setSelectedStudentForEval(null);
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


    const handleSubmitMusic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!musicForm.title) {
            alert('Por favor, preencha o título da música.');
            return;
        }

        try {
            await onAddMusic({
                title: musicForm.title,
                category: musicForm.category,
                lyrics: musicForm.lyrics,
                file_url: ''
            } as any); // Type assertion to bypass strict Props check if needed, though simpler is better. App.tsx expects Omit<MusicItem, 'id'>

            onNotifyAdmin(`Admin adicionou nova música: ${musicForm.title}`, user);
            setMusicForm({ title: '', category: '', lyrics: '', url: '' });
            alert('Música adicionada!');
        } catch (error) {
            console.error(error);
            alert('Erro ao adicionar música. Tente novamente.');
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
            ? managedUsers.filter(u => u.role === 'aluno')
            : managedUsers.filter(u => u.role === 'aluno' && u.professorName === professorIdentity);

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
            // Specific student from modal or selection
            const assignmentPayload: Omit<Assignment, 'id' | 'created_at'> = {
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
            // General assignment for targeted students
            for (const student of targetStudents) {
                const assignmentPayload: Omit<Assignment, 'id' | 'created_at'> = {
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
        onNotifyAdmin(`${user.role === 'admin' ? 'Admin' : 'Professor'} criou trabalho: ${newAssignment.title}`, user);
        setShowAssignToStudentModal(false);
        setSelectedAssignmentTarget('mine'); // Reset to default
    };

    const handleViewAssignmentSubmission = async (fileUrl: string, fileName: string) => {
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
            onNotifyAdmin(`Admin visualizou resposta de trabalho: ${fileName}`, user);
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Error generating signed URL for assignment (Admin):', error);
            alert('Erro ao visualizar o arquivo: ' + error.message);
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

            const updatedAssignment: Assignment = {
                ...assignments.find(a => a.id === assignmentId)!,
                status: 'completed',
                submission_url: fileUrl,
                submission_name: file.name,
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
        let price = getCurrentPrice();
        let itemName = '';

        if (orderForm.item === 'shirt') { itemName = 'Blusa Oficial'; }
        else if (orderForm.item === 'pants_roda') { itemName = 'Calça de Roda'; }
        else if (orderForm.item === 'pants_train') { itemName = 'Calça de Treino'; }
        else if (orderForm.item === 'combo') { itemName = 'Combo'; }

        const newOrder: Omit<UniformOrder, 'id' | 'created_at'> = {
            user_id: user.id,
            user_name: user.nickname || user.name,
            user_role: user.role,
            date: new Date().toLocaleDateString('pt-BR'),
            item: itemName,
            shirt_size: (orderForm.item === 'shirt' || orderForm.item === 'combo') ? orderForm.shirtSize : undefined,
            pants_size: (orderForm.item !== 'shirt') ? orderForm.pantsSize : undefined,
            total: price,
            status: 'pending'
        };
        onAddOrder(newOrder);
        setMyOrders([newOrder as UniformOrder, ...myOrders]); // Add to local state for immediate display
        onNotifyAdmin(`${user.role === 'admin' ? 'Admin' : 'Professor'} solicitou uniforme: ${itemName}`, user);
        alert('Pedido registrado!');
        setOrderForm({ item: 'combo', shirtSize: '', pantsSize: '' });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.target.files || !e.target.files[0]) return;
        let file = e.target.files[0];

        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        setClassPhoto(previewUrl);

        try {
            file = await convertToStandardImage(file);
            const ext = file.name.split('.').pop();
            const filePath = `${user.id}/class_records/${Date.now()}.${ext}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('class_records').upload(filePath, file, {
                upsert: true
            });
            if (uploadError) throw uploadError;

            // Store in DB using relative path
            await onAddClassRecord({
                photo_url: uploadData.path,
                created_by: user.id,
                description: `Registro de aula por ${user.nickname || user.name}`
            });

            // Update class records list for UI
            setClassRecords(prev => [...prev, { name: uploadData.path, url: '', created_at: new Date().toISOString() }]);

            onNotifyAdmin(`Registro de aula enviado`, user);
            alert('Registro de aula enviado com sucesso!');
            setClassPhoto(null); // Clear preview after successful upload
        } catch (err: any) {
            console.error('Error uploading class record:', err);
            alert('Erro ao enviar registro de aula: ' + (err.message || err.error_description || 'Erro desconhecido'));
            setClassPhoto(null); // Clear preview on error
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    const fetchClassRecords = useCallback(async () => {
        try {
            // Fetch from database table instead of direct storage listing
            const { data, error } = await supabase
                .from('class_records')
                .select('*, profiles(nickname, name)')
                .order('created_at', { ascending: false })
                .limit(40);

            if (error) throw error;

            const records = (data || []).map((it: any) => ({
                name: it.photo_url, // This is the full path needed for createSignedUrl
                url: '',
                created_at: it.created_at,
                author_id: it.created_by,
                author_name: it.profiles?.nickname || it.profiles?.name || 'Professor',
                description: it.description
            }));

            setClassRecords(records);
        } catch (error) {
            console.error('Error fetching class records (from DB):', error);
            // Fallback to storage listing if table fails for some reason
            try {
                const { data, error: storageError } = await supabase.storage.from('class_records').list('', { limit: 20 });
                if (!storageError) {
                    const storageRecords = (data || []).map((it: any) => ({
                        name: it.name,
                        url: '',
                        created_at: it.created_at
                    }));
                    setClassRecords(storageRecords);
                }
            } catch (err) {
                console.error('Final fallback failed:', err);
            }
        }
    }, []);

    const handleViewClassRecord = async (filePath: string) => {
        const newWindow = window.open('', '_blank');
        try {
            const { data, error } = await supabase.storage
                .from('class_records')
                .createSignedUrl(filePath, 300); // 5 minutes

            if (error) throw error;
            if (newWindow) newWindow.location.href = data.signedUrl;
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Error generating signed URL for class record:', error);
            alert('Erro ao visualizar foto: ' + error.message);
        }
    };

    const fetchAttendanceHistory = useCallback(async () => {
        // Fetch real attendance records from DB
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    id,
                    created_at,
                    status,
                    student_id,
                    session_id,
                    class_sessions (
                        date,
                        time,
                        location,
                        title
                    ),
                    profiles:student_id (
                        nickname,
                        first_name,
                        last_name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            // Store attendance history in state for display
            if (data) {
                const formattedHistory = data.map((record: any) => ({
                    id: record.id,
                    class_date: record.class_sessions?.date || record.created_at?.split('T')[0] || '',
                    session_id: record.session_id,
                    student_id: record.student_id,
                    student_name: record.profiles?.nickname || record.profiles?.first_name || 'Aluno',
                    status: record.status as 'present' | 'absent' | 'justified',
                    justification: record.justification
                }));
                setAttendanceHistory(formattedHistory);
            }
        } catch (err) {
            console.error("Error fetching attendance history", err);
        }
    }, []);

    useEffect(() => {
        fetchClassRecords();
        fetchAttendanceHistory();
    }, [fetchClassRecords, fetchAttendanceHistory]);


    // --- Student Details Handlers ---
    const handleViewReport = async (fileUrl: string, fileName: string) => {
        // Open window immediately to avoid pop-up blocking on mobile
        const newWindow = window.open('', '_blank');
        try {
            const { data, error } = await supabase.storage
                .from('school_reports_files')
                .createSignedUrl(fileUrl, 60); // URL valid for 60 seconds

            if (error) throw error;

            if (newWindow) {
                newWindow.location.href = data.signedUrl;
            }
            onNotifyAdmin(`Visualizou boletim: ${fileName}`, user); // Added notification
        } catch (error: any) {
            if (newWindow) newWindow.close();
            console.error('Error generating signed URL:', error);
            alert('Erro ao visualizar o arquivo: ' + error.message);
        }
    };


    // --- CALCULATED PROFESSORS DATA (Pedagogical Tab) ---
    const professorsData: ProfessorClassData[] = useMemo(() => {
        const professors = managedUsers.filter(u => u.role === 'professor' || u.role === 'admin');
        return professors.map(prof => {
            const profStudents = managedUsers.filter(u => u.role === 'aluno' && u.professorName === (prof.nickname || prof.first_name || prof.name));

            const studentsData: StudentAcademicData[] = profStudents.map(s => {
                const sGrades = studentGrades.filter(g => g.student_id === s.id);
                // Extract specific grades
                const theoryGrade = sGrades.find(g => g.category === 'theory')?.numeric || 0;
                const movementGrade = sGrades.find(g => g.category === 'movement')?.numeric || 0;
                const musicalityGrade = sGrades.find(g => g.category === 'musicality')?.numeric || 0;

                return {
                    studentId: s.id,
                    studentName: s.nickname || s.name,
                    attendanceRate: 85, // Mock data or derive from attendance table if available
                    theoryGrade: Number(theoryGrade),
                    movementGrade: Number(movementGrade),
                    musicalityGrade: Number(musicalityGrade),
                    lastEvaluation: s.nextEvaluationDate ? formatDatePTBR(s.nextEvaluationDate) : '-',
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

    const filteredMonthlyPayments = monthlyPayments.filter(p =>
        (!p.type || p.type === 'Mensalidade') &&
        !p.month.toLowerCase().includes('avalia') &&
        (paymentFilter === 'all' ? true : p.status === paymentFilter)
    );
    const evaluationPayments = monthlyPayments.filter(p =>
        (p.type === 'evaluation' || p.month.toLowerCase().includes('avalia')) &&
        (paymentFilter === 'all' ? true : p.status === paymentFilter)
    );
    const selectedClassInfo = myClasses.find(c => c.id === selectedClassId);
    const studentBeingEvaluated = studentsForAttendance.find(s => s.id === selectedStudentForEval);

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

            {/* OVERDUE POPUP FOR ADMINS */}
            {overdueSummary.length > 0 && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                    <div className="bg-stone-800 rounded-3xl border-2 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.3)] max-w-lg w-full p-8 animate-bounce-subtle">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-4 bg-orange-500/20 rounded-full border border-orange-500 mb-6 text-orange-500">
                                <AlertCircle size={64} />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">
                                Aviso de Inadimplência
                            </h3>
                            <p className="text-stone-300 mb-8 leading-relaxed">
                                Os seguintes usuários possuem <span className="text-orange-400 font-bold">3 ou mais mensalidades atrasadas</span>. Verifique a situação financeira:
                            </p>

                            <div className="w-full max-h-48 overflow-y-auto mb-8 space-y-2 bg-stone-900/50 p-4 rounded-xl border border-stone-700 custom-scrollbar">
                                {overdueSummary.map(u => (
                                    <div key={u.id} className="flex justify-between items-center bg-stone-900 p-3 rounded-lg border border-stone-800 group">
                                        <div className="text-left">
                                            <div className="text-white font-bold">{u.name}</div>
                                            <div className="text-[10px] text-red-500 font-black uppercase tracking-widest">{u.months} Meses em Aberto</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleLiberateUser(u.id)}
                                                className="px-2 py-1 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded hover:bg-blue-900/50 transition-colors"
                                            >
                                                Liberar
                                            </button>
                                            <button
                                                onClick={() => handleBlockUser(u.id)}
                                                className="px-2 py-1 bg-red-900/30 text-red-400 text-[10px] font-bold rounded hover:bg-red-900/50 transition-colors"
                                            >
                                                Bloquear
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button fullWidth onClick={() => setOverdueSummary([])} className="bg-orange-600 hover:bg-orange-500 font-black h-14 text-lg">
                                Entendido
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Graduation and Evaluation Card */}
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

                {/* Evaluation Info - Showing remaining installments value */}
                {(() => {
                    // Calculate remaining installments for the current user
                    const userInstallments = monthlyPayments.filter(p =>
                        p.student_id === user.id &&
                        p.month?.includes('Parcela')
                    );
                    const paidInstallments = userInstallments.filter(p => p.status === 'paid');
                    const pendingInstallments = userInstallments.filter(p => p.status !== 'paid');
                    const remainingValue = pendingInstallments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const totalPaid = paidInstallments.reduce((sum, p) => sum + (p.amount || 0), 0);

                    return (
                        <div className="w-full max-w-sm bg-green-900/20 rounded-lg p-6 border border-green-900/50 flex flex-col items-center text-center">
                            <p className="text-xs text-green-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                                <GraduationCap size={16} /> Próxima Avaliação
                            </p>
                            <div className="flex flex-col items-center gap-2">
                                {remainingValue > 0 ? (
                                    <>
                                        <p className="text-sm text-stone-400">Valor Restante Parcelas:</p>
                                        <p className="text-2xl font-bold text-white">R$ {remainingValue.toFixed(2).replace('.', ',')}</p>
                                        <div className="flex gap-2 text-xs">
                                            <span className="text-green-400">{paidInstallments.length} pagas</span>
                                            <span className="text-stone-600">|</span>
                                            <span className="text-orange-400">{pendingInstallments.length} pendentes</span>
                                        </div>
                                        {/* Progress bar */}
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
                                {user.nextEvaluationDate && (
                                    <span className="text-sm text-stone-400 bg-stone-900/50 px-3 py-1 rounded-full mt-2">
                                        Data: <span className="text-green-400">{user.nextEvaluationDate.split('-').reverse().join('/')}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })()}
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
                    onClick={() => setActiveTab('music')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'music' ? 'bg-stone-800 text-yellow-500 border-t-2 border-yellow-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    <Music size={16} /> Músicas
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'reports' ? 'bg-stone-800 text-orange-500 border-t-2 border-orange-500' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
                >
                    <FileText size={16} /> Relatórios
                </button>
                <div className="ml-auto flex gap-2">
                    <a href="https://www.instagram.com/filhosdofogo2005" target="_blank" rel="noopener noreferrer">
                        <button className="px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 text-white border-b-2 bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 border-pink-600">
                            <Instagram size={16} /> Instagram
                        </button>
                    </a>
                    <a href="https://discord.gg/AY2kk9Ubk" target="_blank" rel="noopener noreferrer">
                        <button className="px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 text-white border-b-2" style={{ backgroundColor: '#5865F2', borderColor: '#5865F2' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4752C4'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5865F2'}>
                            <MessageCircle size={16} /> Discord
                        </button>
                    </a>
                </div>
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
                        <button
                            onClick={() => setActiveTab('music')}
                            className="bg-stone-800 p-6 rounded-xl border border-stone-700 text-left hover:border-yellow-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-yellow-500`}>
                                    <Music size={24} />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white">{musicList.length}</h3>
                            <p className="text-stone-400 text-sm">Músicas no Acervo</p>
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
                                            type="date"
                                            value={eventFormData.date}
                                            onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
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
                            {events.filter(e => !e.status || e.status === 'active').map(event => (
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



                    {/* EDIT PAYMENT MODAL */}
                    {showEditPaymentModal && editingPayment && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                            <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative flex flex-col max-h-[90vh]">
                                <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Edit2 className="text-blue-500" />
                                        Editar Pagamento
                                    </h3>
                                    <button onClick={() => setShowEditPaymentModal(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
                                </div>
                                <div className="mb-4 bg-stone-900/50 p-4 rounded-lg border border-stone-700/50">
                                    <p className="text-xs text-stone-500 uppercase font-bold mb-1">Aluno</p>
                                    <p className="text-white font-bold">{editingPayment.student_name}</p>
                                </div>
                                <form onSubmit={handleUpdatePayment} className="space-y-4">
                                    <div>
                                        <label htmlFor="editMonth" className="block text-sm text-stone-400 mb-1">Mês de Referência</label>
                                        <input
                                            type="text"
                                            id="editMonth"
                                            value={editPaymentForm.month}
                                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, month: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="editDueDate" className="block text-sm text-stone-400 mb-1">Data de Vencimento</label>
                                        <input
                                            type="date"
                                            id="editDueDate"
                                            value={editPaymentForm.dueDate}
                                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, dueDate: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="editAmount" className="block text-sm text-stone-400 mb-1">Valor (R$)</label>
                                        <input
                                            type="number"
                                            id="editAmount"
                                            value={editPaymentForm.amount}
                                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="editStatus" className="block text-sm text-stone-400 mb-1">Status</label>
                                        <select
                                            id="editStatus"
                                            value={editPaymentForm.status}
                                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, status: e.target.value as any })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        >
                                            <option value="pending">Pendente</option>
                                            <option value="paid">Pago</option>
                                            <option value="overdue">Atrasado</option>
                                        </select>
                                    </div>
                                    <div className="pt-4 flex justify-end gap-2 border-t border-stone-700 mt-4">
                                        <button type="button" onClick={() => setShowEditPaymentModal(false)} className="px-4 py-2 text-stone-400 hover:text-white">Cancelar</button>
                                        <Button type="submit">
                                            <Save size={18} /> Salvar Alterações
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
                                                        <span className="text-stone-600 text-xs flex items-center gap-1"><CheckCircle size={12} /> Finalizado</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteUniformOrder(order.id)}
                                                        className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                        title="Excluir pedido"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
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
                                                        <span className="text-stone-600 text-xs flex items-center gap-1"><CheckCircle size={12} /> Finalizado</span>
                                                    )}
                                                    {reg.status !== 'cancelled' && (
                                                        <button
                                                            onClick={() => handleUpdateEventRegistration(reg.id, 'cancelled')}
                                                            className="p-2 bg-stone-900 hover:bg-stone-700 text-stone-400 hover:text-orange-500 rounded transition-colors"
                                                            title="Cancelar Registro"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteEventRegistration(reg.id)}
                                                        className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                        title="Excluir registro"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
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
                                        {filteredMonthlyPayments.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-stone-700/30">
                                                <td className="p-4 font-medium text-white">{payment.student_name}</td>
                                                <td className="p-4 text-stone-300">{payment.month}</td>
                                                <td className="p-4 text-stone-300">{payment.due_date.split('-').reverse().join('/')}</td>
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
                                                    {/* Upload Proof Button */}
                                                    <div className="mt-2">
                                                        <label className="cursor-pointer inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
                                                            <UploadCloud size={12} />
                                                            {payment.proof_url ? 'Trocar Comprovante' : 'Enviar Comprovante'}
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*,application/pdf"
                                                                onChange={async (e) => {
                                                                    if (e.target.files?.[0]) {
                                                                        let file = e.target.files[0];
                                                                        try {
                                                                            file = await convertToStandardImage(file);
                                                                            const ext = file.name.split('.').pop();
                                                                            const path = `${user.id}/payment_proofs/${payment.id}_${Date.now()}.${ext}`;
                                                                            const { data: uploadData, error } = await supabase.storage.from('payment_proofs').upload(path, file);
                                                                            if (error) throw error;

                                                                            await onUpdatePaymentRecord({
                                                                                ...payment,
                                                                                proof_url: uploadData.path,
                                                                                proof_name: file.name
                                                                            });
                                                                            alert('Comprovante enviado!');
                                                                        } catch (err: any) {
                                                                            alert('Erro upload: ' + err.message);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                </td>
                                                <td className="p-4">
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
                                                    <div className="flex justify-end gap-2">
                                                        {payment.status !== 'paid' && (
                                                            <button
                                                                onClick={() => handleMarkAsPaid(payment.id)}
                                                                className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition-colors"
                                                            >
                                                                Dar Baixa
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenEditPayment(payment)}
                                                            className="p-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
                                                            title="Editar pagamento"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                            className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                            title="Excluir pagamento"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredMonthlyPayments.length === 0 && (
                                    <div className="text-center py-8 text-stone-500">Nenhum registro encontrado em Mensalidades.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* NEW SECTION: AVALIAÇÕES PANEL (FINANCIAL RECORDS) */}
                    <div className="bg-stone-800 rounded-2xl border border-stone-700 mt-6 overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-stone-700/50 bg-purple-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-500">
                                    <GraduationCap size={28} />
                                </div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">Pagamentos de Avaliações</h2>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                            <th className="p-4">Aluno</th>
                                            <th className="p-4">Identificador</th>
                                            <th className="p-4">Vencimento</th>
                                            <th className="p-4">Valor</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-700 text-sm">
                                        {(() => {
                                            // Group by student and find the next pending/overdue installment
                                            const groupedByStudent = evaluationPayments.reduce((acc, curr) => {
                                                if (!acc[curr.student_id]) acc[curr.student_id] = [];
                                                acc[curr.student_id].push(curr);
                                                return acc;
                                            }, {} as Record<string, any[]>);

                                            return Object.values(groupedByStudent).map((studentPayments: any[]) => {
                                                // Sort by due date (assuming due_date is YYYY-MM-DD)
                                                const sorted = studentPayments.sort((a, b) => a.due_date.localeCompare(b.due_date));
                                                // Find first non-paid
                                                const nextPending = sorted.find(p => p.status !== 'paid') || sorted[sorted.length - 1];


                                                return (
                                                    <tr key={nextPending.id} className="hover:bg-stone-700/30">
                                                        <td className="p-4 font-medium text-white">{nextPending.student_name}</td>
                                                        <td className="p-4 text-stone-300">
                                                            {nextPending.month}
                                                            <div className="text-[10px] text-stone-500">
                                                                {studentPayments.filter(p => p.status === 'paid').length}/{studentPayments.length} pagas
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-stone-300">{nextPending.due_date.split('-').reverse().join('/')}</td>
                                                        <td className="p-4 text-white font-mono font-bold text-purple-400">R$ {nextPending.amount.toFixed(2).replace('.', ',')}</td>
                                                        <td className="p-4">
                                                            {nextPending.status === 'paid' && (
                                                                <span className="inline-flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                                                                    <CheckCircle size={12} /> Pago
                                                                </span>
                                                            )}
                                                            {nextPending.status === 'pending' && (
                                                                <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold border border-yellow-900/50">
                                                                    <Clock size={12} /> Próxima: {nextPending.month.split('-')[0]}
                                                                </span>
                                                            )}
                                                            {nextPending.status === 'overdue' && (
                                                                <span className="inline-flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded text-xs font-bold border border-red-900/50">
                                                                    <AlertCircle size={12} /> Atrasado
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {nextPending.status !== 'paid' && (
                                                                    <button
                                                                        onClick={() => handleMarkAsPaid(nextPending.id)}
                                                                        className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition-colors"
                                                                    >
                                                                        Confirmar
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeletePayment(nextPending.id)}
                                                                    className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                                {evaluationPayments.length === 0 && (
                                    <div className="text-center py-8 text-stone-500 italic">Nenhum registro de pagamento de avaliação encontrado.</div>
                                )}
                            </div>
                        </div>
                    </div>


                </div>
            )
            }

            {/* --- TAB: USERS MANAGEMENT (CRUD) --- */}
            {
                activeTab === 'users' && (
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

                                        {/* Professor Responsável - shown for everyone except 'Anjo de Fogo' */}
                                        {(editingUser?.nickname !== 'Anjo de Fogo' && userForm.nickname !== 'Anjo de Fogo') && (
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
                                                    {managedUsers.filter(u => (u.role === 'professor' || u.role === 'admin') && u.id !== editingUser?.id).map(prof => (
                                                        <option key={prof.id} value={prof.nickname || prof.first_name || prof.name}>
                                                            {prof.nickname ? `${prof.nickname} (${prof.first_name || prof.name})` : prof.first_name || prof.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm text-stone-400 mb-1">Status da Conta</label>
                                            <select
                                                value={userForm.status}
                                                onChange={(e) => setUserForm({ ...userForm, status: e.target.value as 'active' | 'blocked' })}
                                                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            >
                                                <option value="active">Ativo (Acesso Liberado)</option>
                                                <option value="blocked">Bloqueado (Acesso Negado)</option>
                                            </select>
                                        </div>

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
                                            <th className="p-4">Status</th>
                                            <th className="p-4 rounded-tr-lg text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-700 text-sm">
                                        {filteredManagedUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-stone-700/30 group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-stone-500">
                                                            <Logo className="w-full h-full object-cover" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-white">{u.name}</p>
                                                                {u.status === 'blocked' && (
                                                                    <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Bloqueado</span>
                                                                )}
                                                                {u.status === 'archived' && (
                                                                    <span className="bg-stone-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Arquivado</span>
                                                                )}
                                                            </div>
                                                            {u.nickname && <p className="text-xs text-cyan-400 font-medium italic">{u.nickname}</p>}
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
                                                            <p className="font-bold text-white flex items-center gap-1">
                                                                R$ {(u.graduationCost ?? 0).toFixed(2).replace('.', ',')}
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingGradCostId(u.id);
                                                                        setEditingGradCostValue((u.graduationCost ?? 0).toString());
                                                                        setEditingEvaluationDate(u.nextEvaluationDate || today);
                                                                    }}
                                                                    className="text-stone-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            </p>
                                                            {/* Enhanced Installment Display */}
                                                            {(() => {
                                                                // Use inclusive filtering for 'Avaliação' or 'Parcela'
                                                                const userInstallments = monthlyPayments.filter(p =>
                                                                    p.student_id === u.id &&
                                                                    (p.month.includes('Parcela') || p.type === 'evaluation')
                                                                );
                                                                const totalInstallments = userInstallments.length;

                                                                if (totalInstallments > 0) {
                                                                    const paidInstallments = userInstallments.filter(p => p.status === 'paid').length;

                                                                    // Try to determine max installments from the string "Parcela X/Y"
                                                                    // Or fallback to total count found
                                                                    let maxInstallmentsStr = totalInstallments.toString();
                                                                    const match = userInstallments[0]?.month?.match(/\/(\d+)/);
                                                                    if (match) maxInstallmentsStr = match[1];

                                                                    // Calculate remaining debt based on paid installments
                                                                    const paidAmount = userInstallments
                                                                        .filter(p => p.status === 'paid')
                                                                        .reduce((sum, p) => sum + p.amount, 0);

                                                                    const originalDebt = u.graduationCost ?? 0;
                                                                    // If original debt is 0 (some legacy cases), use sum of all installments
                                                                    const totalDebt = originalDebt > 0 ? originalDebt : userInstallments.reduce((sum, p) => sum + p.amount, 0);

                                                                    const remainingDebt = Math.max(0, totalDebt - paidAmount);

                                                                    return (
                                                                        <div className="flex flex-col items-start mt-1 p-1 bg-stone-800 rounded border border-stone-700 w-full">
                                                                            <div className="flex justify-between w-full">
                                                                                <span className="text-[10px] text-blue-400 font-bold">
                                                                                    {paidInstallments}/{maxInstallmentsStr} Pagas
                                                                                </span>
                                                                                {u.nextEvaluationDate && <span className="text-[9px] text-stone-500">{formatDatePTBR(u.nextEvaluationDate)}</span>}
                                                                            </div>
                                                                            <div className="w-full bg-stone-700 h-1.5 rounded-full mt-1 mb-1">
                                                                                <div
                                                                                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                                                    style={{ width: `${(paidInstallments / Number(maxInstallmentsStr)) * 100}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            {remainingDebt > 0 ? (
                                                                                <span className="text-[10px] text-stone-300 font-mono">
                                                                                    Restante: R$ {remainingDebt.toFixed(2).replace('.', ',')}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                                                                                    <CheckCircle size={10} /> Quitado
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                            {u.nextEvaluationDate ? (
                                                                <p className="text-[10px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-900/30">
                                                                    {formatDatePTBR(u.nextEvaluationDate)}
                                                                </p>
                                                            ) : (
                                                                <p className="text-[10px] text-stone-500 italic">S/ Data</p>
                                                            )}
                                                            {/* Button to generate the boleto directly from here */}
                                                            <button
                                                                onClick={() => {
                                                                    setEvalModalStudent(u);
                                                                    setEvalModalAmount((u.graduationCost ?? 0).toString());
                                                                    const defaultDate = u.nextEvaluationDate || new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0];
                                                                    setEvalModalDueDate(defaultDate);
                                                                    setShowEvalModal(true);
                                                                }}
                                                                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1 font-bold"
                                                            >
                                                                <Plus size={10} /> Gerar Boleto Total
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setInstallmentStudent(u);
                                                                    setInstallmentCount(1);
                                                                    setInstallmentDueDate(u.nextEvaluationDate || today);
                                                                    setShowInstallmentModal(true);
                                                                }}
                                                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1 font-bold"
                                                            >
                                                                <DollarSign size={10} /> Parcelar
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setNewPaymentForm({
                                                                        studentId: u.id,
                                                                        month: '',
                                                                        dueDate: today,
                                                                        amount: '50.00'
                                                                    });
                                                                    setShowAddPaymentModal(true);
                                                                }}
                                                                className="text-[10px] text-green-400 hover:text-green-300 flex items-center gap-1 mt-1 font-bold"
                                                            >
                                                                <PlusCircle size={10} /> Add Mensalidade
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => onToggleArchiveUser(u.id, u.status)}
                                                            className={`p-2 bg-stone-900 rounded transition-colors ${u.status === 'archived' ? 'text-blue-500 hover:bg-stone-700' : 'text-stone-400 hover:text-blue-500 hover:bg-stone-700'}`}
                                                            title={u.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
                                                        >
                                                            <Archive size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => onToggleBlockUser(u.id, u.status)}
                                                            className={`p-2 bg-stone-900 rounded transition-colors ${u.status === 'blocked' ? 'text-red-500 hover:bg-stone-700' : 'text-stone-400 hover:text-green-500 hover:bg-stone-700'}`}
                                                            title={u.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                                                        >
                                                            {u.status === 'blocked' ? <Lock size={16} /> : <Shield size={16} />}
                                                        </button>
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
                )
            }

            {/* --- TAB: STUDENT DETAILS --- */}
            {
                activeTab === 'student_details' && (
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
                                                                    <div key={report.id} className="bg-stone-800 p-3 rounded border border-stone-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                                        <div className="flex flex-col min-w-0">
                                                                            <p className="text-white font-medium truncate">{report.file_name}</p>
                                                                            <p className="text-xs text-stone-500">Período: {report.period} • Enviado em: {report.date}</p>
                                                                        </div>
                                                                        <Button
                                                                            variant="secondary"
                                                                            className="text-xs h-auto px-4 py-2 w-full sm:w-auto flex items-center justify-center gap-2"
                                                                            onClick={() => handleViewSchoolReport(report.file_url)}
                                                                        >
                                                                            <Eye size={14} /> Ver Boletim
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
                                                                    <div key={training.id} className="bg-stone-800 p-3 rounded border border-stone-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                                        <div className="flex flex-col min-w-0">
                                                                            <p className="text-white font-medium truncate">{training.video_name}</p>
                                                                            <p className="text-xs text-stone-500">Enviado em: {training.date} • Expira em: {new Date(training.expires_at).toLocaleDateString('pt-BR')}</p>
                                                                        </div>
                                                                        <Button
                                                                            variant="secondary"
                                                                            className="text-xs h-auto px-4 py-2 w-full sm:w-auto flex items-center justify-center gap-2"
                                                                            onClick={() => handleViewHomeTrainingVideo(training.video_url)}
                                                                        >
                                                                            <Video size={14} /> Ver Treino
                                                                        </Button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-stone-500 text-sm italic">Nenhum treino em casa enviado.</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Assignments - Filtered by professor */}
                                                    <div>
                                                        <h4 className="text-blue-400 font-bold text-sm mb-3 flex items-center gap-2">
                                                            <BookOpen size={16} /> Trabalhos e Tarefas
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {(() => {
                                                                const profIdentity = allUsersProfiles.find(p =>
                                                                    (p.nickname || p.name) === student.professorName
                                                                );

                                                                const studentSpecificAssignments = assignments.filter(assign => {
                                                                    const belongsToStudent = assign.student_id === student.id;
                                                                    const createdByProfessor = profIdentity ? assign.created_by === profIdentity.id : false;

                                                                    // Show if it belongs to student AND was created by their professor
                                                                    // Also show assignments without student_id (global) IF created by their professor
                                                                    return belongsToStudent || (assign.student_id === null);
                                                                });

                                                                return studentSpecificAssignments.length > 0 ? (
                                                                    studentSpecificAssignments.map(assign => (
                                                                        <div key={assign.id} className={`bg-stone-800 p-3 rounded border border-stone-700 ${assign.status === 'completed' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-yellow-500'}`}>
                                                                            <div className="flex justify-between items-start">
                                                                                <p className="text-white font-medium text-sm">{assign.title}</p>
                                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${assign.status === 'completed' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                                                                    {assign.status === 'completed' ? 'Ok' : '...'}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[10px] text-stone-500 mt-0.5">Vence: {assign.due_date}</p>
                                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                                {assign.attachment_url && (
                                                                                    <a href={assign.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] flex items-center gap-1 hover:underline">
                                                                                        <Paperclip size={10} /> Material
                                                                                    </a>
                                                                                )}
                                                                                {assign.submission_url && (
                                                                                    <button
                                                                                        onClick={() => handleViewAssignmentSubmission(assign.submission_url!, assign.submission_name || 'Trabalho')}
                                                                                        className="text-green-400 text-[10px] flex items-center gap-1 hover:underline bg-transparent border-none p-0 cursor-pointer"
                                                                                    >
                                                                                        <CheckCircle size={10} /> Resposta
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-stone-500 text-sm italic">Nenhum trabalho atribuído por seu professor.</p>
                                                                );
                                                            })()}
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
                )
            }

            {/* --- TAB: PEDAGOGY --- */}
            {
                activeTab === 'pedagogy' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <GraduationCap className="text-blue-500" />
                                    Acompanhamento Pedagógico
                                    <span className="text-sm font-normal text-stone-400 ml-2">(Supervisão de Professores)</span>
                                </h2>
                                <Button onClick={handleDownloadPedagogicalReport} variant="secondary" className="border border-stone-600">
                                    <FileUp size={18} className="mr-2" /> Baixar Relatório Pedagógico (CSV)
                                </Button>
                            </div>

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
                                                                className="text-green-500 hover:text-green-400 ml-1 transition-colors"
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

                                                    {/* Students Table */}
                                                    <h4 className="text-stone-400 font-bold text-xs uppercase mb-3">Desempenho e Custos de Graduação</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b border-stone-700 text-xs text-stone-500">
                                                                    <th className="pb-2">Aluno</th>
                                                                    <th className="pb-2">Presença</th>
                                                                    <th className="pb-2">Teórica</th>
                                                                    <th className="pb-2">Moviment.</th>
                                                                    <th className="pb-2">Musical.</th>
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
                                                                        <td className="py-3">
                                                                            <span className={`font-bold ${((student.theoryGrade || 0) >= 7) ? 'text-green-500' : 'text-red-500'}`}>
                                                                                {(student.theoryGrade || 0).toFixed(1)}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3">
                                                                            <span className={`font-bold ${((student.movementGrade || 0) >= 7) ? 'text-green-500' : 'text-red-500'}`}>
                                                                                {(student.movementGrade || 0).toFixed(1)}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3">
                                                                            <span className={`font-bold ${((student.musicalityGrade || 0) >= 7) ? 'text-green-500' : 'text-red-500'}`}>
                                                                                {(student.musicalityGrade || 0).toFixed(1)}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-3">
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
                )
            }

            {/* --- TAB: MY CLASSES (PROFESSOR MODE) --- */}
            {
                activeTab === 'my_classes' && (
                    <div className="space-y-6 animate-fade-in relative">

                        {/* Top Actions Bar (Similar to Professor) */}
                        <div className="flex flex-wrap gap-2 justify-end bg-stone-800 p-4 rounded-xl border border-stone-700">
                            <Button variant="secondary" onClick={() => setProfView('music_manager')} className="border border-stone-600">
                                <Music size={18} className="text-yellow-400" /> Músicas
                            </Button>
                            <Button variant="secondary" onClick={() => setProfView('assignments')} className="border border-stone-600">
                                <BookOpen size={18} className="text-blue-400" /> Trabalhos
                            </Button>
                            <Button variant="secondary" onClick={() => setProfView('uniform')} className="border border-stone-600">
                                <Shirt size={18} className="text-emerald-400" /> Uniforme
                            </Button>
                            <Button variant="secondary" onClick={() => setProfView('financial')} className="bg-stone-700 hover:bg-stone-600 text-white border-stone-600">
                                <Wallet size={18} /> Financeiro
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
                                                {managedUsers.filter(u => u.role === 'aluno').map(student => (
                                                    <option key={student.id} value={student.id}>{student.nickname || student.name} {student.professorName ? `(${student.professorName})` : ''}</option>
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
                                                    <span className={`text-sm ${selectedAssignmentTarget === 'mine' ? 'text-blue-400 font-bold' : 'text-stone-400'}`}>Meus Alunos ({managedUsers.filter(u => u.professorName === (user.nickname || user.first_name || user.name)).length})</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name="assign_target"
                                                        checked={selectedAssignmentTarget === 'all'}
                                                        onChange={() => setSelectedAssignmentTarget('all')}
                                                        className="w-4 h-4 accent-orange-500"
                                                    />
                                                    <span className={`text-sm ${selectedAssignmentTarget === 'all' ? 'text-orange-400 font-bold' : 'text-stone-400'}`}>Todos os Alunos do Grupo ({managedUsers.filter(u => u.role === 'aluno').length})</span>
                                                </label>
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
                                        <div className="flex justify-end gap-3">
                                            <Button type="submit" disabled={selectedAssignmentTarget === 'all' ? managedUsers.filter(u => u.role === 'aluno').length === 0 : managedUsers.filter(u => u.professorName === (user.nickname || user.first_name || user.name)).length === 0}>
                                                <Plus size={18} className="mr-1" />
                                                {selectedAssignmentTarget === 'all' ? 'Passar para Todos' : 'Passar para Meus Alunos'}
                                            </Button>
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
                                                        <div className="flex items-center gap-2 text-xs text-green-500 bg-green-900/10 p-2 rounded mb-2">
                                                            <Paperclip size={12} /> Arquivo Anexado
                                                        </div>
                                                    )}
                                                    {assign.submission_url && (
                                                        <Button
                                                            variant="secondary"
                                                            className="w-full text-xs py-1.5 h-auto bg-green-900/20 text-green-400 border-green-500/20 hover:bg-green-900/40"
                                                            onClick={() => handleViewAssignmentSubmission(assign.submission_url!, assign.submission_name || 'Trabalho')}
                                                        >
                                                            <CheckCircle size={14} className="mr-1" /> Ver Resposta do Aluno
                                                        </Button>
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
                        )
                        }

                        {/* --- PROF MODE: EVALUATE --- */}
                        {
                            profView === 'evaluate' && studentBeingEvaluated && (
                                <div className="max-w-4xl mx-auto bg-stone-800 rounded-xl border border-stone-700 animate-fade-in p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                            <Award className="text-yellow-500" /> Avaliar {studentBeingEvaluated.nickname || studentBeingEvaluated.name}
                                        </h2>
                                        <button onClick={() => setProfView('all_students')} className="text-stone-400 hover:text-white flex items-center gap-1 transition-colors">
                                            <ArrowLeft size={18} /> Voltar
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        {/* THEORY */}
                                        <div className="bg-stone-900 p-5 rounded-xl border border-stone-700 space-y-4">
                                            <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">Teórica</h3>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">Avaliação Escrita</label>
                                                <textarea
                                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white h-32 text-sm focus:border-yellow-500 outline-none transition-all"
                                                    placeholder="Pontos positivos e observações..."
                                                    value={evalData.theory.written}
                                                    onChange={e => setEvalData({ ...evalData, theory: { ...evalData.theory, written: e.target.value } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">Nota (0-10)</label>
                                                <input
                                                    type="number" min="0" max="10" step="0.1"
                                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white text-xl font-bold text-center focus:border-yellow-500 outline-none transition-all"
                                                    value={evalData.theory.numeric}
                                                    onChange={e => setEvalData({ ...evalData, theory: { ...evalData.theory, numeric: e.target.value } })}
                                                    placeholder="0.0"
                                                    disabled={!evalData.theory.written.trim()}
                                                />
                                            </div>
                                        </div>

                                        {/* MOVEMENT */}
                                        <div className="bg-stone-900 p-5 rounded-xl border border-stone-700 space-y-4">
                                            <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">Movimentação</h3>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">Avaliação Escrita</label>
                                                <textarea
                                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white h-32 text-sm focus:border-yellow-500 outline-none transition-all"
                                                    placeholder="Pontos positivos e observações..."
                                                    value={evalData.movement.written}
                                                    onChange={e => setEvalData({ ...evalData, movement: { ...evalData.movement, written: e.target.value } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">Nota (0-10)</label>
                                                <input
                                                    type="number" min="0" max="10" step="0.1"
                                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white text-xl font-bold text-center focus:border-yellow-500 outline-none transition-all"
                                                    value={evalData.movement.numeric}
                                                    onChange={e => setEvalData({ ...evalData, movement: { ...evalData.movement, numeric: e.target.value } })}
                                                    placeholder="0.0"
                                                    disabled={!evalData.movement.written.trim()}
                                                />
                                            </div>
                                        </div>

                                        {/* MUSICALITY */}
                                        <div className="bg-stone-900 p-5 rounded-xl border border-stone-700 space-y-4">
                                            <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">Musicalidade</h3>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">Avaliação Escrita</label>
                                                <textarea
                                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white h-32 text-sm focus:border-yellow-500 outline-none transition-all"
                                                    placeholder="Pontos positivos e observações..."
                                                    value={evalData.musicality.written}
                                                    onChange={e => setEvalData({ ...evalData, musicality: { ...evalData.musicality, written: e.target.value } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">Nota (0-10)</label>
                                                <input
                                                    type="number" min="0" max="10" step="0.1"
                                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white text-xl font-bold text-center focus:border-yellow-500 outline-none transition-all"
                                                    value={evalData.musicality.numeric}
                                                    onChange={e => setEvalData({ ...evalData, musicality: { ...evalData.musicality, numeric: e.target.value } })}
                                                    placeholder="0.0"
                                                    disabled={!evalData.musicality.written.trim()}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => setEvalData({ theory: { written: '', numeric: '' }, movement: { written: '', numeric: '' }, musicality: { written: '', numeric: '' } })}>
                                            Limpar Campos
                                        </Button>
                                        <Button onClick={handleSaveEvaluation} disabled={savingGrades} className="px-8 bg-yellow-600 hover:bg-yellow-500">
                                            {savingGrades ? 'Salvando...' : 'Salvar Avaliação'}
                                        </Button>
                                    </div>
                                </div>
                            )
                        }

                        {/* --- PROF MODE: UNIFORM --- */}
                        {
                            profView === 'uniform' && (
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
                                                <ShoppingBag className="text-emerald-400" /> Minhas Solicitações
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
                                                                                uniformFileInputRef.current?.click();
                                                                            }}
                                                                            disabled={uploadingUniformProof}
                                                                        >
                                                                            {uploadingUniformProof && selectedOrderToProof?.id === order.id ? 'Enviando...' : <><FileUp size={12} className="mr-1" /> Enviar Comprovante</>}
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
                            )
                        }

                        {/* --- PROF MODE: MUSIC --- */}
                        {
                            profView === 'music_manager' && (
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
                                                                        <Clock size={10} /> {new Date(m.created_at || '').toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <button className="p-1.5 text-stone-600 hover:text-red-500 transition-colors" title="Remover">
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
                                </div >
                            )
                        }


                        {/* --- PROF MODE: ALL STUDENTS --- */}
                        {
                            profView === 'all_students' && (
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
                                                <p className="text-stone-400 text-sm">{studentsForAttendance.length} alunos vinculados ao seu perfil</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-stone-900 border border-stone-700 px-4 py-2 rounded-2xl">
                                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                                    <Video size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest">Total de Envios</p>
                                                    <p className="text-lg font-black text-white leading-none">
                                                        {homeTrainings.filter(ht => studentsForAttendance.some(s => s.id === ht.user_id)).length} Vídeos
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                            {studentsForAttendance.map(student => {
                                                const studentVideos = homeTrainings.filter(ht => ht.user_id === student.id);
                                                const studentGradesList = studentGrades.filter(g => g.student_id === student.id);
                                                const avgGrade = (studentGradesList.reduce((acc, curr) => acc + (typeof curr.numeric === 'number' ? curr.numeric : parseFloat(curr.numeric as any) || 0), 0) / (studentGradesList.length || 1)).toFixed(1);

                                                // Visual belt color calculation
                                                const getBeltColors = (beltName: string) => {
                                                    const b = (beltName || '').toLowerCase();
                                                    const [mainPart, ...rest] = b.split('ponta');
                                                    const pontaPart = rest.join('ponta');

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

                                            {studentsForAttendance.length === 0 && (
                                                <div className="col-span-full text-center py-20 text-stone-500 bg-stone-900/30 rounded-3xl border-2 border-dashed border-stone-800 flex flex-col items-center justify-center animate-pulse">
                                                    <Users size={64} className="mb-4 opacity-20" />
                                                    <p className="text-lg font-bold uppercase tracking-widest opacity-50">Nenhum aluno encontrado vinculado a você.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        }

                        {/* --- DEFAULT DASHBOARD --- */}
                        {
                            profView === 'dashboard' && (
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
                                                <div key={rec.name} className="flex justify-between items-center bg-stone-900 p-4 rounded-xl border-l-4 border-purple-500 shadow-lg">
                                                    <div className="flex flex-col gap-1 overflow-hidden">
                                                        <span className="text-white font-bold text-sm truncate capitalize">{(rec as any).author_name || 'Professor'}</span>
                                                        <span className="text-stone-500 text-[10px] flex items-center gap-1 font-mono">
                                                            <Calendar size={10} /> {new Date(rec.created_at || '').toLocaleDateString('pt-BR')} - {new Date(rec.created_at || '').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleViewClassRecord(rec.name)}
                                                        className="px-4 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 text-xs font-black uppercase rounded-lg transition-all border border-purple-500/20 whitespace-nowrap"
                                                    >
                                                        Ver Foto
                                                    </button>
                                                </div>
                                            )) : (
                                                <p className="text-stone-500 text-sm">Nenhum registro enviado ainda.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* MAIN ACTIONS BAR - Same as Professor */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <Button onClick={() => setProfView('all_students')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-900 to-indigo-700 hover:from-indigo-800 hover:to-indigo-600 border border-indigo-500/30">
                                            <Users size={28} className="text-indigo-300" />
                                            <span className="text-sm font-bold">Meus Alunos</span>
                                            <span className="text-xs text-indigo-200">Ver Tudo</span>
                                        </Button>
                                        <Button onClick={() => setProfView('uniform')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-900 to-emerald-700 hover:from-emerald-800 hover:to-emerald-600 border border-emerald-500/30">
                                            <Shirt size={28} className="text-emerald-300" />
                                            <span className="text-sm font-bold">Uniforme</span>
                                            <span className="text-xs text-emerald-200">Pedidos</span>
                                        </Button>
                                        <Button onClick={() => setProfView('assignments')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-cyan-900 to-cyan-700 hover:from-cyan-800 hover:to-cyan-600 border border-cyan-500/30">
                                            <BookOpen size={28} className="text-cyan-300" />
                                            <span className="text-sm font-bold">Trabalhos</span>
                                            <span className="text-xs text-cyan-200">Gerenciar</span>
                                        </Button>
                                        <Button onClick={() => setProfView('music_manager')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-900 to-purple-700 hover:from-purple-800 hover:to-purple-600 border border-purple-500/30">
                                            <Music size={28} className="text-purple-300" />
                                            <span className="text-sm font-bold">Músicas</span>
                                            <span className="text-xs text-purple-200">Acervo</span>
                                        </Button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                                            <h3 className="text-xl font-bold text-white mb-4">Minhas Aulas</h3>
                                            <div className="space-y-4">
                                                {myClasses.filter(cls => cls.status !== 'completed').map(cls => {
                                                    // Check if button should be visible (during class time + 30 minutes)
                                                    const now = new Date();
                                                    const classDate = new Date(`${cls.date}T${cls.time}`);
                                                    // Window: from class start until 30 minutes later
                                                    const classEndTime = new Date(classDate.getTime() + 30 * 60 * 1000);
                                                    const isWithinClassWindow = now >= classDate && now <= classEndTime;
                                                    const isToday = cls.date === now.toISOString().split('T')[0];

                                                    return (
                                                        <div key={cls.id} className="bg-stone-900 p-4 rounded border-l-2 border-purple-500">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="font-bold text-white">{cls.title}</p>
                                                                    <p className="text-stone-500 text-sm">{cls.date} - {cls.time} - {cls.location}</p>
                                                                </div>
                                                                {isToday && (
                                                                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full font-bold">Hoje</span>
                                                                )}
                                                            </div>
                                                            {isWithinClassWindow ? (
                                                                <Button fullWidth onClick={() => handleOpenAttendance(cls.id)}>
                                                                    <CalendarCheck size={16} /> Realizar Chamada
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

                                        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                                            <h3 className="text-xl font-bold text-white mb-4">Acompanhamento</h3>

                                            {/* Grade Stats */}
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
                                                    {studentGrades.filter(g => studentsForAttendance.some(s => s.id === g.student_id)).length > 0 ? (
                                                        studentGrades.filter(g => studentsForAttendance.some(s => s.id === g.student_id))
                                                            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                                                            .slice(0, 5).map(g => (
                                                                <div key={g.id} className="flex justify-between items-center bg-stone-900/30 p-2 rounded text-[10px] border-l-2 border-green-900/50">
                                                                    <div className="flex-1">
                                                                        <p className="text-stone-200 font-bold">{studentsForAttendance.find(s => s.id === g.student_id)?.nickname || 'Aluno'}</p>
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

                                            {/* Student Shortcuts */}
                                            <div className="mt-6 space-y-3">
                                                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Atalhos dos Alunos</h4>
                                                {studentsForAttendance.slice(0, 3).map(s => (
                                                    <div key={s.id} className="flex items-center gap-3 p-2 bg-stone-900 rounded">
                                                        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-white font-bold">
                                                            {s.name?.charAt(0) || 'A'}
                                                        </div>
                                                        <div className="flex-1"><p className="text-white text-sm font-bold">{s.nickname || s.name}</p></div>
                                                        <Button variant="secondary" className="text-xs h-7 px-2" onClick={() => handleOpenEvaluation(s.id)}>Avaliar</Button>
                                                    </div>
                                                ))}
                                            </div>

                                            <button onClick={() => setProfView('all_students')} className="w-full text-center text-stone-500 text-[10px] mt-4 hover:text-white transition-colors">Ver todos os alunos</button>
                                        </div>
                                    </div>
                                </>
                            )
                        }
                    </div >
                )
            }

            {/* NEW SECTION: ATTENDANCE HISTORY inside My Classes Tab or separate? User asked for "Historico de chamadas" */
                /* We can put it at the bottom of the 'dashboard' view in Prof Mode or inside 'my_classes' Tab if user is not in Prof Mode dashboard. */
                /* Let's put it in the "Minhas Aulas" tab content, assuming user uses that tab. */
            }
            {/* Redundant History Removed */}

            {
                activeTab === 'grades' && (
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
                                                const student = allUsersProfiles.find(p => p.id === g.student_id);
                                                const professor = allUsersProfiles.find(p => p.id === g.professor_id);
                                                const studentDisplayName = student ? (student.nickname || student.name) : (g.student_name || 'Aluno');
                                                const professorDisplayName = professor ? (professor.nickname || professor.name) : (g.professor_name || 'Professor');

                                                return (
                                                    <tr key={g.id} className="border-b border-stone-800">
                                                        <td className="py-2 text-white">{studentDisplayName}</td>
                                                        <td className="py-2 text-stone-300">
                                                            {g.category === 'theory' ? 'Teórica' : g.category === 'movement' ? 'Movimentação' : 'Musicalidade'}
                                                        </td>
                                                        <td className="py-2 text-white font-bold">{Number.isFinite(numericVal) ? numericVal.toFixed(1) : '-'}</td>
                                                        <td className="py-2 text-stone-400">{g.written}</td>
                                                        <td className="py-2 text-stone-300">{professorDisplayName}</td>
                                                        <td className="py-2 text-stone-500">{formatDatePTBR(g.created_at)}</td>
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
                )
            }

            {
                activeTab === 'reports' && (
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
                                            <th className="p-4">Professor</th>
                                            <th className="p-4">Graduação</th>
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
                                                <td className="p-4 text-stone-300">{move.professor || '-'}</td>
                                                <td className="p-4 text-stone-300 bg-stone-800/20">{move.belt}</td>
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
                )
            }
            {/* EVALUATION MODAL - Global position */}
            {
                showEvalModal && evalModalStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
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
                                    <p className="text-stone-400 text-sm">Usuário</p>
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

                                            const { error: updateError } = await supabase
                                                .from('profiles')
                                                .update({
                                                    graduation_cost: amount,
                                                    next_evaluation_date: evalModalDueDate
                                                })
                                                .eq('id', evalModalStudent.id);

                                            if (updateError) {
                                                console.error('Error updating profile evaluation info:', updateError);
                                            } else {
                                                setManagedUsers(prev => prev.map(u =>
                                                    u.id === evalModalStudent.id
                                                        ? { ...u, graduationCost: amount, nextEvaluationDate: evalModalDueDate }
                                                        : u
                                                ));
                                            }

                                            alert(`Boleto de R$ ${amount.toFixed(2).replace('.', ',')} gerado com sucesso!`);
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
                )
            }
            {/* INSTALLMENT MODAL */}
            {
                showInstallmentModal && installmentStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-stone-800 rounded-2xl border border-blue-600 shadow-2xl max-w-md w-full p-6 relative">
                            <button
                                onClick={() => {
                                    setShowInstallmentModal(false);
                                    setInstallmentStudent(null);
                                    setInstallmentCount(1);
                                    setInstallmentDueDate('');
                                }}
                                className="absolute top-4 right-4 text-stone-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <DollarSign size={20} className="text-blue-500" />
                                Gerar Boleto Parcelado (Avaliação)
                            </h3>

                            <div className="space-y-4">
                                <div className="bg-stone-900 p-4 rounded-lg border border-stone-700">
                                    <p className="text-stone-400 text-sm">Usuário</p>
                                    <p className="text-white font-bold text-lg">{installmentStudent.nickname || installmentStudent.name}</p>
                                    <p className="text-blue-400 text-sm mt-1 font-bold">Total em Aberto: R$ {(installmentStudent.graduationCost ?? 0).toFixed(2).replace('.', ',')}</p>
                                </div>

                                <div>
                                    <label className="block text-sm text-stone-300 mb-2">Opção de Parcelamento</label>
                                    <div className="flex items-center gap-4">
                                        <select
                                            value={installmentCount}
                                            onChange={(e) => setInstallmentCount(Number(e.target.value))}
                                            className="flex-1 bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                                        >
                                            {[...Array(12)].map((_, i) => (
                                                <option key={i + 1} value={i + 1}>{i + 1}x</option>
                                            ))}
                                        </select>
                                        <div className="flex-1 text-right">
                                            <p className="text-xs text-stone-400">Valor por parcela</p>
                                            <p className="text-xl font-bold text-white">
                                                R$ {((installmentStudent.graduationCost || 0) / installmentCount).toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-stone-400 mb-2">Data de Vencimento</label>
                                    <input
                                        type="date"
                                        value={installmentDueDate}
                                        onChange={(e) => setInstallmentDueDate(e.target.value)}
                                        className="w-full bg-stone-900 border border-stone-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="bg-blue-900/20 p-3 rounded border border-blue-900/30 text-[10px] text-blue-300 italic">
                                    * Este valor será subtraído do custo total de graduação do aluno ao confirmar.
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            setShowInstallmentModal(false);
                                            setInstallmentStudent(null);
                                            setInstallmentCount(1);
                                            setInstallmentDueDate('');
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="flex-1 bg-blue-600 hover:bg-blue-500"
                                        onClick={handleCreateInstallment}
                                        disabled={installmentCount <= 0}
                                    >
                                        Confirmar Parcelamento ({installmentCount}x)
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ADD PAYMENT MODAL - Global Position */}
            {
                showAddPaymentModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-md w-full p-6 relative flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <PlusCircle className="text-green-500" />
                                    Adicionar Novo Pagamento
                                </h3>
                                <button onClick={() => setShowAddPaymentModal(false)} className="text-stone-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleAddPayment} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <label htmlFor="student" className="block text-sm text-stone-400 mb-1">Usuário</label>
                                    <select
                                        id="student"
                                        name="student"
                                        value={newPaymentForm.studentId}
                                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, studentId: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                        required
                                    >
                                        <option value="">Selecione um usuário</option>
                                        {managedUsers.filter(u => ['aluno', 'professor', 'admin'].includes(u.role)).map(u => (
                                            <option key={u.id} value={u.id}>{u.nickname || u.name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="month" className="block text-sm text-stone-400 mb-1">Referência (Mês/Ano)</label>
                                    <input
                                        type="text"
                                        id="month"
                                        name="month"
                                        value={newPaymentForm.month}
                                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, month: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                        placeholder="Ex: Janeiro/2024"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="dueDate" className="block text-sm text-stone-400 mb-1">Vencimento</label>
                                    <input
                                        type="date"
                                        id="dueDate"
                                        name="dueDate"
                                        value={newPaymentForm.dueDate}
                                        onChange={(e) => setNewPaymentForm({ ...newPaymentForm, dueDate: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
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
                )
            }

            {/* --- TAB: MUSIC --- */}
            {
                activeTab === 'music' && (
                    <div className="bg-stone-800 rounded-2xl p-8 border border-stone-700 animate-fade-in shadow-2xl relative overflow-hidden">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-yellow-500">
                                    <Music size={32} />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Acervo Musical</h2>
                                    <p className="text-stone-400 text-sm">Gerencie o repertório do grupo</p>
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
                                                            <Clock size={10} /> {new Date(m.created_at || '').toLocaleDateString('pt-BR')}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button className="p-1.5 text-stone-600 hover:text-red-500 transition-colors" title="Remover">
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
                )
            }
            {/* End of DashboardAdmin */}
        </div >
    );
};
