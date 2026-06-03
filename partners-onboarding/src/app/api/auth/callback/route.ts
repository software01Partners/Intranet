import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

// Tipos de OTP por email aceitos pelo verifyOtp (token hash).
type EmailOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change' | 'email';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const flow = requestUrl.searchParams.get('flow');

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Ignora erros de setAll em Server Components
          }
        },
      },
    }
  );

  try {
    // Fluxo token hash (verifyOtp) — recomendado: NÃO depende de cookie no
    // navegador, então funciona mesmo se o usuário abrir o link em outro
    // dispositivo/navegador (recuperação de senha, convite, magic link).
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

      if (error) {
        console.error('Erro ao verificar token (verifyOtp):', error);
        return NextResponse.redirect(
          new URL('/login?error=auth_failed', requestUrl.origin)
        );
      }

      // Recuperação de senha ou convite → definir senha
      if (type === 'recovery' || type === 'invite') {
        return NextResponse.redirect(new URL('/set-password', requestUrl.origin));
      }

      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }

    // Fluxo PKCE (code) — mantido para compatibilidade com links antigos.
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Erro ao trocar code por sessão:', error);
        return NextResponse.redirect(
          new URL('/login?error=auth_failed', requestUrl.origin)
        );
      }

      // Convite ou recuperação de senha → redireciona para definir senha
      if (flow === 'invite' || flow === 'recovery') {
        return NextResponse.redirect(new URL('/set-password', requestUrl.origin));
      }

      // Redireciona para a página inicial após autenticação bem-sucedida
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    }
  } catch (error) {
    console.error('Erro inesperado no callback:', error);
    return NextResponse.redirect(
      new URL('/login?error=unexpected_error', requestUrl.origin)
    );
  }

  // Se não houver code nem token_hash, redireciona para login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
