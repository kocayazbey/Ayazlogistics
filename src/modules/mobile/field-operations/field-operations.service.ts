import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface OfflineOperation {
  id: string;
  tenantId: string;
  driverId: string;
  operationType: 'pickup' | 'delivery' | 'inventory' | 'maintenance';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'synced';
  data: Record<string, any>;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  };
  offlineSince: Date;
  syncedAt?: Date;
  createdAt: Date;
}

export interface ProofOfDelivery {
  id: string;
  tenantId: string;
  shipmentId: string;
  driverId: string;
  deliveryType: 'signature' | 'photo' | 'code' | 'id_verification';
  recipientInfo: {
    name: string;
    idNumber?: string;
    phone?: string;
    email?: string;
  };
  deliveryData: {
    signature?: string; // Base64 encoded signature
    photo?: string; // Base64 encoded photo
    code?: string; // Delivery code
    idVerified?: boolean;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string;
  };
  timestamp: Date;
  isOffline: boolean;
  syncedAt?: Date;
}

export interface ElectronicSignature {
  id: string;
  tenantId: string;
  documentId: string;
  signerId: string;
  signature: string; // Base64 encoded signature
  certificate?: string; // Digital certificate
  timestamp: Date;
  ipAddress?: string;
  deviceInfo?: string;
  isLegallyBinding: boolean;
  createdAt: Date;
}

export interface Geofence {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  type: 'warehouse' | 'delivery_zone' | 'restricted_area' | 'pickup_zone';
  coordinates: Array<{ latitude: number; longitude: number }>;
  radius?: number; // For circular geofences
  isActive: boolean;
  rules: GeofenceRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GeofenceRule {
  id: string;
  geofenceId: string;
  trigger: 'enter' | 'exit' | 'dwell';
  action: 'notify' | 'log' | 'restrict' | 'allow';
  conditions: string[];
  isActive: boolean;
}

export interface GeofenceEvent {
  id: string;
  tenantId: string;
  geofenceId: string;
  driverId: string;
  vehicleId?: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: Date;
  duration?: number; // For dwell events
  isProcessed: boolean;
}

@Injectable()
export class FieldOperationsService {
  private readonly logger = new Logger(FieldOperationsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createOfflineOperation(operation: Omit<OfflineOperation, 'id' | 'createdAt'>): Promise<OfflineOperation> {
    const id = `OO-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO offline_operations (id, tenant_id, driver_id, operation_type, status, data,
                                     location, offline_since, synced_at, created_at)
      VALUES (${id}, ${operation.tenantId}, ${operation.driverId}, ${operation.operationType},
              ${operation.status}, ${JSON.stringify(operation.data)}, ${JSON.stringify(operation.location)},
              ${operation.offlineSince}, ${operation.syncedAt || null}, ${now})
    `);

    this.logger.log(`Offline operation created: ${id} for driver ${operation.driverId}`);

    return {
      id,
      ...operation,
      createdAt: now,
    };
  }

  async getOfflineOperations(tenantId: string, driverId?: string): Promise<OfflineOperation[]> {
    let query = sql`SELECT * FROM offline_operations WHERE tenant_id = ${tenantId}`;
    
    if (driverId) {
      query = sql`SELECT * FROM offline_operations WHERE tenant_id = ${tenantId} AND driver_id = ${driverId}`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      driverId: row.driver_id as string,
      operationType: row.operation_type as OfflineOperation['operationType'],
      status: row.status as OfflineOperation['status'],
      data: JSON.parse(row.data as string),
      location: JSON.parse(row.location as string),
      offlineSince: new Date(row.offline_since as string),
      syncedAt: row.synced_at ? new Date(row.synced_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async syncOfflineOperations(tenantId: string, driverId: string): Promise<number> {
    const operations = await this.getOfflineOperations(tenantId, driverId);
    const pendingOperations = operations.filter(op => op.status === 'completed' && !op.syncedAt);

    for (const operation of pendingOperations) {
      try {
        // Sync operation data to main system
        await this.syncOperationData(operation);
        
        await this.db.execute(sql`
          UPDATE offline_operations SET status = 'synced', synced_at = NOW() WHERE id = ${operation.id}
        `);

        this.logger.log(`Offline operation synced: ${operation.id}`);
      } catch (error) {
        this.logger.error(`Failed to sync offline operation ${operation.id}:`, error);
      }
    }

    return pendingOperations.length;
  }

  private async syncOperationData(operation: OfflineOperation): Promise<void> {
    // Implement actual sync logic based on operation type
    switch (operation.operationType) {
      case 'pickup':
        await this.syncPickupData(operation);
        break;
      case 'delivery':
        await this.syncDeliveryData(operation);
        break;
      case 'inventory':
        await this.syncInventoryData(operation);
        break;
      case 'maintenance':
        await this.syncMaintenanceData(operation);
        break;
    }
  }

  private async syncPickupData(operation: OfflineOperation): Promise<void> {
    // Sync pickup data to main system
    this.logger.log(`Syncing pickup data for operation ${operation.id}`);
  }

  private async syncDeliveryData(operation: OfflineOperation): Promise<void> {
    // Sync delivery data to main system
    this.logger.log(`Syncing delivery data for operation ${operation.id}`);
  }

  private async syncInventoryData(operation: OfflineOperation): Promise<void> {
    // Sync inventory data to main system
    this.logger.log(`Syncing inventory data for operation ${operation.id}`);
  }

  private async syncMaintenanceData(operation: OfflineOperation): Promise<void> {
    // Sync maintenance data to main system
    this.logger.log(`Syncing maintenance data for operation ${operation.id}`);
  }

  async createProofOfDelivery(pod: Omit<ProofOfDelivery, 'id' | 'timestamp'>): Promise<ProofOfDelivery> {
    const id = `POD-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO proof_of_delivery (id, tenant_id, shipment_id, driver_id, delivery_type,
                                   recipient_info, delivery_data, location, timestamp, is_offline, synced_at)
      VALUES (${id}, ${pod.tenantId}, ${pod.shipmentId}, ${pod.driverId}, ${pod.deliveryType},
              ${JSON.stringify(pod.recipientInfo)}, ${JSON.stringify(pod.deliveryData)},
              ${JSON.stringify(pod.location)}, ${now}, ${pod.isOffline}, ${pod.syncedAt || null})
    `);

    this.logger.log(`Proof of delivery created: ${id} for shipment ${pod.shipmentId}`);

    return {
      id,
      ...pod,
      timestamp: now,
    };
  }

  async createElectronicSignature(signature: Omit<ElectronicSignature, 'id' | 'createdAt'>): Promise<ElectronicSignature> {
    const id = `ES-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO electronic_signatures (id, tenant_id, document_id, signer_id, signature,
                                        certificate, timestamp, ip_address, device_info,
                                        is_legally_binding, created_at)
      VALUES (${id}, ${signature.tenantId}, ${signature.documentId}, ${signature.signerId},
              ${signature.signature}, ${signature.certificate || null}, ${signature.timestamp},
              ${signature.ipAddress || null}, ${signature.deviceInfo || null},
              ${signature.isLegallyBinding}, ${now})
    `);

    this.logger.log(`Electronic signature created: ${id} for document ${signature.documentId}`);

    return {
      id,
      ...signature,
      createdAt: now,
    };
  }

  async createGeofence(geofence: Omit<Geofence, 'id' | 'createdAt' | 'updatedAt'>): Promise<Geofence> {
    const id = `GF-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO geofences (id, tenant_id, name, description, type, coordinates, radius,
                            is_active, rules, created_at, updated_at)
      VALUES (${id}, ${geofence.tenantId}, ${geofence.name}, ${geofence.description},
              ${geofence.type}, ${JSON.stringify(geofence.coordinates)}, ${geofence.radius || null},
              ${geofence.isActive}, ${JSON.stringify(geofence.rules)}, ${now}, ${now})
    `);

    this.logger.log(`Geofence created: ${id} for tenant ${geofence.tenantId}`);

    return {
      id,
      ...geofence,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getGeofences(tenantId: string): Promise<Geofence[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM geofences WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string,
      type: row.type as Geofence['type'],
      coordinates: JSON.parse(row.coordinates as string),
      radius: row.radius ? parseFloat(row.radius as string) : undefined,
      isActive: row.is_active as boolean,
      rules: JSON.parse(row.rules as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async createGeofenceEvent(event: Omit<GeofenceEvent, 'id' | 'timestamp'>): Promise<GeofenceEvent> {
    const id = `GFE-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO geofence_events (id, tenant_id, geofence_id, driver_id, vehicle_id,
                                  event_type, location, timestamp, duration, is_processed)
      VALUES (${id}, ${event.tenantId}, ${event.geofenceId}, ${event.driverId},
              ${event.vehicleId || null}, ${event.eventType}, ${JSON.stringify(event.location)},
              ${now}, ${event.duration || null}, ${event.isProcessed})
    `);

    this.logger.log(`Geofence event created: ${id} for geofence ${event.geofenceId}`);

    return {
      id,
      ...event,
      timestamp: now,
    };
  }

  async getFieldOperationsDashboard(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    const offlineOperations = await this.getOfflineOperations(tenantId);
    const pendingSync = offlineOperations.filter(op => op.status === 'completed' && !op.syncedAt);

    const podStats = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total_pods,
        COUNT(CASE WHEN is_offline = true THEN 1 END) as offline_pods,
        COUNT(CASE WHEN synced_at IS NOT NULL THEN 1 END) as synced_pods
      FROM proof_of_delivery
      WHERE tenant_id = ${tenantId}
      AND timestamp BETWEEN ${period.start} AND ${period.end}
    `);

    const geofenceStats = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'enter' THEN 1 END) as enter_events,
        COUNT(CASE WHEN event_type = 'exit' THEN 1 END) as exit_events,
        COUNT(CASE WHEN is_processed = false THEN 1 END) as unprocessed_events
      FROM geofence_events
      WHERE tenant_id = ${tenantId}
      AND timestamp BETWEEN ${period.start} AND ${period.end}
    `);

    const podData = podStats[0];
    const geofenceData = geofenceStats[0];

    return {
      summary: {
        totalOfflineOperations: offlineOperations.length,
        pendingSyncOperations: pendingSync.length,
        totalPODs: parseInt(podData?.total_pods as string) || 0,
        offlinePODs: parseInt(podData?.offline_pods as string) || 0,
        syncedPODs: parseInt(podData?.synced_pods as string) || 0,
        totalGeofenceEvents: parseInt(geofenceData?.total_events as string) || 0,
        unprocessedGeofenceEvents: parseInt(geofenceData?.unprocessed_events as string) || 0,
      },
      operations: {
        offline: pendingSync.slice(0, 10),
        recent: offlineOperations.slice(0, 10),
      },
      metrics: {
        syncRate: this.calculateSyncRate(offlineOperations),
        geofenceCompliance: this.calculateGeofenceCompliance(tenantId, period),
        offlineCapability: this.calculateOfflineCapability(tenantId),
      },
    };
  }

  private calculateSyncRate(operations: OfflineOperation[]): number {
    if (operations.length === 0) return 0;
    const synced = operations.filter(op => op.syncedAt).length;
    return Math.round((synced / operations.length) * 100);
  }

  private async calculateGeofenceCompliance(tenantId: string, period: { start: Date; end: Date }): Promise<number> {
    const result = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN event_type = 'enter' AND is_processed = true THEN 1 END) as processed_enters
      FROM geofence_events
      WHERE tenant_id = ${tenantId}
      AND timestamp BETWEEN ${period.start} AND ${period.end}
    `);

    const data = result[0];
    const total = parseInt(data?.total_events as string) || 0;
    const processed = parseInt(data?.processed_enters as string) || 0;

    return total > 0 ? Math.round((processed / total) * 100) : 0;
  }

  private async calculateOfflineCapability(tenantId: string): Promise<number> {
    const result = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total_operations,
        COUNT(CASE WHEN status IN ('completed', 'synced') THEN 1 END) as successful_operations
      FROM offline_operations
      WHERE tenant_id = ${tenantId}
      AND offline_since >= NOW() - INTERVAL '7 days'
    `);

    const data = result[0];
    const total = parseInt(data?.total_operations as string) || 0;
    const successful = parseInt(data?.successful_operations as string) || 0;

    return total > 0 ? Math.round((successful / total) * 100) : 0;
  }
}
