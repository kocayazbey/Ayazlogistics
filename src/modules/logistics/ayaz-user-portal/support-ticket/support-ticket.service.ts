import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  userId: string;
  category: 'billing' | 'shipping' | 'inventory' | 'technical' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'waiting_internal' | 'resolved' | 'closed';
  subject: string;
  description: string;
  assignedTo?: string;
  assignedTeam?: string;
  relatedOrderId?: string;
  relatedShipmentId?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  resolution?: string;
  satisfactionRating?: number;
  satisfactionComment?: string;
  createdAt: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userType: 'customer' | 'support_agent' | 'system';
  message: string;
  isInternal: boolean;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
  }>;
  createdAt: Date;
}

@Injectable()
export class SupportTicketService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createTicket(
    data: Omit<SupportTicket, 'id' | 'ticketNumber' | 'status' | 'createdAt'>,
    tenantId: string,
  ): Promise<SupportTicket> {
    const ticketId = `TKT-${Date.now()}`;
    const ticketNumber = `#${Date.now().toString().slice(-6)}`;

    const ticket: SupportTicket = {
      id: ticketId,
      ticketNumber,
      ...data,
      status: 'open',
      createdAt: new Date(),
    };

    await this.eventBus.emit('ticket.created', {
      ticketId,
      ticketNumber,
      customerId: data.customerId,
      category: data.category,
      priority: data.priority,
      subject: data.subject,
      tenantId,
    });

    // Auto-assign based on category
    await this.autoAssignTicket(ticketId, data.category, tenantId);

    return ticket;
  }

  async getTicket(ticketId: string, customerId: string, tenantId: string): Promise<SupportTicket | null> {
    // Mock: Would query support_tickets table
    return null;
  }

  async getCustomerTickets(
    customerId: string,
    filters: {
      status?: string;
      category?: string;
      priority?: string;
    },
    tenantId: string,
  ): Promise<SupportTicket[]> {
    // Mock: Would query with filters
    return [];
  }

  async updateTicketStatus(
    ticketId: string,
    status: SupportTicket['status'],
    tenantId: string,
    userId: string,
  ): Promise<void> {
    if (status === 'resolved') {
      await this.eventBus.emit('ticket.resolved', {
        ticketId,
        resolvedBy: userId,
        resolvedAt: new Date(),
        tenantId,
      });
    } else if (status === 'closed') {
      await this.eventBus.emit('ticket.closed', {
        ticketId,
        closedBy: userId,
        closedAt: new Date(),
        tenantId,
      });
    }

    await this.eventBus.emit('ticket.status_updated', {
      ticketId,
      status,
      updatedBy: userId,
      tenantId,
    });
  }

  async addComment(
    data: Omit<TicketComment, 'id' | 'createdAt'>,
    tenantId: string,
  ): Promise<TicketComment> {
    const commentId = `CMT-${Date.now()}`;

    const comment: TicketComment = {
      id: commentId,
      ...data,
      createdAt: new Date(),
    };

    await this.eventBus.emit('ticket.comment.added', {
      commentId,
      ticketId: data.ticketId,
      userId: data.userId,
      userType: data.userType,
      tenantId,
    });

    // Update ticket status if customer replied
    if (data.userType === 'customer') {
      await this.updateTicketStatus(data.ticketId, 'waiting_internal', tenantId, data.userId);
    }

    return comment;
  }

  async getTicketComments(ticketId: string, includeInternal: boolean, tenantId: string): Promise<TicketComment[]> {
    // Mock: Would query ticket_comments table
    return [];
  }

  async assignTicket(
    ticketId: string,
    assignedTo: string,
    assignedTeam: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('ticket.assigned', {
      ticketId,
      assignedTo,
      assignedTeam,
      assignedBy: userId,
      tenantId,
    });

    await this.updateTicketStatus(ticketId, 'in_progress', tenantId, userId);
  }

  async rateTicket(
    ticketId: string,
    rating: number,
    comment: string,
    customerId: string,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('ticket.rated', {
      ticketId,
      rating,
      comment,
      customerId,
      tenantId,
    });
  }

  async getTicketStatistics(customerId: string, tenantId: string): Promise<any> {
    return {
      customerId,
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      avgResolutionTime: 0, // in hours
      satisfactionScore: 0,
    };
  }

  async searchTickets(
    customerId: string,
    searchQuery: string,
    tenantId: string,
  ): Promise<SupportTicket[]> {
    // Mock: Would perform full-text search
    return [];
  }

  private async autoAssignTicket(ticketId: string, category: string, tenantId: string): Promise<void> {
    const teamMapping: Record<string, string> = {
      'billing': 'billing_team',
      'shipping': 'operations_team',
      'inventory': 'warehouse_team',
      'technical': 'tech_support',
      'general': 'customer_service',
    };

    const assignedTeam = teamMapping[category] || 'customer_service';

    await this.eventBus.emit('ticket.auto_assigned', {
      ticketId,
      assignedTeam,
      tenantId,
    });
  }
}

