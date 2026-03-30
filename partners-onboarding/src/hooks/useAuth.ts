'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '../lib/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { UserRole } from '../lib/types';

interface UserData {
  role: UserRole;
  area_id: string | null;
  name: string;
}

interface UseAuthReturn {
  user: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  role: UserRole | null;
  areaId: string | null;
  userName: string | null;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    // Busca dados do usuário da tabela users
    const fetchUserData = async (session: Session) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name, role, area_id, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (cancelled) return;

        if (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          setUserData(null);
        } else if (data) {
          setUserData({
            role: data.role as UserRole,
            area_id: data.area_id,
            name: data.name || session.user.email?.split('@')[0] || '',
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Erro inesperado ao buscar dados do usuário:', error);
        setUserData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Busca sessão inicial
    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        setSession(initialSession);

        if (initialSession?.user) {
          setUser(initialSession.user);
          await fetchUserData(initialSession);
        } else {
          setUser(null);
          setUserData(null);
          setLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao buscar sessão inicial:', error);
        setUser(null);
        setSession(null);
        setUserData(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuta mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (cancelled) return;
      setSession(newSession);

      if (newSession?.user) {
        setUser(newSession.user);
        setLoading(true);
        await fetchUserData(newSession);
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserData(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    role: userData?.role ?? null,
    areaId: userData?.area_id ?? null,
    userName: userData?.name ?? null,
  };
}
