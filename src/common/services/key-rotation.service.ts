import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger('KeyRotationService');
  private readonly rotationSchedule = new Map<string, any>();

  scheduleRotation(keyId: string, interval: number): void {
    this.rotationSchedule.set(keyId, {
      interval,
      lastRotation: Date.now(),
      nextRotation: Date.now() + interval
    });
    
    this.logger.debug(`Key rotation scheduled for ${keyId} every ${interval}ms`);
  }

  async rotateKey(keyId: string): Promise<string> {
    const newKey = this.generateNewKey();
    
    // Update rotation schedule
    const schedule = this.rotationSchedule.get(keyId);
    if (schedule) {
      schedule.lastRotation = Date.now();
      schedule.nextRotation = Date.now() + schedule.interval;
    }
    
    this.logger.debug(`Key rotated for ${keyId}`);
    return newKey;
  }

  private generateNewKey(): string {
    return `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getNextRotation(keyId: string): Date | null {
    const schedule = this.rotationSchedule.get(keyId);
    return schedule ? new Date(schedule.nextRotation) : null;
  }
}
