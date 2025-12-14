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
import { User, GroupEvent, AdminNotification, MusicItem, UniformOrder, UserRole, HomeTraining, SchoolReport, Assignment, PaymentRecord, ClassSession, EventRegistration } from './types';


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

  // --- Data Fetching from Supabase ---
  const fetchData = useCallback(async () => {
    if (!session || !user) return; // Depende do usuário estar definido

    const userId = session.user.id;
    const userRole = user.role; // Use a role do usuário atual

    // Fetch ALL profiles to determine professor IDs for filtering
    let mappedProfiles: User[] = []; // Declarar e inicializar aqui
    const { data: allProfilesData, error: allProfilesError } = await supabase.from('profiles').select('id, first_name, last_name, nickname, role, professor_name'); // Removed 'email'
    if (allProfilesError) {
      console.error('Error fetching all profiles:', allProfilesError);
    } else {
      mappedProfiles = (allProfilesData || []).map(p => ({ // Atribuir aqui
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.nickname || 'Usuário',
        nickname: p.nickname || undefined,
        email: '', // Email will be populated from session.user.email later
        role: p.role as UserRole,
        first_name: p.first_name || undefined,
        last_name: p.last_name || undefined,
        professorName: p.professor_name || undefined,
      }));
      setAllUsersProfiles(mappedProfiles);
    }

    // Fetch Group Events
    const { data: eventsData, error: eventsError } = await supabase.from('group_events').select('*');
    if (eventsError) console.error('Error fetching events:', eventsError);
    else setEvents(eventsData || []);

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

  }, [session, user]); // Re-fetch if session or user changes

  // Função para buscar o perfil do usuário
  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, nickname, belt, belt_color, professor_name, birth_date, graduation_cost, phone, role') // Removed 'email'
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

      if (session) {
        const profileData = await fetchUserProfile(session.user.id);

        // MODIFICADO: Verifica se first_name existe e não é uma string vazia
        if (profileData && profileData.first_name && profileData.first_name.trim() !== '') {
          // Perfil existe e tem o primeiro nome preenchido (considerado completo o suficiente)
          const userRole: UserRole = profileData.role as UserRole;
          const fetchedUser: User = {
            id: session.user.id,
            name: profileData.first_name || session.user.email || 'User',
            nickname: profileData.nickname || undefined,
            email: session.user.email || '', // Populated from session.user.email
            role: userRole,
            belt: profileData.belt || undefined,
            beltColor: profileData.belt_color || undefined,
            professorName: profileData.professor_name || undefined,
            birthDate: profileData.birth_date || undefined,
            graduationCost: profileData.graduation_cost !== null ? Number(profileData.graduation_cost) : 0,
            phone: profileData.phone || undefined,
            first_name: profileData.first_name || undefined,
            last_name: profileData.last_name || undefined,
          };
          setUser(fetchedUser);
          setCurrentView('dashboard');
        } else {
          // Perfil não existe ou está incompleto (primeiro nome ausente ou vazio)
          setUser(null); // Garante que o usuário seja nulo se o perfil estiver incompleto
          setCurrentView('profile_setup');
        }
      } else {
        // Não há sessão, volta para a tela inicial
        setUser(null);
        setCurrentView('home');
      }
      setIsProfileChecked(true); // Marca a verificação do perfil como completa
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
    await supabase.auth.signOut();
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
                graduation_cost: updatedData.graduationCost,
                phone: updatedData.phone,
                role: updatedData.role, // Allow admin to update role
                updated_at: new Date().toISOString(),
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
                    graduationCost: updatedProfile.graduation_cost !== null ? Number(updatedProfile.graduation_cost) : 0,
                    phone: updatedProfile.phone || undefined,
                    first_name: updatedProfile.first_name || undefined,
                    last_name: updatedProfile.last_name || undefined,
                };
                setUser(fetchedUser);
                alert('Profile updated successfully!');
                fetchData(); // Re-fetch all data after profile update
            }
        }
    }
  };

  // --- Event Handlers (Supabase Interactions) ---
  const handleAddEvent = async (newEvent: Omit<GroupEvent, 'id' | 'created_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('group_events').insert({ ...newEvent, created_by: session.user.id }).select().single();
    if (error) console.error('Error adding event:', error);
    else setEvents(prev => [...prev, data]);
  };

  const handleEditEvent = async (updatedEvent: GroupEvent) => {
    const { data, error } = await supabase.from('group_events').update(updatedEvent).eq('id', updatedEvent.id).select().single();
    if (error) console.error('Error editing event:', error);
    else setEvents(prev => prev.map(event => event.id === updatedEvent.id ? data : event));
  };

  const handleCancelEvent = async (eventId: string) => {
    const { error } = await supabase.from('group_events').delete().eq('id', eventId);
    if (error) console.error('Error deleting event:', error);
    else setEvents(prev => prev.filter(event => event.id !== eventId));
  };

  const handleNotifyAdmin = async (action: string, actor: User) => {
    const newNotification: Omit<AdminNotification, 'id' | 'created_at'> = {
      user_id: actor.id,
      user_name: actor.nickname || actor.name,
      action: action,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    const { data, error } = await supabase.from('admin_notifications').insert(newNotification).select().single();
    if (error) console.error('Error adding notification:', error);
    else setAdminNotifications(prev => [data, ...prev]);
  };

  const handleAddMusic = async (newMusic: Omit<MusicItem, 'id' | 'created_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('music_items').insert({ ...newMusic, created_by: session.user.id }).select().single();
    if (error) console.error('Error adding music:', error);
    else {
      setMusicList(prev => [...prev, data]);
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

  const handleAddHomeTraining = async (newTraining: Omit<HomeTraining, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('home_trainings').insert(newTraining).select().single();
    if (error) console.error('Error adding home training:', error);
    else setHomeTrainings(prev => [data, ...prev]);
  };

  const handleAddSchoolReport = async (newReport: Omit<SchoolReport, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('school_reports').insert(newReport).select().single();
    if (error) console.error('Error adding school report:', error);
    else setSchoolReports(prev => [data, ...prev]);
  };

  const handleAddAssignment = async (newAssignment: Omit<Assignment, 'id' | 'created_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('assignments').insert({ ...newAssignment, created_by: session.user.id }).select().single();
    if (error) console.error('Error adding assignment:', error);
    else setAssignments(prev => [...prev, data]);
  };

  const handleUpdateAssignment = async (updatedAssignment: Assignment) => {
    const { data, error } = await supabase.from('assignments').update(updatedAssignment).eq('id', updatedAssignment.id).select().single();
    if (error) console.error('Error updating assignment:', error);
    else setAssignments(prev => prev.map(a => a.id === updatedAssignment.id ? data : a));
  };

  const handleAddPaymentRecord = async (newPayment: Omit<PaymentRecord, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('monthly_payments').insert(newPayment).select().single();
    if (error) console.error('Error adding payment record:', error);
    else setMonthlyPayments(prev => [data, ...prev]);
  };

  const handleUpdatePaymentRecord = async (updatedPayment: PaymentRecord) => {
    const { data, error } = await supabase.from('monthly_payments').update(updatedPayment).eq('id', updatedPayment.id).select().single();
    if (error) console.error('Error updating payment record:', error);
    else setMonthlyPayments(prev => prev.map(p => p.id === updatedPayment.id ? data : p));
  };

  const handleAddClassSession = async (newSession: Omit<ClassSession, 'id' | 'created_at'>) => {
    if (!session) return;
    const { data, error } = await supabase.from('class_sessions').insert({ ...newSession, professor_id: session.user.id }).select().single();
    if (error) console.error('Error adding class session:', error);
    else setClassSessions(prev => [...prev, data]);
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
    const { data, error } = await supabase.from('event_registrations').update(updatedRegistration).eq('id', updatedRegistration.id).select().single();
    if (error) console.error('Error updating event registration with proof:', error);
    else setEventRegistrations(prev => prev.map(reg => reg.id === updatedRegistration.id ? data : reg));
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
              events={events} 
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
              assignments={assignments.filter(a => a.student_id === user.id || a.created_by === allUsersProfiles.find(p => (p.nickname === user.professorName || p.name === user.professorName) && (p.role === 'professor' || p.role === 'admin'))?.id)} // Pass relevant assignments
              onUpdateAssignment={handleUpdateAssignment}
              eventRegistrations={eventRegistrations.filter(reg => reg.user_id === user.id)} // Pass only student's event registrations
              onAddEventRegistration={handleAddEventRegistration}
              allUsersProfiles={allUsersProfiles} // NEW: Pass all user profiles
              monthlyPayments={monthlyPayments}
              onUpdatePaymentRecord={handleUpdatePaymentRecord}
            />
          )}
          {user.role === 'professor' && (
            <DashboardProfessor 
              user={user} 
              events={events} 
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
              eventRegistrations={eventRegistrations} // Professor can see all event registrations
            />
          )}
          {user.role === 'admin' && (
            <DashboardAdmin 
              user={user} 
              onAddEvent={handleAddEvent} 
              onEditEvent={handleEditEvent}
              onCancelEvent={handleCancelEvent}
              events={events} 
              notifications={adminNotifications}
              musicList={musicList}
              uniformOrders={uniformOrders}
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