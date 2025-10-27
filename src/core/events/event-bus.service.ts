import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventBusService {
  constructor(private eventEmitter: EventEmitter2) {}

  async emit(event: string, payload: any): Promise<void> {
    this.eventEmitter.emit(event, payload);
  }

  async publish(event: string, payload: any): Promise<void> {
    this.eventEmitter.emit(event, payload);
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.once(event, listener);
  }

  removeListener(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.removeListener(event, listener);
  }

  removeAllListeners(event?: string): void {
    this.eventEmitter.removeAllListeners(event);
  }
}

