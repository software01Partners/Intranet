'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, BookOpen, AlertTriangle, Award, Lock, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { formatRelativeTime } from '@/lib/utils';
import type { NotificationType } from '@/lib/types';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } =
    useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'nova_trilha':
        return BookOpen;
      case 'atraso':
        return AlertTriangle;
      case 'certificado':
        return Award;
      case 'quiz_bloqueado':
        return Lock;
      default:
        return Bell;
    }
  };

  const handleNotificationClick = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const displayedNotifications = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#7A7468] dark:text-[#9A9590] hover:text-[#2D2A26] dark:hover:text-[#E8E5E0] hover:bg-[#EDE9E3] dark:hover:bg-[#3D3D3D] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#1B4D3E] dark:bg-[#34D399] rounded-full flex items-center justify-center text-[10px] font-semibold text-white dark:text-[#1A1A1A]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-[#262626] border border-[#E0DCD6] dark:border-[#3D3D3D] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#E0DCD6] dark:border-[#3D3D3D]">
            <h3 className="text-lg font-bold text-[#2D2A26] dark:text-[#E8E5E0]">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[#1B4D3E] dark:text-[#34D399] hover:opacity-80 transition-opacity"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#7A7468] dark:text-[#9A9590]">
                Carregando...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-4 text-center text-[#7A7468] dark:text-[#9A9590]">
                Nenhuma notificação
              </div>
            ) : (
              displayedNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={`w-full flex items-start gap-3 p-4 text-left hover:bg-[#F5F3EF] dark:hover:bg-[#3D3D3D] transition-colors ${
                      !notification.read ? 'bg-[#1B4D3E]/5 dark:bg-[#34D399]/10' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon
                        className={`w-5 h-5 ${
                          notification.type === 'certificado'
                            ? 'text-[#D4A053]'
                            : notification.type === 'atraso'
                            ? 'text-[#F59E0B]'
                            : notification.type === 'quiz_bloqueado'
                            ? 'text-red-400'
                            : 'text-[#3B82F6]'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2D2A26] dark:text-[#E8E5E0] leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#7A7468] dark:text-[#9A9590] mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#1B4D3E] dark:bg-[#34D399] mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 10 && (
            <div className="p-3 border-t border-[#E0DCD6] dark:border-[#3D3D3D] text-center">
              <button className="text-sm text-[#1B4D3E] dark:text-[#34D399] hover:opacity-80 transition-opacity">
                Ver todas ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
