import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

type Role = 'customer' | 'admin';
export type UserProfile = { 
  id: string;
  email: string; 
  name: string; 
  role: Role;
  avatar_url?: string;
};

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('Sessão expirada ou inválida:', error.message);
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        if (data.session?.user) {
          mapSupabaseUserToProfile(data.session.user);
        }
      }
      setLoading(false);
    }).catch(err => {
      console.error('Erro ao inicializar autenticação:', err);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        mapSupabaseUserToProfile(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapSupabaseUserToProfile = (supabaseUser: SupabaseUser) => {
    const userMeta = supabaseUser.user_metadata || {};
    const appMeta = (supabaseUser as any).app_metadata || {};
    const role: Role = appMeta.role === 'admin' ? 'admin' : 'customer';

    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: userMeta.full_name || userMeta.first_name || supabaseUser.email?.split('@')[0] || 'Usuário',
      role,
      avatar_url: userMeta.avatar_url,
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
