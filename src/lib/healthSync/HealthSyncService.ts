import type { GoogleDriveClient } from './GoogleDriveClient';
import type { HealthConnectParser } from './HealthConnectParser';
import type { IDayRepository } from '@/repositories/IDayRepository';
import type { IProfileRepository } from '@/repositories/IProfileRepository';
import type { UserProfile } from '@/types/user';
import { wearableRecordsToDayActivities } from '@/lib/wearable/mergeActivity';
import { DriveAuthError, DriveDownloadError, PersistenceError } from './errors';

// Phase type for progress callbacks — does not import from the store layer.
export type HealthSyncPhase = 'fetching_drive' | 'parsing' | 'writing' | 'done';

export interface HealthSyncContext {
  uid:            string;
  driveToken:     string;
  profile:        UserProfile;
  /** Called when a 401 is received. Must return a fresh token, or null if re-auth failed. */
  onTokenRefresh: () => Promise<string | null>;
  onProgress:     (phase: HealthSyncPhase, progress: number) => void;
}

export class HealthSyncService {
  constructor(
    private readonly driveClient:  GoogleDriveClient,
    private readonly parser:       HealthConnectParser,
    private readonly dayRepo:      IDayRepository,
    private readonly profileRepo:  IProfileRepository,
  ) {}

  async sync(ctx: HealthSyncContext): Promise<void> {
    let token = ctx.driveToken;

    // ── Phase 1: find + download ─────────────────────────────────────────
    ctx.onProgress('fetching_drive', 10);
    let zipBytes: Uint8Array;

    try {
      zipBytes = await this._fetchZip(token, ctx);
    } catch (err) {
      if (err instanceof DriveAuthError) {
        // Retry once with a fresh token
        const newToken = await ctx.onTokenRefresh();
        if (!newToken) throw new DriveAuthError();
        token = newToken;
        zipBytes = await this._fetchZip(token, ctx);
      } else {
        throw err;
      }
    }

    // ── Phase 2: parse ────────────────────────────────────────────────────
    ctx.onProgress('parsing', 70);
    const records = await this.parser.parse(zipBytes);
    const dayActivities = wearableRecordsToDayActivities(records);
    ctx.onProgress('parsing', 85);

    // ── Phase 3: write ────────────────────────────────────────────────────
    ctx.onProgress('writing', 90);
    try {
      for (const { date, activity } of dayActivities) {
        await this.dayRepo.setActivity(ctx.uid, date, activity, ctx.profile.targets);
      }
      await this.profileRepo.setLastSyncAt(ctx.uid, new Date().toISOString());
    } catch (err) {
      throw new PersistenceError(
        err instanceof Error ? err.message : 'Failed to persist activity data',
      );
    }

    ctx.onProgress('done', 100);
  }

  private async _fetchZip(token: string, ctx: HealthSyncContext): Promise<Uint8Array> {
    const file = await this.driveClient.findHealthConnectFile(token);
    if (!file) {
      throw new DriveDownloadError(
        'No Health Connect export found in Google Drive. ' +
        'Export your data from the Samsung Health app first.',
      );
    }
    ctx.onProgress('fetching_drive', 40);
    const bytes = await this.driveClient.downloadZip(token, file.id);
    ctx.onProgress('fetching_drive', 65);
    return bytes;
  }
}
