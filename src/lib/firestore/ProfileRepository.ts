import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import type { IProfileRepository } from '@/repositories';
import type { UserProfile, OnboardingData, MacroTargets } from '@/types/user';
import type { ProfileDocument } from '@/types/firestore';
import { COLLECTIONS } from './schema';
import { toProfileDocument, fromProfileDocument } from './mappers';

export class FirestoreProfileRepository implements IProfileRepository {
  constructor(private readonly db: Firestore) {}

  async get(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(this.db, COLLECTIONS.profile(uid)));
    if (!snap.exists()) return null;
    return fromProfileDocument(snap.data() as ProfileDocument);
  }

  async create(
    uid: string,
    data: OnboardingData,
    computed: { bmr: number; tdee: number; targets: MacroTargets },
  ): Promise<UserProfile> {
    const now = new Date().toISOString();
    const profile: UserProfile = {
      ...data,
      bmr:                  computed.bmr,
      tdee:                 computed.tdee,
      targets:              computed.targets,
      healthConnectEnabled: false,
      lastSyncAt:           null,
      onboardingComplete:   true,
      createdAt:            now,
      updatedAt:            now,
    };
    await setDoc(
      doc(this.db, COLLECTIONS.profile(uid)),
      toProfileDocument(profile),
    );
    return profile;
  }

  async update(uid: string, patch: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.get(uid);
    if (!existing) throw new Error(`Profile not found for uid ${uid}`);

    const updated: UserProfile = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(
      doc(this.db, COLLECTIONS.profile(uid)),
      toProfileDocument(updated),
    );
    return updated;
  }

  async setLastSyncAt(uid: string, at: string): Promise<void> {
    await updateDoc(doc(this.db, COLLECTIONS.profile(uid)), {
      lastSyncAt: at,
      updatedAt:  new Date().toISOString(),
    });
  }
}
