"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../components/SessionContextProvider';
import { User, UserRole, ALL_BELTS } from '../../types';
import { Button } from '../../components/Button';
import { ArrowLeft, User as UserIcon, GraduationCap, Calendar, Phone, Save, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/Logo';

interface ProfileSetupProps {
  onProfileComplete: (user: User) => void;
  onBack: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ onProfileComplete, onBack }) => {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    nickname: '',
    birth_date: '',
    phone: '',
    belt: ALL_BELTS[0],
    role: 'aluno' as UserRole, // Default role, not user selectable
    professor_name: '',
    graduation_cost: undefined as number | undefined, // Explicitly include graduation_cost
  });
  const [isNewUser, setIsNewUser] = useState(false);
  const [availableProfessors, setAvailableProfessors] = useState<User[]>([]); // New state for professors

  useEffect(() => {
    const fetchProfileAndProfessors = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      // Fetch current user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, nickname, birth_date, phone, belt, role, professor_name, graduation_cost')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setFormData({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          nickname: profileData.nickname || '',
          birth_date: profileData.birth_date || '',
          phone: profileData.phone || '',
          belt: profileData.belt || ALL_BELTS[0],
          role: profileData.role as UserRole || 'aluno',
          professor_name: profileData.professor_name || '',
          graduation_cost: profileData.graduation_cost !== null ? Number(profileData.graduation_cost) : undefined,
        });
        setIsNewUser(false);
      } else {
        // No profile found, it's a new user
        setIsNewUser(true);
        const emailNamePart = session.user.email?.split('@')[0];
        setFormData(prev => ({
          ...prev,
          first_name: emailNamePart || '',
        }));
      }

      // Fetch available professors and admins from the new view
      const { data: profsData, error: profsError } = await supabase
        .from('professor_admin_profiles') // Fetching from the new view
        .select('id, first_name, last_name, nickname, role');

      if (profsError) {
        console.error('Error fetching professors from view:', profsError);
      } else {
        const filteredProfs: User[] = (profsData || [])
          .map(p => ({
            id: p.id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.nickname || 'Usuário',
            nickname: p.nickname || undefined,
            email: '', 
            role: p.role as UserRole,
            first_name: p.first_name || undefined,
            last_name: p.last_name || undefined,
          }));
        setAvailableProfessors(filteredProfs);
      }
      
      setLoading(false);
    };

    fetchProfileAndProfessors();
  }, [session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!session) {
      alert('Você precisa estar logado para completar seu perfil.');
      setLoading(false);
      return;
    }

    const profileData = {
      id: session.user.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      nickname: formData.nickname,
      birth_date: formData.birth_date || null,
      phone: formData.phone || null,
      belt: formData.belt,
      role: formData.role, // Role is not user selectable, it's set by admin or default
      professor_name: formData.professor_name || null,
      graduation_cost: formData.graduation_cost !== undefined ? formData.graduation_cost : null, // Ensure graduation_cost is sent
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(profileData, {
      onConflict: 'id',
    });

    if (error) {
      console.error('Error saving profile:', error);
      alert('Erro ao salvar perfil: ' + error.message);
    } else {
      alert('Perfil salvo com sucesso!');
      const updatedUser: User = {
        id: session.user.id,
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        nickname: formData.nickname || undefined,
        email: session.user.email || '',
        role: formData.role,
        belt: formData.belt,
        phone: formData.phone || undefined,
        professorName: formData.professor_name || undefined,
        birthDate: formData.birth_date || undefined,
        first_name: formData.first_name,
        last_name: formData.last_name,
        graduationCost: formData.graduation_cost, // Include graduation_cost
      };
      onProfileComplete(updatedUser);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <p className="text-white text-xl">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-stone-900">
      <div className="w-full max-w-md bg-stone-800 rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-8 text-center relative overflow-hidden">
          <button onClick={onBack} className="absolute top-4 left-4 text-white/80 hover:text-white z-10">
            <ArrowLeft />
          </button>
          
          <div className="relative z-10 flex justify-center mb-4">
             <Logo className="h-24 w-24 drop-shadow-lg rounded-full border-2 border-white/20" variant="large" />
          </div>
          
          <h2 className="relative z-10 text-2xl font-bold text-white">
            {isNewUser ? 'Complete seu Perfil' : 'Editar Perfil'}
          </h2>
          <p className="relative z-10 text-white/80 text-sm mt-2">
            {isNewUser ? 'Preencha seus dados para começar!' : 'Atualize suas informações'}
          </p>

          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {isNewUser && (
            <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-400 p-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle size={18} />
              <p>Bem-vindo(a)! Por favor, complete seu perfil.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm text-stone-400 mb-1">Primeiro Nome</label>
              <input 
                type="text" 
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm text-stone-400 mb-1">Sobrenome</label>
              <input 
                type="text" 
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm text-stone-400 mb-1">Apelido (Capoeira)</label>
            <input 
              type="text" 
              id="nickname"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
              placeholder="Ex: Gafanhoto"
              required
            />
          </div>

          <div>
            <label htmlFor="birth_date" className="block text-sm text-stone-400 mb-1">Data de Nascimento</label>
            <input 
              type="date" 
              id="birth_date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white [color-scheme:dark]"
              required
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm text-stone-400 mb-1">WhatsApp (Ex: 5511999999999)</label>
            <input 
              type="text" 
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
              placeholder="5511999999999"
            />
          </div>

          <div>
            <label htmlFor="belt" className="block text-sm text-stone-400 mb-1">Cordel / Graduação</label>
            <select 
              id="belt"
              name="belt"
              value={formData.belt}
              onChange={handleChange}
              className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
            >
              {ALL_BELTS.map(belt => (
                <option key={belt} value={belt}>{belt}</option>
              ))}
            </select>
          </div>

          {formData.role === 'aluno' && (
            <div>
              <label htmlFor="professor_name" className="block text-sm text-stone-400 mb-1">Professor Responsável</label>
              <select 
                id="professor_name"
                name="professor_name"
                value={formData.professor_name}
                onChange={handleChange}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-white"
              >
                <option value="">Selecione um professor</option>
                {availableProfessors.map(prof => (
                  <option key={prof.id} value={prof.nickname || prof.first_name || prof.name}>
                    {prof.nickname ? `${prof.nickname} (${prof.first_name || prof.name})` : prof.first_name || prof.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Perfil'}
          </Button>
        </form>
      </div>
    </div>
  );
};