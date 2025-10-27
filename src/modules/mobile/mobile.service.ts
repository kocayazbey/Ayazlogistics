import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { inventory, inventoryMovements } from '../../database/schema/shared/wms.schema';
import { orders } from '../../database/schema/shared/orders.schema';
import { customers } from '../../database/schema/shared/crm.schema';
import { mobileTasks } from '../../database/schema/mobile/tasks.schema';
import { users } from '../../database/schema/core/users.schema';
import { notifications } from '../../database/schema/core/notifications.schema';
import { eq, and, desc, count, sql, like, or, gte, lte } from 'drizzle-orm';

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase
  ) {}

  async getDashboardData(tenantId: string, role: string) {
    this.logger.log(`Getting dashboard data for role: ${role} in tenant: ${tenantId}`);

    // Get task statistics
    const [taskStats] = await this.db
      .select({
        total: count(),
        completed: sql<number>`COUNT(CASE WHEN ${mobileTasks.status} = 'completed' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN ${mobileTasks.status} = 'pending' THEN 1 END)`,
        urgent: sql<number>`COUNT(CASE WHEN ${mobileTasks.priority} = 'urgent' AND ${mobileTasks.status} != 'completed' THEN 1 END)`,
      })
      .from(mobileTasks)
      .where(eq(mobileTasks.tenantId, tenantId));

    // Get recent tasks
    const recentTasks = await this.db
      .select()
      .from(mobileTasks)
      .where(eq(mobileTasks.tenantId, tenantId))
      .orderBy(desc(mobileTasks.createdAt))
      .limit(5);

    const dashboardData = {
      stats: {
        totalTasks: Number(taskStats?.total || 0),
        completedTasks: Number(taskStats?.completed || 0),
        pendingTasks: Number(taskStats?.pending || 0),
        urgentTasks: Number(taskStats?.urgent || 0)
      },
      recentActivity: recentTasks.map(task => ({
        type: `${task.type}_${task.status}`,
        title: task.title,
        description: task.description,
        timestamp: task.createdAt
      })),
      alerts: []
    };

    return dashboardData;
  }

  async getInventory(tenantId: string, filters: any) {
    this.logger.log(`Getting inventory for tenant: ${tenantId}`);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(inventory.tenantId, tenantId)];

    if (filters.status) {
      whereConditions.push(eq(inventory.status, filters.status));
    }

    if (filters.sku) {
      whereConditions.push(eq(inventory.sku, filters.sku));
    }

    const [inventoryData, totalCount] = await Promise.all([
      this.db
        .select({
          id: inventory.id,
          sku: inventory.sku,
          name: inventory.name,
          quantity: inventory.quantityOnHand,
          location: inventory.locationId,
          status: inventory.status,
        })
        .from(inventory)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(inventory)
        .where(and(...whereConditions))
    ]);

    return {
      data: inventoryData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async updateLocation(tenantId: string, userId: string, location: { latitude: number; longitude: number }) {
    this.logger.log(`Updating location for user: ${userId} in tenant: ${tenantId}`);

    // Get current user data
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Update user metadata with location
    const updatedMetadata = {
      ...(user.metadata as any || {}),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdated: new Date().toISOString(),
      },
    };

    await this.db
      .update(users)
      .set({
        metadata: updatedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      id: userId,
      location,
      timestamp: new Date().toISOString(),
      status: 'updated'
    };
  }

  async getLocation(tenantId: string, userId: string) {
    this.logger.log(`Getting location for user: ${userId} in tenant: ${tenantId}`);

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const metadata = user.metadata as any || {};
    const location = metadata.location || null;

    if (!location) {
      return {
        latitude: null,
        longitude: null,
        address: null,
        lastUpdated: null,
        message: 'Location not set'
      };
    }

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address || 'Address not available',
      lastUpdated: location.lastUpdated || new Date().toISOString()
    };
  }

  async scanBarcode(tenantId: string, barcode: string, metadata?: any) {
    this.logger.log(`Scanning barcode: ${barcode} in tenant: ${tenantId}`);

    // Search for product by SKU or barcode
    const [product] = await this.db
      .select({
        id: inventory.id,
        sku: inventory.sku,
        name: inventory.name,
        quantity: inventory.quantityOnHand,
        location: inventory.locationId,
        status: inventory.status,
        warehouseId: inventory.warehouseId,
      })
      .from(inventory)
      .where(and(
        eq(inventory.tenantId, tenantId),
        or(
          eq(inventory.sku, barcode),
          sql`${inventory.metadata}->>'barcode' = ${barcode}`
        )
      ))
      .limit(1);

    if (!product) {
      return {
        barcode,
        found: false,
        message: 'Product not found',
        timestamp: new Date().toISOString(),
        metadata
      };
    }

    return {
      barcode,
      found: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        quantity: Number(product.quantity || 0),
        location: product.location || 'Unknown',
        status: product.status,
        warehouseId: product.warehouseId,
      },
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  async scanQRCode(tenantId: string, qrCode: string, metadata?: any) {
    this.logger.log(`Scanning QR code: ${qrCode} in tenant: ${tenantId}`);

    try {
      // Try to parse QR code as JSON first
      let parsedData: any;
      try {
        parsedData = JSON.parse(qrCode);
      } catch {
        // If not JSON, treat as SKU/product identifier
        parsedData = { sku: qrCode, type: 'product' };
      }

      // If QR contains product info
      if (parsedData.type === 'product' || parsedData.sku) {
        const sku = parsedData.sku || parsedData.id;
        const [product] = await this.db
          .select({
            id: inventory.id,
            sku: inventory.sku,
            name: inventory.name,
            quantity: inventory.quantityOnHand,
            location: inventory.locationId,
            status: inventory.status,
          })
          .from(inventory)
          .where(and(
            eq(inventory.tenantId, tenantId),
            eq(inventory.sku, sku)
          ))
          .limit(1);

        if (product) {
          return {
            qrCode,
            found: true,
            data: {
              type: 'product',
              id: product.id,
              sku: product.sku,
              name: product.name,
              quantity: Number(product.quantity || 0),
              location: product.location,
              status: product.status,
            },
            timestamp: new Date().toISOString(),
            metadata
          };
        }
      }

      // Return parsed QR data if product not found
      return {
        qrCode,
        found: false,
        data: parsedData,
        message: 'QR code scanned but product not found in inventory',
        timestamp: new Date().toISOString(),
        metadata
      };
    } catch (error) {
      this.logger.error('Error scanning QR code', error);
      return {
        qrCode,
        found: false,
        error: 'Failed to parse QR code',
        timestamp: new Date().toISOString(),
        metadata
      };
    }
  }

  async uploadPhoto(tenantId: string, userId: string, photo: string, metadata?: any) {
    this.logger.log(`Uploading photo for user: ${userId} in tenant: ${tenantId}`);

    // Validate user exists
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate photo ID
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, you would:
    // 1. Save photo to cloud storage (S3, Azure Blob, etc.)
    // 2. Store photo metadata in database
    // 3. Create thumbnail versions
    // For now, we'll return the photo ID and metadata
    
    const photoMetadata = {
      id: photoId,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      tenantId,
      size: photo.length, // Base64 length
      format: metadata?.format || 'jpeg',
      ...metadata,
    };

    // Store photo reference in user metadata or create a photos table
    const userMetadata = user.metadata as any || {};
    if (!userMetadata.photos) {
      userMetadata.photos = [];
    }
    userMetadata.photos.push(photoMetadata);

    await this.db
      .update(users)
      .set({
        metadata: userMetadata,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return {
      id: photoId,
      photo: photo.substring(0, 50) + '...', // Don't return full base64
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      metadata: photoMetadata,
      status: 'uploaded',
      message: 'Photo uploaded successfully. Storage implementation pending.'
    };
  }

  async getOrders(tenantId: string, filters: any) {
    this.logger.log(`Getting orders for tenant: ${tenantId}`);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(orders.tenantId, tenantId)];

    if (filters.status) {
      whereConditions.push(eq(orders.status, filters.status as any));
    }

    const [ordersData, totalCount] = await Promise.all([
      this.db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customer: orders.customerName,
          status: orders.status,
          items: sql<number>`jsonb_array_length(${orders.items})`,
          totalValue: sql<number>`(${orders.totals}->>'total')::numeric`,
          deliveryDate: orders.deliveredAt,
        })
        .from(orders)
        .where(and(...whereConditions))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(orders)
        .where(and(...whereConditions))
    ]);

    return {
      data: ordersData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async getCustomers(tenantId: string, filters: any) {
    this.logger.log(`Getting customers for tenant: ${tenantId}`);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(customers.tenantId, tenantId)];

    if (filters.status) {
      whereConditions.push(eq(customers.status, filters.status));
    }

    const [customersData, totalCount] = await Promise.all([
      this.db
        .select({
          id: customers.id,
          name: customers.name,
          contact: customers.phone,
          email: customers.email,
          address: sql<string>`CONCAT(${customers.address}, ', ', ${customers.city}, ', ', ${customers.country})`,
        })
        .from(customers)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(customers)
        .where(and(...whereConditions))
    ]);

    return {
      data: customersData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async getEmployees(tenantId: string, filters: any) {
    this.logger.log(`Getting employees for tenant: ${tenantId}`);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(users.tenantId, tenantId)];

    if (filters.role) {
      whereConditions.push(eq(users.role, filters.role));
    }

    const [employeesData, totalCount] = await Promise.all([
      this.db
        .select({
          id: users.id,
          name: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          role: users.role,
          status: sql<string>`CASE WHEN ${users.isActive} THEN 'active' ELSE 'inactive' END`,
          phone: users.phone,
        })
        .from(users)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(users)
        .where(and(...whereConditions))
    ]);

    return {
      data: employeesData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async getReports(tenantId: string, type: string, filters: any) {
    this.logger.log(`Getting ${type} report for tenant: ${tenantId}`);

    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    let reportData: any = {};

    switch (type) {
      case 'tasks':
        const [taskStats] = await this.db
          .select({
            total: count(),
            completed: sql<number>`COUNT(CASE WHEN ${mobileTasks.status} = 'completed' THEN 1 END)`,
            pending: sql<number>`COUNT(CASE WHEN ${mobileTasks.status} = 'pending' THEN 1 END)`,
            inProgress: sql<number>`COUNT(CASE WHEN ${mobileTasks.status} = 'in_progress' THEN 1 END)`,
            urgent: sql<number>`COUNT(CASE WHEN ${mobileTasks.priority} = 'urgent' THEN 1 END)`,
          })
          .from(mobileTasks)
          .where(and(
            eq(mobileTasks.tenantId, tenantId),
            gte(mobileTasks.createdAt, startDate),
            lte(mobileTasks.createdAt, endDate)
          ));

        reportData = {
          summary: {
            totalTasks: Number(taskStats?.total || 0),
            completedTasks: Number(taskStats?.completed || 0),
            pendingTasks: Number(taskStats?.pending || 0),
            inProgressTasks: Number(taskStats?.inProgress || 0),
            urgentTasks: Number(taskStats?.urgent || 0),
            completionRate: taskStats?.total > 0 
              ? ((Number(taskStats?.completed || 0) / Number(taskStats?.total || 1)) * 100).toFixed(2) + '%'
              : '0%',
          },
        };
        break;

      case 'orders':
        const [orderStats] = await this.db
          .select({
            total: count(),
            completed: sql<number>`COUNT(CASE WHEN ${orders.status} = 'delivered' THEN 1 END)`,
            pending: sql<number>`COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END)`,
            totalValue: sql<number>`SUM((${orders.totals}->>'total')::numeric)`,
          })
          .from(orders)
          .where(and(
            eq(orders.tenantId, tenantId),
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate)
          ));

        reportData = {
          summary: {
            totalOrders: Number(orderStats?.total || 0),
            completedOrders: Number(orderStats?.completed || 0),
            pendingOrders: Number(orderStats?.pending || 0),
            totalValue: Number(orderStats?.totalValue || 0).toFixed(2),
            averageOrderValue: orderStats?.total > 0
              ? (Number(orderStats?.totalValue || 0) / Number(orderStats?.total || 1)).toFixed(2)
              : '0',
          },
        };
        break;

      default:
        reportData = {
          summary: 'Report type not implemented',
        };
    }

    return {
      type,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      data: reportData,
      generatedAt: new Date().toISOString(),
      filters
    };
  }

  async getAnalytics(tenantId: string, type: string, period: string) {
    this.logger.log(`Getting ${type} analytics for period: ${period} in tenant: ${tenantId}`);

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let analyticsData: any = {};

    switch (type) {
      case 'performance':
        const [taskPerf] = await this.db
          .select({
            avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${mobileTasks.completedAt} - ${mobileTasks.startedAt})))`,
            totalCompleted: sql<number>`COUNT(CASE WHEN ${mobileTasks.status} = 'completed' THEN 1 END)`,
            totalAssigned: count(),
          })
          .from(mobileTasks)
          .where(and(
            eq(mobileTasks.tenantId, tenantId),
            gte(mobileTasks.createdAt, startDate)
          ));

        analyticsData = {
          tasks: {
            completed: Number(taskPerf?.totalCompleted || 0),
            assigned: Number(taskPerf?.totalAssigned || 0),
            completionRate: taskPerf?.totalAssigned > 0
              ? ((Number(taskPerf?.totalCompleted || 0) / Number(taskPerf?.totalAssigned || 1)) * 100).toFixed(2) + '%'
              : '0%',
            avgCompletionTimeHours: taskPerf?.avgCompletionTime
              ? (Number(taskPerf.avgCompletionTime) / 3600).toFixed(2)
              : '0',
          },
        };
        break;

      case 'orders':
        const [orderAnalytics] = await this.db
          .select({
            total: count(),
            delivered: sql<number>`COUNT(CASE WHEN ${orders.status} = 'delivered' THEN 1 END)`,
            totalValue: sql<number>`SUM((${orders.totals}->>'total')::numeric)`,
          })
          .from(orders)
          .where(and(
            eq(orders.tenantId, tenantId),
            gte(orders.createdAt, startDate)
          ));

        analyticsData = {
          orders: {
            total: Number(orderAnalytics?.total || 0),
            delivered: Number(orderAnalytics?.delivered || 0),
            deliveryRate: orderAnalytics?.total > 0
              ? ((Number(orderAnalytics?.delivered || 0) / Number(orderAnalytics?.total || 1)) * 100).toFixed(2) + '%'
              : '0%',
            totalRevenue: Number(orderAnalytics?.totalValue || 0).toFixed(2),
          },
        };
        break;

      default:
        analyticsData = {
          message: 'Analytics type not implemented',
        };
    }

    return {
      type,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      data: analyticsData,
      generatedAt: new Date().toISOString()
    };
  }

  async getUpdates(tenantId: string, userId: string) {
    this.logger.log(`Getting updates for user: ${userId} in tenant: ${tenantId}`);

    // Get unread notifications for user
    const unreadNotifications = await this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        data: notifications.data,
        createdAt: notifications.createdAt,
        isRead: notifications.isRead,
      })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isRead, false)
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    // Get recent tasks assigned to user
    const recentTasks = await this.db
      .select({
        id: mobileTasks.id,
        title: mobileTasks.title,
        type: mobileTasks.type,
        status: mobileTasks.status,
        priority: mobileTasks.priority,
        createdAt: mobileTasks.createdAt,
      })
      .from(mobileTasks)
      .where(and(
        eq(mobileTasks.tenantId, tenantId),
        eq(mobileTasks.assignedTo, userId),
        sql`${mobileTasks.status} != 'completed'`
      ))
      .orderBy(desc(mobileTasks.createdAt))
      .limit(10);

    const updates = [
      ...unreadNotifications.map(notif => ({
        id: notif.id,
        type: 'notification',
        title: notif.title,
        message: notif.message,
        timestamp: notif.createdAt?.toISOString() || new Date().toISOString(),
        read: notif.isRead,
        data: notif.data,
      })),
      ...recentTasks.map(task => ({
        id: task.id,
        type: 'task_assigned',
        title: task.title,
        message: `New ${task.type} task assigned - Priority: ${task.priority}`,
        timestamp: task.createdAt?.toISOString() || new Date().toISOString(),
        read: false,
        data: {
          taskId: task.id,
          status: task.status,
          priority: task.priority,
        },
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      updates: updates.slice(0, 20), // Limit to 20 most recent
      unreadCount: unreadNotifications.length,
      timestamp: new Date().toISOString()
    };
  }
}

