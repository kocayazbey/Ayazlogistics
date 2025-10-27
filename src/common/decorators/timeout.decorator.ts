import { SetMetadata } from '@nestjs/common';

export const TIMEOUT_KEY = 'timeout';

export const Timeout = (timeoutMs: number, errorMessage?: string) =>
  SetMetadata(TIMEOUT_KEY, { timeout: timeoutMs, errorMessage });

export const FastTimeout = () => Timeout(5000, 'Operation timed out after 5 seconds');

export const SlowTimeout = () => Timeout(30000, 'Operation timed out after 30 seconds');

export const DatabaseTimeout = () => Timeout(10000, 'Database operation timed out');

export const ExternalServiceTimeout = () => Timeout(15000, 'External service call timed out');

export const FileOperationTimeout = () => Timeout(20000, 'File operation timed out');
