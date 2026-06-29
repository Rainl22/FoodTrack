import { GoogleDriveClient } from '../GoogleDriveClient';
import { DriveAuthError, DriveDownloadError } from '../errors';

const TOKEN = 'test-token';
const FILE_ID = 'file-abc123';

function mockFetch(status: number, body: unknown, throws?: string) {
  global.fetch = jest.fn().mockImplementation(() => {
    if (throws) return Promise.reject(new Error(throws));
    return Promise.resolve({
      status,
      ok: status >= 200 && status < 300,
      json: () => Promise.resolve(body),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });
  });
}

describe('GoogleDriveClient', () => {
  let client: GoogleDriveClient;

  beforeEach(() => {
    client = new GoogleDriveClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── findHealthConnectFile ────────────────────────────────────────────────

  describe('findHealthConnectFile', () => {
    it('returns the first file on success', async () => {
      mockFetch(200, { files: [{ id: FILE_ID, name: 'health_connect_2024.zip' }] });
      const result = await client.findHealthConnectFile(TOKEN);
      expect(result).toEqual({ id: FILE_ID, name: 'health_connect_2024.zip' });
    });

    it('returns null when no files found', async () => {
      mockFetch(200, { files: [] });
      const result = await client.findHealthConnectFile(TOKEN);
      expect(result).toBeNull();
    });

    it('throws DriveAuthError on 401', async () => {
      mockFetch(401, {});
      await expect(client.findHealthConnectFile(TOKEN)).rejects.toBeInstanceOf(DriveAuthError);
    });

    it('throws DriveDownloadError on non-401 HTTP error', async () => {
      mockFetch(500, {});
      await expect(client.findHealthConnectFile(TOKEN)).rejects.toBeInstanceOf(DriveDownloadError);
    });

    it('throws DriveDownloadError on network failure', async () => {
      mockFetch(0, {}, 'Failed to fetch');
      await expect(client.findHealthConnectFile(TOKEN)).rejects.toBeInstanceOf(DriveDownloadError);
    });

    it('passes the Authorization header', async () => {
      mockFetch(200, { files: [] });
      await client.findHealthConnectFile(TOKEN);
      const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(opts.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    });
  });

  // ── downloadZip ──────────────────────────────────────────────────────────

  describe('downloadZip', () => {
    it('returns Uint8Array on success', async () => {
      mockFetch(200, null);
      const result = await client.downloadZip(TOKEN, FILE_ID);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('throws DriveAuthError on 401', async () => {
      mockFetch(401, null);
      await expect(client.downloadZip(TOKEN, FILE_ID)).rejects.toBeInstanceOf(DriveAuthError);
    });

    it('throws DriveDownloadError on non-401 HTTP error', async () => {
      mockFetch(403, null);
      await expect(client.downloadZip(TOKEN, FILE_ID)).rejects.toBeInstanceOf(DriveDownloadError);
    });

    it('throws DriveDownloadError on network failure', async () => {
      mockFetch(0, null, 'Network error');
      await expect(client.downloadZip(TOKEN, FILE_ID)).rejects.toBeInstanceOf(DriveDownloadError);
    });

    it('includes the fileId in the URL', async () => {
      mockFetch(200, null);
      await client.downloadZip(TOKEN, FILE_ID);
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain(FILE_ID);
    });
  });
});
