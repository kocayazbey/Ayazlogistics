// Database type definitions
declare module 'drizzle-orm' {
  interface RowList<T extends Record<string, unknown>[]> {
    rows: T;
    rowCount: number;
  }
}

// Extend Drizzle result types
declare global {
  interface DatabaseResult {
    rows: any[];
    rowCount: number;
  }
}

export {};
