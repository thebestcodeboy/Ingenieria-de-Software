'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loginWithEmail, logoutUser, getRoleFromUser } from '../services/auth';

export type UserRole = 'mesa_entrada' | 'profesor' | 'alumno' | 'gerente' | null;

interface AuthContextType {
  user: any;
  role: UserRole;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ user?: any; error?: any }>;
  logout: () => Promise<void>;
  impersonateRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {},
  impersonateRole: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setRole(currentUser ? (getRoleFromUser(currentUser) as UserRole) : null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setRole(currentUser ? (getRoleFromUser(currentUser) as UserRole) : null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { user: loggedUser, error } = await loginWithEmail(email, pass);
      if (error) {
        return { error };
      }
      setUser(loggedUser);
      setRole(getRoleFromUser(loggedUser) as UserRole);
      return { user: loggedUser, error: null };
    } catch (err) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const impersonateRole = (newRole: UserRole) => {
    setRole(newRole);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, impersonateRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);