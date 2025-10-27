import { SetMetadata } from '@nestjs/common';

export const BLOCKCHAIN_KEY = 'blockchain';
export const BLOCKCHAIN_OPTIONS_KEY = 'blockchain_options';

export interface BlockchainOptions {
  network?: string;
  contract?: string;
  gasLimit?: number;
  gasPrice?: number;
  enableLogging?: boolean;
  enableAuditing?: boolean;
  enableEncryption?: boolean;
  customAbi?: string;
  fallbackNetwork?: string;
  retryAttempts?: number;
  timeout?: number;
}

export const Blockchain = (options: BlockchainOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(BLOCKCHAIN_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(BLOCKCHAIN_OPTIONS_KEY, {
      enableLogging: true,
      enableAuditing: true,
      retryAttempts: 3,
      timeout: 30000,
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

export const Ethereum = () => Blockchain({ network: 'ethereum' });
export const Polygon = () => Blockchain({ network: 'polygon' });
export const BlockchainAudit = () => Blockchain({ enableAuditing: true });
