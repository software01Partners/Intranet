'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, ChevronRight, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './NotificationBell';
import Image from 'next/image';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { user, role, userName } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user?.id) return;

      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchAvatar();
  }, [user?.id]);

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'colaborador':
        return 'Colaborador';
      case 'gestor':
        return 'Gestor';
      case 'admin':
        return 'Admin';
      default:
        return '';
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'colaborador':
        return 'bg-[#3B82F6]/10 text-[#3B82F6] dark:text-[#60A5FA] border-[#3B82F6]/20';
      case 'gestor':
        return 'bg-[#F5A623]/10 text-[#E0951F] dark:text-[#F5A623] border-[#F5A623]/20';
      case 'admin':
        return 'bg-[#6B2FA0]/10 text-[#6B2FA0] dark:bg-[#8B5CF6]/15 dark:text-[#A78BFA] border-[#6B2FA0]/20 dark:border-[#8B5CF6]/30';
      default:
        return 'bg-[#F1F3F8] dark:bg-[#2D2D4A] text-[#6B7194] dark:text-[#8888A0] border-[#E2E5F1] dark:border-[#2D2D4A]';
    }
  };

  const generateBreadcrumb = () => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', href: '/' }];

    if (segments.length === 0) {
      return breadcrumbs;
    }

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ label, href });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumb();

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#1A1A2E] border-b border-[#E2E5F1] dark:border-[#2D2D4A] h-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] hover:bg-[#F1F3F8] dark:hover:bg-[#2D2D4A] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav className="hidden lg:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-[#9CA3C4] dark:text-[#8888A0]" />
                )}
                <Link
                  href={crumb.href}
                  className={`${
                    index === breadcrumbs.length - 1
                      ? 'text-[#1A1D2E] dark:text-[#E8E8ED] font-semibold'
                      : 'text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED]'
                  } transition-colors`}
                >
                  {crumb.label}
                </Link>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Light/Dark */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] hover:bg-[#F1F3F8] dark:hover:bg-[#2D2D4A] transition-colors"
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          )}

          <NotificationBell />

          <div className="flex items-center gap-3">
            {role && (
              <span
                className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getRoleColor(role)}`}
              >
                {getRoleLabel(role)}
              </span>
            )}

            <button className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-[#F1F3F8] dark:hover:bg-[#2D2D4A] transition-colors">
              {avatarUrl ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={avatarUrl}
                    alt={userName || 'Usuário'}
                    width={32}
                    height={32}
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6B2FA0] to-[#F5A623] flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {userName
                      ? userName.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="hidden md:block text-[#1A1D2E] dark:text-[#E8E8ED] text-sm font-medium">
                {userName || user?.email || 'Usuário'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
