'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loginWithEmail, logoutUser, getRoleFromUser } from '../services/auth';

export type UserRole = 'mesa_entrada' | 'profesor' | 'alumno' | null;

interface AuthContextType {
  user: any;
  role: UserRole;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  impersonateRole: (role: UserRole) => void; // Switcher rápido para agilizar pruebas en local
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  impersonateRole: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Cargar la sesión actual al montar el componente
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // Si hay usuario toma su rol; si no hay login en local iniciamos como mesa_entrada por defecto
      setRole(currentUser ? (getRoleFromUser(currentUser) as UserRole) : 'mesa_entrada');
      setLoading(false);
    });

    // 2. Suscribirse a cambios de estado de autenticación
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
      const { user: loggedUser } = await loginWithEmail(email, pass);
      setUser(loggedUser);
      setRole(getRoleFromUser(loggedUser) as UserRole);
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