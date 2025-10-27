import { SetMetadata } from '@nestjs/common';

export const VERSIONING_KEY = 'versioning';
export const VERSION_KEY = 'version';
export const DEPRECATED_KEY = 'deprecated';
export const BREAKING_KEY = 'breaking';

export const Versioning = (version: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(VERSIONING_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(VERSION_KEY, version)(target, propertyKey, descriptor);
    return descriptor;
  };
};

export const Version = (version: string) => Versioning(version);
export const Deprecated = (since?: string, removal?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(DEPRECATED_KEY, { since, removal })(target, propertyKey, descriptor);
    return descriptor;
  };
};
export const Breaking = (since?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(BREAKING_KEY, { since })(target, propertyKey, descriptor);
    return descriptor;
  };
};
