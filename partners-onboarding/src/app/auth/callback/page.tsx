'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const handleCallback = async () => {
      // O Supabase client detecta automaticamente os tokens do hash da URL
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.push('/login?error=auth_failed');
        return;
      }

      // Verificar o type na URL (query param ou hash param)
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash.replace('#', ''));

      const type = searchParams.get('type') || hashParams.get('type');

      if (type === 'invite' || type === 'recovery') {
        router.push('/set-password');
      } else {
        router.push('/');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F3EF] to-[#1B4D3E]/5 dark:from-[#1A1A1A] dark:to-[#262626] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1B4D3E] to-[#D4A053] flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        <p className="text-[#7A7468] dark:text-[#9A9590]">Autenticando...</p>
      </div>
    </div>
  );
}
