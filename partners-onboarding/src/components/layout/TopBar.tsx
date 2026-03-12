'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './NotificationBell';
import Image from 'next/image';

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { user, role, userName } = useAuth();
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
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'gestor':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin':
        return 'bg-[#E8580C]/20 text-[#E8580C] border-[#E8580C]/30';
      default:
        return 'bg-[#262630] text-[#8888A0] border-[#262630]';
    }
  };

  // Gera breadcrumb baseado no pathname
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
    <header className="sticky top-0 z-30 bg-[#0A0A0F] border-b border-[#262630] h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-[#8888A0] hover:text-[#E8E8ED] hover:bg-[#13131A] rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <nav className="hidden lg:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-[#8888A0]" />
                )}
                <Link
                  href={crumb.href}
                  className={`${
                    index === breadcrumbs.length - 1
                      ? 'text-[#E8E8ED] font-medium'
                      : 'text-[#8888A0] hover:text-[#E8E8ED]'
                  } transition-colors`}
                >
                  {crumb.label}
                </Link>
              </div>
            ))}
          </nav>
        </div>

        {/* Right side: Notifications + Avatar */}
        <div className="flex items-center gap-4">
          {/* Notificações */}
          <NotificationBell />

          {/* Avatar e informações do usuário */}
          <div className="flex items-center gap-3">
            {/* Badge de role */}
            {role && (
              <span
                className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getRoleColor(role)}`}
              >
                {getRoleLabel(role)}
              </span>
            )}
            
            <button className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-[#13131A] transition-colors">
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E8580C] to-[#8B5CF6] flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {userName
                      ? userName.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="hidden md:block text-[#E8E8ED] text-sm font-medium">
                {userName || user?.email || 'Usuário'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
