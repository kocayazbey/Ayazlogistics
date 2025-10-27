import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';
export const DEPRECATED_KEY = 'deprecated';

export const ApiVersion = (version: string) => SetMetadata(API_VERSION_KEY, version);
export const Deprecated = (since?: string, sunset?: string) => 
  SetMetadata(DEPRECATED_KEY, { since, sunset });
