import { dayRepository, profileRepository } from '@/lib/firestore';
import { GoogleDriveClient } from './GoogleDriveClient';
import { HealthConnectParser } from './HealthConnectParser';
import { HealthSyncService } from './HealthSyncService';

export const healthSyncService = new HealthSyncService(
  new GoogleDriveClient(),
  new HealthConnectParser(),
  dayRepository,
  profileRepository,
);

export { DriveAuthError, DriveDownloadError, ParseError, PersistenceError } from './errors';
export type { HealthSyncPhase } from './HealthSyncService';
