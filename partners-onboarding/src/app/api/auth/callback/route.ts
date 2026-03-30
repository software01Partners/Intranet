import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
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
      // Troca o code por sessão
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Erro ao trocar code por sessão:', error);
        return NextResponse.redirect(
          new URL('/login?error=auth_failed', requestUrl.origin)
        );
      }

      // Redireciona para a página inicial após autenticação bem-sucedida
      return NextResponse.redirect(new URL('/', requestUrl.origin));
    } catch (error) {
      console.error('Erro inesperado no callback:', error);
      return NextResponse.redirect(
        new URL('/login?error=unexpected_error', requestUrl.origin)
      );
    }
  }

  // Se não houver code, redireciona para login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
