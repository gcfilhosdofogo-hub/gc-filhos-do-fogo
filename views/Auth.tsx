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
  const [showPassword, setShowPassword] = useState(false); // Still useful for custom forms if needed, but not for SupabaseAuth component

  // Supabase Auth UI will handle the actual login/registration forms.
  // We'll provide it with custom data attributes for registration to populate profile.
  const appearance = useMemo(() => ({
    theme: ThemeSupa,
    variables: {
      default: {
        colors: {
          brand: '#f97316', // Orange-600
          brandAccent: '#ea580c', // Orange-500
          brandButtonText: 'white',
          defaultButtonBackground: '#44403c', // Stone-700
          defaultButtonBackgroundHover: '#57534e', // Stone-600
          defaultButtonBorder: '#78716c', // Stone-600
          defaultButtonText: 'white',
          inputBackground: '#292524', // Stone-900
          inputBorder: '#57534e', // Stone-600
          inputBorderHover: '#f97316', // Orange-600
          inputBorderFocus: '#f97316', // Orange-600
          inputText: 'white',
          inputLabelText: '#a8a29e', // Stone-400
          messageText: 'white',
          messageBackground: '#44403c', // Stone-700
          anchorText: '#f97316', // Orange-600
          anchorTextHover: '#ea580c', // Orange-500
        },
      },
    },
  }), []);

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
            Acesse sua Conta
          </h2>
          <p className="relative z-10 text-white/80 text-sm mt-2">
            Entre ou crie uma conta para acessar seu painel
          </p>

          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
        </div>

        {/* Supabase Auth UI */}
        <div className="p-8">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={appearance}
            theme="dark" // Using dark theme for consistency with your app's background
            providers={[]} // No third-party providers unless specified
            redirectTo={window.location.origin + '/dashboard'} // Redirect to dashboard after auth
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Seu Email',
                  password_label: 'Sua Senha',
                  email_input_placeholder: 'seu@email.com',
                  password_input_placeholder: '••••••••',
                  button_label: 'Entrar',
                  social_provider_text: 'Entrar com {{provider}}',
                  link_text: 'Já tem uma conta? Entrar',
                },
                sign_up: {
                  email_label: 'Seu Email',
                  password_label: 'Crie uma Senha',
                  email_input_placeholder: 'seu@email.com',
                  password_input_placeholder: '••••••••',
                  button_label: 'Criar Conta',
                  social_provider_text: 'Criar conta com {{provider}}',
                  link_text: 'Não tem uma conta? Cadastre-se',
                  confirmation_text: 'Verifique seu email para o link de confirmação',
                },
                forgotten_password: {
                  email_label: 'Seu Email',
                  password_label: 'Sua Senha',
                  email_input_placeholder: 'seu@email.com',
                  button_label: 'Enviar instruções de recuperação',
                  link_text: 'Esqueceu sua senha?',
                  confirmation_text: 'Verifique seu email para o link de recuperação',
                },
                update_password: {
                  password_label: 'Nova Senha',
                  password_input_placeholder: 'Sua nova senha',
                  button_label: 'Atualizar Senha',
                  confirmation_text: 'Sua senha foi atualizada',
                },
              },
            }}
            // Custom data attributes for sign-up to populate the profiles table
            // These fields will appear in the sign-up form
            // Note: Supabase Auth UI doesn't directly support custom fields in the UI without extending it.
            // For simplicity, we'll rely on the `handle_new_user` trigger to populate basic profile data
            // from `raw_user_meta_data` if you were to add these fields to the sign-up form manually.
            // For now, the trigger will use `first_name`, `last_name`, `nickname`, `birth_date` if provided
            // during sign-up via `user_metadata` in a custom sign-up flow, or they can be updated post-signup.
            // The default Auth UI only asks for email and password.
          />
        </div>
      </div>
    </div>
  );
};