import React, { useState } from 'react';
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { Logo } from './Logo';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="bg-stone-900 border-b border-stone-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer flex items-center gap-3" onClick={() => onNavigate('home')}>
            <Logo className="h-10 w-10" />
            <span className="font-extrabold text-2xl tracking-tight hidden sm:block bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 text-transparent bg-clip-text drop-shadow-sm">
              Filhos do Fogo
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {user ? (
                <>
                  <div className="text-stone-300 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                    <UserIcon size={16} />
                    Olá, {user.name} ({user.role})
                  </div>
                  <button
                    onClick={onLogout}
                    className="bg-stone-800 hover:bg-stone-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 focus:outline-none"
            >
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-stone-900 border-b border-stone-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {user ? (
              <>
                 <div className="text-stone-300 block px-3 py-2 rounded-md text-base font-medium">
                    Olá, {user.name}
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className="text-stone-300 hover:bg-stone-800 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium flex items-center gap-2"
                  >
                    <LogOut size={18} />
                    Sair
                  </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onNavigate('login');
                  setIsOpen(false);
                }}
                className="text-orange-500 hover:bg-stone-800 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
              >
                Área do Aluno / Professor
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};