// Abstract database adapter — decouples the parser from sql.js so it can be
// unit-tested with a mock and later swapped for a different SQLite binding.

export interface DbRow {
  [column: string]: string | number | null | Uint8Array;
}

export interface DbAdapter {
  /** Run a SELECT and return all matching rows. */
  query(sql: string, params?: (string | number | null)[]): DbRow[];
  /** Close / release the database. */
  close(): void;
}
