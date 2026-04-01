'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, ChevronRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { NotificationBell } from './NotificationBell';
import Image from 'next/image';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme, mounted } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = await res.json();
        setAvatarUrl(data.avatar_url || null);
        setUserName(data.name || null);
        setRole(data.role || null);
      } catch {
        // silently fail
      }
    };

    fetchProfile();
  }, []);

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
        return 'bg-[#D4A053]/10 text-[#B8893E] dark:text-[#D4A053] border-[#D4A053]/20';
      case 'admin':
        return 'bg-[#1B4D3E]/10 text-[#1B4D3E] dark:bg-[#34D399]/15 dark:text-[#6EE7B7] border-[#1B4D3E]/20 dark:border-[#34D399]/30';
      default:
        return 'bg-[#EDE9E3] dark:bg-[#3D3D3D] text-[#7A7468] dark:text-[#9A9590] border-[#E0DCD6] dark:border-[#3D3D3D]';
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
    <header className="sticky top-0 z-30 bg-white dark:bg-[#262626] border-b border-[#E0DCD6] dark:border-[#3D3D3D] h-16 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] hover:bg-[#EDE9E3] dark:hover:bg-[#3D3D3D] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav className="hidden lg:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-[#B0A99E] dark:text-[#9A9590]" />
                )}
                <Link
                  href={crumb.href}
                  className={`${
                    index === breadcrumbs.length - 1
                      ? 'text-[#2D2A26] dark:text-[#E8E5E0] font-semibold'
                      : 'text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0]'
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
              className="p-2 rounded-lg text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] hover:bg-[#EDE9E3] dark:hover:bg-[#3D3D3D] transition-colors"
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

            <button className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-[#EDE9E3] dark:hover:bg-[#3D3D3D] transition-colors">
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1B4D3E] to-[#D4A053] flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {userName
                      ? userName.charAt(0).toUpperCase()
                      : userName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="hidden md:block text-[#2D2A26] dark:text-[#E8E5E0] text-sm font-medium">
                {userName || 'Usuário'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
