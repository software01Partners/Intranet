import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/auth/callback'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Rotas do Next.js e assets estáticos
  const isNextRoute = pathname.startsWith('/_next') || pathname === '/favicon.ico';

  // Rotas de API de autenticação
  const isAuthApiRoute = pathname.startsWith('/api/auth');

  // Rotas de cron (protegidas por CRON_SECRET, não por sessão)
  const isCronRoute = pathname.startsWith('/api/cron');

  // Atualiza a sessão e verifica autenticação em uma única operação
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Uma única chamada auth — atualiza sessão E verifica usuário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se for rota pública, do Next.js ou API de auth, permite acesso
  if (isPublicRoute || isNextRoute || isAuthApiRoute || isCronRoute) {
    // Se estiver autenticado e tentando acessar /login, redireciona para /
    if (pathname === '/login' && user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // Para rotas protegidas: se não estiver autenticado, redireciona para /login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Usuário autenticado: permite acesso
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
