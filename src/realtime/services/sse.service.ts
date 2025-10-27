import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private clients = new Map<string, Response>();

  addClient(userId: string, response: Response) {
    this.clients.set(userId, response);
    this.logger.log(`SSE client added: ${userId}`);
    
    // Send initial connection event
    this.sendToClient(userId, 'connected', { message: 'SSE connection established' });
  }

  removeClient(userId: string) {
    this.clients.delete(userId);
    this.logger.log(`SSE client removed: ${userId}`);
  }

  sendToClient(userId: string, event: string, data: any) {
    const client = this.clients.get(userId);
    if (client) {
      try {
        client.write(`event: ${event}\n`);
        client.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        this.logger.error(`Failed to send SSE to client ${userId}:`, error);
        this.removeClient(userId);
      }
    }
  }

  sendToAll(event: string, data: any) {
    this.clients.forEach((_, userId) => {
      this.sendToClient(userId, event, data);
    });
  }

  getClientCount() {
    return this.clients.size;
  }

  getConnectedClients() {
    return Array.from(this.clients.keys());
  }

  async broadcast(event: string, data: any): Promise<void> {
    this.sendToAll(event, data);
    this.logger.log(`Broadcasted SSE event ${event} to all clients`);
  }

  async broadcastToTenant(tenantId: string, event: string, data: any): Promise<void> {
    // TODO: Implement tenant-based filtering
    this.sendToAll(event, { ...data, tenantId });
    this.logger.log(`Broadcasted SSE event ${event} to tenant ${tenantId}`);
  }

  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    this.sendToClient(userId, event, data);
    this.logger.log(`Broadcasted SSE event ${event} to user ${userId}`);
  }

}