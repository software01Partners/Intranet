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

  // Fechar dropdown ao clicar fora
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
      {/* Botão do sino */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#8888A0] hover:text-[#E8E8ED] hover:bg-[#13131A] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#E8580C] rounded-full flex items-center justify-center text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-[#13131A] border border-[#262630] rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#262630]">
            <h3 className="text-lg font-semibold text-[#E8E8ED]">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[#E8580C] hover:text-[#E8580C]/80 transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista de notificações */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[#8888A0]">
                Carregando...
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-4 text-center text-[#8888A0]">
                Nenhuma notificação
              </div>
            ) : (
              displayedNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className={`w-full flex items-start gap-3 p-4 text-left hover:bg-[#1A1A24] transition-colors ${
                      !notification.read ? 'bg-[#E8580C]/5' : ''
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon
                        className={`w-5 h-5 ${
                          notification.type === 'certificado'
                            ? 'text-[#E8580C]'
                            : notification.type === 'atraso'
                            ? 'text-yellow-500'
                            : 'text-blue-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E8E8ED] leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#8888A0] mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#E8580C] mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="p-3 border-t border-[#262630] text-center">
              <button className="text-sm text-[#E8580C] hover:text-[#E8580C]/80 transition-colors">
                Ver todas ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
