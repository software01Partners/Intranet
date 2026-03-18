import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuditLogViewer } from '@/components/admin/AuditLogViewer';
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

export default async function LogsPage() {
  const role = await getUserRole();

  if (role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A1D2E] dark:text-[#E8E8ED] mb-1">
          Logs de Auditoria
        </h1>
        <p className="text-[#6B7194] dark:text-[#8888A0]">
          Histórico de todas as ações realizadas por administradores e gestores
        </p>
      </div>

      <AuditLogViewer />
    </div>
  );
}
