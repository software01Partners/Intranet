import { createClient } from '@/lib/supabase/server';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getUserRole();

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#0F0F1A] flex">
      <DashboardLayoutClient role={role}>
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
