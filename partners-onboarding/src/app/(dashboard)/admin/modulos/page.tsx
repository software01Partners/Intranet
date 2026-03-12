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

export default async function AdminModulosPage() {
  const user = await getUserData();

  if (!user) {
    redirect('/login');
    return null;
  }

  // Verificar se é admin
  if (user.role !== 'admin') {
    redirect('/');
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-1">
          Gerenciar Módulos — Todas as Áreas
        </h1>
        <p className="text-[#6B7194] dark:text-[#8888A0]">
          Gerencie todos os módulos do sistema
        </p>
      </div>

      <ModulesManager areaFilter={null} userRole="admin" />
    </div>
  );
}
