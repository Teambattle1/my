import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, getUserProfile, findEmployeeByEmail } from '@/lib/supabase';
import type { OCCUser, UserRole } from '@/types';

type EmployeeLocation = 'Øst' | 'Vest' | null;

interface AuthContextType {
  user: User | null;
  profile: OCCUser | null;
  employeeId: string | null;
  employeeLocation: EmployeeLocation;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OCCUser | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeLocation, setEmployeeLocation] = useState<EmployeeLocation>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (authUser: User) => {
    // Set fallback profile immediately
    const fallback: OCCUser = {
      id: authUser.id,
      email: authUser.email || '',
      role: 'INSTRUCTOR' as UserRole,
      created_at: new Date().toISOString(),
    };
    setProfile(fallback);

    // Fetch real profile + employee ID in background
    const [dbProfile, empResult] = await Promise.all([
      getUserProfile(authUser.id),
      findEmployeeByEmail(authUser.email || ''),
    ]);

    if (dbProfile) setProfile(dbProfile);
    setEmployeeId(empResult?.id ?? null);
    setEmployeeLocation(empResult?.location ?? null);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadProfile(newSession.user);
      } else {
        setProfile(null);
        setEmployeeId(null);
        setEmployeeLocation(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user);
      }
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      setIsLoading(false);
      return { success: false, error: 'Login fejlede' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setEmployeeId(null);
    setEmployeeLocation(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      employeeId,
      employeeLocation,
      isLoading,
      isAuthenticated: !!user && !!profile,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
