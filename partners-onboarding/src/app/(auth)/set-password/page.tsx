'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const setPasswordSchema = z
  .object({
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type SetPasswordForm = z.infer<typeof setPasswordSchema>;

export default function SetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onSubmit = async (data: SetPasswordForm) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error('Erro ao definir senha', {
          description: error.message,
        });
        return;
      }

      toast.success('Senha definida com sucesso!');
      router.push('/');
      router.refresh();
    } catch {
      toast.error('Erro inesperado', {
        description: 'Ocorreu um erro ao definir a senha. Tente novamente.',
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

        {/* Card */}
        <div className="bg-white dark:bg-[#262626] border border-[#E0DCD6] dark:border-[#3D3D3D] rounded-2xl p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#2D2A26] dark:text-[#E8E5E0]">
              Defina sua senha
            </h2>
            <p className="text-sm text-[#7A7468] dark:text-[#9A9590] mt-1">
              Crie uma senha para acessar a plataforma
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] mb-2"
              >
                Nova senha
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] text-[#2D2A26] dark:text-[#E8E5E0] placeholder-[#B0A99E] dark:placeholder-[#7A7468] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 dark:focus:ring-[#34D399]/30 focus:border-[#1B4D3E] dark:focus:border-[#34D399]"
                placeholder="Mínimo 6 caracteres"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-[#EF4444]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[#2D2A26] dark:text-[#E8E5E0] mb-2"
              >
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F3EF] dark:bg-[#1A1A1A] border border-[#E0DCD6] dark:border-[#3D3D3D] text-[#2D2A26] dark:text-[#E8E5E0] placeholder-[#B0A99E] dark:placeholder-[#7A7468] focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]/30 dark:focus:ring-[#34D399]/30 focus:border-[#1B4D3E] dark:focus:border-[#34D399]"
                placeholder="Repita a senha"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-[#EF4444]">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#1B4D3E] dark:bg-[#34D399] text-white dark:text-[#1A1A1A] rounded-xl font-semibold hover:bg-[#153D31] dark:hover:bg-[#2BB585] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Definir senha e continuar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
