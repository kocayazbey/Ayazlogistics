// Test setup file
import 'reflect-metadata';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';

// Global test utilities
global.testTimeout = 10000;

// Setup console mocks to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is deprecated')) return;
    if (args[0]?.includes?.('Warning: componentWillMount')) return;
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is deprecated')) return;
    if (args[0]?.includes?.('Warning: componentWillMount')) return;
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
