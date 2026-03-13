import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/api';

const AUTH_STORAGE_KEY = 'auth-storage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

function readPersistedAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const directToken = localStorage.getItem('access_token');
  if (directToken) {
    return directToken;
  }

  const persisted = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!persisted) {
    return null;
  }

  try {
    const parsed = JSON.parse(persisted) as {
      state?: {
        accessToken?: string | null;
      };
    };

    return parsed.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

function syncAccessToken(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    localStorage.setItem('access_token', token);
    return;
  }

  localStorage.removeItem('access_token');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => {
        syncAccessToken(accessToken);
        set({
          user,
          accessToken,
          isAuthenticated: true
        });
      },
      clearAuth: () => {
        syncAccessToken(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false
        });
      }
    }),
    {
      name: AUTH_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        syncAccessToken(state?.accessToken ?? null);
      }
    }
  )
);

export function getStoredAccessToken(): string | null {
  return readPersistedAccessToken();
}

export function isAuthenticated(): boolean {
  return Boolean(readPersistedAccessToken());
}

export function clearStoredAuth() {
  syncAccessToken(null);
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false
  });
}
