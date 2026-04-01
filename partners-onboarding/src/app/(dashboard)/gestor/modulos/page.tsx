import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ModulesManager } from '@/components/admin/ModulesManager';
import type { User } from '@/lib/types';

async function getUserData(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as User;
}

export default async function GestorModulosPage() {
  const user = await getUserData();

  if (!user) {
    redirect('/login');
    return null;
  }

  // Verificar se é gestor ou admin
  if (user.role !== 'gestor' && user.role !== 'admin') {
    redirect('/');
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#2D2A26] dark:text-[#E8E5E0] mb-1">Módulos da Minha Área</h1>
        <p className="text-[#7A7468] dark:text-[#9A9590]">
          Gerencie os módulos das trilhas da sua área
        </p>
      </div>

      <ModulesManager areaFilter={user.area_id} userRole="gestor" />
    </div>
  );
}
