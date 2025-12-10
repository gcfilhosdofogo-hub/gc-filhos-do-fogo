import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Landing } from './views/Landing';
import { Auth } from './views/Auth';
import { DashboardAluno } from './views/DashboardAluno';
import { DashboardProfessor } from './views/DashboardProfessor';
import { DashboardAdmin } from './views/DashboardAdmin';
import { User, GroupEvent, AdminNotification, MusicItem, UniformOrder } from './types';

function App() {
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

  const handleLogin = (loggedUser: User) => {
    // Mocking a graduation cost for demonstration purposes if logged in
    const userWithCost = {
        ...loggedUser,
        graduationCost: loggedUser.role === 'aluno' ? 150 : 250 // Example costs
    };
    setUser(userWithCost);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('home');
  };

  // Function to update user profile (e.g. Avatar)
  const handleUpdateProfile = (updatedData: Partial<User>) => {
    if (user) {
        setUser({ ...user, ...updatedData });
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

  const renderContent = () => {
    if (currentView === 'home' && !user) {
      return <Landing onLoginClick={() => setCurrentView('login')} />;
    }

    if (currentView === 'login') {
      return <Auth onLogin={handleLogin} onBack={() => setCurrentView('home')} />;
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

export default App;