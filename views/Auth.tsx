import React, { useState, useMemo } from 'react';
import { Button } from '../components/Button';
import { UserRole, User } from '../types';
import { ArrowLeft, Mail, Lock, User as UserIcon, Eye, EyeOff, GraduationCap, Calendar } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../src/integrations/supabase/client'; // Corrected path

interface Props {
  onLogin: (user: User) => void; // This prop will now be less critical as Supabase handles login state
  onBack: () => void;
}

export const Auth: React.FC<Props> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              nickname: nickname,
            }
          }
        });
        if (error) throw error;
        alert('Verifique seu e-mail para confirmar o cadastro!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onLogin will be handled by the session listener in App.tsx
      }
    } catch (error: any) {
      alert(error.message || 'Erro de autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-stone-900">
      <div className="w-full max-w-md bg-stone-800 rounded-2xl shadow-2xl border border-stone-700 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-8 text-center relative overflow-hidden">
          <div className="relative z-10 flex justify-center mb-4">
            <Logo className="h-24 w-24 drop-shadow-lg rounded-full border-2 border-white/20" variant="large" />
          </div>

          <h2 className="relative z-10 text-2xl font-bold text-white">
            {isSignUp ? 'Criar Conta' : 'Acesse sua Conta'}
          </h2>
          <p className="relative z-10 text-white/80 text-sm mt-2">
            {isSignUp ? 'Preencha os dados para se cadastrar' : 'Entre para acessar seu painel'}
          </p>

          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
        </div>

        {/* Custom Auth Form */}
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-stone-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>
            
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 text-stone-500" size={18} />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="Seu nome"
                      required={isSignUp}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">Apelido (Capoeira)</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 text-stone-500" size={18} />
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="Seu apelido"
                      required={isSignUp}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-stone-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2 pl-10 pr-10 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-stone-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="mt-6 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3"
            >
              {loading ? 'Carregando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-400">
            {isSignUp ? (
              <p>
                Já tem uma conta?{' '}
                <button onClick={() => setIsSignUp(false)} className="text-orange-500 hover:text-orange-400 font-bold hover:underline">
                  Entrar
                </button>
              </p>
            ) : (
              <p>
                Não tem uma conta?{' '}
                <button onClick={() => setIsSignUp(true)} className="text-orange-500 hover:text-orange-400 font-bold hover:underline">
                  Cadastre-se
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
