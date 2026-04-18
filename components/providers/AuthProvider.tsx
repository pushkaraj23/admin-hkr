"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { getFirebaseApp, getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let unsub: (() => void) | undefined;
    try {
      getFirebaseApp();
      const auth = getFirebaseAuth();
      unsub = onAuthStateChanged(auth, (next) => {
        setUser(next);
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }

    return () => {
      unsub?.();
    };
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) return;
    try {
      await firebaseSignOut(getFirebaseAuth());
    } catch {
      /* ignore */
    }
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      signOut,
    }),
    [user, loading, configured, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
