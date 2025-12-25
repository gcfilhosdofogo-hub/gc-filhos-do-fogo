import React from 'react';
import { Button } from '../components/Button';
import { Users, Calendar, MapPin, Instagram, MessageCircle } from 'lucide-react';
import { Logo } from '../components/Logo';

interface Props {
  onLoginClick: () => void;
}

export const Landing: React.FC<Props> = ({ onLoginClick }) => {
  return (
    <div className="flex flex-col min-h-screen">
      
      {/* Hero Section - Changed fixed h-[650px] to min-h-[85vh] to prevent clipping on mobile */}
      <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden py-20">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/90 via-stone-900/80 to-stone-900 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1542408375-9279769db387?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
            alt="" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-8 animate-fade-in-down hover:scale-105 transition-transform duration-500">
             <Logo variant="large" className="drop-shadow-[0_0_25px_rgba(249,115,22,0.3)]" />
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 sr-only">
            Filhos do Fogo
          </h1>
          <p className="text-xl md:text-2xl text-stone-300 mb-8 font-light max-w-2xl">
            Humildade, Disciplina e União
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto">
            <Button onClick={onLoginClick} className="text-lg px-8 py-4 w-full sm:w-auto shadow-orange-900/50">
              Área do Aluno
            </Button>
            
            <a 
              href="https://www.instagram.com/filhosdofogo2005" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" className="text-lg px-8 py-4 w-full flex items-center justify-center gap-2 hover:text-white hover:border-pink-600 hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 transition-all duration-300">
                <Instagram size={24} />
                Siga no Instagram
              </Button>
            </a>

            <a 
              href="https://discord.gg/AY2kk9Ubk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" className="text-lg px-8 py-4 w-full flex items-center justify-center gap-2 hover:text-white hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 transition-all duration-300">
                <MessageCircle size={24} />
                Discord
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-stone-900 py-24 px-4 border-t border-stone-800 relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Nossa Essência</h2>
            <div className="h-1 w-20 bg-orange-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-stone-800 p-8 rounded-2xl border border-stone-700 hover:border-orange-500 transition-colors group flex flex-col items-center text-center hover:-translate-y-2 duration-300 shadow-xl">
              <div className="p-4 bg-stone-900 rounded-full mb-6 group-hover:bg-orange-600/20 transition-colors">
                <Users className="w-10 h-10 text-stone-500 group-hover:text-orange-500 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Comunidade</h3>
              <p className="text-stone-400 leading-relaxed">Um ambiente acolhedor onde todos se ajudam a crescer, respeitando a hierarquia e a individualidade de cada capoeirista.</p>
            </div>
            
            <div className="bg-stone-800 p-8 rounded-2xl border border-stone-700 hover:border-orange-500 transition-colors group flex flex-col items-center text-center hover:-translate-y-2 duration-300 shadow-xl">
              <div className="p-4 bg-stone-900 rounded-full mb-6 group-hover:bg-orange-600/20 transition-colors">
                <Calendar className="w-10 h-10 text-stone-500 group-hover:text-orange-500 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Aulas Diárias</h3>
              <p className="text-stone-400 leading-relaxed">Treinos técnicos, físicos, teórico e musicais. Horários flexíveis para todos os níveis de graduação, do iniciante ao avançado.</p>
            </div>
            
            <div className="bg-stone-800 p-8 rounded-2xl border border-stone-700 hover:border-orange-500 transition-colors group flex flex-col items-center text-center hover:-translate-y-2 duration-300 shadow-xl">
              <div className="p-4 bg-stone-900 rounded-full mb-6 group-hover:bg-orange-600/20 transition-colors">
                <MapPin className="w-10 h-10 text-stone-500 group-hover:text-orange-500 transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Eventos</h3>
              <p className="text-stone-400 leading-relaxed">Participação em batizados, eventos e intercâmbios constantes com outros grupos do Brasil e do Mundo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-stone-950 py-12 px-4 border-t border-stone-900">
        <div className="max-w-7xl mx-auto flex justify-center items-center">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="text-stone-500 font-semibold">Filhos do Fogo © 2005</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
