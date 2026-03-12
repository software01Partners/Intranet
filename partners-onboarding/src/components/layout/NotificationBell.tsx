'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, BookOpen, AlertTriangle, Award, X } from 'lucide-react';
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
        className="relative p-2 text-[#6B7194] dark:text-[#8888A0] hover:text-[#1A1D2E] dark:hover:text-[#E8E8ED] hover:bg-[#F1F3F8] dark:hover:bg-[#2D2D4A] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#6B2FA0] dark:bg-[#8B5CF6] rounded-full flex items-center justify-center text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-[#1A1A2E] border border-[#E2E5F1] dark:border-[#2D2D4A] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#E2E5F1] dark:border-[#2D2D4A]">
            <h3 className="text-lg font-bold text-[#1A1D2E] dark:text-[#E8E8ED]">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[#6B2FA0] dark:text-[#8B5CF6] hover:opacity-80 transition-opacity"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#6B7194] dark:text-[#8888A0]">
                Carregando...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-4 text-center text-[#6B7194] dark:text-[#8888A0]">
                Nenhuma notificação
              </div>
            ) : (
              displayedNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={`w-full flex items-start gap-3 p-4 text-left hover:bg-[#F8F9FC] dark:hover:bg-[#2D2D4A] transition-colors ${
                      !notification.read ? 'bg-[#6B2FA0]/5 dark:bg-[#8B5CF6]/10' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon
                        className={`w-5 h-5 ${
                          notification.type === 'certificado'
                            ? 'text-[#F5A623]'
                            : notification.type === 'atraso'
                            ? 'text-[#F59E0B]'
                            : 'text-[#3B82F6]'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1A1D2E] dark:text-[#E8E8ED] leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#6B7194] dark:text-[#8888A0] mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#6B2FA0] dark:bg-[#8B5CF6] mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 10 && (
            <div className="p-3 border-t border-[#E2E5F1] dark:border-[#2D2D4A] text-center">
              <button className="text-sm text-[#6B2FA0] dark:text-[#8B5CF6] hover:opacity-80 transition-opacity">
                Ver todas ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
