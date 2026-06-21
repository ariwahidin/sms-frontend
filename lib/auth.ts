import type { User } from "@/types/api";

const TOKEN_KEY = "sms_token";
const USER_KEY = "sms_user";

export const authStorage = {
  setToken: (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    // Also set cookie so Next.js middleware can read it
    document.cookie = `sms_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
  },

  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),

  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = "sms_token=; path=/; max-age=0";
  },

  setUser: (user: User) =>
    localStorage.setItem(USER_KEY, JSON.stringify(user)),

  getUser: (): User | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  },

  removeUser: () => localStorage.removeItem(USER_KEY),

  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = "sms_token=; path=/; max-age=0";
  },
};
