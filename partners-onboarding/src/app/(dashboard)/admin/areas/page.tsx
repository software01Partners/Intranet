import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AreasManager } from '@/components/admin/AreasManager';
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

export default async function AreasPage() {
  const role = await getUserRole();

  // Verificar se é admin, senão redirecionar
  if (role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#E8E8ED] mb-1">
          Gestão de Áreas
        </h1>
        <p className="text-[#8888A0]">
          Gerencie as áreas do sistema e seus colaboradores
        </p>
      </div>

      <AreasManager />
    </div>
  );
}
