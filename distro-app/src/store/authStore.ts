import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { api } from "../lib/api";

// NEVER import AsyncStorage. Use SecureStore only.

const TOKEN_KEY = "distro_token";

interface Profile {
  id: number;
  phone: string;
  role: "ADMIN" | "BUYER";
  name: string;
  storeName?: string;
}

interface AuthState {
  token: string | null;
  profile: Profile | null;
  isLoading: boolean;
  loadToken: () => Promise<void>;
  setAuth: (token: string, profile: Profile) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  profile: null,
  isLoading: true,

  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        // Validate with GET /api/auth/me
        const res = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        set({ token, profile: res.data, isLoading: false });
        return;
      }
    } catch {
      // 401 or network error — clear stored token
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    set({ token: null, profile: null, isLoading: false });
  },

  setAuth: async (token, profile) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ token, profile });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, profile: null });
  },
}));
