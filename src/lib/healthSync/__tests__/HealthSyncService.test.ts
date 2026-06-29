import { HealthSyncService, type HealthSyncContext } from '../HealthSyncService';
import { DriveAuthError, DriveDownloadError, ParseError, PersistenceError } from '../errors';
import type { GoogleDriveClient, DriveFile } from '../GoogleDriveClient';
import type { HealthConnectParser } from '../HealthConnectParser';
import { MockDayRepository } from '@/repositories/mock/MockDayRepository';
import { MockProfileRepository } from '@/repositories/mock/MockProfileRepository';
import type { UserProfile } from '@/types/user';
import type { WearableDayRecord } from '@/lib/wearable/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_FILE: DriveFile = { id: 'file-1', name: 'health_connect_2024.zip' };
const ZIP_BYTES = new Uint8Array([1, 2, 3]);

const FAKE_RECORD: WearableDayRecord = {
  date: '2024-01-15',
  wearable: {
    activity: { steps: 8000, activeCaloriesKcal: 300, workoutSessions: [] },
  },
};

const FAKE_PROFILE: UserProfile = {
  name:              'Test User',
  dateOfBirth:       '1990-01-01',
  sex:               'male',
  heightCm:          175,
  weightKg:          75,
  goal:              'maintain',
  activityLevel:     'moderately_active',
  weeklyTrainingDays: 3,
  bmr:               1800,
  tdee:              2500,
  targets: {
    calorieTarget:  2500,
    proteinTargetG: 150,
    carbsTargetG:   300,
    fatTargetG:     80,
  },
  healthConnectEnabled: true,
  onboardingComplete:   true,
  createdAt:            '2024-01-01T00:00:00Z',
  updatedAt:            '2024-01-01T00:00:00Z',
};

function makeMockDriveClient(overrides: Partial<typeof GoogleDriveClient.prototype> = {}): GoogleDriveClient {
  return {
    findHealthConnectFile: jest.fn().mockResolvedValue(FAKE_FILE),
    downloadZip:           jest.fn().mockResolvedValue(ZIP_BYTES),
    ...overrides,
  } as unknown as GoogleDriveClient;
}

function makeMockParser(overrides: Partial<typeof HealthConnectParser.prototype> = {}): HealthConnectParser {
  return {
    parse: jest.fn().mockResolvedValue([FAKE_RECORD]),
    ...overrides,
  } as unknown as HealthConnectParser;
}

function makeContext(overrides: Partial<HealthSyncContext> = {}): HealthSyncContext {
  return {
    uid:            'uid-test',
    driveToken:     'token-abc',
    profile:        FAKE_PROFILE,
    onTokenRefresh: jest.fn().mockResolvedValue('token-refreshed'),
    onProgress:     jest.fn(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HealthSyncService', () => {
  let driveClient:  ReturnType<typeof makeMockDriveClient>;
  let parser:       ReturnType<typeof makeMockParser>;
  let dayRepo:      MockDayRepository;
  let profileRepo:  MockProfileRepository;
  let service:      HealthSyncService;

  beforeEach(() => {
    driveClient = makeMockDriveClient();
    parser      = makeMockParser();
    dayRepo     = new MockDayRepository();
    profileRepo = new MockProfileRepository();
    service     = new HealthSyncService(driveClient, parser, dayRepo, profileRepo);
  });

  // ── Happy path ─────────────────────────────────────────────────────────

  it('calls onProgress with phase transitions in order', async () => {
    const ctx = makeContext();
    await service.sync(ctx);

    const phases = (ctx.onProgress as jest.Mock).mock.calls.map(([phase]) => phase);
    expect(phases).toEqual([
      'fetching_drive',
      'fetching_drive',
      'fetching_drive',
      'parsing',
      'parsing',
      'writing',
      'done',
    ]);
  });

  it('calls setActivity on dayRepo for each parsed record', async () => {
    const spy = jest.spyOn(dayRepo, 'setActivity');
    await service.sync(makeContext());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('uid-test', '2024-01-15', expect.any(Object), FAKE_PROFILE.targets);
  });

  it('calls setLastSyncAt on profileRepo after writing', async () => {
    const spy = jest.spyOn(profileRepo, 'setLastSyncAt');
    await service.sync(makeContext());
    expect(spy).toHaveBeenCalledWith('uid-test', expect.any(String));
  });

  // ── Token refresh ───────────────────────────────────────────────────────

  it('retries once after DriveAuthError on findHealthConnectFile', async () => {
    (driveClient.findHealthConnectFile as jest.Mock)
      .mockRejectedValueOnce(new DriveAuthError())
      .mockResolvedValueOnce(FAKE_FILE);

    const ctx = makeContext();
    await service.sync(ctx);

    expect(ctx.onTokenRefresh).toHaveBeenCalledTimes(1);
    expect(driveClient.findHealthConnectFile).toHaveBeenCalledTimes(2);
  });

  it('retries once after DriveAuthError on downloadZip', async () => {
    (driveClient.downloadZip as jest.Mock)
      .mockRejectedValueOnce(new DriveAuthError())
      .mockResolvedValueOnce(ZIP_BYTES);

    const ctx = makeContext();
    await service.sync(ctx);

    expect(ctx.onTokenRefresh).toHaveBeenCalledTimes(1);
  });

  it('throws DriveAuthError if onTokenRefresh returns null', async () => {
    (driveClient.findHealthConnectFile as jest.Mock).mockRejectedValue(new DriveAuthError());
    const ctx = makeContext({ onTokenRefresh: jest.fn().mockResolvedValue(null) });
    await expect(service.sync(ctx)).rejects.toBeInstanceOf(DriveAuthError);
  });

  // ── Error classification ────────────────────────────────────────────────

  it('propagates DriveDownloadError when no file is found', async () => {
    (driveClient.findHealthConnectFile as jest.Mock).mockResolvedValue(null);
    await expect(service.sync(makeContext())).rejects.toBeInstanceOf(DriveDownloadError);
  });

  it('propagates DriveDownloadError from downloadZip (non-auth)', async () => {
    (driveClient.downloadZip as jest.Mock).mockRejectedValue(new DriveDownloadError('HTTP 500'));
    await expect(service.sync(makeContext())).rejects.toBeInstanceOf(DriveDownloadError);
  });

  it('propagates ParseError from parser', async () => {
    (parser.parse as jest.Mock).mockRejectedValue(new ParseError('Corrupt ZIP'));
    await expect(service.sync(makeContext())).rejects.toBeInstanceOf(ParseError);
  });

  it('wraps repository errors as PersistenceError', async () => {
    jest.spyOn(dayRepo, 'setActivity').mockRejectedValue(new Error('Firestore unavailable'));
    await expect(service.sync(makeContext())).rejects.toBeInstanceOf(PersistenceError);
  });
});
