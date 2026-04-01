import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UserTable } from '@/components/admin/UserTable';
import type { UserRole } from '@/lib/types';

async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as UserRole;
}

export default async function UsuariosPage() {
  const role = await getUserRole();

  // Verificar se é admin, senão redirecionar
  if (role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-1">
          Gestão de Usuários
        </h1>
        <p className="text-[#7A7468] dark:text-[#9A9590]">
          Gerencie usuários, roles e áreas do sistema
        </p>
      </div>

      <UserTable />
    </div>
  );
}
