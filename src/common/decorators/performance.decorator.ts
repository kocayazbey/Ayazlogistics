import { SetMetadata } from '@nestjs/common';

export const PERFORMANCE_KEY = 'performance';
export const PERFORMANCE_SKIP_KEY = 'performanceSkip';

export const Performance = (options?: {
  trackDuration?: boolean;
  trackMemory?: boolean;
  trackCpu?: boolean;
  slowThreshold?: number;
  logSlow?: boolean;
}) =>
  SetMetadata(PERFORMANCE_KEY, options || {});

export const SkipPerformance = () =>
  SetMetadata(PERFORMANCE_SKIP_KEY, true);

export const TrackPerformance = () =>
  Performance({
    trackDuration: true,
    trackMemory: true,
    trackCpu: true,
    slowThreshold: 1000,
    logSlow: true,
  });

export const TrackSlowOperations = (threshold: number = 1000) =>
  Performance({
    trackDuration: true,
    slowThreshold: threshold,
    logSlow: true,
  });

export const TrackMemoryUsage = () =>
  Performance({
    trackMemory: true,
    trackDuration: true,
  });

export const TrackCpuUsage = () =>
  Performance({
    trackCpu: true,
    trackDuration: true,
  });