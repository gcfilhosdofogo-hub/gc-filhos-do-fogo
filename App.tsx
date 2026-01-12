import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Landing } from './views/Landing';
import { Auth } from './views/Auth';
import { DashboardAluno } from './views/DashboardAluno';
import { DashboardProfessor } from './views/DashboardProfessor';
import { DashboardAdmin } from './views/DashboardAdmin';
import { ProfileSetup } from './src/pages/ProfileSetup';
import { SessionContextProvider, useSession } from './src/components/SessionContextProvider';
import { supabase } from './src/integrations/supabase/client';
import { User, GroupEvent, AdminNotification, MusicItem, UniformOrder, UserRole, HomeTraining, SchoolReport, Assignment, PaymentRecord, ClassSession, EventRegistration, StudentGrade, GradeCategory } from './types';


function AppContent() {
  const { session, isLoading } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('home');
  const [isProfileChecked, setIsProfileChecked] = useState(false); // Novo estado para controlar a verificação do perfil

  // Supabase Data States
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [uniformOrders, setUniformOrders] = useState<UniformOrder[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [homeTrainings, setHomeTrainings] = useState<HomeTraining[]>([]);
  const [schoolReports, setSchoolReports] = useState<SchoolReport[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<PaymentRecord[]>([]);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [allUsersProfiles, setAllUsersProfiles] = useState<User[]>([]); // NEW: State to hold all user profiles
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [studentNotesNumericField, setStudentNotesNumericField] = useState<string>('numeric');
  const [studentNotesWrittenField, setStudentNotesWrittenField] = useState<string>('written');
  const [studentNotesAvailableColumns, setStudentNotesAvailableColumns] = useState<string[]>([]);
  const [isGeneratingPayments, setIsGeneratingPayments] = useState(false);

  // --- Data Fetching from Supabase ---
  const fetchData = useCallback(async () => {
    if (!session || !user) return; // Depende do usuário estar definido

    const userId = session.user.id;
    const userRole = user.role; // Use a role do usuário atual

    // Fetch ALL profiles
    let mappedProfiles: User[] = [];
    const { data: allProfilesData, error: allProfilesError } = await supabase.from('profiles').select('*'); // Use * to be safe
    if (allProfilesError) {
      console.error('Error fetching all profiles:', allProfilesError);
    } else {
      mappedProfiles = (allProfilesData || []).map(p => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.nickname || 'Usuário',
        nickname: p.nickname || undefined,
        email: '',
        role: p.role as UserRole,
        first_name: p.first_name || undefined,
        last_name: p.last_name || undefined,
        professorName: p.professor_name || undefined,
        photo_url: p.avatar_url || p.photo_url || undefined, // Unify to favor avatar_url
        status: p.status as 'active' | 'blocked' | undefined,
        belt: p.belt || undefined,
        graduationCost: p.graduation_cost ? Number(p.graduation_cost) : 0, // Safe cast
        nextEvaluationDate: p.next_evaluation_date || undefined,
        phone: p.phone || undefined
      }));
      setAllUsersProfiles(mappedProfiles);
    }

    // Fetch Group Events
    const { data: eventsData, error: eventsError } = await supabase.from('group_events').select('*');
    if (eventsError) console.error('Error fetching events:', eventsError);
    else setEvents((eventsData || []).filter(ev => ev.status !== 'cancelled'));

    // Fetch Music Items
    const { data: musicData, error: musicError } = await supabase.from('music_items').select('*');
    if (musicError) console.error('Error fetching music:', musicError);
    else setMusicList(musicData || []);

    // Fetch Uniform Orders (all for admin, own for others)
    let uniformQuery = supabase.from('uniform_orders').select('*');
    if (userRole !== 'admin') {
      uniformQuery = uniformQuery.eq('user_id', userId);
    }
    const { data: uniformData, error: uniformError } = await uniformQuery;
    if (uniformError) console.error('Error fetching uniform orders:', uniformError);
    else setUniformOrders(uniformData || []);

    // Fetch Admin Notifications (only for admin)
    if (userRole === 'admin') {
      const { data: notifData, error: notifError } = await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false });
      if (notifError) console.error('Error fetching notifications:', notifError);
      else setAdminNotifications(notifData || []);
    }

    // Fetch Home Trainings (own for student, all for admin/professor)
    let homeTrainingQuery = supabase.from('home_trainings').select('*');
    if (userRole === 'aluno') {
      homeTrainingQuery = homeTrainingQuery.eq('user_id', userId);
    }
    const { data: homeTrainingData, error: homeTrainingError } = await homeTrainingQuery;
    if (homeTrainingError) console.error('Error fetching home trainings:', homeTrainingError);
    else setHomeTrainings(homeTrainingData || []);

    // Fetch School Reports (own for student, all for admin/professor)
    let schoolReportQuery = supabase.from('school_reports').select('*');
    // Admin and Professor can see all reports, students only their own
    if (userRole === 'aluno') {
      schoolReportQuery = schoolReportQuery.eq('user_id', userId);
    }
    const { data: schoolReportData, error: schoolReportError } = await schoolReportQuery;
    if (schoolReportError) console.error('Error fetching school reports:', schoolReportError);
    else setSchoolReports(schoolReportData || []);

    // Fetch Assignments (all for admin/professor, relevant for student)
    let assignmentQuery = supabase.from('assignments').select('*');
    if (userRole === 'aluno') {
      // Find the professor's ID based on the student's professorName
      const studentProfessorProfile = mappedProfiles.find( // <-- mappedProfiles agora estará definida
        (p) => (p.nickname === user.professorName || p.name === user.professorName) && (p.role === 'professor' || p.role === 'admin')
      );
      const professorId = studentProfessorProfile?.id;

      if (professorId) {
        assignmentQuery = assignmentQuery.or(`student_id.eq.${userId},created_by.eq.${professorId}`);
      } else {
        assignmentQuery = assignmentQuery.eq('student_id', userId); // Fallback: only show assignments directly assigned to student
      }
    }
    const { data: assignmentData, error: assignmentError } = await assignmentQuery;
    if (assignmentError) console.error('Error fetching assignments:', assignmentError);
    else setAssignments(assignmentData || []);

    // Fetch Monthly Payments (own for student, all for admin)
    let paymentQuery = supabase.from('monthly_payments').select('*');
    if (userRole === 'aluno') {
      paymentQuery = paymentQuery.eq('student_id', userId);
    }
    const { data: paymentData, error: paymentError } = await paymentQuery;
    if (paymentError) console.error('Error fetching payments:', paymentError);
    else setMonthlyPayments(paymentData || []);

    // Fetch Class Sessions
    const { data: classSessionData, error: classSessionError } = await supabase.from('class_sessions').select('*');
    if (classSessionError) console.error('Error fetching class sessions:', classSessionError);
    else setClassSessions(classSessionData || []);

    // Fetch Event Registrations (all for admin, own for others)
    let eventRegQuery = supabase.from('event_registrations').select('*');
    if (userRole !== 'admin') {
      eventRegQuery = eventRegQuery.eq('user_id', userId);
    }
    const { data: eventRegData, error: eventRegError } = await eventRegQuery;
    if (eventRegError) console.error('Error fetching event registrations:', eventRegError);
    else setEventRegistrations(eventRegData || []);

    let gradesData: any[] | null = null;
    let gradesError: any = null;
    if (userRole === 'aluno') {
      const idCandidates = ['student_id', 'user_id', 'aluno_id'];
      for (const col of idCandidates) {
        const { data, error } = await supabase.from('student_notes').select('*').eq(col, userId);
        if (!error) {
          const rows = data || [];
          if (rows.length > 0) {
            gradesData = rows;
            break;
          } else {
            continue;
          }
        }
        const code = String((error as any)?.code || '');
        if (error && code !== '42703' && code !== 'PGRST204') { gradesError = error; break; }
      }
      if (!gradesData && !gradesError) {
        const { data, error } = await supabase.from('student_notes').select('*');
        if (!error) gradesData = (data || []).filter((g: any) => g.student_id === userId || g.user_id === userId || g.aluno_id === userId);
        else gradesError = error;
      }
    } else {
      const { data, error } = await supabase.from('student_notes').select('*');
      gradesData = data || [];
      gradesError = error || null;
    }
    if (gradesError) console.error('Error fetching student grades:', gradesError);
    else {
      const allCols = Array.from(new Set((gradesData || []).flatMap((row: any) => Object.keys(row || {}))));
      setStudentNotesAvailableColumns(allCols);
      const idCandidates = ['student_id', 'user_id', 'aluno_id'];
      const detectedIdKey = idCandidates.find(k => allCols.includes(k)) || 'student_id';
      const numericCandidates = [
        'numeric',
        'nota',
        'score',
        'grade',
        'value',
        'nota_numerica',
        'nota_numero',
        'pontuacao',
        'pontuacao_numerica',
      ];
      const detectedNumeric = numericCandidates.find(k => allCols.includes(k));
      const numericKey = detectedNumeric || 'numeric';
      const writtenCandidates = [
        'written',
        'avaliacao',
        'avaliacao_escrita',
        'avaliacao_texto',
        'comment',
        'comentario',
        'comentarios',
        'texto',
        'descricao',
        'observacao',
        'observacoes',
      ];
      const detectedWritten = writtenCandidates.find(k => allCols.includes(k));
      const writtenKey = detectedWritten || 'written';
      const normalized = (gradesData || []).map((g: any) => {
        const studentId = g[detectedIdKey] ?? g.student_id ?? g.user_id ?? g.aluno_id ?? '';
        const profId = g.professor_id ?? '';
        const student = mappedProfiles.find(p => p.id === studentId);
        const professor = mappedProfiles.find(p => p.id === profId);

        return {
          ...g,
          student_id: studentId,
          student_name: student?.name || 'Aluno',
          professor_id: profId,
          professor_name: professor?.name || 'Professor',
          written:
            typeof g[writtenKey] === 'string'
              ? g[writtenKey]
              : g[writtenKey] !== null && g[writtenKey] !== undefined
                ? String(g[writtenKey])
                : '',
          numeric:
            typeof g[numericKey] === 'number'
              ? g[numericKey]
              : Number(g[numericKey]),
        };
      });

      setStudentGrades(normalized);
      if (detectedNumeric) setStudentNotesNumericField(detectedNumeric);
      if (detectedWritten) setStudentNotesWrittenField(writtenKey);
    }

  }, [session, user]); // Re-fetch if session or user changes

  const generateMonthlyPayments = useCallback(async () => {
    if (!session || user?.role !== 'admin' || isGeneratingPayments) return;

    const today = new Date();
    // Automatic generation disabled by user request. All payments must be manual.
    return;
    if (today.getDate() < 5) return;

    const currentMonth = today.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    setIsGeneratingPayments(true);
    try {
      const { data: existing, error: checkError } = await supabase
        .from('monthly_payments')
        .select('id')
        .eq('month', currentMonth)
        .eq('type', 'Mensalidade')
        .limit(1);

      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        setIsGeneratingPayments(false);
        return;
      }

      const { data: students, error: studentError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, nickname')
        .eq('role', 'aluno');

      if (studentError) throw studentError;
      if (!students || students.length === 0) {
        setIsGeneratingPayments(false);
        return;
      }

      const dueDate = new Date(today.getFullYear(), today.getMonth(), 10).toISOString().split('T')[0];

      const newPayments = students.map(s => ({
        student_id: s.id,
        student_name: s.nickname || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Aluno',
        month: currentMonth,
        due_date: dueDate,
        amount: 50,
        status: 'pending',
        type: 'Mensalidade'
      }));

      const { error: insertError } = await supabase.from('monthly_payments').insert(newPayments);
      if (insertError) throw insertError;

      console.log(`Mensalidades de ${currentMonth} geradas automaticamente.`);
      await fetchData();
    } catch (err) {
      console.error('Erro ao gerar mensalidades automáticas:', err);
    } finally {
      setIsGeneratingPayments(false);
    }
  }, [session, user, isGeneratingPayments, fetchData]);

  useEffect(() => {
    if (user?.role === 'admin') {
      generateMonthlyPayments();
    }
  }, [user, generateMonthlyPayments]);

  // Realtime subscription for Admin Notifications
  useEffect(() => {
    if (!session || user?.role !== 'admin') return;

    const channel = supabase
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          const newNotif = payload.new as AdminNotification;
          setAdminNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, user?.role]);

  // Função para buscar o perfil do usuário
  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*') // Use * to avoid errors if specific columns (like phone/graduation_cost) are missing
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
      console.error('Error fetching profile:', error);
      return null; // Indica falha ou que o perfil não foi encontrado
    }
    return profile;
  }, []);

  // Efeito para gerenciar a sessão e o status do perfil
  useEffect(() => {
    const setupUserAndProfile = async () => {
      if (isLoading) {
        // Ainda carregando a sessão, não faça nada ainda
        return;
      }

      try {
        if (session) {
          const profileData = await fetchUserProfile(session.user.id);

          if (profileData && profileData.status === 'blocked') {
            await handleLogout();
            alert('Sua conta está bloqueada.');
            return;
          }

          // Simplified check: if we have a role, we consider the profile "established" enough
          // to try and load the dashboard or let the user fix details there.
          if (profileData && profileData.role) {
            const userRole = profileData.role as UserRole;
            const fetchedUser: User = {
              id: session.user.id,
              name: profileData.first_name || session.user.email || 'User',
              nickname: profileData.nickname || undefined,
              email: session.user.email || '',
              role: userRole,
              belt: profileData.belt || undefined,
              beltColor: profileData.belt_color || undefined,
              professorName: profileData.professor_name || undefined,
              birthDate: profileData.birth_date || undefined,
              graduationCost: profileData.graduation_cost !== null ? parseFloat(profileData.graduation_cost.toString()) : 0,
              phone: profileData.phone || undefined,
              first_name: profileData.first_name || undefined,
              last_name: profileData.last_name || undefined,
              nextEvaluationDate: profileData.next_evaluation_date || undefined,
              photo_url: profileData.avatar_url || undefined,
              status: profileData.status as 'active' | 'blocked' | undefined,
            };
            setUser(fetchedUser);
            setCurrentView('dashboard');
          } else {
            // Profile missing or no role determined -> setup
            setUser(null);
            setCurrentView('profile_setup');
          }
        } else {
          // No session
          setUser(null);
          setCurrentView('home');
        }
      } catch (err) {
        console.error("Critical error in setupUserAndProfile:", err);
        setUser(null);
        setCurrentView('home');
      } finally {
        setIsProfileChecked(true);
      }
    };

    setIsProfileChecked(false); // Reseta o status de verificação ao mudar a sessão/carregamento
    setupUserAndProfile();
  }, [session, isLoading, fetchUserProfile]); // Dependências

  // Efeito para buscar dados do dashboard quando o usuário estiver definido
  useEffect(() => {
    if (session && user) {
      fetchData();
    }
  }, [session, user, fetchData]);


  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_e: any) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (_) { }
    }
    setUser(null);
    setCurrentView('home');
    setIsProfileChecked(false); // Reseta a verificação do perfil ao deslogar
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (user && session) {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: updatedData.first_name,
          last_name: updatedData.last_name,
          nickname: updatedData.nickname,
          belt: updatedData.belt,
          belt_color: updatedData.beltColor,
          professor_name: updatedData.professorName,
          birth_date: updatedData.birthDate,
          phone: updatedData.phone,
          updated_at: new Date().toISOString(),
          avatar_url: updatedData.photo_url,
        })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile.');
      } else {
        // Após a atualização, re-fetch o perfil para garantir que o estado do App esteja sincronizado
        const updatedProfile = await fetchUserProfile(session.user.id);
        if (updatedProfile) {
          const userRole: UserRole = updatedProfile.role as UserRole;
          const fetchedUser: User = {
            id: session.user.id,
            name: updatedProfile.first_name || session.user.email || 'User',
            nickname: updatedProfile.nickname || undefined,
            email: session.user.email || '', // Populated from session.user.email
            role: userRole,
            belt: updatedProfile.belt || undefined,
            beltColor: updatedProfile.belt_color || undefined,
            professorName: updatedProfile.professor_name || undefined,
            birthDate: updatedProfile.birth_date || undefined,
            graduationCost: updatedProfile.graduation_cost ? parseFloat(updatedProfile.graduation_cost.toString()) : 0,
            phone: updatedProfile.phone || undefined,
            first_name: updatedProfile.first_name || undefined,
            last_name: updatedProfile.last_name || undefined,
            nextEvaluationDate: updatedProfile.next_evaluation_date || undefined,
            photo_url: updatedProfile.avatar_url || undefined,
            status: updatedProfile.status as 'active' | 'blocked' | undefined,
          };
          setUser(fetchedUser);
          alert('Profile updated successfully!');
          handleNotifyAdmin('Atualizou o perfil', fetchedUser); // Notify about profile update
          fetchData(); // Re-fetch all data after profile update
        }
      }
    }
  };

  // --- Event Handlers (Supabase Interactions) ---
  const handleAddEvent = async (newEvent: Omit<GroupEvent, 'id' | 'created_at'>) => {
    if (!session) return null;
    const { data, error } = await supabase.from('group_events').insert({ ...newEvent, created_by: session.user.id }).select().single();
    if (error) {
      console.error('Error adding event:', error);
      return null;
    } else {
      setEvents(prev => [...prev, data]);
      if (user) handleNotifyAdmin(`Criou evento: ${newEvent.title}`, user);
      return data;
    }
  };

  const handleEditEvent = async (updatedEvent: GroupEvent) => {
    const { data, error } = await supabase.from('group_events').update(updatedEvent).eq('id', updatedEvent.id).select().single();
    if (error) console.error('Error editing event:', error);
    else setEvents(prev => prev.map(event => event.id === updatedEvent.id ? data : event));
  };

  const handleCancelEvent = async (eventId: string) => {
    // Soft delete: update status to 'cancelled' instead of deleting
    // This preserves event_registrations and financial records
    const { error } = await supabase.from('group_events').update({ status: 'cancelled' }).eq('id', eventId);
    if (error) console.error('Error cancelling event:', error);
    else setEvents(prev => prev.map(event => event.id === eventId ? { ...event, status: 'cancelled' } : event));
  };

  const handleToggleBlockUser = async (userId: string, currentStatus?: 'active' | 'blocked') => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';

    // Using update now that column existence is confirmed. 
    // Requires SQL RLS policy "Admins can update all profiles" to be active.
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', userId);

    if (error) {
      console.error('Error toggling user block status:', error);
      if (error.message?.includes('row-level security')) {
        alert('Erro de Permissão (RLS): O banco de dados não permitiu a alteração. Certifique-se de ter rodado o script SQL de permissões de Admin no painel do Supabase.');
      } else {
        alert(`Erro ao alterar status: ${error.message}`);
      }
    } else {
      // Optimistic update
      setAllUsersProfiles(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      const targetUser = allUsersProfiles.find(u => u.id === userId);
      handleNotifyAdmin(`${newStatus === 'blocked' ? 'Bloqueou' : 'Desbloqueou'} o usuário: ${targetUser?.nickname || targetUser?.name || userId}`, user!);
    }
  };

  const handleNotifyAdmin = async (action: string, actor: User) => {
    if (!session) return;
    const newNotification: Omit<AdminNotification, 'id' | 'created_at'> = {
      user_id: actor.id,
      user_name: actor.nickname || actor.name,
      action: action,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    const { data, error } = await supabase.from('admin_notifications').insert(newNotification).select().single();
    if (error) {
      console.error('Error adding notification:', error);
    } else {
      setAdminNotifications(prev => [data, ...prev]);
    }
  };

  const handleClearNotifications = async () => {
    if (!session) return;
    const { error } = await supabase.from('admin_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) console.error('Error clearing notifications:', error);
    else setAdminNotifications([]);
  };

  const handleAddMusic = async (newMusic: Omit<MusicItem, 'id' | 'created_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('music_items').insert({ ...newMusic, created_by: session.user.id }).select().single();
    if (error) console.error('Error adding music:', error);
    else {
      setMusicList(prev => [...prev, data]);
      if (user) handleNotifyAdmin(`Adicionou música: ${newMusic.title}`, user);
      fetchData(); // Re-fetch all data to ensure consistency across components
    }
  };

  const handleAddOrder = async (order: Omit<UniformOrder, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('uniform_orders').insert(order).select().single();
    if (error) console.error('Error adding order:', error);
    else {
      setUniformOrders(prev => [data, ...prev]);
      if (user) handleNotifyAdmin(`Solicitou uniforme: ${order.item}`, user);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'pending' | 'ready' | 'delivered') => {
    const { data, error } = await supabase.from('uniform_orders').update({ status }).eq('id', orderId).select().single();
    if (error) console.error('Error updating order status:', error);
    else setUniformOrders(prev => prev.map(o => o.id === orderId ? data : o));
  };

  const handleUpdateOrderWithProof = async (orderId: string, proofUrl: string, proofName: string) => {
    const { data, error } = await supabase.from('uniform_orders').update({ proof_url: proofUrl, proof_name: proofName }).eq('id', orderId).select().single();
    if (error) console.error('Error updating order with proof:', error);
    else setUniformOrders(prev => prev.map(o => o.id === orderId ? data : o));
  };

  const handleAddHomeTraining = async (newTraining: Omit<HomeTraining, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('home_trainings').insert(newTraining).select().single();
    if (error) {
      console.error('Error adding home training:', error);
      throw error;
    } else {
      setHomeTrainings(prev => [data, ...prev]);
    }
  };

  const handleAddSchoolReport = async (newReport: Omit<SchoolReport, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('school_reports').insert(newReport).select().single();
    if (error) {
      console.error('Error adding school report:', error);
      throw error;
    } else {
      setSchoolReports(prev => [data, ...prev]);
    }
  };

  const handleAddAssignment = async (newAssignment: Omit<Assignment, 'id' | 'created_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('assignments').insert({ ...newAssignment, created_by: session.user.id }).select().single();
    if (error) {
      console.error('Error adding assignment:', error);
      throw error;
    } else {
      setAssignments(prev => [...prev, data]);
      if (user) handleNotifyAdmin(`Criou trabalho: ${newAssignment.title}`, user);
    }
  };

  const handleUpdateAssignment = async (updatedAssignment: Assignment) => {
    // Destructure to separate ID and metadata from updateable fields
    let {
      id,
      created_at,
      created_by,
      ...updatePayload
    } = updatedAssignment as any;

    // RLS PROTECTION: If user is a student, only allow updating specific fields
    if (user && user.role === 'aluno') {
      const allowedFields = ['status', 'submission_url', 'submission_name', 'student_id'];
      const filteredPayload: any = {};
      allowedFields.forEach(field => {
        if (updatePayload[field] !== undefined) {
          filteredPayload[field] = updatePayload[field];
        }
      });
      updatePayload = filteredPayload;
    }

    const { data, error } = await supabase
      .from('assignments')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error('No assignment updated. RLS or invalid ID?', { id, role: user?.role });
      throw new Error('Não foi possível atualizar o trabalho. Verifique suas permissões ou se o trabalho ainda existe.');
    }

    const updatedRow = data[0];
    setAssignments(prev => prev.map(a => a.id === id ? updatedRow : a));
  };

  const handleAddPaymentRecord = async (newPayment: Omit<PaymentRecord, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('monthly_payments').insert(newPayment).select().single();
    if (error) {
      console.error('Error adding payment record:', error);
      throw error;
    } else {
      setMonthlyPayments(prev => [data, ...prev]);
    }
  };

  const handleUpdatePaymentRecord = async (updatedPayment: PaymentRecord) => {
    const { data, error } = await supabase.from('monthly_payments').update(updatedPayment).eq('id', updatedPayment.id).select().single();
    if (error) {
      console.error('Error updating payment record:', error);
      throw error;
    } else {
      setMonthlyPayments(prev => prev.map(p => p.id === updatedPayment.id ? data : p));
    }
  };

  const handleAddClassSession = async (newSession: Omit<ClassSession, 'id' | 'created_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('class_sessions').insert({ ...newSession, professor_id: session.user.id }).select().single();
    if (error) console.error('Error adding class session:', error);
    else {
      setClassSessions(prev => [...prev, data]);
      if (user) handleNotifyAdmin(`Criou aula: ${newSession.title}`, user);
    }
  };

  const handleUpdateClassSession = async (updatedSession: ClassSession) => {
    const { data, error } = await supabase.from('class_sessions').update(updatedSession).eq('id', updatedSession.id).select().single();
    if (error) console.error('Error updating class session:', error);
    else setClassSessions(prev => prev.map(cs => cs.id === updatedSession.id ? data : cs));
  };

  // Event Registration Handlers
  const handleAddEventRegistration = async (newRegistration: Omit<EventRegistration, 'id' | 'registered_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('event_registrations').insert(newRegistration).select().single();
    if (error) console.error('Error adding event registration:', error);
    else setEventRegistrations(prev => [...prev, data]);
  };

  const handleUpdateEventRegistrationStatus = async (registrationId: string, status: 'pending' | 'paid' | 'cancelled') => {
    const { data, error } = await supabase.from('event_registrations').update({ status }).eq('id', registrationId).select().single();
    if (error) console.error('Error updating event registration status:', error);
    else setEventRegistrations(prev => prev.map(reg => reg.id === registrationId ? data : reg));
  };

  const handleUpdateEventRegistrationWithProof = async (updatedRegistration: EventRegistration) => {
    // Remove view-only fields that shouldn't be sent to the DB table
    const { event_title, user_name, ...dbPayload } = updatedRegistration;

    const { data, error } = await supabase.from('event_registrations').update(dbPayload).eq('id', updatedRegistration.id).select().single();
    if (error) {
      console.error('Error updating event registration with proof:', error);
      alert('Erro ao atualizar comprovante no banco de dados. Tente novamente.');
    }
    else {
      // Merge the returned DB data with the view-only fields we preserved
      const completeData = { ...data, event_title, user_name };
      setEventRegistrations(prev => prev.map(reg => reg.id === updatedRegistration.id ? completeData : reg));
    }
  };

  const handleAddAttendance = async (attendanceRecords: any[]) => {
    if (attendanceRecords.length === 0) return;
    const { error } = await supabase.from('attendance').insert(attendanceRecords);
    if (error) {
      console.error('Error adding attendance:', error);
      throw error;
    } else {
      if (user) handleNotifyAdmin(`Realizou chamada para ${attendanceRecords.length} alunos`, user);
    }
  };

  const handleAddClassRecord = async (record: { photo_url: string; created_by: string; description?: string }) => {
    if (!session) return;
    const { error } = await supabase.from('class_records').insert(record);
    if (error) {
      console.error('Error adding class record:', error);
      throw error;
    } else {
      if (user) handleNotifyAdmin('Enviou registro fotográfico da aula', user);
    }
  };

  const handleAddStudentGrade = async (payload: Omit<StudentGrade, 'id' | 'created_at' | 'updated_at'>) => {
    const idCandidates = ['student_id', 'user_id', 'aluno_id'];
    const numericCandidates = [
      studentNotesNumericField,
      'numeric',
      'nota',
      'score',
      'grade',
      'value',
      'nota_numerica',
      'nota_numero',
      'pontuacao',
      'pontuacao_numerica',
    ];
    const writtenCandidates = [
      studentNotesWrittenField,
      'written',
      'avaliacao',
      'avaliacao_escrita',
      'avaliacao_texto',
      'comment',
      'comentario',
      'comentarios',
      'texto',
      'descricao',
      'observacao',
      'observacoes',
    ];
    let existingCols = studentNotesAvailableColumns;
    if (existingCols.length === 0) {
      try {
        const { data } = await supabase.from('student_notes').select('*').limit(1);
        existingCols = Array.from(new Set((data || []).flatMap((row: any) => Object.keys(row || {}))));
        setStudentNotesAvailableColumns(existingCols);
      } catch (_) { }
    }
    const idKeysToUse = idCandidates.filter(k => existingCols.includes(k));
    const numericKeysToUse = numericCandidates.filter(k => existingCols.includes(k));
    const writtenKeysToUse = writtenCandidates.filter(k => existingCols.includes(k));
    const finalIdKeys = idKeysToUse.length > 0 ? idKeysToUse : idCandidates;
    const finalNumericKeys = numericKeysToUse.length > 0 ? numericKeysToUse : numericCandidates;
    const finalWrittenKeys = writtenKeysToUse.length > 0 ? writtenKeysToUse : writtenCandidates;
    for (const idKey of finalIdKeys) {
      const base: any = { [idKey]: payload.student_id, professor_id: payload.professor_id };
      // Always use the standard names since we fixed the database columns
      const attempt = {
        ...base,
        numeric: payload.numeric,
        written: payload.written,
        category: payload.category
      };

      const { data, error } = await supabase.from('student_notes').insert(attempt).select().single();
      if (!error && data) {
        const normalized: StudentGrade = {
          ...data,
          student_id: data[idKey] || data.student_id || payload.student_id,
          student_name: payload.student_name,
          professor_id: data.professor_id || payload.professor_id,
          professor_name: payload.professor_name,
          numeric: typeof data.numeric === 'number' ? data.numeric : Number(data.numeric),
          written: String(data.written ?? ''),
          category: data.category as GradeCategory
        };
        setStudentGrades(prev => [normalized, ...prev]);
        if (user) handleNotifyAdmin(`Avaliou aluno (Nota: ${payload.numeric})`, user);
        return;
      }
      if (error) {
        // If it's a "column doesn't exist" error, continue to next candidate
        if ((error as any).code === '42703') continue;
        console.error('Error adding student grade:', error);
        throw error; // Let the caller handle major errors
      }
    }
  };



  const navigate = (view: string) => {
    if (view === 'login' && user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView(view);
    }
  };

  const handleProfileComplete = async (updatedUser: User) => {
    // O ProfileSetup já fez o upsert. Aqui, apenas atualizamos o estado local
    // e acionamos o re-fetch de dados para o dashboard.
    setUser(updatedUser);
    setCurrentView('dashboard');
    await fetchData(); // Garante que os dados do dashboard sejam carregados com o perfil atualizado
    // O useEffect de gerenciamento de sessão/perfil irá re-avaliar e confirmar que o perfil está completo.
  };

  const renderContent = () => {
    // Mostra um loader enquanto a sessão e o perfil estão sendo verificados
    if (isLoading || !isProfileChecked) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
          <p className="text-white text-xl">Carregando...</p>
        </div>
      );
    }

    if (currentView === 'home' && !user) {
      return <Landing onLoginClick={() => setCurrentView('login')} />;
    }

    if (currentView === 'login') {
      return <Auth onLogin={handleLogin} onBack={() => setCurrentView('home')} />;
    }

    if (currentView === 'profile_setup' && session) {
      return <ProfileSetup onProfileComplete={handleProfileComplete} onBack={() => setCurrentView('home')} />;
    }

    if (user) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {user.role === 'aluno' && (
            <DashboardAluno
              user={user}
              events={events.filter(e => e.status !== 'cancelled')}
              musicList={musicList}
              uniformOrders={uniformOrders.filter(order => order.user_id === user.id)} // Pass only student's orders
              onAddOrder={handleAddOrder}
              onNotifyAdmin={handleNotifyAdmin}
              onUpdateProfile={handleUpdateProfile}
              homeTrainings={homeTrainings.filter(ht => ht.user_id === user.id)} // Pass only student's home trainings
              onAddHomeTraining={handleAddHomeTraining}
              schoolReports={schoolReports.filter(sr => sr.user_id === user.id)} // Pass only student's school reports
              onAddSchoolReport={handleAddSchoolReport}
              classSessions={classSessions}
              assignments={assignments.filter(a => a.student_id === user.id)}
              onUpdateAssignment={handleUpdateAssignment}
              eventRegistrations={eventRegistrations.filter(reg => reg.user_id === user.id)} // Pass only student's event registrations
              onAddEventRegistration={handleAddEventRegistration}
              onUpdateEventRegistrationWithProof={handleUpdateEventRegistrationWithProof} // NEW PROP
              allUsersProfiles={allUsersProfiles} // NEW: Pass all user profiles
              monthlyPayments={monthlyPayments}
              onUpdatePaymentRecord={handleUpdatePaymentRecord}
              studentGrades={studentGrades.filter(g => g.student_id === user.id)}
              onUpdateOrderWithProof={handleUpdateOrderWithProof}
            />
          )}
          {user.role === 'professor' && (
            <DashboardProfessor
              user={user}
              events={events.filter(e => e.status !== 'cancelled')}
              musicList={musicList}
              uniformOrders={uniformOrders.filter(order => order.user_id === user.id)} // Pass only professor's orders
              onAddOrder={handleAddOrder}
              onAddMusic={handleAddMusic}
              onNotifyAdmin={handleNotifyAdmin}
              onUpdateProfile={handleUpdateProfile}
              classSessions={classSessions.filter(cs => cs.professor_id === user.id)} // Pass only professor's classes
              onAddClassSession={handleAddClassSession}
              onUpdateClassSession={handleUpdateClassSession}
              assignments={assignments.filter(a => a.created_by === user.id)} // Pass only professor's assignments
              onAddAssignment={handleAddAssignment}
              onUpdateAssignment={handleUpdateAssignment}
              homeTrainings={homeTrainings} // Professor can see all home trainings
              eventRegistrations={eventRegistrations} // Professor sees their own registrations (due to fetchData logic)
              onAddStudentGrade={handleAddStudentGrade}
              studentGrades={studentGrades}
              onAddAttendance={handleAddAttendance}
              monthlyPayments={monthlyPayments.filter(p => p.student_id === user.id)} // Pass professor's payments
              onUpdatePaymentRecord={handleUpdatePaymentRecord}
              onUpdateOrderWithProof={handleUpdateOrderWithProof}
              onUpdateEventRegistrationWithProof={handleUpdateEventRegistrationWithProof}
              onAddClassRecord={handleAddClassRecord}
              allUsersProfiles={allUsersProfiles}
            />
          )}

          {user.role === 'admin' && (
            <DashboardAdmin
              user={user}
              onAddEvent={handleAddEvent}
              onEditEvent={handleEditEvent}
              onCancelEvent={handleCancelEvent}
              events={events.filter(e => e.status !== 'cancelled')}
              notifications={adminNotifications}
              onClearNotifications={handleClearNotifications}
              musicList={musicList}
              uniformOrders={uniformOrders}
              onAddOrder={handleAddOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onAddMusic={handleAddMusic}
              onNotifyAdmin={handleNotifyAdmin}
              onUpdateProfile={handleUpdateProfile}
              monthlyPayments={monthlyPayments}
              onAddPaymentRecord={handleAddPaymentRecord}
              onUpdatePaymentRecord={handleUpdatePaymentRecord}
              classSessions={classSessions}
              onAddClassSession={handleAddClassSession}
              onUpdateClassSession={handleUpdateClassSession}
              assignments={assignments}
              onAddAssignment={handleAddAssignment}
              onUpdateAssignment={handleUpdateAssignment}
              homeTrainings={homeTrainings}
              schoolReports={schoolReports}
              eventRegistrations={eventRegistrations} // Pass event registrations to admin
              onAddEventRegistration={handleAddEventRegistration}
              onUpdateEventRegistrationStatus={handleUpdateEventRegistrationStatus}
              onNavigate={navigate} // Pass navigate function
              studentGrades={studentGrades}
              onAddStudentGrade={handleAddStudentGrade}
              onAddAttendance={handleAddAttendance}
              onAddClassRecord={handleAddClassRecord}
              allUsersProfiles={allUsersProfiles}
              onToggleBlockUser={handleToggleBlockUser}
              onUpdateOrderWithProof={handleUpdateOrderWithProof}
              onUpdateEventRegistrationWithProof={handleUpdateEventRegistrationWithProof}
            />
          )}
        </div>
      );
    }

    return <Landing onLoginClick={() => setCurrentView('login')} />;
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-200 font-sans selection:bg-orange-500 selection:text-white">
      <Navbar
        user={user}
        onLogout={handleLogout}
        onNavigate={navigate}
      />
      <main>
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <SessionContextProvider>
      <AppContent />
    </SessionContextProvider>
  );
}

export default App;
