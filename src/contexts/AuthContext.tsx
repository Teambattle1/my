import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, findEmployeeByName } from '@/lib/supabase';

type EmployeeLocation = 'Øst' | 'Vest' | null;

/** Session saved to localStorage — key 'ed_user_session' (same as eventday-landing). */
interface UserSession {
  name: string;
  role: string;                // 'admin' | 'crew' | 'ef_admin' | etc.
  sites?: LandingSite[];
  employeeId?: string;
  employeeLocation?: EmployeeLocation;
  expiresAt: number;
}

export interface LandingSite {
  id: string;
  key?: string;
  name: string;
  url: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  active?: boolean;
}

interface VerifyCodeResponse {
  type: 'user_sites' | 'admin' | 'client' | 'redirect' | null;
  name?: string;
  role?: string;
  sites?: LandingSite[];
  error?: string;
  [k: string]: unknown;
}

const SESSION_KEY = 'ed_user_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dage

interface AuthContextType {
  session: UserSession | null;
  employeeId: string | null;
  employeeLocation: EmployeeLocation;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as UserSession;
    if (!s?.expiresAt || Date.now() > s.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function writeSession(s: UserSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const s = readSession();
    if (s) setSession(s);
    setIsLoading(false);
  }, []);

  const loginWithCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 4) {
      return { success: false, error: 'Koden skal være 4 tegn' };
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<VerifyCodeResponse>('ef-verify-code', {
        body: { code: trimmed },
      });

      if (error) throw error;
      if (!data || data.type !== 'user_sites' || !data.name) {
        return { success: false, error: 'Ukendt kode — prøv igen' };
      }

      // Only crew/admin employees proceed — we need an employee record to load jobs
      if (data.role !== 'crew' && data.role !== 'admin') {
        return { success: false, error: 'Denne kode giver ikke adgang til MY' };
      }

      // Look up employee by navn — guarantees we have id + location for job lookups
      const emp = await findEmployeeByName(data.name);
      if (!emp) {
        return { success: false, error: 'Bruger findes ikke i medarbejder-databasen' };
      }

      const next: UserSession = {
        name: data.name,
        role: data.role,
        sites: data.sites || [],
        employeeId: emp.id,
        employeeLocation: emp.location,
        expiresAt: Date.now() + SESSION_TTL_MS,
      };
      writeSession(next);
      setSession(next);
      return { success: true };
    } catch (err) {
      console.error('loginWithCode error:', err);
      return { success: false, error: 'Noget gik galt — tjek forbindelsen' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      session,
      employeeId: session?.employeeId ?? null,
      employeeLocation: session?.employeeLocation ?? null,
      isLoading,
      isAuthenticated: !!session?.employeeId,
      loginWithCode,
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
