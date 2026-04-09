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

const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
});

type EmailPasswordForm = z.infer<typeof emailPasswordSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function LoginPage() {
  const router = useRouter();
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
    } catch {
      toast.error('Erro inesperado', {
        description: 'Ocorreu um erro ao fazer login. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitResetPassword = async (data: ResetPasswordForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?flow=recovery`,
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
    } catch {
      toast.error('Erro inesperado', {
        description: 'Ocorreu um erro ao enviar o email. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F3EF] to-[#1B4D3E]/5 dark:from-[#1A1A1A] dark:to-[#262626] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-[#D4A053] flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <h1 className="text-3xl font-bold text-[#2D2A26] dark:text-[#E8E5E0]">
              Partners
            </h1>
          </div>
        </div>

        {/* Card de Login */}
        <div className="bg-white dark:bg-[#262626] border border-[#E0DCD6] dark:border-[#3D3D3D] rounded-2xl p-6 shadow-lg">
          <form
            onSubmit={handleSubmitEmailPassword(onSubmitEmailPassword)}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                {...registerEmailPassword('email')}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] text-[#2D2A26] dark:text-[#E8E5E0] placeholder-[#B0A99E] dark:placeholder-[#7A7468] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 dark:focus:ring-[#34D399]/30 focus:border-[#1B4D3E] dark:focus:border-[#34D399]"
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
                className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] mb-2"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                {...registerEmailPassword('password')}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] text-[#2D2A26] dark:text-[#E8E5E0] placeholder-[#B0A99E] dark:placeholder-[#7A7468] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 dark:focus:ring-[#34D399]/30 focus:border-[#1B4D3E] dark:focus:border-[#34D399]"
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
              className="w-full py-2.5 px-4 bg-[#1B4D3E] dark:bg-[#34D399] text-white dark:text-[#1A1A1A] rounded-xl font-semibold hover:bg-[#153D31] dark:hover:bg-[#2BB585] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-[#1B4D3E] dark:text-[#34D399] hover:text-[#153D31] dark:hover:text-[#2BB585] transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-[#2D2A26]/50 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#262626] border border-[#E0DCD6] dark:border-[#3D3D3D] rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#2D2A26] dark:text-[#E8E5E0]">
                Recuperar Senha
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  resetResetPassword();
                }}
                className="text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] transition-colors"
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
                  className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] mb-2"
                >
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  {...registerResetPassword('email')}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] text-[#2D2A26] dark:text-[#E8E5E0] placeholder-[#B0A99E] dark:placeholder-[#7A7468] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 dark:focus:ring-[#34D399]/30 focus:border-[#1B4D3E] dark:focus:border-[#34D399]"
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
                  className="flex-1 py-2.5 px-4 bg-[#EDE9E3] dark:bg-[#3D3D3D] border border-[#E0DCD6] dark:border-[#3D3D3D] text-[#2D2A26] dark:text-[#E8E5E0] rounded-xl font-medium hover:bg-[#E0DCD6] dark:hover:bg-[#4D4D4D] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 bg-[#1B4D3E] dark:bg-[#34D399] text-white dark:text-[#1A1A1A] rounded-xl font-semibold hover:bg-[#153D31] dark:hover:bg-[#2BB585] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
