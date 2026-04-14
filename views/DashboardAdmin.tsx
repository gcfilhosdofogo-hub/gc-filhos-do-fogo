import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import heic2any from "heic2any";
import { User, GroupEvent, PaymentRecord, AdminNotification, MusicItem, UserRole, UniformOrder, ALL_BELTS, HomeTraining, SchoolReport, Assignment, EventRegistration, ClassSession, StudentGrade, GradeCategory, LessonPlan, EventBanner } from '../types';
import { FFPoints } from './FFPoints';
import { useLanguage } from '../src/i18n/LanguageContext';

import { Shield, Users, Bell, DollarSign, CalendarPlus, Plus, PlusCircle, CheckCircle, AlertCircle, Clock, GraduationCap, BookOpen, ChevronDown, ChevronUp, Trash2, Edit2, X, Save, Activity, MessageCircle, ArrowLeft, CalendarCheck, Camera, FileWarning, Info, Mic2, Music, Paperclip, Search, Shirt, ShoppingBag, ThumbsDown, ThumbsUp, UploadCloud, MapPin, Wallet, Check, Calendar, Settings, UserPlus, Mail, Phone, Lock, Package, FileText, Video, PlayCircle, Ticket, FileUp, Eye, Award, Instagram, Archive, Copy } from 'lucide-react'; // Import Archive
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
    onUpdateOrderStatus: (orderId: string, status: 'pending' | 'paid' | 'producing' | 'delivered') => void;
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
    // Lesson Plan props
    lessonPlans?: LessonPlan[];
    onAddLessonPlan?: (plan: Omit<LessonPlan, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    onUpdateLessonPlan?: (plan: LessonPlan) => Promise<void>;
    onDeleteLessonPlan?: (planId: string) => Promise<void>;
}


const UNIFORM_PRICES = {
    combo: 110.00,
    shirt: 30.00,
    pants_roda: 80.00,
    pants_train: 80.00
};

type Tab = 'overview' | 'events' | 'finance' | 'pedagogy' | 'my_classes' | 'class_monitoring' | 'users' | 'student_details' | 'grades' | 'reports' | 'music' | 'banner' | 'ffpoints';
type ProfessorViewMode = 'dashboard' | 'attendance' | 'new_class' | 'all_students' | 'evaluate' | 'assignments' | 'uniform' | 'music_manager' | 'financial' | 'planning';

const DiscordIcon = ({ size = 20 }: { size?: number }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.858-1.297 1.185-1.999a.076.076 0 0 0-.04-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.33.702.728 1.369 1.185 2c.019.024.05.034.081.02a19.825 19.825 0 0 0 6.007-3.034.076.076 0 0 0 .03-.056c.552-5.18-.894-9.673-3.053-13.66a.066.066 0 0 0-.032-.027ZM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
);

// ────────────────────────────────────────────────────────────
// ActivityFeed — separate component so hooks are valid
// ────────────────────────────────────────────────────────────
const ActivityFeed: React.FC<{
    notifications: AdminNotification[];
    allUsersProfiles: User[];
    onClearNotifications: () => void;
}> = ({ notifications, allUsersProfiles, onClearNotifications }) => {
    const { t } = useLanguage();
    const [activityTab, setActivityTab] = useState<'feed' | 'last_seen'>('feed');
    const [nowTimer, setNowTimer] = useState(Date.now()); // Força o re-render 

    // Atualiza a cada 30 segundos para a bolinha ficar cinza e o texto alterar em tempo real
    useEffect(() => {
        const interval = setInterval(() => setNowTimer(Date.now()), 30000);
        return () => clearInterval(interval);
    }, []);

    const cleanNotifications = useMemo(() => {
        return notifications.filter(n => !n.action.toLowerCase().includes('acessou'));
    }, [notifications]);

    const parseTimestampToMs = (dateStr?: string) => {
        if (!dateStr) return 0;
        if (dateStr.includes('T')) {
            const time = new Date(dateStr).getTime();
            return isNaN(time) ? 0 : time;
        }
        // Fallback para timestamp pt-BR do log: "DD/MM/YYYY, HH:mm:ss" ou "HH:mm"
        const parts = dateStr.split(/[\s,]+/);
        if (parts.length >= 2) {
            const dateP = parts[0].split('/');
            const timeP = parts[1].split(':');
            if (dateP.length === 3) {
                const [day, month, year] = dateP;
                const time = new Date(`${year}-${month}-${day}T${timeP[0] || '00'}:${timeP[1] || '00'}:${timeP[2] || '00'}-03:00`).getTime();
                return isNaN(time) ? 0 : time;
            }
        }
        return 0;
    };

    const getUserLastSeenTimeMs = useCallback((u: User) => {
        let time = u.last_seen ? new Date(u.last_seen).getTime() : 0;
        if (!time || isNaN(time) || time === 0) {
            // Se o BD não retornou data válida, tenta o log + recente em notifications
            const userNotifs = notifications.filter(n => n.user_id === u.id);
            if (userNotifs.length > 0) {
                // Tenta pegar pelo created_at (timestamp ISO real de criação), se não, usa o parse antigo
                time = Math.max(...userNotifs.map(n => n.created_at ? new Date(n.created_at).getTime() : parseTimestampToMs(n.timestamp)));
            }
        }
        return isNaN(time) ? 0 : time;
    }, [notifications]);

    const formatLastSeenMs = useCallback((timeMs: number) => {
        if (timeMs === 0) return t('admin.activity.never_accessed');
        const d = new Date(timeMs);
        const diffMs = nowTimer - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 2) return t('admin.activity.just_now');
        if (diffMins < 60) return `${t('admin.activity.ago')} ${diffMins} ${t('admin.activity.mins')}`;
        if (diffHours < 24) return `${t('admin.activity.ago')} ${diffHours} ${t('admin.activity.hours')}`;
        if (diffDays === 1) return t('admin.activity.yesterday');
        if (diffDays < 7) return `${t('admin.activity.ago')} ${diffDays} ${t('admin.activity.days')}`;
        return d.toLocaleDateString('pt-BR');
    }, [nowTimer, t]);

    const isOnlineMs = useCallback((timeMs: number) => {
        if (timeMs === 0) return false;
        const diff = nowTimer - timeMs;
        // Evita bugar se o relógio local estiver um pouco dessincronizado do server
        return diff >= -60000 && diff < 10 * 60 * 1000;
    }, [nowTimer]);

    const activeUsers = useMemo(() =>
        (allUsersProfiles || [])
            .filter(u => u.status !== 'archived')
            .sort((a, b) => {
                const aTime = getUserLastSeenTimeMs(a);
                const bTime = getUserLastSeenTimeMs(b);
                return bTime - aTime;
            }),
        [allUsersProfiles, getUserLastSeenTimeMs]
    );

    const getRoleColor = (role: string) => {
        if (role === 'admin') return 'text-red-400 bg-red-400/10 border-red-400/20';
        if (role === 'professor') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        return 'text-green-400 bg-green-400/10 border-green-400/20';
    };

    const getActionIcon = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('chamada')) return '✅';
        if (a.includes('trabalho') || a.includes('tarefa') || a.includes('boletim')) return '📝';
        if (a.includes('música') || a.includes('musica')) return '🎵';
        if (a.includes('uniforme')) return '👕';
        if (a.includes('aula') || a.includes('vídeo') || a.includes('video')) return '🥋';
        if (a.includes('avali')) return '⭐';
        if (a.includes('pagamento') || a.includes('comprovante')) return '💰';
        if (a.includes('perfil')) return '👤';
        if (a.includes('planejamento')) return '📋';
        if (a.includes('foto') || a.includes('registro')) return '📷';
        return '🔔';
    };

    return (
        <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-yellow-500" />
                    {t('admin.activity.recent')}
                </h3>
                {cleanNotifications.length > 0 && (
                    <button onClick={onClearNotifications} className="text-[10px] uppercase font-bold text-stone-500 hover:text-red-500 transition-colors">
                        {t('admin.activity.clear')}
                    </button>
                )}
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 mb-4 bg-stone-900 rounded-lg p-1">
                <button
                    onClick={() => setActivityTab('feed')}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${activityTab === 'feed' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-stone-500 hover:text-stone-300'}`}
                >
                    {t('admin.activity.feed')}
                    {cleanNotifications.length > 0 && (
                        <span className="ml-1.5 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">
                            {cleanNotifications.length > 99 ? '99+' : cleanNotifications.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActivityTab('last_seen')}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${activityTab === 'last_seen' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-stone-500 hover:text-stone-300'}`}
                >
                    {t('admin.activity.last_seen')}
                </button>
            </div>

            {/* Feed tab */}
            {activityTab === 'feed' && (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {cleanNotifications.length > 0 ? (
                        cleanNotifications.map(notif => (
                            <div key={notif.id} className="bg-stone-900/80 p-3 rounded-lg border-l-2 border-yellow-500/60 hover:border-yellow-500 transition-all">
                                <div className="flex items-start gap-2">
                                    <span className="text-base mt-0.5 shrink-0">{getActionIcon(notif.action)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{notif.user_name}</p>
                                        <p className="text-xs text-stone-300 leading-relaxed">{notif.action}</p>
                                        <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                                            <Clock size={9} />
                                            {notif.timestamp}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-stone-600">
                            <Activity size={32} className="mb-2 opacity-30" />
                            <p className="text-sm italic">{t('admin.activity.no_recent')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Last Seen tab */}
            {activityTab === 'last_seen' && (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {activeUsers.map(u => {
                        const timeMs = getUserLastSeenTimeMs(u);
                        return (
                            <div key={u.id} className="bg-stone-900/80 p-3 rounded-lg flex items-center gap-3 hover:bg-stone-900 transition-all">
                                <div className="relative shrink-0">
                                    {u.photo_url ? (
                                        <img src={u.photo_url} className="w-9 h-9 rounded-full object-cover border-2 border-stone-700" />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-stone-800 border-2 border-stone-700 flex items-center justify-center text-sm font-black text-stone-400">
                                            {(u.nickname || u.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-stone-900 ${isOnlineMs(timeMs) ? 'bg-green-500' : 'bg-stone-600'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{u.nickname || u.name}</p>
                                    <p className="text-[10px] text-stone-500 flex items-center gap-1">
                                        <Clock size={9} />
                                        {formatLastSeenMs(timeMs)}
                                    </p>
                                </div>
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${getRoleColor(u.role)} shrink-0`}>
                                    {u.role === 'admin' ? 'ADM' : u.role === 'professor' ? 'PROF' : 'ALU'}
                                </span>
                            </div>
                        );
                    })}
                    {activeUsers.length === 0 && (
                        <p className="text-stone-600 text-sm italic text-center py-8">{t('admin.activity.no_user')}</p>
                    )}
                </div>
            )}
        </div>
    );
};



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
    onDeleteMusic = async (_id: string) => { },
    lessonPlans = [],
    onAddLessonPlan,
    onUpdateLessonPlan,
    onDeleteLessonPlan,
}) => {

    const { session } = useSession();
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [profView, setProfView] = useState<ProfessorViewMode>('dashboard');
    const [selectedAssignmentTarget, setSelectedAssignmentTarget] = useState<'mine' | 'all'>('all');

    // Event Management State
    const [showEventForm, setShowEventForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [eventFormData, setEventFormData] = useState({ title: '', date: '', event_time: '', description: '', price: '' });
    const [expandedEventParticipants, setExpandedEventParticipants] = useState<string | null>(null); // New state for event participants

    // Uniform State
    const [orderForm, setOrderForm] = useState({ item: 'combo', shirtSize: '', pantsSize: '' });

    // Banner State
    const [banners, setBanners] = useState<EventBanner[]>([]);
    const [bannerFormData, setBannerFormData] = useState({ title: '', file: null as File | null });
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const bannerFileInputRef = useRef<HTMLInputElement>(null);

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
        status: 'active' as 'active' | 'blocked' | 'archived'
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

    const formatDateESAR = (isoString: string | null | undefined): string => {
        if (!isoString) return '-';
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
    
    // --- ADMIN ATTENDANCE OVERRIDE (For "Monitorar Aulas") ---
    const [adminAttendanceClass, setAdminAttendanceClass] = useState<ClassSession | null>(null);
    const [adminAttendanceData, setAdminAttendanceData] = useState<Record<string, boolean>>({});
    const [adminJustifications, setAdminJustifications] = useState<Record<string, string>>({});
    const [adminAttendanceStudents, setAdminAttendanceStudents] = useState<any[]>([]); // UserProfile type

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
    const [allAttendance, setAllAttendance] = useState<{ student_id: string; status: string }[]>([]);
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [savingGrades, setSavingGrades] = useState(false);

    // Self-payment states (for admin's own financial view in Minhas Aulas)
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
    const [selectedPaymentToProof, setSelectedPaymentToProof] = useState<PaymentRecord | null>(null);
    const eventFileInputRef = useRef<HTMLInputElement>(null);
    const [selectedEventRegToProof, setSelectedEventRegToProof] = useState<EventRegistration | null>(null);

    // Derived: admin's own payments (matching DashboardProfessor filters)
    const myFilteredPayments = useMemo(() => (monthlyPayments || []).filter(p => p.student_id === user.id), [monthlyPayments, user.id]);
    const myMonthlyPayments = useMemo(() => myFilteredPayments.filter(p => (!p.type || p.type === 'Mensalidade') && !p.month.toLowerCase().includes('avalia')), [myFilteredPayments]);
    const myEvaluations = useMemo(() => myFilteredPayments.filter(p => p.type === 'evaluation' || p.month.toLowerCase().includes('avalia')), [myFilteredPayments]);
    const myEventRegistrations = useMemo(() => eventRegistrations ? eventRegistrations.filter(r => r.user_id === user.id) : [], [eventRegistrations, user.id]);
    const myOrders = useMemo(() => (uniformOrders || []).filter(o => o.user_id === user.id), [uniformOrders, user.id]);

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
    const [newClassData, setNewClassData] = useState({ title: '', date: '', time: '', location: '', adminSuggestion: '', planning: '', category: '' });

    // Planning view states
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [editPlanTitle, setEditPlanTitle] = useState('');
    const [editPlanContent, setEditPlanContent] = useState('');
    const [showNewPlanForm, setShowNewPlanForm] = useState(false);
    const [newPlanTitle, setNewPlanTitle] = useState('');
    const [newPlanContent, setNewPlanContent] = useState('');
    const [savingPlan, setSavingPlan] = useState(false);

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
        alert(t('admin.users.alert.blocked', { name: foundUser?.nickname || foundUser?.name || userId }));
        handleLiberateUser(userId); // Also clear it from the popup
    };

    // --- CUSTOM ADMIN DISPLAY NAME ---
    const getAdminDisplayName = () => {
        if (user.nickname === 'Aquiles') return t('admin.dash.admin_ar');
        if (user.nickname === 'Wolverine') return t('admin.dash.admin_br');
        if (user.nickname === 'Anjo de Fogo') return t('admin.dash.admin_gen');
        return user.nickname || user.first_name || user.name || 'Admin';
    };

    const filteredPayments = useMemo(() => {
        let filtered = monthlyPayments || [];

        // Apply Status Filter
        if (paymentFilter !== 'all') {
            filtered = filtered.filter(p => p.status === paymentFilter);
        }

        // Apply Search Filter
        if (userSearch) {
            filtered = filtered.filter(p => {
                const student = allUsersProfiles.find(u => u.id === p.student_id);
                return student?.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                    student?.nickname?.toLowerCase().includes(userSearch.toLowerCase());
            });
        }

        return filtered;
    }, [monthlyPayments, paymentFilter, userSearch, allUsersProfiles]);

    // --- ADMIN HANDLERS ---
    const totalMonthlyPayments = useMemo(() => {
        return (monthlyPayments || [])
            .filter(p => {
                const student = managedUsers.find(u => u.id === p.student_id);
                return p.status === 'paid' && (!student || student.status !== 'archived');
            })
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    }, [monthlyPayments, managedUsers]);

    const pendingMonthlyPayments = useMemo(() => {
        return (monthlyPayments || [])
            .filter(p => {
                const student = managedUsers.find(u => u.id === p.student_id);
                return p.status !== 'paid' && (!student || student.status !== 'archived');
            })
            .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    }, [monthlyPayments, managedUsers]);

    const totalUniformRevenue = useMemo(() => {
        return (uniformOrders || [])
            .filter(o => {
                const student = managedUsers.find(u => u.id === o.user_id);
                return o.status !== 'pending' && (!student || student.status !== 'archived');
            })
            .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    }, [uniformOrders, managedUsers]);

    const pendingUniformRevenue = useMemo(() => {
        return (uniformOrders || [])
            .filter(o => {
                const student = managedUsers.find(u => u.id === o.user_id);
                return o.status === 'pending' && (!student || student.status !== 'archived');
            })
            .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    }, [uniformOrders, managedUsers]);

    const totalEventRevenue = useMemo(() => {
        return (eventRegistrations || [])
            .filter(r => {
                const student = managedUsers.find(u => u.id === r.user_id);
                return r.status === 'paid' && (!student || student.status !== 'archived');
            })
            .reduce((acc, curr) => acc + (Number(curr.amount_paid) || 0), 0);
    }, [eventRegistrations, managedUsers]);

    const pendingEventRevenue = useMemo(() => {
        return (eventRegistrations || [])
            .filter(r => {
                const student = managedUsers.find(u => u.id === r.user_id);
                return r.status === 'pending' && (!student || student.status !== 'archived');
            })
            .reduce((acc, curr) => acc + (Number(curr.amount_paid) || 0), 0);
    }, [eventRegistrations, managedUsers]);

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
            const student = managedUsers.find(u => u.id === p.student_id);
            if (student && student.status === 'archived') return;

            const isEval = p.type === 'evaluation' || p.month.toLowerCase().includes('avalia');
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
            if (student && student.status === 'archived') return;

            movements.push({
                date: formatDatePTBR(o.date),
                description: `Uniforme - ${o.item}`,
                student: o.user_name,
                professor: student?.professorName || '-',
                belt: getBelt(o.user_id),
                type: 'Uniforme',
                value: o.total,
                status: o.status === 'paid' || o.status === 'producing' || o.status === 'delivered' ? 'Pago' : 'Pendente'
            });
        });

        // Event Registrations
        eventRegistrations.forEach(reg => {
            const student = managedUsers.find(u => u.id === reg.user_id);
            if (student && student.status === 'archived') return;

            const linkedEvent = events.find(e => e.id === reg.event_id);
            const dateDisplay = linkedEvent ? formatDatePTBR(linkedEvent.date) : '-';
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
        const headers = [
            t('admin.finance.report_header.date'),
            t('admin.finance.report_header.desc'),
            t('admin.finance.report_header.student'),
            t('admin.finance.report_header.prof'),
            t('admin.finance.report_header.belt'),
            t('admin.finance.report_header.type'),
            t('admin.finance.report_header.value'),
            t('admin.finance.report_header.status')
        ];
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

        link.setAttribute("download", `${t('admin.finance.report_filename')}_${dd}-${mm}-${yyyy}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPedagogicalReport = () => {
        const headers = [
            t('admin.finance.report_header.prof'),
            t('admin.finance.report_header.student'),
            t('admin.pedagogy.table.attendance'),
            t('admin.pedagogy.table.theory'),
            t('admin.pedagogy.table.movement'),
            t('admin.pedagogy.table.musicality'),
            t('admin.pedagogy.table.head.last_eval'),
            `${t('admin.pedagogy.table.grad_cost')} (${language === 'pt' ? 'R$' : '$'})`
        ];
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

        link.setAttribute("download", `${t('admin.pedagogy.report_filename')}_${dd}-${mm}-${yyyy}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const pendingUniformOrders = uniformOrders.filter(o => o.status === 'paid'); // Admin sees 'paid' as pending for them
    const pendingEventRegistrations = eventRegistrations.filter(reg => reg.status === 'pending');

    const handleStartEdit = (e: React.MouseEvent, event: GroupEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let extractedTime = event.event_time || '';
        let cleanedDescription = event.description || '';

        const timeMatch = cleanedDescription.match(/^\[Horário:\s*(.*?)\]\n?/);
        if (timeMatch) {
            extractedTime = timeMatch[1];
            cleanedDescription = cleanedDescription.replace(/^\[Horário:\s*(.*?)\]\n?/, '');
        }

        setEventFormData({
            title: event.title,
            date: event.date,
            event_time: extractedTime,
            description: cleanedDescription,
            price: event.price ? event.price.toString() : ''
        });
        setEditingId(event.id);
        setShowEventForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setShowEventForm(false);
        setEditingId(null);
        setEventFormData({ title: '', date: '', event_time: '', description: '', price: '' });
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
        let finalDescription = eventFormData.description;
        if (eventFormData.event_time) {
            finalDescription = `[Horário: ${eventFormData.event_time}]\n${finalDescription}`;
        }

        const eventPayload = {
            title: eventFormData.title,
            date: eventFormData.date,
            description: finalDescription,
            price: eventPrice
        };

        if (editingId) {
            onEditEvent({ id: editingId, ...eventPayload });
            setEditingId(null);
        } else {
            // Updated to await the response and create debts
            const newEvent = await onAddEvent(eventPayload);

            // Create pending registrations for ACTIVE users only
            if (newEvent) {
                const targets = managedUsers.filter(u => (u.status !== 'archived') && (u.role === 'aluno' || u.role === 'professor' || u.role === 'admin'));

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
        setEventFormData({ title: '', date: '', event_time: '', description: '', price: '' });
        setShowEventForm(false);
    };

    const handleGenerateMonthlyPayments = async () => {
        if (!confirm(t('admin.finance.gen_confirm'))) return;

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
        const activeStudents = managedUsers.filter(u => u.status !== 'archived' && (u.role === 'aluno' || u.role === 'professor'));

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
            alert(t('admin.finance.gen_success', { count: createdCount, month: targetMonth }));
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
        if (!confirm(t('common.delete_confirm'))) return;
        try {
            const { error } = await supabase.from('monthly_payments').delete().eq('id', paymentId);
            if (error) throw error;
            onNotifyAdmin(`Excluiu pagamento ID: ${paymentId}`, user);
            alert(t('common.success_delete'));
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
        if (!confirm(t('common.delete_confirm'))) return;
        try {
            const { error } = await supabase.from('uniform_orders').delete().eq('id', orderId);
            if (error) throw error;
            onNotifyAdmin(`Excluiu pedido de uniforme ID: ${orderId}`, user);
            alert(t('common.success_delete'));
        } catch (err: any) {
            console.error('Error deleting uniform order:', err);
            alert('Erro ao excluir pedido de uniforme: ' + err.message);
        }
    };

    const handleDeleteEventRegistration = async (registrationId: string) => {
        if (!confirm(t('common.delete_confirm'))) return;
        try {
            const { error } = await supabase.from('event_registrations').delete().eq('id', registrationId);
            if (error) throw error;
            onNotifyAdmin(`Excluiu registro de evento ID: ${registrationId}`, user);
            alert(t('common.success_delete'));
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
            alert(t('admin.users.phone_not_found'));
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

    // --- BANNER MANAGEMENT HANDLERS ---
    const fetchBanners = useCallback(async () => {
        const { data, error } = await supabase
            .from('event_banners')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) console.error('Error fetching banners:', error);
        else setBanners(data || []);
    }, []);

    useEffect(() => {
        if (activeTab === 'banner') {
            fetchBanners();
        }
    }, [activeTab, fetchBanners]);

    const handleSaveBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bannerFormData.file) return;

        setUploadingBanner(true);
        try {
            let file = bannerFormData.file;
            file = await convertToStandardImage(file);
            const fileExt = file.name.split('.').pop();
            const filePath = `banners/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('event_banners')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('event_banners')
                .getPublicUrl(uploadData.path);

            const { error: dbError } = await supabase
                .from('event_banners')
                .insert({
                    image_url: publicUrl,
                    title: bannerFormData.title,
                    active: true,
                    created_by: user.id
                });

            if (dbError) throw dbError;

            alert('Banner enviado com sucesso!');
            setBannerFormData({ title: '', file: null });
            if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
            fetchBanners();
            onNotifyAdmin(`Adicionou novo banner de evento: ${bannerFormData.title || 'Sem título'}`, user);
        } catch (error: any) {
            console.error('Error saving banner:', error);
            alert('Erro ao salvar banner: ' + error.message);
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleToggleBanner = async (bannerId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('event_banners')
            .update({ active: !currentStatus })
            .eq('id', bannerId);

        if (error) {
            console.error('Error toggling banner:', error);
            alert('Erro ao alterar status do banner.');
        } else {
            fetchBanners();
            onNotifyAdmin(`${currentStatus ? 'Desativou' : 'Ativou'} banner de evento`, user);
        }
    };

    const handleDeleteBanner = async (bannerId: string) => {
        if (!confirm('Deseja excluir este banner? Esta ação removerá o banner para todos os usuários.')) return;

        const { error } = await supabase
            .from('event_banners')
            .delete()
            .eq('id', bannerId);

        if (error) {
            console.error('Error deleting banner:', error);
            alert('Erro ao excluir banner.');
        } else {
            fetchBanners();
            onNotifyAdmin(`Excluiu banner de evento`, user);
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

    const handleFileChangeForPaymentProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedPaymentToProof) return;
        setUploadingPaymentProof(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/payment_proofs/${selectedPaymentToProof.id}_${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('payment_proofs')
                .upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            await onUpdatePaymentRecord({
                ...selectedPaymentToProof,
                proof_url: uploadData.path,
                proof_name: file.name,
            });
            alert('Comprovante enviado com sucesso! Aguarde a confirmação.');
        } catch (err) {
            console.error('Erro ao enviar comprovante:', err);
            alert('Erro ao enviar comprovante. Tente novamente.');
        } finally {
            setUploadingPaymentProof(false);
            setSelectedPaymentToProof(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileChangeForEventProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedEventRegToProof) return;
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/event_proofs/${selectedEventRegToProof.id}_${Date.now()}.${fileExt}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('event_proofs')
                .upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            await onUpdateEventRegistrationWithProof({
                ...selectedEventRegToProof,
                proof_url: uploadData.path,
                proof_name: file.name,
            });
            alert('Comprovante de evento enviado! Aguarde a confirmação.');
        } catch (err) {
            console.error('Erro ao enviar comprovante de evento:', err);
            alert('Erro ao enviar comprovante. Tente novamente.');
        } finally {
            setSelectedEventRegToProof(null);
            if (eventFileInputRef.current) eventFileInputRef.current.value = '';
        }
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

    const handleOpenAdminAttendance = (classSession: ClassSession) => {
        const prof = allUsersProfiles.find(u => u.id === classSession.professor_id);
        const professorIdentity = prof?.nickname || prof?.first_name || prof?.name || classSession.instructor;

        // Ensure we handle general public if category targets aren't professor specific. But martial arts classes generally belong to a single professor.
        // If we want all students allowed, we could just filter by 'aluno'.
        // But the previous rule was `u.professorName === professorIdentity`.
        const studentsInClass = allUsersProfiles.filter(u => u.role === 'aluno' && u.professorName === professorIdentity);
        
        const initialAttendance: Record<string, boolean> = {};
        const initialJustifications: Record<string, string> = {};

        // 1. Initial default state (everyone present)
        studentsInClass.forEach(s => initialAttendance[s.id] = true);
        
        // 2. Override with existing history if it exists
        const sessionHistory = attendanceHistory.filter(h => h.session_id === classSession.id);
        if (sessionHistory.length > 0) {
            sessionHistory.forEach(record => {
                initialAttendance[record.student_id] = record.status === 'present';
                if (record.justification) {
                    initialJustifications[record.student_id] = record.justification;
                }
            });
        }
        
        setAdminAttendanceClass(classSession);
        setAdminAttendanceStudents(studentsInClass);
        setAdminAttendanceData(initialAttendance);
        setAdminJustifications(initialJustifications);
        setShowSuccess(false);
    };


    const toggleAdminPresence = (studentId: string) => {
        setAdminAttendanceData(prev => ({ ...prev, [studentId]: !prev[studentId] }));
    };

    const handleSaveAdminAttendance = async () => {
        if (!adminAttendanceClass) return;

        const records = adminAttendanceStudents.map(student => {
            const isPresent = !!adminAttendanceData[student.id];
            return {
                session_id: adminAttendanceClass.id,
                student_id: student.id,
                status: isPresent ? 'present' : 'absent',
                justification: !isPresent ? adminJustifications[student.id] : null
            };
        });

        if (records.length === 0) {
           alert("Nenhum aluno encontrado para a chamada desta turma.");
           return;
        }

        try {
            await onAddAttendance(records);
            await onUpdateClassSession({ ...adminAttendanceClass, status: 'completed' });

            setShowSuccess(true);
            setTimeout(() => {
                setAdminAttendanceClass(null);
                setShowSuccess(false);
                setAdminJustifications({});
                onNotifyAdmin(`Realizou chamada da aula: ${adminAttendanceClass.title}`, user);
                fetchAttendanceHistory();
            }, 1000);
        } catch (err: any) {
            console.error('Error saving admin attendance:', err);
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
            title: newClassData.title,
            date: newClassData.date,
            time: newClassData.time,
            instructor: user.nickname || user.name,
            location: newClassData.location,
            level: 'Todos os Níveis',
            professor_id: user.id,
            status: 'pending',
            category: newClassData.category || undefined,
        };
        try {
            await onAddClassSession(newSessionPayload);
            const savedTitle = newClassData.title;
            setNewClassData({ title: '', date: '', time: '', location: '', adminSuggestion: '', planning: '', category: '' });
            onNotifyAdmin(`Agendou nova aula: ${savedTitle}`, user);
            alert(`Aula "${savedTitle}" criada com sucesso!`);
        } catch (err: any) {
            alert('Erro ao criar aula: ' + (err?.message || 'Tente novamente.'));
        }
    };

    // --- Lesson Plan handlers (use lesson_plans table, NOT class_sessions) ---
    const handleAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlanTitle.trim() || !onAddLessonPlan) return;
        setSavingPlan(true);
        try {
            await onAddLessonPlan({
                professor_id: user.id,
                professor_name: user.nickname || user.name,
                title: newPlanTitle,
                content: newPlanContent,
            });
            setNewPlanTitle('');
            setNewPlanContent('');
            setShowNewPlanForm(false);
            onNotifyAdmin(`Adicionou planejamento: ${newPlanTitle}`, user);
        } catch (err: any) {
            alert('Erro ao salvar planejamento: ' + err.message);
        } finally {
            setSavingPlan(false);
        }
    };

    const handleSavePlanEdit = async (plan: LessonPlan) => {
        if (!onUpdateLessonPlan) return;
        setSavingPlan(true);
        try {
            await onUpdateLessonPlan({ ...plan, title: editPlanTitle, content: editPlanContent });
            setEditingPlanId(null);
        } catch (err: any) {
            alert('Erro ao atualizar planejamento: ' + err.message);
        } finally {
            setSavingPlan(false);
        }
    };

    const handleDeletePlan = async (planId: string) => {
        if (!onDeleteLessonPlan) return;
        if (!window.confirm('Tem certeza que deseja excluir este planejamento?')) return;
        try {
            await onDeleteLessonPlan(planId);
        } catch (err: any) {
            alert('Erro ao excluir planejamento: ' + err.message);
        }
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

            // Update class records list for UI immediately with correct data
            const newRecord = {
                name: uploadData.path,
                url: '',
                created_at: new Date().toISOString(),
                author_name: user.nickname || user.first_name || user.name || 'Professor',
                description: `Registro de aula por ${user.nickname || user.name}`
            };
            setClassRecords(prev => [newRecord, ...prev]);

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
                .select('*, profiles:created_by (nickname, first_name)')
                .order('created_at', { ascending: false })
                .limit(40);

            if (error) throw error;

            const records = (data || []).map((it: any) => ({
                name: it.photo_url,
                url: '',
                created_at: it.created_at,
                author_id: it.created_by,
                author_name: it.profiles?.nickname || it.profiles?.first_name || 'Professor',
                description: it.description
            }));

            setClassRecords(records);
        } catch (error) {
            console.error('Error fetching class records (from DB):', error);
            // We removed the storage fallback as it lacks metadata and was showing "ghost" entries
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

    const fetchAllAttendance = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select('student_id, status');
            if (error) throw error;
            if (data) setAllAttendance(data);
        } catch (err) {
            console.error("Error fetching all attendance", err);
        }
    }, []);

    const fetchAttendanceHistory = useCallback(async () => {
        // Fetch real attendance records from DB
        try {
            const { data, error } = await supabase
                .from('attendance')
                .select(`
                    id,
                    created_at,
                    status,
                    justification,
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
                .limit(2000); // Increased limit so expanded class attendance view loads correctly

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
        fetchAllAttendance();
    }, [fetchClassRecords, fetchAttendanceHistory, fetchAllAttendance]);


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
    const professorsData: any[] = useMemo(() => {
        const professors = managedUsers.filter(u => u.role === 'professor' || u.role === 'admin');

        // Calculate attendance rates by student
        const attendanceStats: Record<string, { present: number; total: number }> = {};
        allAttendance.forEach(att => {
            if (!attendanceStats[att.student_id]) {
                attendanceStats[att.student_id] = { present: 0, total: 0 };
            }
            attendanceStats[att.student_id].total++;
            if (att.status === 'present') {
                attendanceStats[att.student_id].present++;
            }
        });

        return professors.map(prof => {
            const profStudents = managedUsers.filter(u => u.role === 'aluno' && u.professorName === (prof.nickname || prof.first_name || prof.name));

            const studentsData: any[] = profStudents
                .filter(u => u.status !== 'archived')
                .map(s => {
                    const sGrades = studentGrades.filter(g => g.student_id === s.id);
                    // Extract specific grades
                    const theoryGrade = sGrades.find(g => g.category === 'theory')?.numeric || 0;
                    const movementGrade = sGrades.find(g => g.category === 'movement')?.numeric || 0;
                    const musicalityGrade = sGrades.find(g => g.category === 'musicality')?.numeric || 0;

                    // Calculate real attendance rate
                    const stats = attendanceStats[s.id];
                    const attendanceRate = stats && stats.total > 0
                        ? Math.round((stats.present / stats.total) * 100)
                        : 0;

                    return {
                        studentId: s.id,
                        studentName: s.nickname || s.name,
                        attendanceRate,
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
    }, [managedUsers, studentGrades, allAttendance]);

    const filteredMonthlyPayments = monthlyPayments.filter(p => {
        const student = managedUsers.find(u => u.id === p.student_id);
        if (student && student.status === 'archived') return false;

        return (!p.type || p.type === 'Mensalidade') &&
            !p.month.toLowerCase().includes('avalia') &&
            (paymentFilter === 'all' ? true : p.status === paymentFilter);
    });

    const evaluationPayments = monthlyPayments.filter(p => {
        const student = managedUsers.find(u => u.id === p.student_id);
        if (student && student.status === 'archived') return false;

        return (p.type === 'evaluation' || p.month.toLowerCase().includes('avalia')) &&
            (paymentFilter === 'all' ? true : p.status === paymentFilter);
    });
    const selectedClassInfo = myClasses.find(c => c.id === selectedClassId);
    const studentBeingEvaluated = studentsForAttendance.find(s => s.id === selectedStudentForEval);

    const activeUsers = useMemo(() => managedUsers.filter(u => u.status !== 'archived'), [managedUsers]);
    const totalStudentsCount = useMemo(() => activeUsers.filter(u => u.role === 'aluno').length, [activeUsers]);
    const totalProfessorsCount = useMemo(() => activeUsers.filter(u => u.role === 'professor').length, [activeUsers]);

    const filteredManagedUsers = managedUsers.filter(u =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.nickname && u.nickname.toLowerCase().includes(userSearch.toLowerCase())) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase())
    );

    const filteredStudentsForDetails = managedUsers.filter(u =>
        u.role === 'aluno' && u.status !== 'archived' &&
        (u.name.toLowerCase().includes(studentDetailsSearch.toLowerCase()) ||
            (u.nickname && u.nickname.toLowerCase().includes(studentDetailsSearch.toLowerCase())) ||
            u.email.toLowerCase().includes(studentDetailsSearch.toLowerCase()))
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="bg-gradient-to-r from-red-900 to-stone-900 p-4 sm:p-8 rounded-2xl border border-red-900/50 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4">

                    <div className="relative group cursor-pointer shrink-0" onClick={() => !uploadingPhoto && photoInputRef.current?.click()} title={t('admin.dash.photo_change')}>
                        <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-stone-700 flex items-center justify-center border-4 border-white/10 overflow-hidden shadow-lg relative">
                            {user.photo_url ? (
                                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <Logo className="w-full h-full object-cover" />
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Camera className="text-white" size={20} />
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

                    <div className="text-center sm:text-left">
                        <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center justify-center sm:justify-start gap-4">
                            <Shield className="text-red-500 shrink-0" size={24} />
                            <span>{t(language === 'pt' ? 'admin.dash.admin_br' : 'admin.dash.admin_ar')}</span>
                        </h1>
                        <p className="text-red-200 mt-1 text-sm">{t('admin.dash.welcome')} {user.nickname || user.first_name || user.name}!</p>
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
                                {t('admin.dash.overdue_title')}
                            </h3>
                            <p className="text-stone-300 mb-8 leading-relaxed">
                                {t('admin.dash.overdue_msg')}
                            </p>

                            <div className="w-full max-h-48 overflow-y-auto mb-8 space-y-2 bg-stone-900/50 p-4 rounded-xl border border-stone-700 custom-scrollbar">
                                {overdueSummary.map(u => (
                                    <div key={u.id} className="flex justify-between items-center bg-stone-900 p-3 rounded-lg border border-stone-800 group">
                                        <div className="text-left">
                                            <div className="text-white font-bold">{u.name}</div>
                                            <div className="text-[10px] text-red-500 font-black uppercase tracking-widest">{u.months} {t('admin.dash.overdue_months')}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleLiberateUser(u.id)}
                                                className="px-2 py-1 bg-blue-900/30 text-blue-400 text-[10px] font-bold rounded hover:bg-blue-900/50 transition-colors"
                                                title={t('admin.dash.overdue_liberate')}
                                            >
                                                {t('admin.dash.overdue_liberate')}
                                            </button>
                                            <button
                                                onClick={() => handleBlockUser(u.id)}
                                                className="px-2 py-1 bg-red-900/30 text-red-400 text-[10px] font-bold rounded hover:bg-red-900/50 transition-colors"
                                            >
                                                {t('admin.dash.overdue_block_btn')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button fullWidth onClick={() => setOverdueSummary([])} className="bg-orange-600 hover:bg-orange-500 font-black h-14 text-lg">
                                {t('admin.dash.overdue_understood')}
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
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">{t('admin.dash.belt_current')}</p>
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
                                <GraduationCap size={16} /> {t('admin.dash.next_eval')}
                            </p>
                            <div className="flex flex-col items-center gap-2">
                                {remainingValue > 0 ? (
                                    <>
                                        <p className="text-sm text-stone-400">{t('admin.dash.remaining_value')}</p>
                                        <p className="text-2xl font-bold text-white">R$ {remainingValue.toFixed(2).replace('.', ',')}</p>
                                        <div className="flex gap-2 text-xs">
                                            <span className="text-green-400">{paidInstallments.length} {t('admin.dash.paid_installments')}</span>
                                            <span className="text-stone-600">|</span>
                                            <span className="text-orange-400">{pendingInstallments.length} {t('admin.dash.pending_installments')}</span>
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
                                            <span className="text-xs text-green-400">✓ {t('admin.dash.paid_off')}</span>
                                        )}
                                    </>
                                )}
                                {user.nextEvaluationDate && (
                                    <span className="text-sm text-stone-400 bg-stone-900/50 px-3 py-1 rounded-full mt-2">
                                        {t('admin.dash.date')} <span className="text-green-400">{user.nextEvaluationDate.split('-').reverse().join('/')}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-stone-700 pb-2">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${activeTab === 'overview' ? 'bg-orange-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    {t('admin.tabs.overview')}
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'events' ? 'bg-yellow-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <CalendarPlus size={14} /> {t('admin.tab.events')}
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${activeTab === 'users' ? 'bg-pink-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    {t('admin.tab.users')}
                </button>
                <button
                    onClick={() => setActiveTab('student_details')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'student_details' ? 'bg-blue-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <Users size={14} /> {t('admin.tab.student_details')}
                </button>
                <button
                    onClick={() => setActiveTab('finance')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'finance' ? 'bg-green-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    {t('admin.tab.finance')}
                    {(pendingUniformOrders.length > 0 || pendingEventRegistrations.length > 0) && (
                        <span className="bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                            {pendingUniformOrders.length + pendingEventRegistrations.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pedagogy')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${activeTab === 'pedagogy' ? 'bg-blue-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    {t('admin.tab.pedagogy')}
                </button>
                <button
                    onClick={() => setActiveTab('grades')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'grades' ? 'bg-green-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <Award size={14} /> {t('admin.tab.grades')}
                </button>
                <button
                    onClick={() => setActiveTab('my_classes')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'my_classes' ? 'bg-purple-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <BookOpen size={14} /> {t('admin.tab.my_classes')}
                </button>
                <button
                    onClick={() => setActiveTab('class_monitoring')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'class_monitoring' ? 'bg-teal-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <Activity size={14} /> Monitorar Aulas
                </button>
                <button
                    onClick={() => setActiveTab('music')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'music' ? 'bg-yellow-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <Music size={14} /> {t('admin.tab.music')}
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'reports' ? 'bg-orange-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <FileText size={14} /> {t('admin.tab.reports')}
                </button>
                <button
                    onClick={() => setActiveTab('banner')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'banner' ? 'bg-indigo-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    <UploadCloud size={14} /> {t('admin.tab.banner')}
                </button>
                <button
                    onClick={() => setActiveTab('ffpoints')}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm ${activeTab === 'ffpoints' ? 'bg-yellow-500 text-white' : 'text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700'}`}
                >
                    {t('admin.tab.ffpoints')}
                </button>
                <a href="https://www.instagram.com/filhosdofogo2005" target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <button className="px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm text-white bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 hover:opacity-90">
                        <Instagram size={14} /> Instagram
                    </button>
                </a>
                <a href="https://discord.gg/AY2kk9Ubk" target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <button className="px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1 text-sm text-white hover:opacity-90" style={{ backgroundColor: '#5865F2' }}>
                        <DiscordIcon size={14} /> Discord
                    </button>
                </a>
            </div>

            {/* --- TAB: OVERVIEW --- */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">


                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <button
                            onClick={() => setActiveTab('users')}
                            className="bg-stone-800 p-3 sm:p-6 rounded-xl border border-stone-700 text-left hover:border-blue-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-blue-500`}>
                                    <Users size={20} />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-white">{totalStudentsCount}</h3>
                            <p className="text-stone-400 text-xs sm:text-sm">{t('admin.stat.students')}</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className="bg-stone-800 p-3 sm:p-6 rounded-xl border border-stone-700 text-left hover:border-green-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-green-500`}>
                                    <DollarSign size={20} />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-white truncate">R$ {totalRevenue.toFixed(2).replace('.', ',')}</h3>
                            <p className="text-stone-400 text-xs sm:text-sm">{t('admin.stat.revenue')}</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('finance')}
                            className="bg-stone-800 p-3 sm:p-6 rounded-xl border border-stone-700 text-left hover:border-red-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-red-500`}>
                                    <Wallet size={20} />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-white truncate">R$ {pendingRevenue.toFixed(2).replace('.', ',')}</h3>
                            <p className="text-stone-400 text-xs sm:text-sm">{t('admin.stat.pending')}</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('events')}
                            className="bg-stone-800 p-3 sm:p-6 rounded-xl border border-stone-700 text-left hover:border-orange-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-orange-500`}>
                                    <CalendarPlus size={20} />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-white">{events.length}</h3>
                            <p className="text-stone-400 text-xs sm:text-sm">{t('admin.stat.events')}</p>
                        </button>
                        <button
                            onClick={() => setActiveTab('music')}
                            className="bg-stone-800 p-3 sm:p-6 rounded-xl border border-stone-700 text-left hover:border-yellow-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-2 sm:mb-4">
                                <div className={`p-2 rounded-lg bg-stone-900 text-yellow-500`}>
                                    <Music size={20} />
                                </div>
                            </div>
                            <h3 className="text-lg sm:text-2xl font-bold text-white">{musicList.length}</h3>
                            <p className="text-stone-400 text-xs sm:text-sm">{t('admin.stat.music')}</p>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <ActivityFeed
                            notifications={notifications}
                            allUsersProfiles={allUsersProfiles}
                            onClearNotifications={onClearNotifications}
                        />
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
                                {t('admin.events.manage_events')}
                            </h3>
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setEventFormData({ title: '', date: '', event_time: '', description: '', price: '' });
                                    setShowEventForm(!showEventForm);
                                }}
                                className="text-sm bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                            >
                                {showEventForm && !editingId ? <X size={16} /> : <Plus size={16} />}
                                {showEventForm && !editingId ? t('common.close') : t('admin.events.new')}
                            </button>
                        </div>

                        {showEventForm && (
                            <form onSubmit={handleSaveEvent} className="bg-stone-900 p-4 rounded-lg mb-6 border border-stone-700 border-l-4 border-l-orange-500">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-white font-bold">{editingId ? t('admin.events.edit_title') : t('admin.events.create_title')}</h4>
                                    {editingId && (
                                        <button type="button" onClick={handleCancelEdit} className="text-xs text-stone-400 hover:text-white">{t('admin.events.cancel_edit')}</button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">{t('admin.events.field_title')}</label>
                                        <input
                                            type="text"
                                            value={eventFormData.title}
                                            onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">{t('admin.events.field_date')}</label>
                                        <input
                                            type="date"
                                            value={eventFormData.date}
                                            onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">{t('admin.events.field_time')}</label>
                                        <input
                                            type="time"
                                            value={eventFormData.event_time}
                                            onChange={e => setEventFormData({ ...eventFormData, event_time: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-400 block mb-1">{t('admin.events.field_price')}</label>
                                        <input
                                            type="number"
                                            value={eventFormData.price}
                                            onChange={e => setEventFormData({ ...eventFormData, price: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                                            placeholder={t('admin.events.field_price_ph')}
                                            min="0"
                                            step="0.01"
                                        />
                                        <p className="text-[10px] text-stone-500 mt-1">{t('admin.events.field_price_hint')}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-stone-400 block mb-1">{t('admin.events.field_desc')}</label>
                                        <textarea
                                            value={eventFormData.description}
                                            onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={handleCancelEdit} className="text-stone-400 px-4 py-2 hover:text-white">{t('common.cancel')}</button>
                                    <Button type="submit">{editingId ? t('admin.events.update') : t('admin.events.save')}</Button>
                                </div>
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {events.filter(e => !e.status || e.status === 'active').map(event => {
                                const timeMatch = (event.description || '').match(/^\[Horário:\s*(.*?)\]\n?/);
                                const displayTime = event.event_time || (timeMatch ? timeMatch[1] : null);
                                const displayDesc = timeMatch ? event.description.replace(/^\[Horário:\s*(.*?)\]\n?/, '') : event.description;

                                return (
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
                                        <p className="text-orange-400 text-sm mb-1">
                                            {event.date.split('-').reverse().join('/')} {displayTime && <span className="text-stone-400 ml-2">{t('admin.events.at')} {displayTime}</span>}
                                        </p>
                                        {event.price ? (
                                            <span className="text-green-400 text-xs font-bold bg-green-900/30 px-2 py-0.5 rounded border border-green-900/50 mb-2 inline-block">
                                                R$ {event.price.toFixed(2).replace('.', ',')}
                                            </span>
                                        ) : (
                                            <span className="text-stone-500 text-xs font-bold bg-stone-800 px-2 py-0.5 rounded mb-2 inline-block">
                                                {t('admin.events.free')}
                                            </span>
                                        )}
                                        <p className="text-stone-400 text-xs mt-2">{displayDesc}</p>

                                        {/* Participants List */}
                                        <div className="mt-4 border-t border-stone-700 pt-4">
                                            <button
                                                onClick={() => setExpandedEventParticipants(expandedEventParticipants === event.id ? null : event.id)}
                                                className="flex items-center gap-2 text-stone-400 hover:text-white text-sm font-medium"
                                            >
                                                <Users size={16} />
                                                {t('admin.events.participants')} ({eventRegistrations.filter(reg => reg.event_id === event.id).length})
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
                                                                    {reg.status === 'paid' ? t('admin.status.paid') : reg.status === 'pending' ? t('admin.status.pending') : t('admin.status.cancelled')}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-stone-500 text-xs italic">{t('admin.events.no_participants')}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {events.length === 0 && (
                                <div className="text-stone-500 text-sm col-span-full text-center py-4">{t('admin.events.active_none')}</div>
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
                                        {t('admin.finance.belt_config_title')}
                                    </h3>
                                    <button onClick={() => setShowBeltConfig(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
                                </div>

                                <div className="overflow-y-auto flex-1 pr-2 space-y-2">
                                    <p className="text-sm text-stone-400 mb-4 bg-stone-900/50 p-3 rounded">
                                        {t('admin.finance.belt_config_desc')}
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
                                        <Save size={18} /> {t('admin.finance.belt_save')}
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
                                        {t('admin.finance.edit_payment')}
                                    </h3>
                                    <button onClick={() => setShowEditPaymentModal(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
                                </div>
                                <div className="mb-4 bg-stone-900/50 p-4 rounded-lg border border-stone-700/50">
                                    <p className="text-xs text-stone-500 uppercase font-bold mb-1">{t('admin.finance.student')}</p>
                                    <p className="text-white font-bold">{editingPayment.student_name}</p>
                                </div>
                                <form onSubmit={handleUpdatePayment} className="space-y-4">
                                    <div>
                                        <label htmlFor="editMonth" className="block text-sm text-stone-400 mb-1">{t('admin.finance.ref_month')}</label>
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
                                        <label htmlFor="editDueDate" className="block text-sm text-stone-400 mb-1">{t('admin.finance.due_date')}</label>
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
                                        <label htmlFor="editAmount" className="block text-sm text-stone-400 mb-1">{t('admin.finance.amount')}</label>
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
                                        <label htmlFor="editStatus" className="block text-sm text-stone-400 mb-1">{t('admin.finance.payment_status')}</label>
                                        <select
                                            id="editStatus"
                                            value={editPaymentForm.status}
                                            onChange={(e) => setEditPaymentForm({ ...editPaymentForm, status: e.target.value as any })}
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            required
                                        >
                                            <option value="pending">{t('status.pending')}</option>
                                            <option value="paid">{t('status.paid')}</option>
                                            <option value="overdue">{t('status.overdue')}</option>
                                        </select>
                                    </div>
                                    <div className="pt-4 flex justify-end gap-2 border-t border-stone-700 mt-4">
                                        <button type="button" onClick={() => setShowEditPaymentModal(false)} className="px-4 py-2 text-stone-400 hover:text-white">{t('common.cancel')}</button>
                                        <Button type="submit">
                                            <Save size={18} /> {t('admin.finance.belt_save')}
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
                            {t('admin.finance.uniform_orders')}
                            {pendingUniformOrders.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingUniformOrders.length} {t('admin.finance.pending_orders')}</span>}
                        </h2>

                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                        <th className="p-4">{t('admin.finance.table.user')}</th>
                                        <th className="p-4">{t('admin.finance.table.date')}</th>
                                        <th className="p-4">{t('admin.finance.table.item')}</th>
                                        <th className="p-4">{t('admin.finance.table.details')}</th>
                                        <th className="p-4">{t('admin.finance.table.value')}</th>
                                        <th className="p-4">{t('admin.finance.table.status')}</th>
                                        <th className="p-4 text-right">{t('admin.finance.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700 text-sm">
                                    {uniformOrders.filter(o => o.status !== 'pending').map(order => (
                                        <tr key={order.id} className={`hover:bg-stone-700/30 ${order.status === 'paid' ? 'bg-orange-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold text-white">{order.user_name}</div>
                                                <div className="text-xs text-stone-500 capitalize">{order.user_role}</div>
                                            </td>
                                            <td className="p-4 text-stone-300">{order.date}</td>
                                            <td className="p-4 text-white font-medium">{order.item}</td>
                                            <td className="p-4 text-stone-400 text-xs">
                                                {order.shirt_size && <div>{t('admin.finance.shirt')}: {order.shirt_size}</div>}
                                                {order.pants_size && <div>{t('admin.finance.pants')}: {order.pants_size}</div>}
                                            </td>
                                            <td className="p-4 text-green-400 font-bold">R$ {order.total.toFixed(2).replace('.', ',')}</td>
                                            <td className="p-4">
                                                {order.status === 'paid' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs border border-yellow-900/50">{t('admin.finance.status.paid')}</span>}
                                                {order.status === 'producing' && <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-xs border border-blue-900/50">{t('admin.finance.status.producing')}</span>}
                                                {order.status === 'delivered' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs border border-green-900/50">{t('admin.finance.status.delivered')}</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {order.status === 'paid' && (
                                                        <Button
                                                            className="text-xs px-2 py-1 h-auto"
                                                            variant="secondary"
                                                            onClick={() => onUpdateOrderStatus(order.id, 'producing')}
                                                            title={t('admin.finance.btn.produce')}
                                                        >
                                                            <Shirt size={14} className="mr-1" /> {t('admin.finance.btn.produce')}
                                                        </Button>
                                                    )}
                                                    {order.status === 'producing' && (
                                                        <Button
                                                            className="text-xs px-2 py-1 h-auto"
                                                            onClick={() => onUpdateOrderStatus(order.id, 'delivered')}
                                                            title={t('admin.finance.btn.deliver')}
                                                        >
                                                            <Package size={14} className="mr-1" /> {t('admin.finance.btn.deliver')}
                                                        </Button>
                                                    )}
                                                    {order.status === 'delivered' && (
                                                        <span className="text-stone-600 text-xs flex items-center gap-1"><CheckCircle size={12} /> {t('admin.finance.status.finished')}</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteUniformOrder(order.id)}
                                                        className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                        title={t('admin.finance.delete_order_title')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {uniformOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-stone-500 italic">{t('admin.finance.no_uniform_orders')}</td>
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
                            {t('admin.finance.event_regs')}
                            {pendingEventRegistrations.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingEventRegistrations.length} {t('admin.finance.pending_orders')}</span>}
                        </h2>

                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead>
                                    <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                        <th className="p-4">{t('admin.finance.table.participant')}</th>
                                        <th className="p-4">{t('admin.finance.table.event')}</th>
                                        <th className="p-4">{t('admin.finance.table.paid_amount')}</th>
                                        <th className="p-4">{t('admin.finance.table.status')}</th>
                                        <th className="p-4">{t('admin.finance.table.proof')}</th>
                                        <th className="p-4 text-right">{t('admin.finance.table.action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700 text-sm">
                                    {eventRegistrations.map(reg => (
                                        <tr key={reg.id} className={`hover:bg-stone-700/30 ${reg.status === 'pending' ? 'bg-purple-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold text-white">{reg.user_name}</div>
                                                <div className="text-xs text-stone-500">{t('admin.finance.reg_at')}: {new Date(reg.registered_at).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'es-AR')}</div>
                                            </td>
                                            <td className="p-4 text-white font-medium">{reg.event_title}</td>
                                            <td className="p-4 text-green-400 font-bold">R$ {reg.amount_paid.toFixed(2).replace('.', ',')}</td>
                                            <td className="p-4">
                                                {reg.status === 'pending' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs border border-yellow-900/50">{t('admin.finance.status.pending_pay')}</span>}
                                                {reg.status === 'paid' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-xs border border-green-900/50">{t('status.paid')}</span>}
                                                {reg.status === 'cancelled' && <span className="px-2 py-1 rounded bg-red-900/30 text-red-400 text-xs border border-red-900/50">{t('status.cancelled')}</span>}
                                            </td>
                                            <td className="p-4"> {/* NEW: Comprovante Column */}
                                                {reg.proof_url ? (
                                                    <button
                                                        onClick={() => handleViewEventRegistrationProof(reg.proof_url!, reg.event_title + ' ' + t('admin.finance.table.proof'))}
                                                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                                    >
                                                        <Eye size={14} /> {t('admin.finance.view_proof')}
                                                    </button>
                                                ) : (
                                                    <span className="text-stone-500 text-xs italic">{t('admin.finance.no_proof')}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {reg.status === 'pending' && (
                                                        <Button
                                                            className="text-xs px-2 py-1 h-auto"
                                                            variant="secondary"
                                                            onClick={() => handleUpdateEventRegistration(reg.id, 'paid')}
                                                            title={t('admin.finance.btn.confirm_pay')}
                                                        >
                                                            <DollarSign size={14} className="mr-1" /> {t('admin.finance.btn.confirm_pay')}
                                                        </Button>
                                                    )}
                                                    {reg.status === 'paid' && (
                                                        <span className="text-stone-600 text-xs flex items-center gap-1"><CheckCircle size={12} /> {t('admin.finance.status.finished')}</span>
                                                    )}
                                                    {reg.status !== 'cancelled' && (
                                                        <button
                                                            onClick={() => handleUpdateEventRegistration(reg.id, 'cancelled')}
                                                            className="p-2 bg-stone-900 hover:bg-stone-700 text-stone-400 hover:text-orange-500 rounded transition-colors"
                                                            title={t('admin.finance.btn.cancel_reg_title')}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteEventRegistration(reg.id)}
                                                        className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                        title={t('admin.finance.delete_reg_title')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {eventRegistrations.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-stone-500 italic">{t('admin.finance.no_event_regs')}</td> {/* Updated colspan */}
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
                                        <h2 className="text-2xl font-bold text-white tracking-tight">{t('admin.finance.control_title')}</h2>
                                        <p className="text-stone-400 text-sm">{t('admin.finance.suggested_due')}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                    <div className="bg-stone-900/50 px-4 py-2 rounded-xl border border-stone-700 flex flex-col justify-center min-w-[150px]">
                                        <span className="text-stone-500 text-[10px] uppercase font-black tracking-wider">{t('admin.finance.to_receive')}</span>
                                        <p className="text-lg font-black text-red-500 leading-none">R$ {pendingMonthlyPayments.toFixed(2).replace('.', language === 'pt' ? ',' : '.')}</p>
                                    </div>

                                    <div className="flex items-center gap-2 ml-auto lg:ml-0">
                                        <button
                                            onClick={() => setShowBeltConfig(true)}
                                            className="p-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg border border-stone-600 transition-all shadow-md"
                                            title={t('admin.finance.belt_config_title')}
                                        >
                                            <Settings size={20} />
                                        </button>
                                        <Button
                                            onClick={handleGenerateMonthlyPayments}
                                            variant="secondary"
                                            className="border border-green-900/50 text-green-400 hover:bg-green-900/20 px-4 py-2 text-sm h-11"
                                        >
                                            <CalendarCheck size={16} /> <span className="hidden sm:inline">{t('admin.finance.btn.gen_month')}</span>
                                        </Button>
                                        <Button
                                            onClick={() => setShowAddPaymentModal(true)}
                                            className="px-4 py-2 text-sm font-bold h-11 shadow-lg shadow-orange-900/20"
                                        >
                                            <Plus size={18} /> {t('admin.finance.btn.add_payment')}
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
                                        {t(`admin.finance.filter.${status}` as any)}
                                    </button>
                                ))}
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                            <th className="p-4">{t('admin.finance.student')}</th>
                                            <th className="p-4">{t('admin.finance.table.month_ref')}</th>
                                            <th className="p-4">{t('admin.finance.table.due')}</th>
                                            <th className="p-4">{t('admin.finance.table.value')}</th>
                                            <th className="p-4">{t('admin.finance.table.status')}</th>
                                            <th className="p-4">{t('admin.finance.table.proof_col')}</th>
                                            <th className="p-4 text-right">{t('admin.finance.table.action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-700 text-sm">
                                        {filteredMonthlyPayments.map((payment) => (
                                            <tr key={payment.id} className="hover:bg-stone-700/30">
                                                <td className="p-4 font-medium text-white">{payment.student_name}</td>
                                                <td className="p-4 text-stone-300">{payment.month}</td>
                                                <td className="p-4 text-stone-300">{payment.due_date.split('-').reverse().join('/')}</td>
                                                <td className="p-4 text-white font-mono">R$ {payment.amount.toFixed(2).replace('.', language === 'pt' ? ',' : '.')}</td>
                                                <td className="p-4">
                                                    {payment.status === 'paid' && (
                                                        <span className="inline-flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                                                            <CheckCircle size={12} /> {t('admin.finance.paid_on')} {payment.paid_at}
                                                        </span>
                                                    )}
                                                    {payment.status === 'pending' && (
                                                        <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold border border-yellow-900/50">
                                                            <Clock size={12} /> {t('status.pending')}
                                                        </span>
                                                    )}
                                                    {payment.status === 'overdue' && (
                                                        <span className="inline-flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded text-xs font-bold border border-red-900/50">
                                                            <AlertCircle size={12} /> {t('status.overdue')}
                                                        </span>
                                                    )}
                                                    {/* Upload Proof Button */}
                                                    <div className="mt-2">
                                                        <label className="cursor-pointer inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
                                                            <UploadCloud size={12} />
                                                            {payment.proof_url ? t('admin.finance.change_proof') : t('admin.finance.upload_proof')}
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
                                                                            alert(t('admin.finance.proof_uploaded'));
                                                                        } catch (err: any) {
                                                                            alert(t('admin.finance.upload_error') + ': ' + err.message);
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
                                                            onClick={() => handleViewPaymentProof(payment.proof_url!, payment.proof_name || t('admin.finance.table.proof_col'))}
                                                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                                        >
                                                            <FileUp size={14} /> {t('admin.finance.view_proof')}
                                                        </button>
                                                    ) : (
                                                        <span className="text-stone-500 text-xs italic">{t('admin.finance.no_proof_yet')}</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {payment.status !== 'paid' && (
                                                            <button
                                                                onClick={() => handleMarkAsPaid(payment.id)}
                                                                className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition-colors"
                                                            >
                                                                {t('admin.finance.btn.settle')}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleOpenEditPayment(payment)}
                                                            className="p-1.5 rounded bg-stone-700 text-stone-300 hover:bg-stone-600 transition-colors"
                                                            title={t('admin.finance.edit_payment')}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                            className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                            title={t('admin.finance.delete_payment_title')}
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
                                <h2 className="text-2xl font-bold text-white tracking-tight">{t('admin.finance.eval_payments')}</h2>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                            <th className="p-4">{t('admin.finance.student')}</th>
                                            <th className="p-4">{t('admin.finance.table.id')}</th>
                                            <th className="p-4">{t('admin.finance.table.due')}</th>
                                            <th className="p-4">{t('admin.finance.table.value')}</th>
                                            <th className="p-4">{t('admin.finance.table.status')}</th>
                                            <th className="p-4 text-right">{t('admin.finance.table.action')}</th>
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
                                                                {studentPayments.filter(p => p.status === 'paid').length}/{studentPayments.length} {t('admin.finance.paid_installments')}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-stone-300">{nextPending.due_date.split('-').reverse().join('/')}</td>
                                                        <td className="p-4 text-white font-mono font-bold text-purple-400">R$ {nextPending.amount.toFixed(2).replace('.', language === 'pt' ? ',' : '.')}</td>
                                                        <td className="p-4">
                                                            {nextPending.status === 'paid' && (
                                                                <span className="inline-flex items-center gap-1 text-green-400 bg-green-900/20 px-2 py-1 rounded text-xs font-bold border border-green-900/50">
                                                                    <CheckCircle size={12} /> {t('status.paid')}
                                                                </span>
                                                            )}
                                                            {nextPending.status === 'pending' && (
                                                                <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded text-xs font-bold border border-yellow-900/50">
                                                                    <Clock size={12} /> {t('admin.finance.next_installment')}: {nextPending.month.split('-')[0]}
                                                                </span>
                                                            )}
                                                            {nextPending.status === 'overdue' && (
                                                                <span className="inline-flex items-center gap-1 text-red-400 bg-red-900/20 px-2 py-1 rounded text-xs font-bold border border-red-900/50">
                                                                    <AlertCircle size={12} /> {t('status.overdue')}
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
                                                                        {t('admin.finance.btn.settle')}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeletePayment(nextPending.id)}
                                                                    className="p-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
                                                                    title={t('admin.finance.delete_payment_title')}
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
                                            {editingUser ? t('admin.users.modal.edit') : t('admin.users.modal.new')}
                                        </h3>
                                        <button onClick={() => setShowUserModal(false)} className="text-stone-400 hover:text-white"><X size={24} /></button>
                                    </div>

                                    <form onSubmit={handleSaveUser} className="overflow-y-auto flex-1 pr-2 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.full_name')}</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={userForm.name}
                                                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.nickname')}</label>
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
                                                <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.whatsapp')}</label>
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
                                                <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.role')}</label>
                                                <select
                                                    value={userForm.role}
                                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                                >
                                                    <option value="aluno">{t('admin.users.modal.role_student')}</option>
                                                    <option value="professor">{t('admin.users.modal.role_professor')}</option>
                                                    <option value="admin">{t('admin.users.modal.role_admin')}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.birthdate')}</label>
                                                <input
                                                    type="date"
                                                    value={userForm.birthDate}
                                                    onChange={(e) => setUserForm({ ...userForm, birthDate: e.target.value })}
                                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.belt')}</label>
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
                                                <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.prof_resp')}</label>
                                                <select
                                                    id="professor_name"
                                                    name="professor_name"
                                                    value={userForm.professorName}
                                                    onChange={(e) => setUserForm({ ...userForm, professorName: e.target.value })}
                                                    className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                                >
                                                    <option value="">{t('admin.users.modal.select_prof')}</option>
                                                    {managedUsers.filter(u => (u.role === 'professor' || u.role === 'admin') && u.id !== editingUser?.id).map(prof => (
                                                        <option key={prof.id} value={prof.nickname || prof.first_name || prof.name}>
                                                            {prof.nickname ? `${prof.nickname} (${prof.first_name || prof.name})` : prof.first_name || prof.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm text-stone-400 mb-1">{t('admin.users.modal.status')}</label>
                                            <select
                                                value={userForm.status}
                                                onChange={(e) => setUserForm({ ...userForm, status: e.target.value as 'active' | 'blocked' })}
                                                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                                            >
                                                <option value="active">{t('admin.users.modal.status_active')}</option>
                                                <option value="blocked">{t('admin.users.modal.status_blocked')}</option>
                                            </select>
                                        </div>

                                        {!editingUser && (
                                            <div className="bg-stone-900 p-3 rounded border border-stone-700 text-sm text-stone-400 flex items-center gap-2">
                                                <Lock size={16} />
                                                {t('admin.users.modal.pw_hint')} <span className="text-white font-mono font-bold">123456</span>
                                            </div>
                                        )}

                                        <div className="pt-4 flex justify-end gap-2 border-t border-stone-700 mt-4">
                                            <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-stone-400 hover:text-white">{t('common.cancel')}</button>
                                            <Button type="submit">
                                                <Save size={18} /> {editingUser ? t('admin.users.btn.update') : t('admin.users.btn.create')}
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
                                        {t('admin.users.manage_title')}
                                    </h2>
                                    <p className="text-stone-400 text-sm">{t('admin.users.manage_subtitle')}</p>
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-3 top-2.5 text-stone-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder={t('admin.users.search_placeholder')}
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

                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse min-w-[850px]">
                                    <thead>
                                        <tr className="bg-stone-900 text-stone-500 text-xs uppercase border-b border-stone-700">
                                            <th className="p-4 rounded-tl-lg">{t('admin.users.table.user')}</th>
                                            <th className="p-4">{t('admin.users.table.role')}</th>
                                            <th className="p-4">{t('admin.users.table.contact')}</th>
                                            <th className="p-4">{t('admin.users.table.belt')}</th>
                                            <th className="p-4">{t('admin.users.table.next_eval')}</th>
                                            <th className="p-4">{t('admin.users.table.status')}</th>
                                            <th className="p-4 rounded-tr-lg text-right">{t('admin.users.table.actions')}</th>
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
                                                                    <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">{t('admin.users.status.blocked_badge')}</span>
                                                                )}
                                                                {u.status === 'archived' && (
                                                                    <span className="bg-stone-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">{t('admin.users.status.archived_badge')}</span>
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
                                                                <span className="text-[10px] text-stone-400 w-8">{t('admin.users.eval.value')}</span>
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
                                                                <span className="text-[10px] text-stone-400 w-8">{t('admin.users.eval.date')}</span>
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
                                                                    title={t('common.save')}
                                                                >
                                                                    <Save size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => { setEditingGradCostId(null); setEditingGradCostValue(''); setEditingEvaluationDate(''); }}
                                                                    className="text-stone-500 hover:text-red-500 p-1 rounded bg-stone-800 border border-stone-700 hover:bg-stone-700"
                                                                    title={t('common.cancel')}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1 group">
                                                            <p className="font-bold text-white flex items-center gap-1">
                                                                {language === 'pt' ? 'R$' : '$'} {(u.graduationCost ?? 0).toFixed(2).replace('.', language === 'pt' ? ',' : '.')}
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
                                                                                    {paidInstallments}/{maxInstallmentsStr} {t('admin.users.eval.paid_count')}
                                                                                </span>
                                                                                {u.nextEvaluationDate && <span className="text-[9px] text-stone-500">{language === 'pt' ? formatDatePTBR(u.nextEvaluationDate) : formatDateESAR(u.nextEvaluationDate)}</span>}
                                                                            </div>
                                                                            <div className="w-full bg-stone-700 h-1.5 rounded-full mt-1 mb-1">
                                                                                <div
                                                                                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                                                    style={{ width: `${(paidInstallments / Number(maxInstallmentsStr)) * 100}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            {remainingDebt > 0 ? (
                                                                                <span className="text-[10px] text-stone-300 font-mono">
                                                                                    {t('admin.users.eval.remaining')} {language === 'pt' ? 'R$' : '$'} {remainingDebt.toFixed(2).replace('.', language === 'pt' ? ',' : '.')}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                                                                                    <CheckCircle size={10} /> {t('admin.users.eval.settled')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                                            {u.nextEvaluationDate ? (
                                                                <p className="text-[10px] text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded border border-green-900/30">
                                                                    {language === 'pt' ? formatDatePTBR(u.nextEvaluationDate) : formatDateESAR(u.nextEvaluationDate)}
                                                                </p>
                                                            ) : (
                                                                <p className="text-[10px] text-stone-500 italic">{t('admin.users.eval.no_date')}</p>
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
                                                                <Plus size={10} /> {t('admin.users.eval.btn.bill_total')}
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
                                                                <DollarSign size={10} /> {t('admin.users.eval.btn.installments')}
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
                                                                <PlusCircle size={10} /> {t('admin.users.eval.btn.add_monthly')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => onToggleArchiveUser(u.id, u.status)}
                                                            className={`p-2 bg-stone-900 rounded transition-colors ${u.status === 'archived' ? 'text-blue-500 hover:bg-stone-700' : 'text-stone-400 hover:text-blue-500 hover:bg-stone-700'}`}
                                                            title={u.status === 'archived' ? t('admin.users.action.unarchive') : t('admin.users.action.archive')}
                                                        >
                                                            <Archive size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => onToggleBlockUser(u.id, u.status)}
                                                            className={`p-2 bg-stone-900 rounded transition-colors ${u.status === 'blocked' ? 'text-red-500 hover:bg-stone-700' : 'text-stone-400 hover:text-green-500 hover:bg-stone-700'}`}
                                                            title={u.status === 'blocked' ? t('admin.users.action.unblock') : t('admin.users.action.block')}
                                                        >
                                                            {u.status === 'blocked' ? <Lock size={16} /> : <Shield size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenUserModal(u)}
                                                            className="p-2 bg-stone-900 hover:bg-stone-700 text-stone-400 hover:text-blue-500 rounded transition-colors"
                                                            title={t('common.edit')}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="p-2 bg-stone-900 hover:bg-stone-700 text-stone-400 hover:text-red-500 rounded transition-colors"
                                                            title={t('common.delete')}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredManagedUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-stone-500 italic">
                                                    {t('admin.users.no_users')}
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

            {/* --- TAB: BANNER --- */}
            {
                activeTab === 'banner' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* DEBUG: REMOVE LATER */}
                        <div className="bg-indigo-900/30 p-2 text-indigo-400 text-xs font-bold rounded text-center border border-indigo-500/30">
                            {t('admin.banner.manage_title')}
                        </div>
                        <div className="bg-stone-800 p-6 rounded-xl border border-stone-700">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                                <UploadCloud className="text-indigo-500" />
                                {t('admin.banner.manage_title')}
                            </h2>

                            <form onSubmit={handleSaveBanner} className="bg-stone-900 p-6 rounded-lg border border-stone-700 mb-8">
                                <h3 className="text-lg font-bold text-white mb-4">{t('admin.banner.new_banner')}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">{t('admin.banner.field.title')}</label>
                                        <input
                                            type="text"
                                            value={bannerFormData.title}
                                            onChange={e => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                                            placeholder={t('admin.banner.field.title_ph')}
                                            className="w-full bg-stone-800 border border-stone-600 rounded px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">{t('admin.banner.field.image')}</label>
                                        <input
                                            type="file"
                                            ref={bannerFileInputRef}
                                            onChange={e => setBannerFormData({ ...bannerFormData, file: e.target.files?.[0] || null })}
                                            accept="image/*"
                                            className="w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                                            required
                                        />
                                        <p className="text-[10px] text-stone-500 mt-1">{t('admin.banner.field.image_hint')}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button type="submit" disabled={uploadingBanner || !bannerFormData.file}>
                                        {uploadingBanner ? t('admin.banner.btn.uploading') : t('admin.banner.btn.upload')}
                                    </Button>
                                </div>
                            </form>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {banners.map(banner => (
                                    <div key={banner.id} className="bg-stone-900 rounded-xl overflow-hidden border border-stone-700 relative group">
                                        <div className="aspect-video w-full bg-stone-800 relative">
                                            <img
                                                src={banner.image_url}
                                                alt={banner.title || 'Banner'}
                                                className={`w-full h-full object-cover ${!banner.active && 'opacity-30 grayscale'}`}
                                            />
                                            {!banner.active && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10 uppercase tracking-widest">{t('admin.banner.status.inactive')}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 flex justify-between items-center bg-stone-900">
                                            <div>
                                                <h4 className="text-white font-bold truncate max-w-[200px]">{banner.title || t('admin.banner.no_title')}</h4>
                                                <p className="text-[10px] text-stone-500">{banner.created_at ? (language === 'pt' ? formatDatePTBR(banner.created_at) : formatDateESAR(banner.created_at)) : '-'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleToggleBanner(banner.id, banner.active)}
                                                    className={`p-2 rounded-lg transition-colors ${banner.active ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}
                                                    title={banner.active ? 'Desativar' : 'Ativar'}
                                                >
                                                    {banner.active ? <CheckCircle size={18} /> : <X size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBanner(banner.id)}
                                                    className="p-2 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {banners.length === 0 && (
                                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-stone-600 border-2 border-dashed border-stone-800 rounded-xl">
                                        <UploadCloud size={48} className="mb-2 opacity-20" />
                                        <p className="italic">Nenhum banner cadastrado ainda.</p>
                                    </div>
                                )}
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
                                        {t('admin.users.manage_title')}
                                    </h2>
                                    <p className="text-stone-400 text-sm">{t('admin.users.manage_subtitle')}</p>
                                </div>
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-3 top-2.5 text-stone-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder={t('admin.users.search_placeholder')}
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
                                                        <p className="text-xs text-stone-400">{student.belt || t('landing.essence')}</p>
                                                    </div>
                                                </div>
                                                {expandedStudent === student.id ? <ChevronUp className="text-stone-400" /> : <ChevronDown className="text-stone-400" />}
                                            </div>

                                            {expandedStudent === student.id && (
                                                <div className="border-t border-stone-700 bg-stone-900/50 p-4 animate-fade-in-down">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                        <div>
                                                            <p className="text-stone-400 text-xs uppercase font-bold mb-2">{t('common.details')}</p>
                                                            <p className="text-white text-sm mb-1"><span className="text-stone-500">{t('common.name')}:</span> {student.first_name} {student.last_name}</p>
                                                            <p className="text-white text-sm mb-1"><span className="text-stone-500">{t('common.email')}:</span> {student.email}</p>
                                                            {student.phone && <p className="text-white text-sm mb-1"><span className="text-stone-500">{t('common.phone')}:</span> {student.phone}</p>}
                                                            {student.birthDate && <p className="text-white text-sm mb-1"><span className="text-stone-500">{t('common.date')}:</span> {language === 'pt' ? formatDatePTBR(student.birthDate) : formatDateESAR(student.birthDate)}</p>}
                                                            {student.professorName && <p className="text-white text-sm mb-1"><span className="text-stone-500">{t('common.role')}:</span> {student.professorName}</p>}
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
                                                                            <Eye size={14} /> {t('common.view')}
                                                                        </Button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-stone-500 text-sm italic">{t('reports.no_reports')}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Home Trainings */}
                                                    <div className="mb-6">
                                                        <h4 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
                                                            <Video size={16} /> {t('admin.users.home_trainings')}
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {homeTrainings.filter(training => training.user_id === student.id).length > 0 ? (
                                                                homeTrainings.filter(training => training.user_id === student.id).map(training => (
                                                                    <div key={training.id} className="bg-stone-800 p-3 rounded border border-stone-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                                        <div className="flex flex-col min-w-0">
                                                                            <p className="text-white font-medium truncate">{training.video_name}</p>
                                                                            <p className="text-xs text-stone-500">{t('common.sent_at')}: {training.date} • {t('common.expires_at')}: {new Date(training.expires_at).toLocaleDateString('pt-BR')}</p>
                                                                        </div>
                                                                        <Button
                                                                            variant="secondary"
                                                                            className="text-xs h-auto px-4 py-2 w-full sm:w-auto flex items-center justify-center gap-2"
                                                                            onClick={() => handleViewHomeTrainingVideo(training.video_url)}
                                                                        >
                                                                            <Video size={14} /> {t('common.view')}
                                                                        </Button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-stone-500 text-sm italic">{t('training.no_videos')}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Assignments - Filtered by professor */}
                                                    <div>
                                                        <h4 className="text-blue-400 font-bold text-sm mb-3 flex items-center gap-2">
                                                            <BookOpen size={16} /> {t('admin.users.assignments')}
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {(() => {
                                                                const profIdentity = allUsersProfiles.find(p =>
                                                                    (p.nickname || p.name) === student.professorName
                                                                );

                                                                const studentSpecificAssignments = assignments.filter(assign => {
                                                                    const belongsToStudent = assign.student_id === student.id;
                                                                    return belongsToStudent || (assign.student_id === null);
                                                                });

                                                                return studentSpecificAssignments.length > 0 ? (
                                                                    studentSpecificAssignments.map(assign => (
                                                                        <div key={assign.id} className={`bg-stone-800 p-3 rounded border border-stone-700 ${assign.status === 'completed' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-yellow-500'}`}>
                                                                            <div className="flex justify-between items-start">
                                                                                <p className="text-white font-medium text-sm">{assign.title}</p>
                                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${assign.status === 'completed' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                                                                                    {assign.status === 'completed' ? t('common.done') : '...'}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[10px] text-stone-500 mt-0.5">{t('common.due')}: {assign.due_date}</p>
                                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                                {assign.attachment_url && (
                                                                                    <a href={assign.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] flex items-center gap-1 hover:underline">
                                                                                        <Paperclip size={10} /> {t('common.material')}
                                                                                    </a>
                                                                                )}
                                                                                {assign.submission_url && (
                                                                                    <button
                                                                                        onClick={() => handleViewAssignmentSubmission(assign.submission_url!, assign.submission_name || 'Trabalho')}
                                                                                        className="text-green-400 text-[10px] flex items-center gap-1 hover:underline bg-transparent border-none p-0 cursor-pointer"
                                                                                    >
                                                                                        <CheckCircle size={10} /> {t('common.answer')}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-stone-500 text-sm italic">{t('prof.assign.none')}</p>
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
                                        {t('admin.users.no_users_found')}
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
                                    {t('admin.pedagogy.title')}
                                    <span className="text-sm font-normal text-stone-400 ml-2">{t('admin.pedagogy.subtitle')}</span>
                                </h2>
                                <Button onClick={handleDownloadPedagogicalReport} variant="secondary" className="border border-stone-600">
                                    <FileUp size={18} className="mr-2" /> {t('admin.pedagogy.btn.report')}
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
                                                        <p className="text-xs text-stone-400">{prof.students.length} {t('admin.pedagogy.active_students')}</p>
                                                    </div>
                                                </div>
                                                {expandedProfessor === prof.professorId ? <ChevronUp className="text-stone-400" /> : <ChevronDown className="text-stone-400" />}
                                            </div>

                                            {/* Expanded Details */}
                                            {expandedProfessor === prof.professorId && (
                                                <div className="border-t border-stone-700 bg-stone-900/50 p-4 animate-fade-in-down">

                                                    {/* Students Table */}
                                                    <h4 className="text-stone-400 font-bold text-xs uppercase mb-3">{t('admin.pedagogy.section.performance')}</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b border-stone-700 text-xs text-stone-500">
                                                                    <th className="pb-2">{t('admin.pedagogy.table.student')}</th>
                                                                    <th className="pb-2">{t('admin.pedagogy.table.attendance')}</th>
                                                                    <th className="pb-2">{t('admin.pedagogy.table.theory')}</th>
                                                                    <th className="pb-2">{t('admin.pedagogy.table.movement')}</th>
                                                                    <th className="pb-2">{t('admin.pedagogy.table.musicality')}</th>
                                                                    <th className="pb-2">{t('admin.pedagogy.table.grad_cost')}</th>
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
                                                                                {student.graduationCost !== undefined ? `${language === 'pt' ? 'R$' : '$'} ${student.graduationCost.toFixed(2).replace('.', language === 'pt' ? ',' : '.')}` : '-'}
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

                        <div className="flex flex-wrap gap-2 justify-end bg-stone-800 p-4 rounded-xl border border-stone-700">
                            {profView === 'dashboard' && (
                                <Button onClick={() => setProfView('new_class')} className="bg-purple-700 hover:bg-purple-600 text-white border-purple-600">
                                    <PlusCircle size={18} /> Nova Aula
                                </Button>
                            )}
                            <Button variant="secondary" onClick={() => setProfView('planning')} className="bg-stone-700 hover:bg-stone-600 text-white border-stone-600">
                                <BookOpen size={18} /> Planejamento
                            </Button>
                            <Button variant="secondary" onClick={() => setProfView('financial')} className="bg-stone-700 hover:bg-stone-600 text-white border-stone-600">
                                <Wallet size={18} /> Financeiro
                            </Button>
                            <Button variant="outline" onClick={handleCopyPix} className={`transition-all ${pixCopied ? "border-green-500 text-green-500 bg-green-500/5" : "text-stone-300 border-stone-700"}`} title="PIX Mensalidade">
                                {pixCopied ? <Check size={18} /> : <ArrowLeft size={18} className="rotate-180" />}
                                {pixCopied ? 'Copiado!' : 'Mensalidade'}
                            </Button>
                            <a href="https://www.instagram.com/filhosdofogo2005" target="_blank" rel="noopener noreferrer">
                                <Button className="bg-gradient-to-r from-pink-600 via-purple-600 to-orange-500 border-none text-white">
                                    <Instagram size={18} /> Instagram
                                </Button>
                            </a>
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
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Direcionado para (Categoria)</label>
                                        <select value={newClassData.category} onChange={e => setNewClassData({ ...newClassData, category: e.target.value })} className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white">
                                            <option value="">Todos (geral)</option>
                                            <option value="iniciantes">Iniciantes</option>
                                            <option value="intermediarios">Intermediários</option>
                                            <option value="avancados">Avançados</option>
                                            <option value="infantil">Infantil</option>
                                            <option value="adultos">Adultos</option>
                                            <option value="graduados">Graduados</option>
                                            <option value="instrutores">Instrutores e Professores</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Planejamento de Aula</label>
                                        <textarea
                                            value={newClassData.planning}
                                            onChange={(e) => setNewClassData({ ...newClassData, planning: e.target.value })}
                                            placeholder="Descreva o que será treinado (ex: Aquecimento, Ginga, Jogo de dentro...)"
                                            className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white min-h-[100px]"
                                        />
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
                                                                                <Check size={12} /> {t('assignments.submitted')}
                                                                            </span>
                                                                        ) : (
                                                                            <label className="cursor-pointer">
                                                                                <span className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors inline-block">
                                                                                    {uploadingMusicFile ? t('common.loading') : t('common.send')}
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
                                                        <UserPlus size={16} /> {t('prof.dash.assign_title')}
                                                    </Button>
                                                </div>
                                            ))}
                                            {profModeAssignments.filter(a => a.status === 'pending').length === 0 && (
                                                <p className="text-stone-500 text-sm text-center py-4">{t('prof.assign.none')}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Completed */}
                                    <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <Check className="text-green-500" size={18} /> {t('prof.assign.completed')}
                                        </h3>
                                        <div className="space-y-3">
                                            {profModeAssignments.filter(a => a.status === 'completed').map(assign => (
                                                <div key={assign.id} className="bg-stone-900/50 p-4 rounded-lg border border-stone-700 opacity-80">
                                                    <h4 className="font-bold text-stone-300 line-through decoration-stone-500">{assign.title}</h4>
                                                    <p className="text-xs text-stone-500 mb-2">{t('common.sent_on')}: {assign.due_date}</p>
                                                    {assign.attachment_url && (
                                                        <div className="flex items-center gap-2 text-xs text-green-500 bg-green-900/10 p-2 rounded mb-2">
                                                            <Paperclip size={12} /> {t('prof.assign.material')}
                                                        </div>
                                                    )}
                                                    {assign.submission_url && (
                                                        <Button
                                                            variant="secondary"
                                                            className="w-full text-xs py-1.5 h-auto bg-green-900/20 text-green-400 border-green-500/20 hover:bg-green-900/40"
                                                            onClick={() => handleViewAssignmentSubmission(assign.submission_url!, assign.submission_name || 'Trabalho')}
                                                        >
                                                            <CheckCircle size={14} className="mr-1" /> {t('prof.assign.view_answer')}
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                            {profModeAssignments.filter(a => a.status === 'completed').length === 0 && (
                                                <p className="text-stone-500 text-sm text-center py-4">{t('prof.assign.none')}</p>
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
                                            <Award className="text-yellow-500" /> {t('prof.view.evaluate')} {studentBeingEvaluated.nickname || studentBeingEvaluated.name}
                                        </h2>
                                        <button onClick={() => setProfView('all_students')} className="text-stone-400 hover:text-white flex items-center gap-1 transition-colors">
                                            <ArrowLeft size={18} /> {t('common.back')}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        {/* THEORY */}
                                        <div className="bg-stone-900 p-5 rounded-xl border border-stone-700 space-y-4">
                                            <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">{t('grades.theory')}</h3>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">{t('grades.written')}</label>
                                                <textarea
                                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg p-3 text-white h-32 text-sm focus:border-yellow-500 outline-none transition-all"
                                                    placeholder={t('prof.eval.obs')}
                                                    value={evalData.theory.written}
                                                    onChange={e => setEvalData({ ...evalData, theory: { ...evalData.theory, written: e.target.value } })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">{t('common.value')} (0-10)</label>
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
                                            <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">{t('grades.movement')}</h3>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">{t('grades.written')}</label>
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
                                            <h3 className="text-lg font-bold text-white border-b border-stone-800 pb-2">{t('grades.musicality')}</h3>
                                            <div>
                                                <label className="block text-xs text-stone-500 uppercase font-bold mb-2">{t('grades.written')}</label>
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
                                            {t('grades.clear')}
                                        </Button>
                                        <Button onClick={handleSaveEvaluation} disabled={savingGrades} className="px-8 bg-yellow-600 hover:bg-yellow-500">
                                            {savingGrades ? t('common.saving') : t('grades.save')}
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
                                                                    {order.status === 'pending' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-[10px] font-black uppercase border border-yellow-900/50">{t('prof.uniform.status_pending')}</span>}
                                                                    {order.status === 'paid' && <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-[10px] font-black uppercase border border-blue-900/50">{t('prof.uniform.status_paid')}</span>}
                                                                    {order.status === 'producing' && <span className="px-2 py-1 rounded bg-orange-900/30 text-orange-400 text-[10px] font-black uppercase border border-orange-900/50">{t('prof.uniform.status_producing')}</span>}
                                                                    {order.status === 'delivered' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-[10px] font-black uppercase border border-green-900/50">{t('prof.uniform.status_delivered')}</span>}
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
                                                                {order.status === 'paid' && (
                                                                    <span className="text-yellow-400 text-[10px] flex items-center gap-1 font-bold italic">
                                                                        <Clock size={12} /> {t('prof.uniform.analysis')}
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

                        {/* --- PROF MODE: PLANEJAMENTO DE AULA --- */}
                        {
                            profView === 'planning' && (
                                <div className="bg-stone-800 rounded-xl p-6 border border-stone-700 animate-fade-in">
                                    <button onClick={() => setProfView('dashboard')} className="mb-6 text-stone-400 flex items-center gap-2 hover:text-white transition-all hover:-translate-x-1">
                                        <ArrowLeft size={16} /> Voltar ao Painel
                                    </button>

                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-purple-400">
                                                <BookOpen size={28} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Planejamento de Aulas</h2>
                                                <p className="text-stone-400 text-sm">{lessonPlans.length} plano(s) cadastrado(s)</p>
                                            </div>
                                        </div>
                                        <Button onClick={() => { setShowNewPlanForm(true); setNewPlanTitle(`Aula ${lessonPlans.length + 1}`); setNewPlanContent(''); }} className="bg-purple-600 hover:bg-purple-500 shrink-0">
                                            <PlusCircle size={16} className="mr-1" /> Novo Plano
                                        </Button>
                                    </div>
                                    {showNewPlanForm && (
                                        <form onSubmit={handleAddPlan} className="mb-6 bg-stone-900/80 border border-purple-500/30 rounded-2xl p-5 space-y-4 animate-fade-in">
                                            <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest">Novo Planejamento</h3>
                                            <div><label className="block text-xs text-stone-400 mb-1 font-bold uppercase">Título</label><input type="text" required value={newPlanTitle} onChange={e => setNewPlanTitle(e.target.value)} placeholder="Ex: Aula 1 – Ginga e Au" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none" /></div>
                                            <div><label className="block text-xs text-stone-400 mb-1 font-bold uppercase">Conteúdo / Planejamento</label><textarea value={newPlanContent} onChange={e => setNewPlanContent(e.target.value)} rows={4} placeholder="Descreva o conteúdo (ex: Aquecimento, Ginga, Jogo de dentro, Roda...)" className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none resize-y" /></div>
                                            <div className="flex gap-3"><Button type="submit" disabled={savingPlan} className="bg-purple-600 hover:bg-purple-500"><Save size={14} className="mr-1" /> {savingPlan ? 'Salvando...' : 'Salvar'}</Button><Button type="button" variant="ghost" onClick={() => setShowNewPlanForm(false)} className="text-stone-400"><X size={14} className="mr-1" /> Cancelar</Button></div>
                                        </form>
                                    )}

                                    <div className="space-y-4">
                                        {lessonPlans.length === 0 ? (
                                            <div className="text-center py-16 bg-stone-900/30 rounded-2xl border-2 border-dashed border-stone-700">
                                                <BookOpen size={48} className="mx-auto mb-3 text-stone-700" />
                                                <p className="text-stone-500 font-bold uppercase tracking-widest text-sm">Nenhum planejamento cadastrado ainda.</p>
                                                <p className="text-stone-600 text-xs mt-2">Clique em "Novo Plano" para começar.</p>
                                            </div>
                                        ) : (
                                            [...lessonPlans]
                                                .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
                                                .map((plan, idx) => (
                                                    <div key={plan.id} className="rounded-xl border border-stone-700 bg-stone-900/60 overflow-hidden">
                                                        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800 bg-stone-900/80">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black text-purple-400 bg-purple-900/30 border border-purple-900/50 px-2 py-0.5 rounded-full uppercase">#{idx + 1}</span>
                                                                <p className="font-black text-white">{plan.title}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {editingPlanId !== plan.id && (
                                                                    <>
                                                                        <button onClick={() => { setEditingPlanId(plan.id); setEditPlanTitle(plan.title); setEditPlanContent(plan.content); }} className="text-stone-500 hover:text-purple-400 transition-colors p-1" title="Editar">
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button onClick={() => handleDeletePlan(plan.id)} className="text-stone-500 hover:text-red-400 transition-colors p-1" title="Excluir">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {editingPlanId !== plan.id ? (
                                                            <div className="px-5 py-4 min-h-[70px]">
                                                                {plan.content ? (<p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">{plan.content}</p>) : (<p className="text-stone-600 text-sm italic">Sem conteúdo. Clique em editar para adicionar.</p>)}
                                                            </div>
                                                        ) : (
                                                            <div className="px-5 py-4 space-y-3 bg-stone-900/40">
                                                                <div><label className="block text-xs text-stone-400 mb-1 font-bold uppercase">Título</label><input type="text" value={editPlanTitle} onChange={e => setEditPlanTitle(e.target.value)} className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none" /></div>
                                                                <div><label className="block text-xs text-stone-400 mb-1 font-bold uppercase">Conteúdo / Planejamento</label><textarea value={editPlanContent} onChange={e => setEditPlanContent(e.target.value)} rows={4} className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none resize-y" /></div>
                                                                <div className="flex gap-2">
                                                                    <Button onClick={() => handleSavePlanEdit(plan)} disabled={savingPlan} className="bg-purple-600 hover:bg-purple-500 h-8 text-xs"><Save size={12} className="mr-1" /> {savingPlan ? 'Salvando...' : 'Salvar'}</Button>
                                                                    <Button variant="ghost" onClick={() => setEditingPlanId(null)} className="text-stone-400 h-8 text-xs"><X size={12} className="mr-1" /> Cancelar</Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            )
                        }

                        {/* --- PROF MODE: FINANCIAL (Pessoal) --- */}
                        {
                            profView === 'financial' && (
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
                                                                                onClick={(e) => e.stopPropagation()}
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

                                    {/* Pedidos de Uniforme */}
                                    <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-700 shadow-xl mt-6">
                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                            <Shirt className="text-emerald-500" />
                                            Meus Pedidos de Uniforme
                                        </h3>
                                        <div className="space-y-3">
                                            {myOrders.length > 0 ? (
                                                myOrders.map(order => (
                                                    <div key={order.id} className={`bg-stone-900 p-4 rounded-xl border-l-4 ${order.status !== 'pending' ? 'border-green-500' : 'border-yellow-500'} flex flex-col gap-3 shadow-lg`}>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-white">{order.item}</p>
                                                                <p className="text-stone-500 text-xs">R$ {order.total.toFixed(2).replace('.', ',')} - {order.date}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {order.status === 'pending' && <span className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-[10px] font-black uppercase border border-yellow-900/50">{t('prof.uniform.status_pending')}</span>}
                                                                {order.status === 'paid' && <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-[10px] font-black uppercase border border-blue-900/50">{t('prof.uniform.status_paid')}</span>}
                                                                {order.status === 'producing' && <span className="px-2 py-1 rounded bg-orange-900/30 text-orange-400 text-[10px] font-black uppercase border border-orange-900/50">{t('prof.uniform.status_producing')}</span>}
                                                                {order.status === 'delivered' && <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-[10px] font-black uppercase border border-green-900/50">{t('prof.uniform.status_delivered')}</span>}
                                                            </div>
                                                        </div>
                                                        {order.status === 'pending' && !order.proof_url && (
                                                            <div className="flex items-center gap-2">
                                                                <Button variant="secondary" className="text-[10px] h-auto px-2 py-1 flex-1 bg-stone-800 border-stone-700" onClick={() => { setSelectedOrderToProof(order); setTimeout(() => uniformFileInputRef.current?.click(), 100); }} disabled={uploadingUniformProof}>
                                                                    {uploadingUniformProof && selectedOrderToProof?.id === order.id ? 'Enviando...' : <><FileUp size={12} className="mr-1" /> Pagar/Enviar Comprovante</>}
                                                                </Button>
                                                                <input type="file" accept="image/*, application/pdf" className="hidden" ref={uniformFileInputRef} onChange={handleFileChangeForUniformProof} onClick={(e) => e.stopPropagation()} disabled={uploadingUniformProof} />
                                                            </div>
                                                        )}
                                                        {order.status === 'pending' && order.proof_url && (<span className="text-yellow-400 text-[10px] flex items-center gap-1 font-bold italic"><Clock size={12} /> Comprovante em análise</span>)}
                                                        {order.proof_url && (<button onClick={() => handleViewPaymentProof(order.proof_url!, order.item + ' Comprovante')} className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 font-medium bg-blue-400/5 px-2 py-1 rounded border border-blue-400/20 self-start"><Eye size={12} /> Ver Comprovante</button>)}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-stone-500 text-sm italic py-8 text-center bg-stone-900/50 rounded-xl border border-dashed border-stone-800">Nenhum pedido registrado.</p>
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
                                                            <Calendar size={10} /> {rec.created_at ? `${new Date(rec.created_at).toLocaleDateString('pt-BR')} - ${new Date(rec.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Data não disponível'}
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

                                    {/* MAIN ACTIONS BAR - Matching Professor + Planning */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
                                        <Button onClick={() => setProfView('music_manager')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-900 to-purple-700 hover:from-purple-800 hover:to-purple-600 border border-purple-500/30">
                                            <Music size={28} className="text-purple-300" />
                                            <span className="text-sm font-bold">Músicas</span>
                                            <span className="text-xs text-purple-200">Acervo</span>
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
                                        <Button onClick={() => setProfView('planning')} className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-900 to-amber-700 hover:from-amber-800 hover:to-amber-600 border border-amber-500/30">
                                            <BookOpen size={28} className="text-amber-300" />
                                            <span className="text-sm font-bold">Planos</span>
                                            <span className="text-xs text-amber-200">Aulas</span>
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
                                                                const presentCount = sessionAttendance.filter(h => h.status === 'present').length;
                                                                const absentCount = sessionAttendance.filter(h => h.status === 'absent').length;
                                                                const justifiedCount = sessionAttendance.filter(h => h.status === 'justified').length;

                                                                return (
                                                                    <div key={cls.id} className="space-y-1">
                                                                        <div
                                                                            onClick={() => isCompleted && setExpandedSessionId(isExpanded ? null : cls.id)}
                                                                            className={`flex justify-between items-center bg-stone-900/40 p-3 rounded-lg text-xs border-l-4 ${isCompleted ? 'border-green-500 hover:bg-stone-900/60 cursor-pointer shadow-sm hover:shadow-md' : 'border-stone-600'} transition-all`}
                                                                        >
                                                                            <div className="flex-1">
                                                                                <span className="text-stone-100 font-black text-sm block mb-1">{cls.title || 'Aula Sem Título'}</span>
                                                                                <div className="flex flex-wrap items-center gap-3">
                                                                                    <span className="flex items-center gap-1 text-[10px] text-stone-500 bg-stone-900 px-2 py-0.5 rounded font-mono">
                                                                                        <Calendar size={10} /> {cls.date.split('-').reverse().join('/')}
                                                                                    </span>
                                                                                    {!isCompleted && <span className="text-orange-400 text-[10px] font-black uppercase tracking-wider animate-pulse">(Pendente)</span>}
                                                                                    {isCompleted && sessionAttendance.length > 0 && (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-green-500 font-bold text-[10px]">{presentCount} Presentes</span>
                                                                                            <span className="text-red-500 font-bold text-[10px]">{absentCount} Faltas</span>
                                                                                            {justifiedCount > 0 && <span className="text-blue-400 font-bold text-[10px]">{justifiedCount} Justif.</span>}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                {isCompleted ? (
                                                                                    <>
                                                                                        <CheckCircle size={14} className="text-green-500" />
                                                                                        {isExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-500" />}
                                                                                    </>
                                                                                ) : (
                                                                                    <Clock size={14} className="text-stone-600" />
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {isExpanded && isCompleted && (
                                                                            <div className="ml-3 pl-3 border-l-2 border-stone-800 space-y-1.5 py-3 animate-fade-in">
                                                                                <p className="text-[10px] text-stone-500 font-black uppercase mb-2 tracking-widest">Lista de Alunos</p>
                                                                                {sessionAttendance.length > 0 ? (
                                                                                    sessionAttendance.sort((a, b) => a.student_name.localeCompare(b.student_name)).map(record => (
                                                                                        <div key={record.id} className={`bg-stone-900/30 p-2.5 rounded-lg flex flex-col gap-1 border border-stone-800/50 hover:border-stone-700 transition-colors`}>
                                                                                            <div className="flex justify-between items-center">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={`w-1.5 h-1.5 rounded-full ${record.status === 'present' ? 'bg-green-500 shadow-sm shadow-green-500/50' : record.status === 'justified' ? 'bg-blue-500' : 'bg-red-500'}`} />
                                                                                                    <span className="text-stone-300 font-bold text-xs">{record.student_name}</span>
                                                                                                </div>
                                                                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${record.status === 'present' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                                                                    record.status === 'justified' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                                                        'bg-red-500/10 text-red-500 border border-red-500/20'
                                                                                                    }`}>
                                                                                                    {record.status === 'present' ? 'Presente' : record.status === 'justified' ? 'Justificado' : 'Ausente'}
                                                                                                </span>
                                                                                            </div>
                                                                                            {record.status === 'justified' && record.justification && (
                                                                                                <div className="mt-1 bg-blue-900/5 p-2 rounded border border-blue-900/10">
                                                                                                    <p className="text-[10px] text-blue-400/80 italic flex items-start gap-1.5">
                                                                                                        <MessageCircle size={10} className="mt-0.5" />
                                                                                                        "{record.justification}"
                                                                                                    </p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))
                                                                                ) : (
                                                                                    <p className="text-[10px] text-stone-600 italic p-4 bg-stone-900/20 rounded-lg">Dados da chamada não carregados ou indisponíveis.</p>
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
                activeTab === 'class_monitoring' && (
                    <div className="space-y-6 animate-fade-in relative">
                        <div className="bg-stone-800 rounded-xl p-6 border border-stone-700">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Activity className="text-teal-500" />
                                Monitoramento Geral de Aulas
                            </h3>
                            <div className="space-y-4">
                                {classSessions.length > 0 ? (
                                    classSessions
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map(session => {
                                            const prof = allUsersProfiles.find(u => u.id === session.professor_id);
                                            const profName = prof?.nickname || prof?.name || session.instructor || 'Prof. Desconhecido';
                                            const isExpanded = expandedSessionId === session.id;
                                            const sessionAttendance = attendanceHistory.filter(h => h.session_id === session.id);
                                            const presentCount = sessionAttendance.filter(h => h.status === 'present').length;
                                            const absentCount = sessionAttendance.filter(h => h.status === 'absent').length;
                                            const justifiedCount = sessionAttendance.filter(h => h.status === 'justified').length;
                                            
                                            return (
                                                <div key={session.id} className="bg-stone-900/50 rounded-xl border-l-4 border-teal-500 flex flex-col transition-all overflow-hidden hover:bg-stone-900">
                                                    <div 
                                                        className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer`}
                                                        onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                                    >
                                                        <div className="w-full">
                                                            <div className="flex items-center justify-between">
                                                                {session.title && <h4 className="font-bold text-white text-lg">{session.title}</h4>}
                                                                <div className="flex items-center gap-2 md:hidden">
                                                                    {isExpanded ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-600" />}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-stone-400 text-sm flex flex-wrap gap-2 mt-1">
                                                                <span className="flex items-center gap-1"><Calendar size={14} /> {session.date}</span>
                                                                <span className="flex items-center gap-1"><Clock size={14} /> {session.time}</span>
                                                                <span className="flex items-center gap-1"><MapPin size={14} /> {session.location}</span>
                                                            </div>
                                                            
                                                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                                <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-xs border border-stone-700">
                                                                    Prof: {profName}
                                                                </span>
                                                                {session.category && (
                                                                    <span className="bg-teal-900/30 text-teal-400 px-2 py-0.5 rounded text-xs border border-teal-900/50 uppercase font-bold tracking-wider">
                                                                        {session.category}
                                                                    </span>
                                                                )}
                                                                <span className={`px-2 py-0.5 rounded text-xs border ${session.status === 'completed' ? 'bg-green-900/30 text-green-400 border-green-900/50' : session.status === 'cancelled' ? 'bg-red-900/30 text-red-400 border-red-900/50' : 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50'}`}>
                                                                    {session.status === 'completed' ? 'Concluída' : session.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                                                                </span>
                                                                {session.status === 'completed' && sessionAttendance.length > 0 && (
                                                                    <div className="flex items-center gap-1.5 ml-1">
                                                                        <span className="text-green-500 font-bold text-[10px]">{presentCount} P</span>
                                                                        <span className="text-red-500 font-bold text-[10px]">{absentCount} F</span>
                                                                        {justifiedCount > 0 && <span className="text-blue-400 font-bold text-[10px]">{justifiedCount} PJ</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="mt-4 md:mt-0 flex shrink-0 self-center items-center gap-4">
                                                            <Button
                                                                variant="secondary"
                                                                className="text-xs w-full md:w-auto px-3 py-1.5 h-auto whitespace-nowrap bg-stone-800 border-stone-600 hover:bg-stone-700 hover:text-white transition-all text-stone-300"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenAdminAttendance(session);
                                                                }}
                                                            >
                                                                <CalendarCheck size={14} className="mr-1 inline" />
                                                                {session.status === 'completed' ? 'Editar Chamada' : 'Realizar Chamada'}
                                                            </Button>

                                                            <div className="hidden md:block">
                                                                {isExpanded ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-600" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* EXPANDED CONTENT: ATTENDANCE DETAILS */}
                                                    {isExpanded && (
                                                        <div className="px-4 pb-4 pt-1 bg-stone-900/30 animate-fade-in border-t border-teal-900/30">
                                                            <div className="space-y-2 mt-2">
                                                                <p className="text-[10px] text-teal-500/80 font-black uppercase tracking-widest pl-1 mb-2 border-b border-teal-900/50 pb-1 flex items-center justify-between">
                                                                    Detalhes da Frequência
                                                                    {session.status !== 'completed' && <span className="text-stone-500 normal-case font-medium tracking-normal flex items-center gap-1"><AlertCircle size={10} /> Chamada ainda não finalizada pelo responsável.</span>}
                                                                </p>
                                                                
                                                                {sessionAttendance.length > 0 ? (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                        {sessionAttendance.sort((a, b) => a.student_name.localeCompare(b.student_name)).map(record => (
                                                                            <div key={record.id} className="bg-stone-900/80 p-2.5 rounded-lg flex flex-col gap-1 border border-stone-800 hover:border-stone-700 transition-colors">
                                                                                <div className="flex justify-between items-center gap-2">
                                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                                        <div className={`shrink-0 w-2 h-2 rounded-full ${record.status === 'present' ? 'bg-green-500 shadow-sm shadow-green-500/50' : record.status === 'justified' ? 'bg-blue-500' : 'bg-red-500'}`} />
                                                                                        <span className="text-stone-300 font-medium text-xs truncate">{record.student_name}</span>
                                                                                    </div>
                                                                                    <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                                                        record.status === 'present' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                                                        record.status === 'justified' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                                        'bg-red-500/10 text-red-500 border border-red-500/20'
                                                                                    }`}>
                                                                                        {record.status === 'present' ? 'Presente' : record.status === 'justified' ? 'Falta Justificada' : 'Ausente'}
                                                                                    </span>
                                                                                </div>
                                                                                {(record.status === 'absent' || record.status === 'justified') && record.justification && (
                                                                                    <div className="text-[10px] text-stone-500 italic pl-4 mt-0.5">
                                                                                        " {record.justification} "
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : session.status === 'completed' ? (
                                                                    <p className="text-stone-500 text-xs italic pl-1 py-1">A chamada foi registrada como concluída, mas nenhum registro exato de aluno foi encontrado. (Dica de suporte: turma pode estar vazia ou ocorreu erro ao salvar o registro dos alunos na época)</p>
                                                                ) : (
                                                                    <p className="text-stone-500 text-xs italic pl-1 py-1">Expanda esta aula depois de fazer a chamada para ver o diário detalhado de alunos.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                ) : (
                                    <p className="text-stone-500 italic text-center py-8">Nenhuma aula encontrada no sistema.</p>
                                )}
                            </div>
                        </div>

                        {/* --- ADMIN ATTENDANCE OVERLAY --- */}
                        {adminAttendanceClass && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                                <div className="bg-stone-800 rounded-2xl border border-stone-600 shadow-2xl max-w-2xl w-full relative max-h-[90vh] flex flex-col">
                                    <div className="flex justify-between items-center p-6 border-b border-stone-700 shrink-0">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <CalendarCheck className="text-teal-500" /> Chamada - {adminAttendanceClass.title}
                                        </h3>
                                        <button onClick={() => setAdminAttendanceClass(null)} className="text-stone-400 hover:text-white transition-colors"><X size={24} /></button>
                                    </div>
                                    <div className="p-6 overflow-y-auto space-y-3">
                                        {adminAttendanceStudents.length === 0 ? (
                                            <div className="bg-orange-900/20 border border-orange-500/30 p-4 rounded-xl text-center">
                                                <p className="text-orange-400 font-medium">Nenhum aluno da turma deste professor encontrado.</p>
                                                <p className="text-orange-500/70 text-sm mt-1">A chamada é montada com base nos alunos direcionados ao professor desta aula.</p>
                                            </div>
                                        ) : (
                                            adminAttendanceStudents.map((student) => {
                                                const isPresent = adminAttendanceData[student.id];
                                                return (
                                                    <div key={student.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-all duration-200 ${isPresent ? 'bg-green-900/10 border-green-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                                                        <div className="flex items-center gap-4 cursor-pointer mb-3 sm:mb-0" onClick={() => toggleAdminPresence(student.id)}>
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors shrink-0 ${isPresent ? 'bg-green-600' : 'bg-red-900'}`}>
                                                                <Logo className="w-full h-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <p className={`font-medium ${isPresent ? 'text-white' : 'text-stone-300'}`}>{student.nickname || student.name}</p>
                                                                <p className="text-xs text-stone-500">{student.belt}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto pl-[3.5rem] sm:pl-0">
                                                            <div onClick={() => toggleAdminPresence(student.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase cursor-pointer text-center ${isPresent ? 'bg-green-500 text-stone-900' : 'bg-stone-700 text-stone-400'}`}>
                                                                {isPresent ? 'Presente' : 'Ausente'}
                                                            </div>
                                                            {!isPresent && (
                                                                <input
                                                                    type="text"
                                                                    placeholder="Motivo da falta"
                                                                    className="w-full sm:w-48 bg-stone-900 border border-stone-600 rounded px-3 py-1.5 text-sm text-white outline-none"
                                                                    value={adminJustifications[student.id] || ''}
                                                                    onChange={(e) => setAdminJustifications(prev => ({ ...prev, [student.id]: e.target.value }))}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                    <div className="p-6 border-t border-stone-700 bg-stone-900/50 flex justify-end shrink-0 rounded-b-2xl">
                                        <Button
                                            onClick={handleSaveAdminAttendance}
                                            disabled={showSuccess || adminAttendanceStudents.length === 0}
                                            className="bg-teal-600 hover:bg-teal-500"
                                        >
                                            {showSuccess ? <Check size={18} /> : <Save size={18} />}
                                            {showSuccess ? 'Salvo!' : 'Salvar Chamada'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

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
            {/* ── FFPoints ── */}
            {activeTab === 'ffpoints' && (
                <FFPoints user={user} allUsersProfiles={allUsersProfiles} />
            )}
            {/* End of DashboardAdmin */}
        </div >
    );
};
