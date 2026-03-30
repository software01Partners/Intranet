# Partners Onboarding Platform

## Sobre
Plataforma interna de onboarding para ~100 colaboradores da Partners Comunicação Integrada.

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage)
- Cloudflare R2 (vídeos)
- Vercel (deploy)

## Comandos
- `npm run dev` — rodar local
- `npm run build` — build de produção
- `npm run lint` — verificar erros

## Estrutura
- src/app/ — páginas (App Router)
- src/components/ — componentes reutilizáveis
- src/lib/ — supabase clients, utils, types
- src/hooks/ — hooks customizados
- src/app/api/ — API routes

## Banco de Dados (Supabase)
8 tabelas: areas, users, trails, modules, user_progress, quiz_questions, certificates, notifications

## Roles
- Colaborador: faz trilhas, quizzes, vê progresso
- Gestor: "admin da área" — CRUD trilhas/módulos SÓ da área dele + painel equipe da área
- Admin: controle total de todas as áreas + gestão de usuários

## Tipos de Trilha
- obrigatoria_global: area_id=NULL, todos vêem
- obrigatoria_area: area_id=uuid, só a área vê
- optativa_global: area_id=NULL, todos vêem, opcional
- optativa_area: area_id=uuid, só a área vê, opcional

## Regras Importantes
- Server Components por padrão, "use client" só quando necessário
- Nunca passar ícones lucide-react de Server → Client Component (extrair para wrapper 'use client')
- Supabase client sempre de src/lib/supabase/ (nunca instanciar direto)
- RLS ativo em todas as tabelas
- Quiz corrigido no server (API Route)
- Gestor só acessa dados da area_id dele
- Upload: vídeos → R2, PDFs → Supabase Storage (bucket "documents")
- Cores da marca: primária roxo #6B2FA0, accent dourado #F5A623

## Problemas Conhecidos e Resolvidos
- RLS circular na tabela users → resolvido com função get_user_role() SECURITY DEFINER
- Hydration mismatch em Input.tsx → resolvido com useId()
- framer-motion animate sobrescreve Tailwind lg:translate-x-0 → usar classes condicionais
- react-player não funciona com signed URLs do R2 → usar <video> nativo
- existingProgress null no quiz check → verificar null antes de acessar .completed
- Next.js 15+: searchParams e params são Promises → sempre tipar como Promise<{...}> e usar await