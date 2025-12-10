import React, { useState, useMemo } from 'react';
import { Button } from '../components/Button';
import { UserRole, User } from '../types';
import { ArrowLeft, Mail, Lock, User as UserIcon, Eye, EyeOff, GraduationCap, Calendar } from 'lucide-react';
import { Logo } from '../components/Logo';

interface Props {
  onLogin: (user: User) => void;
  onBack: () => void;
}

// Configuration of Belts (Cordéis)
const BELT_SYSTEM = {
  ALUNO: [
    { name: "Cordel Cinza", color: "linear-gradient(to right, #9ca3af, #d1d5db)" },
    { name: "Cordel Verde", color: "#16a34a" },
    { name: "Cordel Verde ponta Amarelo", color: "linear-gradient(to right, #16a34a 80%, #facc15 20%)" },
    { name: "Cordel Verde ponta Azul", color: "linear-gradient(to right, #16a34a 80%, #2563eb 20%)" },
    { name: "Cordel Verde e Amarelo", color: "linear-gradient(to right, #16a34a, #facc15)" },
    { name: "Cordel Verde e Amarelo ponta Verde", color: "linear-gradient(to right, #16a34a, #facc15, #16a34a)" },
    { name: "Cordel Verde e Amarelo ponta Amarelo", color: "linear-gradient(to right, #16a34a, #facc15, #facc15)" },
    { name: "Cordel Verde e Amarelo ponta Azul", color: "linear-gradient(to right, #16a34a, #facc15, #2563eb)" },
    { name: "Cordel Amarelo", color: "#facc15" },
    { name: "Cordel Amarelo ponta Verde", color: "linear-gradient(to right, #facc15 80%, #16a34a 20%)" },
    { name: "Cordel Amarelo ponta Azul", color: "linear-gradient(to right, #facc15 80%, #2563eb 20%)" },
  ],
  PROFESSOR: [
    { name: "Cordel Amarelo e Azul (Instrutor)", color: "linear-gradient(to right, #facc15, #2563eb)" },
    { name: "Cordel Amarelo e Azul ponta Amarelo (Instrutor I)", color: "linear-gradient(to right, #facc15, #2563eb, #facc15)" },
    { name: "Cordel Amarelo e Azul ponta Azul (Instrutor II)", color: "linear-gradient(to right, #facc15, #2563eb, #2563eb)" },
    { name: "Cordel Azul (Professor)", color: "#2563eb" },
    { name: "Cordel Azul ponta Verde e Amarelo (Professor I)", color: "linear-gradient(to right, #2563eb 70%, #16a34a 15%, #facc15 15%)" },
    { name: "Cordel Verde, Amarelo, Azul e Branco (Mestrando)", color: "linear-gradient(to right, #16a34a, #facc15, #2563eb, #ffffff)" },
    { name: "Cordel Verde e Branco (Mestre I)", color: "linear-gradient(to right, #16a34a, #ffffff)" },
    { name: "Cordel Amarelo e Branco (Mestre II)", color: "linear-gradient(to right, #facc15, #ffffff)" },
    { name: "Cordel Azul e Branco (Mestre III)", color: "linear-gradient(to right, #2563eb, #ffffff)" },
    { name: "Cordel Branco (Grão-Mestre)", color: "#ffffff" },
  ]
};

// Hardcoded Users Data
const PREDEFINED_USERS = [
  {
    name: "Marcos Antonio Soares Rodrigues",
    nickname: "Anjo de Fogo",
    email: "mestrefogo64@gmail.com",
    role: "admin",
    password: "anjodefogogcff",
    belt: "Cordel Branco (Grão-Mestre)",
    beltColor: "#ffffff",
    birthDate: "1964-01-01"
  },
  {
    name: "Jean da Silva Ramos",
    nickname: "Aquiles",
    email: "jeanstiflerramos@gmail.com",
    role: "admin", // Professor/Admin
    password: "aquilesgcff",
    belt: "Cordel Azul (Professor)", 
    beltColor: "#2563eb",
    birthDate: "1985-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Adriano de Freitas e Souza",
    nickname: "Wolverine",
    email: "adrinowol@gmail.com",
    role: "admin", // Professor/Admin
    password: "wolverinegcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1985-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Vicente José Ferreira neto",
    nickname: "Anu Branco",
    email: "nb8124369@gmail.com",
    role: "professor",
    password: "anubrancogcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1990-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Jefferson dos Santos Gomes",
    nickname: "Zeus",
    email: "jeffersongomezntt@gmail.com",
    role: "professor",
    password: "zeusgcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1990-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Roberto Santos Merlino",
    nickname: "Pequeno Fogo",
    email: "robertomerlinorj@gmail.com",
    role: "professor",
    password: "pequenofogogcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1990-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Wallace Carlos de Almeida",
    nickname: "Fênix",
    email: "wcaaantos@gmail.com",
    role: "professor",
    password: "fenixgcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1990-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Gutierrez Henrique Moreira da Silva",
    nickname: "Gigante",
    email: "henriquegutierrez115@gmail.com",
    role: "professor",
    password: "gigantegcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1990-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Manoel Carlos Souza de Araujo",
    nickname: "Anjo de Luz",
    email: "manoelcarlos232418@gmail.com",
    role: "professor",
    password: "anjodeluzgcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1990-01-01",
    professorName: "Anjo de Fogo"
  },
  {
    name: "Vitor Geraldo Carbunk",
    nickname: "Lion",
    email: "vitor.carbunk1@gmail.com",
    role: "professor",
    password: "liongcff",
    belt: "Cordel Azul (Professor)",
    beltColor: "#2563eb",
    birthDate: "1990-01-01",
    professorName: "Anjo de Fogo"
  },
  // --- USUÁRIOS DE TESTE ---
  {
    name: "Aluno Teste Maior",
    nickname: "O Maior",
    email: "maior@teste.com",
    role: "aluno",
    password: "123",
    belt: "Cordel Cinza",
    beltColor: "linear-gradient(to right, #9ca3af, #d1d5db)",
    birthDate: "2000-01-01", // 24 anos
    professorName: "Vicente \"Anu Branco\""
  },
  {
    name: "Aluno Teste Menor",
    nickname: "O Menor",
    email: "menor@teste.com",
    role: "aluno",
    password: "123",
    belt: "Cordel Cinza",
    beltColor: "linear-gradient(to right, #9ca3af, #d1d5db)",
    birthDate: "2015-01-01", // 9 anos
    professorName: "Vicente \"Anu Branco\""
  }
];

export const Auth: React.FC<Props> = ({ onLogin, onBack }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register/Change Password State
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedBelt, setSelectedBelt] = useState(BELT_SYSTEM.ALUNO[0].name);
  const [selectedProfessor, setSelectedProfessor] = useState('');

  // Extract valid professors for selection (Professors + Aquiles + Wolverine)
  const professorsList = useMemo(() => {
    return PREDEFINED_USERS.filter(user => 
      user.role === 'professor' || 
      ['Aquiles', 'Wolverine'].includes(user.nickname || '')
    ).map(user => user.nickname);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showChangePassword) {
      if (newPassword !== confirmPassword) {
        alert("As senhas não conferem.");
        return;
      }
      alert("Senha alterada com sucesso! Por favor, faça login com a nova senha.");
      setShowChangePassword(false);
      setPassword('');
      return;
    }

    // Check predefined users first
    const foundUser = PREDEFINED_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (foundUser) {
      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        name: foundUser.name,
        nickname: foundUser.nickname,
        email: foundUser.email,
        role: foundUser.role as UserRole,
        belt: foundUser.belt,
        beltColor: foundUser.beltColor,
        birthDate: foundUser.birthDate,
        professorName: (foundUser as any).professorName 
      });
      return;
    }

    if (isRegister) {
      if (!selectedProfessor) {
        alert("Por favor, selecione seu professor.");
        return;
      }

      const beltInfo = BELT_SYSTEM.ALUNO.find(b => b.name === selectedBelt) || BELT_SYSTEM.ALUNO[0];
      
      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        nickname: nickname,
        email: email,
        role: 'aluno',
        belt: beltInfo.name,
        beltColor: beltInfo.color,
        professorName: selectedProfessor,
        birthDate: birthDate
      });
    } else {
      alert("Usuário não encontrado ou senha incorreta. Tente: mestrefogo64@gmail.com / anjodefogogcff");
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setShowChangePassword(false);
    setSelectedProfessor('');
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
            {showChangePassword ? 'Trocar Senha' : (isRegister ? 'Junte-se à Roda' : 'Bem-vindo de volta')}
          </h2>
          <p className="relative z-10 text-white/80 text-sm mt-2">
            {showChangePassword ? 'Defina sua nova senha de acesso' : (isRegister ? 'Crie sua conta de aluno' : 'Entre para acessar seu painel')}
          </p>

          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {(isRegister) && (
               <>
                 <div className="space-y-1">
                  <label className="text-sm text-stone-400 ml-1">Nome Completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>
                 <div className="space-y-1">
                  <label className="text-sm text-stone-400 ml-1">Apelido (Capoeira)</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="Ex: Gafanhoto"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-stone-400 ml-1">Data de Nascimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm text-stone-400 ml-1">Seu Professor</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                    <select
                      value={selectedProfessor}
                      required
                      onChange={(e) => setSelectedProfessor(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all appearance-none"
                    >
                      <option value="" disabled>Selecione seu professor...</option>
                      {professorsList.map((prof) => (
                        <option key={prof} value={prof}>{prof}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-stone-400 ml-1">Cordel Atual</label>
                  <select
                    value={selectedBelt}
                    onChange={(e) => setSelectedBelt(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 px-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all appearance-none"
                  >
                    {BELT_SYSTEM.ALUNO.map((belt) => (
                      <option key={belt.name} value={belt.name}>{belt.name}</option>
                    ))}
                  </select>
                </div>
               </>
            )}

            {!showChangePassword && (
              <div className="space-y-1">
                <label className="text-sm text-stone-400 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            )}

            {!showChangePassword && (
              <div className="space-y-1">
                <label className="text-sm text-stone-400 ml-1">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-10 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-stone-500 hover:text-white">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {showChangePassword && (
              <>
                 <div className="space-y-1">
                  <label className="text-sm text-stone-400 ml-1">Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="Nova senha"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-stone-400 ml-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-stone-500 w-5 h-5" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      placeholder="Repita a senha"
                    />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" fullWidth className="mt-6">
              {showChangePassword ? 'Salvar Nova Senha' : (isRegister ? 'Criar Conta' : 'Entrar')}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2 text-center">
            {!showChangePassword && (
              <button
                onClick={toggleMode}
                className="text-stone-400 hover:text-orange-500 text-sm transition-colors"
              >
                {isRegister ? 'Já tem conta? Faça login' : 'Aluno novo? Cadastre-se'}
              </button>
            )}
            
            {!isRegister && !showChangePassword && (
              <button
                onClick={() => setShowChangePassword(true)}
                className="text-stone-500 hover:text-stone-300 text-xs transition-colors"
              >
                Primeiro acesso / Trocar Senha
              </button>
            )}

            {showChangePassword && (
               <button
                onClick={() => setShowChangePassword(false)}
                className="text-stone-400 hover:text-white text-sm transition-colors"
              >
                Voltar para Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};