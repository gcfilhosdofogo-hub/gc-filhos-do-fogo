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
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]); // NEW: Event Registrations

  // --- Data Fetching from Supabase ---
  const fetchData = useCallback(async () => {
    if (!session) return;

    const userId = session.user.id;
    const userRole = user?.role; // Use current user role if available

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
      assignmentQuery = assignmentQuery.or(`student_id.eq.${userId},created_by.eq.${user?.professorName}`); // Students see their own or general assignments from their professor
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

    // NEW: Fetch Event Registrations (all for admin, own for others)
    let eventRegQuery = supabase.from('event_registrations').select('*');
    if (userRole !== 'admin') {
      eventRegQuery = eventRegQuery.eq('user_id', userId);
    }
    const { data: eventRegData, error: eventRegError } = await eventRegQuery;
    if (eventRegError) console.error('Error fetching event registrations:', eventRegError);
    else setEventRegistrations(eventRegData || []);

  }, [session, user?.role, user?.professorName]); // Re-fetch if session or user role/professor changes

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        const fetchUserProfile = async () => {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, nickname, avatar_url, belt, belt_color, professor_name, birth_date, graduation_cost, phone, role, email') // Added email to select
            .eq('id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
            // Fallback to a basic user object if profile fetch fails
            setUser({
              id: session.user.id,
              name: session.user.email || 'User',
              email: session.user.email || '',
              role: 'aluno', // Default to aluno if profile not found or error
            });
            setCurrentView('profile_setup');
          } else if (profile) {
            if (!profile.first_name || !profile.nickname || !profile.birth_date) {
              setCurrentView('profile_setup');
            } else {
              const userRole: UserRole = profile.role as UserRole;
              const fetchedUser: User = {
                id: session.user.id,
                name: profile.first_name || session.user.email || 'User',
                nickname: profile.nickname || undefined,
                email: profile.email || session.user.email || '', // Use profile email or session email
                role: userRole,
                avatarUrl: profile.avatar_url || undefined,
                belt: profile.belt || undefined,
                beltColor: profile.belt_color || undefined,
                professorName: profile.professor_name || undefined,
                birthDate: profile.birth_date || undefined,
                // MODIFIED: Ensure 0 is kept as a number, or default to 0 if null
                graduationCost: profile.graduation_cost !== null ? Number(profile.graduation_cost) : 0,
                phone: profile.phone || undefined,
                first_name: profile.first_name || undefined,
                last_name: profile.last_name || undefined,
              };
              setUser(fetchedUser);
              setCurrentView('dashboard');
            }
          } else {
            // No profile found, it's a new user or profile not completed
            setCurrentView('profile_setup');
          }
        };
        fetchUserProfile();
      } else {
        setUser(null);
        setCurrentView('home');
      }
    }
  }, [session, isLoading]);

  // Fetch data whenever user or session changes
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
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (user && session) {
        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: updatedData.first_name,
                last_name: updatedData.last_name,
                nickname: updatedData.nickname,
                avatar_url: updatedData.avatarUrl,
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
            setUser({ ...user, ...updatedData });
            alert('Profile updated successfully!');
            fetchData(); // Re-fetch all data after profile update
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

  // NEW: Event Registration Handlers
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


  const navigate = (view: string) => {
    if (view === 'login' && user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView(view);
    }
  };

  const handleProfileComplete = (updatedUser: User) => {
    setUser(updatedUser);
    setCurrentView('dashboard');
    fetchData(); // Re-fetch all data after profile is completed
  };

  const renderContent = () => {
    if (isLoading) {
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
              assignments={assignments.filter(a => a.student_id === user.id || a.student_id === null)} // Pass relevant assignments
              onUpdateAssignment={handleUpdateAssignment}
              eventRegistrations={eventRegistrations.filter(reg => reg.user_id === user.id)} // Pass only student's event registrations
              onAddEventRegistration={handleAddEventRegistration}
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