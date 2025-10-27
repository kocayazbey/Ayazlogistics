import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';
import axios from 'axios';
import { withRetry } from './rfid-resilience.policy';

interface RFIDTag {
  epc: string; // Electronic Product Code
  tid?: string; // Tag Identifier
  rssi?: number; // Signal strength
  antennaId?: string;
  timestamp: Date;
}

interface RFIDReadEvent {
  tags: RFIDTag[];
  readerId: string;
  location?: string;
  readType: 'single' | 'bulk' | 'gate';
  timestamp: Date;
}

@Injectable()
export class RFIDReaderService {
  private readonly logger = new Logger(RFIDReaderService.name);
  private readonly readers: Map<string, any> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  async connectReader(
    readerId: string,
    readerIp: string,
    port: number = 5084,
    location?: string,
  ): Promise<void> {
    try {
      const readerConfig = {
        id: readerId,
        ip: readerIp,
        port,
        location,
        isConnected: true,
      };

      this.readers.set(readerId, readerConfig);

      // Start polling for tags
      this.startPolling(readerId, readerIp, port, location);

      this.logger.log(`RFID reader ${readerId} connected at ${readerIp}:${port}`);
    } catch (error: any) {
      this.logger.error(`Failed to connect RFID reader: ${error.message}`);
    }
  }

  private async startPolling(
    readerId: string,
    readerIp: string,
    port: number,
    location?: string,
  ): Promise<void> {
    // Poll RFID reader every 100ms
    setInterval(async () => {
      try {
        const tags = await this.readTags(readerIp, port);

        if (tags.length > 0) {
          await this.handleRFIDRead({
            tags,
            readerId,
            location,
            readType: 'bulk',
            timestamp: new Date(),
          });
        }
      } catch (error: any) {
        // Silent fail for polling errors
      }
    }, 100);
  }

  private async readTags(readerIp: string, port: number): Promise<RFIDTag[]> {
    try {
      // Mock LLRP (Low Level Reader Protocol) communication
      const response = await withRetry(() => axios.get(`http://${readerIp}:${port}/tags`, { timeout: 50 }), {
        maxRetries: 3,
        baseDelayMs: 100,
      });

      return response.data?.tags || [];
    } catch (error) {
      return [];
    }
  }

  private async handleRFIDRead(event: RFIDReadEvent): Promise<void> {
    await this.eventBus.emit('rfid.tags.read', event);

    // Process each tag
    for (const tag of event.tags) {
      await this.eventBus.emit('rfid.tag.detected', {
        epc: tag.epc,
        readerId: event.readerId,
        location: event.location,
        timestamp: event.timestamp,
      });
    }

    this.logger.debug(`RFID read: ${event.tags.length} tags from ${event.readerId}`);
  }

  async readSingleTag(readerId: string): Promise<RFIDTag | null> {
    const reader = this.readers.get(readerId);

    if (!reader) {
      this.logger.warn(`Reader ${readerId} not connected`);
      return null;
    }

    try {
      const tags = await this.readTags(reader.ip, reader.port);
      return tags[0] || null;
    } catch (error: any) {
      this.logger.error(`Single tag read failed: ${error.message}`);
      return null;
    }
  }

  async writeTag(
    readerId: string,
    epc: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    const reader = this.readers.get(readerId);

    if (!reader) {
      return false;
    }

    try {
      await withRetry(() => axios.post(`http://${reader.ip}:${reader.port}/write`, { epc, data }), {
        maxRetries: 3,
        baseDelayMs: 200,
      });

      await this.eventBus.emit('rfid.tag.written', {
        epc,
        readerId,
        data,
        timestamp: new Date(),
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Tag write failed: ${error.message}`);
      return false;
    }
  }

  async configureGateReader(
    readerId: string,
    gateType: 'inbound' | 'outbound',
    autoProcess: boolean = true,
  ): Promise<void> {
    const reader = this.readers.get(readerId);

    if (reader) {
      reader.gateType = gateType;
      reader.autoProcess = autoProcess;
    }
  }

  disconnectReader(readerId: string): void {
    const reader = this.readers.get(readerId);

    if (reader) {
      reader.isConnected = false;
      this.readers.delete(readerId);
      this.logger.log(`RFID reader ${readerId} disconnected`);
    }
  }

  getConnectedReaders(): Array<{ id: string; ip: string; location?: string }> {
    return Array.from(this.readers.values()).map(r => ({
      id: r.id,
      ip: r.ip,
      location: r.location,
    }));
  }
}

