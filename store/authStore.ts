"use client";

import { create } from "zustand";
import type { User } from "@/types/api";
import { authStorage } from "@/lib/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user, token) => {
    authStorage.setToken(token);
    authStorage.setUser(user);
    set({ user, token, isLoading: false });
  },

  logout: () => {
    authStorage.clear();
    set({ user: null, token: null, isLoading: false });
  },

  hydrate: () => {
    const token = authStorage.getToken();
    const user = authStorage.getUser();
    set({ user, token, isLoading: false });
  },
}));
