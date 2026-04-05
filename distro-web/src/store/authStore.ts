import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  phone: string;
  storeName: string;
  role: "BUYER" | "ADMIN";
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isLoggedIn: () => boolean;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: (token, user) => {
        setCookie("distro-token", token);
        setCookie("distro-role", user.role);
        set({ token, user });
      },

      clearAuth: () => {
        deleteCookie("distro-token");
        deleteCookie("distro-role");
        set({ token: null, user: null });
      },

      isLoggedIn: () => !!get().token,
    }),
    {
      name: "distro-auth",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          const item = localStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: (name, value) => {
          if (typeof window !== "undefined") {
            localStorage.setItem(name, JSON.stringify(value));
          }
        },
        removeItem: (name) => {
          if (typeof window !== "undefined") {
            localStorage.removeItem(name);
          }
        },
      },
    }
  )
);
