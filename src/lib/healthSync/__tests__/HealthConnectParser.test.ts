import { HealthConnectParser } from '../HealthConnectParser';
import { ParseError } from '../errors';

// Mock the wearable modules — sql.js WASM cannot load in Jest
jest.mock('@/lib/wearable/sqlJsAdapter', () => ({
  openHealthConnectZip: jest.fn(),
}));
jest.mock('@/lib/wearable/parseHealthConnect', () => ({
  parseHealthConnect: jest.fn(),
}));

import { openHealthConnectZip } from '@/lib/wearable/sqlJsAdapter';
import { parseHealthConnect } from '@/lib/wearable/parseHealthConnect';

const mockOpenZip = openHealthConnectZip as jest.Mock;
const mockParse   = parseHealthConnect   as jest.Mock;

const FAKE_DB   = { close: jest.fn() };
const ZIP_BYTES = new Uint8Array([1, 2, 3, 4]);

const FAKE_RECORD = {
  date: '2024-01-15',
  wearable: { activity: { steps: 8000, activeCaloriesKcal: 300, workoutSessions: [] } },
};

describe('HealthConnectParser', () => {
  let parser: HealthConnectParser;

  beforeEach(() => {
    parser = new HealthConnectParser();
    mockOpenZip.mockResolvedValue(FAKE_DB);
    FAKE_DB.close.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns records on successful parse', async () => {
    mockParse.mockReturnValue({
      success: true,
      result:  { records: [FAKE_RECORD], warnings: [] },
    });

    const records = await parser.parse(ZIP_BYTES);
    expect(records).toEqual([FAKE_RECORD]);
  });

  it('throws ParseError when openHealthConnectZip rejects', async () => {
    mockOpenZip.mockRejectedValue(new Error('Corrupt ZIP'));
    await expect(parser.parse(ZIP_BYTES)).rejects.toBeInstanceOf(ParseError);
    await expect(parser.parse(ZIP_BYTES)).rejects.toThrow('Corrupt ZIP');
  });

  it('throws ParseError when parseHealthConnect returns success: false', async () => {
    mockParse.mockReturnValue({
      success: false,
      message: 'No health records found',
    });
    await expect(parser.parse(ZIP_BYTES)).rejects.toBeInstanceOf(ParseError);
    await expect(parser.parse(ZIP_BYTES)).rejects.toThrow('No health records found');
  });

  it('closes the db even when parseHealthConnect throws', async () => {
    mockParse.mockImplementation(() => { throw new Error('unexpected'); });
    await expect(parser.parse(ZIP_BYTES)).rejects.toThrow();
    expect(FAKE_DB.close).toHaveBeenCalled();
  });

  it('closes the db after a successful parse', async () => {
    mockParse.mockReturnValue({
      success: true,
      result:  { records: [FAKE_RECORD], warnings: [] },
    });
    await parser.parse(ZIP_BYTES);
    expect(FAKE_DB.close).toHaveBeenCalled();
  });

  it('passes samsung_health as source to parseHealthConnect', async () => {
    mockParse.mockReturnValue({
      success: true,
      result:  { records: [], warnings: [] },
    });
    await parser.parse(ZIP_BYTES);
    expect(mockParse).toHaveBeenCalledWith(FAKE_DB, { source: 'samsung_health' });
  });
});
