'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FolderEdit,
  FileVideo,
  BarChart3,
  UserCog,
  Building2,
  LogOut,
  X,
  ScrollText,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole | null;
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  section?: 'all' | 'gestor' | 'admin';
}

const menuItems: MenuItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: LayoutDashboard,
    section: 'all',
  },
  {
    label: 'Trilhas',
    href: '/trilhas',
    icon: BookOpen,
    section: 'all',
  },
  {
    label: 'Minha Equipe',
    href: '/gestor',
    icon: Users,
    roles: ['gestor', 'admin'],
    section: 'gestor',
  },
  {
    label: 'Gerenciar Trilhas',
    href: '/gestor/trilhas',
    icon: FolderEdit,
    roles: ['gestor', 'admin'],
    section: 'gestor',
  },
  {
    label: 'Gerenciar Módulos',
    href: '/gestor/modulos',
    icon: FileVideo,
    roles: ['gestor', 'admin'],
    section: 'gestor',
  },
  {
    label: 'Métricas',
    href: '/admin',
    icon: BarChart3,
    roles: ['gestor', 'admin'],
    section: 'gestor',
  },
  {
    label: 'Todas as Trilhas',
    href: '/admin/trilhas',
    icon: FolderEdit,
    roles: ['admin'],
    section: 'admin',
  },
  {
    label: 'Todos os Módulos',
    href: '/admin/modulos',
    icon: FileVideo,
    roles: ['admin'],
    section: 'admin',
  },
  {
    label: 'Áreas',
    href: '/admin/areas',
    icon: Building2,
    roles: ['admin'],
    section: 'admin',
  },
  {
    label: 'Usuários',
    href: '/admin/usuarios',
    icon: UserCog,
    roles: ['admin'],
    section: 'admin',
  },
  {
    label: 'Logs',
    href: '/admin/logs',
    icon: ScrollText,
    roles: ['admin'],
    section: 'admin',
  },
  {
    label: 'Lixeira',
    href: '/admin/lixeira',
    icon: Trash2,
    roles: ['admin'],
    section: 'admin',
  },
];

export function Sidebar({ isOpen, onClose, role: roleProp }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = roleProp;

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignorar erro
    }
    window.location.href = '/login';
  };

  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  const allItems = filteredMenuItems.filter((item) => item.section === 'all');
  const gestorItems = filteredMenuItems.filter((item) => item.section === 'gestor');
  const adminItems = filteredMenuItems.filter((item) => item.section === 'admin');

  const linkBase =
    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all border-l-[3px] border-transparent';
  const linkActive =
    'bg-[#1B4D3E]/10 dark:bg-[#34D399]/15 text-[#1B4D3E] dark:text-[#6EE7B7] border-l-[#1B4D3E] dark:border-l-[#34D399]';
  const linkInactive =
    'text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] hover:bg-[#EDE9E3] dark:hover:bg-[#3D3D3D]';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed left-0 top-0 h-full w-[240px] bg-white dark:bg-[#262626] border-r border-[#E0DCD6] dark:border-[#3D3D3D] z-50
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:flex-shrink-0
        `}
      >
        {/* Header com logo */}
        <div className="flex items-center justify-between p-6 border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B4D3E] to-[#D4A053] flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-[#2D2A26] dark:text-[#E8E5E0] font-semibold text-lg">
              Partners
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {allItems.length > 0 && (
            <div className="space-y-2">
              {allItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href + '/'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`${linkBase} ${isActive ? linkActive : linkInactive}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {gestorItems.length > 0 && (
            <>
              <div className="h-px bg-[#E0DCD6] dark:bg-[#3D3D3D] my-4" />
              <div className="space-y-2">
                {gestorItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href + '/'));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`${linkBase} ${isActive ? linkActive : linkInactive}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {adminItems.length > 0 && (
            <>
              <div className="h-px bg-[#E0DCD6] dark:bg-[#3D3D3D] my-4" />
              <div className="space-y-2">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href + '/'));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`${linkBase} ${isActive ? linkActive : linkInactive}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-[#E0DCD6] dark:border-[#3D3D3D]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] hover:bg-[#EDE9E3] dark:hover:bg-[#3D3D3D] transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
