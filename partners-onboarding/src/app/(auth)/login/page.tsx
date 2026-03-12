'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

const emailPasswordSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const magicLinkSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
});

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

  const {
    register: registerEmailPassword,
    handleSubmit: handleSubmitEmailPassword,
    formState: { errors: errorsEmailPassword },
  } = useForm<EmailPasswordForm>({
    resolver: zodResolver(emailPasswordSchema),
  });

  const {
    register: registerMagicLink,
    handleSubmit: handleSubmitMagicLink,
    formState: { errors: errorsMagicLink },
  } = useForm<MagicLinkForm>({
    resolver: zodResolver(magicLinkSchema),
  });

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
    <div className="min-h-screen bg-gradient-to-b from-[#F8F9FC] to-[#6B2FA0]/5 dark:from-[#0F0F1A] dark:to-[#1A1A2E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B2FA0] to-[#F5A623] flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-3xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
              Partners
            </h1>
          </div>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-[#1A1A2E] border border-[#E2E5F1] dark:border-[#2D2D4A] rounded-2xl p-6 shadow-lg">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'email'
                  ? 'bg-[#6B2FA0] dark:bg-[#8B5CF6] text-white'
                  : 'bg-[#F8F9FC] dark:bg-[#0F0F1A] text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED]'
              }`}
            >
              Email/Senha
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('magic')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'magic'
                  ? 'bg-[#6B2FA0] dark:bg-[#8B5CF6] text-white'
                  : 'bg-[#F8F9FC] dark:bg-[#0F0F1A] text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED]'
              }`}
            >
              Magic Link
            </button>
          </div>

          {activeTab === 'email' && (
            <form
              onSubmit={handleSubmitEmailPassword(onSubmitEmailPassword)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED] mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...registerEmailPassword('email')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] text-[#1A1D2E] dark:text-[#E8E8ED] placeholder-[#9CA3C4] dark:placeholder-[#6B7194] focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 focus:border-[#6B2FA0] dark:focus:border-[#8B5CF6]"
                  placeholder="seu@email.com"
                />
                {errorsEmailPassword.email && (
                  <p className="mt-1 text-sm text-[#EF4444]">
                    {errorsEmailPassword.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED] mb-2"
                >
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  {...registerEmailPassword('password')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] text-[#1A1D2E] dark:text-[#E8E8ED] placeholder-[#9CA3C4] dark:placeholder-[#6B7194] focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 focus:border-[#6B2FA0] dark:focus:border-[#8B5CF6]"
                  placeholder="••••••••"
                />
                {errorsEmailPassword.password && (
                  <p className="mt-1 text-sm text-[#EF4444]">
                    {errorsEmailPassword.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#6B2FA0] dark:bg-[#8B5CF6] text-white rounded-xl font-semibold hover:bg-[#5A2788] dark:hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-[#6B2FA0] dark:text-[#8B5CF6] hover:text-[#5A2788] dark:hover:text-[#7C3AED] transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          )}

          {activeTab === 'magic' && (
            <form
              onSubmit={handleSubmitMagicLink(onSubmitMagicLink)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="magic-email"
                  className="block text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED] mb-2"
                >
                  Email
                </label>
                <input
                  id="magic-email"
                  type="email"
                  {...registerMagicLink('email')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] text-[#1A1D2E] dark:text-[#E8E8ED] placeholder-[#9CA3C4] dark:placeholder-[#6B7194] focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 focus:border-[#6B2FA0] dark:focus:border-[#8B5CF6]"
                  placeholder="seu@email.com"
                />
                {errorsMagicLink.email && (
                  <p className="mt-1 text-sm text-[#EF4444]">
                    {errorsMagicLink.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#6B2FA0] dark:bg-[#8B5CF6] text-white rounded-xl font-semibold hover:bg-[#5A2788] dark:hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-[#1A1D2E]/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1A1A2E] border border-[#E2E5F1] dark:border-[#2D2D4A] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
                Recuperar Senha
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  resetResetPassword();
                }}
                className="text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitResetPassword(onSubmitResetPassword)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-[#1A1D2E] dark:text-[#E8E8ED] mb-2"
                >
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  {...registerResetPassword('email')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#0F0F1A] border border-[#E2E5F1] dark:border-[#2D2D4A] text-[#1A1D2E] dark:text-[#E8E8ED] placeholder-[#9CA3C4] dark:placeholder-[#6B7194] focus:outline-none focus:ring-2 focus:ring-[#6B2FA0]/30 dark:focus:ring-[#8B5CF6]/30 focus:border-[#6B2FA0] dark:focus:border-[#8B5CF6]"
                  placeholder="seu@email.com"
                />
                {errorsResetPassword.email && (
                  <p className="mt-1 text-sm text-[#EF4444]">
                    {errorsResetPassword.email.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    resetResetPassword();
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#F1F3F8] dark:bg-[#2D2D4A] border border-[#E2E5F1] dark:border-[#2D2D4A] text-[#1A1D2E] dark:text-[#E8E8ED] rounded-xl font-medium hover:bg-[#E2E5F1] dark:hover:bg-[#3D3D5C] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-[#6B2FA0] dark:bg-[#8B5CF6] text-white rounded-xl font-semibold hover:bg-[#5A2788] dark:hover:bg-[#7C3AED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
