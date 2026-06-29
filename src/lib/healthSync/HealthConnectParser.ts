import { openHealthConnectZip } from '@/lib/wearable/sqlJsAdapter';
import { parseHealthConnect } from '@/lib/wearable/parseHealthConnect';
import type { WearableDayRecord } from '@/lib/wearable/types';
import { ParseError } from './errors';

export class HealthConnectParser {
  async parse(zipBytes: Uint8Array): Promise<WearableDayRecord[]> {
    let db: Awaited<ReturnType<typeof openHealthConnectZip>>;
    try {
      db = await openHealthConnectZip(zipBytes);
    } catch (err) {
      throw new ParseError(
        `Could not read Health Connect export: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    let records: WearableDayRecord[];
    try {
      const result = parseHealthConnect(db, { source: 'samsung_health' });
      if (!result.success || !result.result) {
        throw new ParseError(result.message ?? 'Health Connect export contained no readable data');
      }
      records = result.result.records;
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }

    return records;
  }
}
