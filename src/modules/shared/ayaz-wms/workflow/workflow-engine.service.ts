import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';

interface WorkflowParameter {
  id: string;
  code: string;
  name: string;
  category: string;
  dataType: 'boolean' | 'number' | 'string' | 'select';
  defaultValue: any;
  possibleValues?: any[];
  description: string;
  affectedOperations: string[];
  validationRules?: any;
}

interface WorkflowRule {
  id: string;
  code: string;
  name: string;
  priority: number;
  conditions: Array<{
    parameter: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    target: string;
    value: any;
  }>;
  active: boolean;
}

@Injectable()
export class WorkflowEngineService {
  private parameters: Map<string, WorkflowParameter> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {
    this.initializeDefaultParameters();
  }

  private initializeDefaultParameters() {
    const defaultParams: WorkflowParameter[] = [
      { id: '1', code: 'AUTO_PUTAWAY_SUGGEST', name: 'Otomatik Yerleştirme Önerisi', category: 'receiving', dataType: 'boolean', defaultValue: true, description: 'Mal kabulde otomatik konum önerisi yap', affectedOperations: ['receiving', 'putaway'] },
      { id: '2', code: 'REQUIRE_LOT_ON_RECEIVE', name: 'Mal Kabulde Lot Zorunlu', category: 'receiving', dataType: 'boolean', defaultValue: true, description: 'Giriş işleminde lot numarası zorunlu olsun', affectedOperations: ['receiving'] },
      { id: '3', code: 'ALLOW_MIXED_LOT_LOCATION', name: 'Lokasyonda Karma Lot', category: 'inventory', dataType: 'boolean', defaultValue: false, description: 'Bir lokasyonda farklı lotlar bulunabilir', affectedOperations: ['putaway', 'receiving'] },
      { id: '4', code: 'PICKING_STRATEGY', name: 'Toplama Stratejisi', category: 'picking', dataType: 'select', defaultValue: 'FIFO', possibleValues: ['FIFO', 'FEFO', 'LIFO', 'ZONE'], description: 'Varsayılan toplama stratejisi', affectedOperations: ['picking'] },
      { id: '5', code: 'AUTO_ALLOCATE_ON_ORDER', name: 'Sipariş Oluşturulunca Oto Ayır', category: 'picking', dataType: 'boolean', defaultValue: true, description: 'Sipariş oluşunca stok otomatik ayırılsın', affectedOperations: ['order_create', 'picking'] },
    ];

    defaultParams.forEach(p => this.parameters.set(p.code, p));
  }

  async getParameter(code: string, warehouseId: string): Promise<any> {
    const cacheKey = `param:${warehouseId}:${code}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const param = this.parameters.get(code);
    if (!param) return null;

    await this.cacheService.set(cacheKey, param.defaultValue, 3600);
    return param.defaultValue;
  }

  async setParameter(code: string, value: any, warehouseId: string, userId: string) {
    const param = this.parameters.get(code);
    if (!param) throw new NotFoundException('Parameter not found');

    await this.cacheService.set(`param:${warehouseId}:${code}`, value, 3600);
    await this.eventBus.emit('workflow.parameter.changed', { code, value, warehouseId, userId });

    return { code, value, updatedAt: new Date() };
  }

  async evaluateRule(ruleCode: string, context: any): Promise<boolean> {
    return true;
  }

  async getAllParameters(warehouseId: string): Promise<WorkflowParameter[]> {
    return Array.from(this.parameters.values());
  }
}

