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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
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
    label: 'Dashboard Admin',
    href: '/admin',
    icon: BarChart3,
    roles: ['admin'],
    section: 'admin',
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
];

export function Sidebar({ isOpen, onClose, role: roleProp }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const role = roleProp;

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
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
    'bg-[#6B2FA0]/10 dark:bg-[#8B5CF6]/15 text-[#6B2FA0] dark:text-[#A78BFA] border-l-[#6B2FA0] dark:border-l-[#8B5CF6]';
  const linkInactive =
    'text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] hover:bg-[#F1F3F8] dark:hover:bg-[#2D2D4A]';

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
          fixed left-0 top-0 h-full w-[240px] bg-white dark:bg-[#1A1A2E] border-r border-[#E2E5F1] dark:border-[#2D2D4A] z-50
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:flex-shrink-0
        `}
      >
        {/* Header com logo */}
        <div className="flex items-center justify-between p-6 border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B2FA0] to-[#F5A623] flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-[#1A1D2E] dark:text-[#E8E8ED] font-semibold text-lg">
              Partners
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] transition-colors"
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
              <div className="h-px bg-[#E2E5F1] dark:bg-[#2D2D4A] my-4" />
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
              <div className="h-px bg-[#E2E5F1] dark:bg-[#2D2D4A] my-4" />
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

        <div className="p-4 border-t border-[#E2E5F1] dark:border-[#2D2D4A]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] hover:bg-[#F1F3F8] dark:hover:bg-[#2D2D4A] transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
