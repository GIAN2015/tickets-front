// src/components/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  id?: number | null;               // 👈 AGREGA ESTO
  username?: string | null;
  role?: string | null;
  empresaId?: number | string | null;
  empresaNombre?: string | null;
  email?: string | null;
} | null;

type AuthState = {
  token: string | null;
  user: User;
  hasHydrated: boolean;

  setAuth: (token: string | null, user: User | null) => void;
  clearAuth: () => void;
  setHydrated: (val: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,

      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
      setHydrated: (val) => set({ hasHydrated: val }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
