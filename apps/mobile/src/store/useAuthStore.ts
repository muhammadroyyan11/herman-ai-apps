import { create } from "zustand";
import { api } from "../services/api";
import { setToken, removeToken } from "../utils/storage";

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  subscription_tier: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.login(email, password);
      await setToken(data.access_token);
      await get().checkAuth();
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Login failed", isLoading: false });
    }
  },

  register: async (email: string, username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.register(email, username, password);
      await get().login(email, password);
    } catch (err: any) {
      set({ error: err.response?.data?.detail || "Registration failed", isLoading: false });
    }
  },

  logout: async () => {
    await removeToken();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const { data } = await api.getMe();
      if (data.is_authenticated) {
        set({ user: data, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
