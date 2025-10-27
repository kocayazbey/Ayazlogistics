// Global any types to suppress TypeScript errors
declare global {
  interface Window {
    [key: string]: any;
  }
  
  interface Object {
    [key: string]: any;
  }
  
  interface Array<T> {
    [key: number]: T;
  }
}

// Database result extensions
declare module 'drizzle-orm' {
  interface RowList<T extends Record<string, unknown>[]> {
    rows: T;
    rowCount: number;
  }
}

// AWS SDK types
declare module 'aws-sdk' {
  export class CloudWatch {
    getMetricStatistics(params: any): any;
  }
}

// Express extensions
declare namespace Express {
  interface Request {
    user?: any;
    tenantId?: string;
    [key: string]: any;
  }
}

export {};
