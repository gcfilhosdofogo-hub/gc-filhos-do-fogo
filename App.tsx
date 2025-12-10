import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Landing } from './views/Landing';
import { Auth } from './views/Auth';
import { DashboardAluno } from './views/DashboardAluno';
import { DashboardProfessor } from './views/DashboardProfessor';
import { DashboardAdmin } from './views/DashboardAdmin';
import { ProfileSetup } from './src/pages/ProfileSetup'; // Import the new ProfileSetup component
import { SessionContextProvider, useSession } from './src/components/SessionContextProvider';
import { supabase } from './src/integrations/supabase/client';
import { User, GroupEvent, AdminNotification, MusicItem, UniformOrder, UserRole } from './types';


function AppContent() {
  const { session, isLoading } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('home');
  const [events, setEvents] = useState<GroupEvent[]>([
    { id: '1', title: 'Roda de Fim de Ano', date: '20 Dez', description: 'Grande roda de confraternização e troca de cordéis.', price: 50 },
    { id: '2', title: 'Workshop de Angola', date: '15 Jan', description: 'Treino especial com Mestre convidado.', price: 120 }
  ]);
  
  // Mock music data uploaded by professors
  const [musicList, setMusicList] = useState<MusicItem[]>([
    {
      id: '1',
      title: 'Paranauê',
      category: 'Corridos',
      lyrics: "Paranauê, paranauê, paraná\nParanauê, paranauê, paraná\n\nVou dizer a minha mulher, paraná\nCapoeira venceu, paraná\nParanauê, paranauê, paraná"
    },
    {
      id: '2',
      title: 'Iúna é mandingueira',
      category: 'Quadras',
      lyrics: "Iúna é mandingueira\nQuando canta no sertão\nÉ sinal de boa chuva\nPra colheita do feijão"
    }
  ]);

  // Global Uniform Orders State
  const [uniformOrders, setUniformOrders] = useState<UniformOrder[]>([]);

  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        // Fetch user profile from Supabase
        const fetchUserProfile = async () => {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, nickname, avatar_url, belt, belt_color, professor_name, birth_date, graduation_cost, phone, role')
            .eq('id', session.user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 means "no rows found"
            console.error('Error fetching profile:', error);
            // Fallback to basic user info if profile fetch fails
            setUser({
              id: session.user.id,
              name: session.user.email || 'User',
              email: session.user.email || '',
              role: 'aluno', // Default role
            });
            setCurrentView('profile_setup'); // Redirect to profile setup if error or no profile
          } else if (profile) {
            // Check if essential profile fields are filled
            if (!profile.first_name || !profile.nickname || !profile.birth_date) {
              setCurrentView('profile_setup'); // Redirect to profile setup if profile is incomplete
            } else {
              const userRole: UserRole = profile.role as UserRole;
              setUser({
                id: session.user.id,
                name: profile.first_name || session.user.email || 'User',
                nickname: profile.nickname || undefined,
                email: session.user.email || '',
                role: userRole,
                avatarUrl: profile.avatar_url || undefined,
                belt: profile.belt || undefined,
                beltColor: profile.belt_color || undefined,
                professorName: profile.professor_name || undefined,
                birthDate: profile.birth_date || undefined,
                graduationCost: profile.graduation_cost || undefined,
                phone: profile.phone || undefined,
              });
              setCurrentView('dashboard');
            }
          } else {
            // No profile found, new user needs to set up profile
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

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView('home');
  };

  // Function to update user profile (e.g. Avatar)
  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (user && session) {
        const { error } = await supabase
            .from('profiles')
            .update(updatedData)
            .eq('id', session.user.id);

        if (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        } else {
            setUser({ ...user, ...updatedData });
            alert('Profile updated successfully!');
        }
    }
  };

  const handleAddEvent = (newEvent: GroupEvent) => {
    setEvents([...events, newEvent]);
  };

  const handleEditEvent = (updatedEvent: GroupEvent) => {
    setEvents(prev => prev.map(event => event.id === updatedEvent.id ? updatedEvent : event));
  };

  const handleCancelEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
  };

  // Handler to create a notification for the admin
  const handleNotifyAdmin = (action: string, actor: User) => {
    const newNotification: AdminNotification = {
      id: Date.now().toString(),
      userId: actor.id,
      userName: actor.nickname || actor.name,
      action: action,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    setAdminNotifications(prev => [newNotification, ...prev]);
  };

  const handleAddMusic = (newMusic: MusicItem) => {
      setMusicList(prev => [newMusic, ...prev]);
  };

  // Uniform Order Handlers
  const handleAddOrder = (order: UniformOrder) => {
    setUniformOrders(prev => [order, ...prev]);
    // Also create a notification
    if (user) {
        handleNotifyAdmin(`Solicitou uniforme: ${order.item}`, user);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, status: 'pending' | 'ready' | 'delivered') => {
    setUniformOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
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
      // Role based routing
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {user.role === 'aluno' && (
            <DashboardAluno 
              user={user} 
              events={events} 
              musicList={musicList}
              uniformOrders={uniformOrders}
              onAddOrder={handleAddOrder}
              onNotifyAdmin={handleNotifyAdmin}
              onUpdateProfile={handleUpdateProfile}
            />
          )}
          {user.role === 'professor' && (
            <DashboardProfessor 
              user={user} 
              events={events} 
              musicList={musicList}
              uniformOrders={uniformOrders}
              onAddOrder={handleAddOrder}
              onAddMusic={handleAddMusic}
              onNotifyAdmin={handleNotifyAdmin}
              onUpdateProfile={handleUpdateProfile}
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