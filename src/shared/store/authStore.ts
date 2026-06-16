import { create } from 'zustand';
import { account } from '../lib/appwrite/client';
import type { AppwriteUser } from '../types';

interface AuthStore {
  user: AppwriteUser | null;
  loading: boolean;
  init: () => Promise<void>;
  setUser: (user: AppwriteUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  init: async () => {
    try {
      const u = await account.get();
      set({ user: { $id: u.$id, email: u.email, name: u.name }, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  setUser: (user) => set({ user }),
  logout: async () => {
    try {
      await account.deleteSession('current');
    } finally {
      set({ user: null });
    }
  },
}));
