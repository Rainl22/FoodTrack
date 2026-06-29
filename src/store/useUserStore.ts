import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface UserState {
  status:      AuthStatus;
  user:        User | null;
  profile:     UserProfile | null;
  driveToken:  string | null;

  setStatus:     (status: AuthStatus) => void;
  setUser:       (user: User | null) => void;
  setProfile:    (profile: UserProfile | null) => void;
  setDriveToken: (token: string | null) => void;
  clear:         () => void;
}

export const useUserStore = create<UserState>((set) => ({
  status:     'loading',
  user:       null,
  profile:    null,
  driveToken: null,

  setStatus:     (status)     => set({ status }),
  setUser:       (user)       => set({ user }),
  setProfile:    (profile)    => set({ profile }),
  setDriveToken: (driveToken) => set({ driveToken }),
  clear:         ()           => set({ status: 'unauthenticated', user: null, profile: null, driveToken: null }),
}));
