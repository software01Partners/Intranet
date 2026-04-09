'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash.substring(1); // remove o #
      const hashParams = new URLSearchParams(hash);

      // Verificar se há erro no hash (ex: otp_expired)
      const hashError = hashParams.get('error_description');
      if (hashError) {
        setError(decodeURIComponent(hashError.replace(/\+/g, ' ')));
        return;
      }

      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (!accessToken || !refreshToken) {
        setError('Link inválido. Solicite um novo convite ao administrador.');
        return;
      }

      const supabase = createClient();

      // Definir a sessão manualmente com os tokens do hash
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError('Erro ao autenticar. Tente novamente ou solicite um novo link.');
        return;
      }

      // Convite ou recuperação → definir senha
      if (type === 'invite' || type === 'recovery') {
        router.push('/set-password');
      } else {
        router.push('/');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F3EF] to-[#1B4D3E]/5 dark:from-[#1A1A1A] dark:to-[#262626] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-[#D4A053] flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">P</span>
        </div>

        {error ? (
          <>
            <h2 className="text-lg font-semibold text-[#2D2A26] dark:text-[#E8E5E0] mb-2">
              Link inválido
            </h2>
            <p className="text-[#7A7468] dark:text-[#9A9590] mb-6">
              {error}
            </p>
            <a
              href="/login"
              className="inline-block py-2.5 px-6 bg-[#1B4D3E] dark:bg-[#34D399] text-white dark:text-[#1A1A1A] rounded-xl font-semibold hover:bg-[#153D31] dark:hover:bg-[#2BB585] transition-colors"
            >
              Voltar ao login
            </a>
          </>
        ) : (
          <p className="text-[#7A7468] dark:text-[#9A9590]">Autenticando...</p>
        )}
      </div>
    </div>
  );
}
