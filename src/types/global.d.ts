// Global type definitions to fix TypeScript errors

declare global {
  interface Error {
    message: string;
    stack?: string;
  }
  
  // Custom type extensions
}

// Database result types
interface DatabaseRow {
  [key: string]: any;
}

interface DatabaseResult {
  rows: DatabaseRow[];
  rowCount: number;
}

// AWS SDK types (if needed)
interface CloudWatchMetrics {
  Datapoints?: Array<{
    Average?: number;
    Maximum?: number;
    Minimum?: number;
    Timestamp?: Date;
  }>;
}

// Extend Express Request
declare namespace Express {
  interface Request {
    user?: any;
    tenantId?: string;
    [key: string]: any;
  }
}

// Custom global types

export {};
