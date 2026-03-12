'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

// Schema de validação para Email/Senha
const emailPasswordSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

// Schema de validação para Magic Link
const magicLinkSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
});

// Schema de validação para recuperação de senha
const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
});

type EmailPasswordForm = z.infer<typeof emailPasswordSchema>;
type MagicLinkForm = z.infer<typeof magicLinkSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

type TabType = 'email' | 'magic';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const supabase = createClient();

  // Formulário Email/Senha
  const {
    register: registerEmailPassword,
    handleSubmit: handleSubmitEmailPassword,
    formState: { errors: errorsEmailPassword },
  } = useForm<EmailPasswordForm>({
    resolver: zodResolver(emailPasswordSchema),
  });

  // Formulário Magic Link
  const {
    register: registerMagicLink,
    handleSubmit: handleSubmitMagicLink,
    formState: { errors: errorsMagicLink },
  } = useForm<MagicLinkForm>({
    resolver: zodResolver(magicLinkSchema),
  });

  // Formulário Reset Password
  const {
    register: registerResetPassword,
    handleSubmit: handleSubmitResetPassword,
    formState: { errors: errorsResetPassword },
    reset: resetResetPassword,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmitEmailPassword = async (data: EmailPasswordForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error('Erro ao fazer login', {
          description: error.message || 'Credenciais inválidas',
        });
        return;
      }

      toast.success('Login realizado com sucesso!');
      router.push('/');
      router.refresh();
    } catch (error) {
      toast.error('Erro inesperado', {
        description: 'Ocorreu um erro ao fazer login. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitMagicLink = async (data: MagicLinkForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error('Erro ao enviar link', {
          description: error.message || 'Não foi possível enviar o link de acesso',
        });
        return;
      }

      toast.success('Link enviado para seu email!', {
        description: 'Verifique sua caixa de entrada e clique no link para fazer login',
      });
    } catch (error) {
      toast.error('Erro inesperado', {
        description: 'Ocorreu um erro ao enviar o link. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitResetPassword = async (data: ResetPasswordForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        toast.error('Erro ao enviar email', {
          description: error.message || 'Não foi possível enviar o email de recuperação',
        });
        return;
      }

      toast.success('Email de recuperação enviado!', {
        description: 'Verifique sua caixa de entrada para redefinir sua senha',
      });
      setShowResetPassword(false);
      resetResetPassword();
    } catch (error) {
      toast.error('Erro inesperado', {
        description: 'Ocorreu um erro ao enviar o email. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Partners</h1>
        </div>

        {/* Card de Login */}
        <div className="bg-[#13131A] border border-[#262630] rounded-xl p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'email'
                  ? 'bg-[#E8580C] text-white'
                  : 'bg-[#0A0A0F] text-gray-400 hover:text-white'
              }`}
            >
              Email/Senha
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('magic')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'magic'
                  ? 'bg-[#E8580C] text-white'
                  : 'bg-[#0A0A0F] text-gray-400 hover:text-white'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Formulário Email/Senha */}
          {activeTab === 'email' && (
            <form onSubmit={handleSubmitEmailPassword(onSubmitEmailPassword)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...registerEmailPassword('email')}
                  className="w-full px-4 py-2 bg-[#0A0A0F] border border-[#262630] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E8580C] focus:border-transparent"
                  placeholder="seu@email.com"
                />
                {errorsEmailPassword.email && (
                  <p className="mt-1 text-sm text-red-400">{errorsEmailPassword.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  {...registerEmailPassword('password')}
                  className="w-full px-4 py-2 bg-[#0A0A0F] border border-[#262630] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E8580C] focus:border-transparent"
                  placeholder="••••••••"
                />
                {errorsEmailPassword.password && (
                  <p className="mt-1 text-sm text-red-400">{errorsEmailPassword.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#E8580C] text-white rounded-lg font-medium hover:bg-[#D14A0A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-[#E8580C] hover:text-[#D14A0A] transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          )}

          {/* Formulário Magic Link */}
          {activeTab === 'magic' && (
            <form onSubmit={handleSubmitMagicLink(onSubmitMagicLink)} className="space-y-4">
              <div>
                <label htmlFor="magic-email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="magic-email"
                  type="email"
                  {...registerMagicLink('email')}
                  className="w-full px-4 py-2 bg-[#0A0A0F] border border-[#262630] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E8580C] focus:border-transparent"
                  placeholder="seu@email.com"
                />
                {errorsMagicLink.email && (
                  <p className="mt-1 text-sm text-red-400">{errorsMagicLink.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#E8580C] text-white rounded-lg font-medium hover:bg-[#D14A0A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#13131A] border border-[#262630] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recuperar Senha</h2>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  resetResetPassword();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitResetPassword(onSubmitResetPassword)} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  {...registerResetPassword('email')}
                  className="w-full px-4 py-2 bg-[#0A0A0F] border border-[#262630] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E8580C] focus:border-transparent"
                  placeholder="seu@email.com"
                />
                {errorsResetPassword.email && (
                  <p className="mt-1 text-sm text-red-400">{errorsResetPassword.email.message}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    resetResetPassword();
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#0A0A0F] border border-[#262630] text-white rounded-lg font-medium hover:bg-[#1A1A1F] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-[#E8580C] text-white rounded-lg font-medium hover:bg-[#D14A0A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
