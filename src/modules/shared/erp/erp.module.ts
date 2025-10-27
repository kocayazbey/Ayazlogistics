import { Module } from '@nestjs/common';
import { ERPController } from './erp.controller';
import { FinanceService } from '../ayaz-erp/finance/finance.service';
import { PersonnelService } from '../ayaz-erp/hr/personnel/personnel.service';
import { PayrollService } from '../ayaz-erp/hr/payroll/payroll.service';
import { StockCardsService } from '../ayaz-erp/inventory/stock-cards/stock-cards.service';
import { BatchLotService } from '../ayaz-erp/inventory/batch-lot/batch-lot.service';
import { PurchaseOrdersService } from '../ayaz-erp/procurement/purchase-orders/purchase-orders.service';
import { CommonModule } from '../../../common/module';
import { CacheService } from '../../../common/services/cache.service';

@Module({
  imports: [CommonModule],
  controllers: [ERPController],
  providers: [
    FinanceService,
    PersonnelService,
    PayrollService,
    StockCardsService,
    BatchLotService,
    PurchaseOrdersService,
    CacheService,
  ],
  exports: [
    FinanceService,
    PersonnelService,
    PayrollService,
    StockCardsService,
    BatchLotService,
    PurchaseOrdersService,
  ],
})
export class ERPModule {}

