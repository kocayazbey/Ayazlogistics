import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

interface SSEClient {
  id: string;
  userId?: string;
  channels: Set<string>;
  lastPing: number;
}

@Injectable()
export class SSEService {
  private readonly logger = new Logger(SSEService.name);
  private clients = new Map<string, SSEClient>();
  private eventStreams = new Map<string, Subject<any>>();

  registerClient(clientId: string, userId?: string): void {
    this.clients.set(clientId, {
      id: clientId,
      userId,
      channels: new Set(),
      lastPing: Date.now(),
    });
    this.logger.log(`SSE client registered: ${clientId}`);
  }

  unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
    this.logger.log(`SSE client unregistered: ${clientId}`);
  }

  subscribe(clientId: string, channel: string): Observable<any> {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Client not found');

    client.channels.add(channel);

    if (!this.eventStreams.has(channel)) {
      this.eventStreams.set(channel, new Subject());
    }

    return this.eventStreams.get(channel)!.asObservable();
  }

  publish(channel: string, event: any): void {
    const stream = this.eventStreams.get(channel);
    if (stream) {
      stream.next(event);
      this.logger.debug(`Event published to channel ${channel}`);
    }
  }

  broadcast(event: any): void {
    this.eventStreams.forEach((stream) => stream.next(event));
  }

  publishToUser(userId: string, event: any): void {
    const userClients = Array.from(this.clients.values()).filter(c => c.userId === userId);
    userClients.forEach(client => {
      client.channels.forEach(channel => {
        this.publish(channel, event);
      });
    });
  }

  heartbeat(): void {
    const now = Date.now();
    const timeout = 30000;

    this.clients.forEach((client, id) => {
      if (now - client.lastPing > timeout) {
        this.unregisterClient(id);
      }
    });
  }
}

