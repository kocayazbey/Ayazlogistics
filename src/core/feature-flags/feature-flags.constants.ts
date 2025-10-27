export const FEATURE_FLAGS = {
  STATUS_TEST: 'feature-flags-lifecycle-ab',
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
