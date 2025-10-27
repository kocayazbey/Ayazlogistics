import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface ARSession {
  sessionId: string;
  userId: string;
  deviceId: string;
  sessionType: 'picking' | 'training' | 'maintenance' | 'inventory_check';
  warehouseId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed';
  accuracy: number;
  itemsProcessed: number;
}

interface ARMarker {
  markerId: string;
  type: 'location' | 'product' | 'equipment' | 'safety_zone' | 'navigation';
  warehouseLocationId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  metadata: Record<string, any>;
  isActive: boolean;
}

interface ARVisualization {
  type: 'route_overlay' | 'item_highlight' | 'quantity_display' | 'instruction_panel' | 'warning_alert';
  content: any;
  position: { x: number; y: number; z: number };
  duration: number;
  priority: number;
}

interface PickingGuidance {
  currentLocation: string;
  targetLocation: string;
  distance: number;
  direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
  visualCues: ARVisualization[];
  audioInstruction: string;
  item: {
    sku: string;
    quantity: number;
    shelfLevel: number;
    binPosition: string;
  };
}

@Injectable()
export class WarehouseARService {
  private readonly logger = new Logger(WarehouseARService.name);
  private activeSessions = new Map<string, ARSession>();

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async startARSession(userId: string, deviceId: string, sessionType: ARSession['sessionType'], warehouseId: string): Promise<string> {
    const sessionId = `ar_${Date.now()}`;

    const session: ARSession = {
      sessionId,
      userId,
      deviceId,
      sessionType,
      warehouseId,
      startTime: new Date(),
      status: 'active',
      accuracy: 100,
      itemsProcessed: 0,
    };

    this.activeSessions.set(sessionId, session);

    await this.db.execute(
      `INSERT INTO ar_sessions 
       (session_id, user_id, device_id, session_type, warehouse_id, start_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [sessionId, userId, deviceId, sessionType, warehouseId, session.startTime]
    );

    this.logger.log(`AR session started: ${sessionId} (${sessionType})`);

    return sessionId;
  }

  async getPickingGuidance(sessionId: string, currentLocation: string, targetSKU: string): Promise<PickingGuidance> {
    const item = await this.db.execute(
      `SELECT 
        i.sku,
        i.quantity,
        wl.location_code,
        wl.zone,
        wl.aisle,
        wl.bay,
        wl.level
       FROM inventory i
       JOIN warehouse_locations wl ON i.location_id = wl.id
       WHERE i.sku = $1 AND i.quantity > 0
       ORDER BY wl.zone, wl.aisle, wl.bay
       LIMIT 1`,
      [targetSKU]
    );

    if (item.rows.length === 0) {
      throw new Error('Item not found');
    }

    const itemData = item.rows[0];
    const targetLocation = itemData.location_code;

    const distance = this.calculateDistance(currentLocation, targetLocation);
    const direction = this.calculateDirection(currentLocation, targetLocation);

    const visualCues: ARVisualization[] = [
      {
        type: 'route_overlay',
        content: { path: [currentLocation, targetLocation], color: '#00FF00' },
        position: { x: 0, y: 0, z: 0 },
        duration: 0,
        priority: 1,
      },
      {
        type: 'item_highlight',
        content: { location: targetLocation, color: '#FFD700' },
        position: { x: 0, y: 1.5, z: 0 },
        duration: 0,
        priority: 2,
      },
      {
        type: 'quantity_display',
        content: { quantity: itemData.quantity, unit: 'adet' },
        position: { x: 0, y: 2, z: 0 },
        duration: 0,
        priority: 3,
      },
    ];

    const guidance: PickingGuidance = {
      currentLocation,
      targetLocation,
      distance,
      direction,
      visualCues,
      audioInstruction: `${targetLocation} konumuna git. ${itemData.level}. seviye, ${itemData.quantity} adet ${itemData.sku}`,
      item: {
        sku: itemData.sku,
        quantity: parseInt(itemData.quantity),
        shelfLevel: parseInt(itemData.level),
        binPosition: itemData.bay,
      },
    };

    return guidance;
  }

  private calculateDistance(from: string, to: string): number {
    const fromParts = this.parseLocation(from);
    const toParts = this.parseLocation(to);

    const aisleDistance = Math.abs(toParts.aisle - fromParts.aisle) * 20;
    const bayDistance = Math.abs(toParts.bay - fromParts.bay) * 1.5;

    return aisleDistance + bayDistance;
  }

  private parseLocation(location: string): { zone: string; aisle: number; bay: number; level: number } {
    const match = location.match(/([A-Z])-(\d+)-(\d+)-(\d+)/);
    if (!match) {
      return { zone: 'A', aisle: 1, bay: 1, level: 1 };
    }

    return {
      zone: match[1],
      aisle: parseInt(match[2]),
      bay: parseInt(match[3]),
      level: parseInt(match[4]),
    };
  }

  private calculateDirection(from: string, to: string): PickingGuidance['direction'] {
    const fromParts = this.parseLocation(from);
    const toParts = this.parseLocation(to);

    if (toParts.aisle > fromParts.aisle) return 'forward';
    if (toParts.aisle < fromParts.aisle) return 'backward';
    if (toParts.bay > fromParts.bay) return 'right';
    if (toParts.bay < fromParts.bay) return 'left';

    return 'forward';
  }

  async trackItemPicked(sessionId: string, sku: string, location: string, quantity: number): Promise<void> {
    const session = this.activeSessions.get(sessionId);

    if (session) {
      session.itemsProcessed++;
    }

    await this.db.execute(
      `INSERT INTO ar_picking_events 
       (session_id, sku, location, quantity, picked_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [sessionId, sku, location, quantity]
    );

    this.logger.log(`Item picked via AR: ${sku} x${quantity} from ${location}`);
  }

  async generateARMarkers(warehouseId: string): Promise<ARMarker[]> {
    const locations = await this.db.execute(
      `SELECT 
        id,
        location_code,
        zone,
        aisle,
        bay,
        level,
        location_type
       FROM warehouse_locations
       WHERE warehouse_id = $1 AND is_active = true`,
      [warehouseId]
    );

    const markers: ARMarker[] = locations.rows.map((loc, index) => ({
      markerId: `marker_${loc.id}`,
      type: 'location',
      warehouseLocationId: loc.id,
      position: {
        x: parseInt(loc.aisle) * 3,
        y: parseInt(loc.level) * 0.5,
        z: parseInt(loc.bay) * 1.5,
      },
      rotation: { x: 0, y: 0, z: 0 },
      metadata: {
        locationCode: loc.location_code,
        zone: loc.zone,
        type: loc.location_type,
      },
      isActive: true,
    }));

    return markers;
  }

  async getSessionMetrics(sessionId: string): Promise<any> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      const result = await this.db.execute(
        `SELECT * FROM ar_sessions WHERE session_id = $1`,
        [sessionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }

      return result.rows[0];
    }

    const events = await this.db.execute(
      `SELECT COUNT(*) as count FROM ar_picking_events WHERE session_id = $1`,
      [sessionId]
    );

    return {
      sessionId,
      duration: Math.floor((Date.now() - session.startTime.getTime()) / 1000),
      itemsProcessed: session.itemsProcessed,
      accuracy: session.accuracy,
      status: session.status,
    };
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);

    if (session) {
      session.status = 'completed';
      session.endTime = new Date();

      await this.db.execute(
        `UPDATE ar_sessions SET
         status = 'completed',
         end_time = $2,
         items_processed = $3,
         accuracy = $4
         WHERE session_id = $1`,
        [sessionId, session.endTime, session.itemsProcessed, session.accuracy]
      );

      this.activeSessions.delete(sessionId);

      this.logger.log(`AR session ended: ${sessionId}`);
    }
  }
}

