import { SetMetadata } from '@nestjs/common';

export const EXPERIMENTAL_KEY = 'experimental';
export const EXPERIMENTAL_OPTIONS_KEY = 'experimental_options';

export interface ExperimentalOptions {
  feature: string;
  version?: string;
  stability?: 'alpha' | 'beta' | 'rc' | 'stable';
  warnings?: string[];
  documentation?: string;
  feedback?: string;
  timeline?: string;
}

export const Experimental = (options: ExperimentalOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(EXPERIMENTAL_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(EXPERIMENTAL_OPTIONS_KEY, options)(target, propertyKey, descriptor);
    return descriptor;
  };
};

export const ExperimentalFeature = (feature: string, stability: 'alpha' | 'beta' = 'alpha') =>
  Experimental({ feature, stability });

export const ExperimentalAudit = (feature: string) =>
  Experimental({ feature, stability: 'alpha', warnings: ['This feature is experimental and may change'] });
