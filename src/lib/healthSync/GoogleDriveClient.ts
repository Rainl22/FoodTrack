import { DriveAuthError, DriveDownloadError } from './errors';

export interface DriveFile {
  id:   string;
  name: string;
}

const DRIVE_FILES_URL =
  'https://www.googleapis.com/drive/v3/files';

export class GoogleDriveClient {
  async findHealthConnectFile(token: string): Promise<DriveFile | null> {
    const q = encodeURIComponent("name contains 'health_connect' and trashed = false");
    let resp: Response;
    try {
      resp = await fetch(
        `${DRIVE_FILES_URL}?q=${q}&orderBy=modifiedTime+desc&fields=files(id,name,modifiedTime)&pageSize=5`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      throw new DriveDownloadError(`Network error searching Drive: ${String(err)}`);
    }
    if (resp.status === 401) throw new DriveAuthError();
    if (!resp.ok) throw new DriveDownloadError(`Drive search failed: HTTP ${resp.status}`);

    const data = await resp.json() as { files?: DriveFile[] };
    return data.files?.[0] ?? null;
  }

  async downloadZip(token: string, fileId: string): Promise<Uint8Array> {
    let resp: Response;
    try {
      resp = await fetch(
        `${DRIVE_FILES_URL}/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      throw new DriveDownloadError(`Network error downloading file: ${String(err)}`);
    }
    if (resp.status === 401) throw new DriveAuthError();
    if (!resp.ok) throw new DriveDownloadError(`Drive download failed: HTTP ${resp.status}`);

    return new Uint8Array(await resp.arrayBuffer());
  }
}
