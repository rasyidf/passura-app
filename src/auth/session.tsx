import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { db } from "@/db/local-db";
import { verifyPassword } from "./local-auth";
import type { Elder } from "@/db/types";

interface AuthState {
  elder: Elder | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "session-elder-id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    elder: null,
    isLoading: true,
  });

  // Restore session from IndexedDB appConfig on mount
  useEffect(() => {
    (async () => {
      try {
        const config = await db.appConfig.get(SESSION_KEY);
        if (config?.value) {
          const elder = await db.elders.get(config.value as string);
          if (elder) {
            setState({ elder, isLoading: false });
            return;
          }
        }
      } catch {
        // Ignore errors, just treat as no session
      }
      setState({ elder: null, isLoading: false });
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const elder = await db.elders
        .where("email")
        .equals(email.toLowerCase().trim())
        .first();

      if (!elder) return false;

      const valid = await verifyPassword(
        password,
        elder.passwordHash,
        elder.salt
      );
      if (!valid) return false;

      await db.appConfig.put({ key: SESSION_KEY, value: elder.id });
      setState({ elder, isLoading: false });
      return true;
    },
    []
  );

  const logout = useCallback(async () => {
    await db.appConfig.delete(SESSION_KEY);
    setState({ elder: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
