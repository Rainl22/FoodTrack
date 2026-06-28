// Browser adapter: wraps sql.js to implement DbAdapter.
// sql.js uses a WebAssembly SQLite build — the .wasm file must be served from /sql-wasm.wasm.
//
// Usage:
//   const db = await openHealthConnectDb(uint8Array);
//   const result = parseHealthConnect(db);
//   db.close();

import type { DbAdapter, DbRow } from './dbAdapter';

/** Load the sql.js WASM module. Call once per session — reuse the returned initSqlJs function. */
async function loadSqlJs() {
  // sql.js ships a browser build. We point it at the .wasm file in /public.
  const initSqlJs = (await import('sql.js')).default;
  return initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
}

let _sqlJsPromise: ReturnType<typeof loadSqlJs> | null = null;

function getSqlJs() {
  if (!_sqlJsPromise) _sqlJsPromise = loadSqlJs();
  return _sqlJsPromise;
}

/** Open a Health Connect SQLite database from raw bytes and return a DbAdapter. */
export async function openHealthConnectDb(bytes: Uint8Array): Promise<DbAdapter> {
  const SQL = await getSqlJs();
  const db = new SQL.Database(bytes);

  return {
    query(sql: string, params?: (string | number | null)[]): DbRow[] {
      const stmt = db.prepare(sql);
      if (params && params.length > 0) stmt.bind(params);

      const rows: DbRow[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as DbRow);
      }
      stmt.free();
      return rows;
    },

    close() {
      db.close();
    },
  };
}

/** Convenience: unzip a Health Connect export ZIP and open the database inside it.
 *  Returns the DbAdapter and a close function. */
export async function openHealthConnectZip(zipBytes: Uint8Array): Promise<DbAdapter> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(zipBytes);

  const dbFile = Object.values(zip.files).find(f => f.name.endsWith('.db'));
  if (!dbFile) {
    throw new Error(
      'No .db file found in the ZIP. Expected health_connect_export.db inside the archive.'
    );
  }

  const dbBytes = await dbFile.async('uint8array');
  return openHealthConnectDb(dbBytes);
}
