import { Module } from '@nestjs/common';
import { CRMController } from './crm.controller';
import { CRMService } from './services/crm.service';
import { CustomersService } from '../ayaz-crm/customers/customers.service';
import { LeadsService } from '../ayaz-crm/leads/leads.service';
import { DealersService } from '../ayaz-crm/dealers/dealers.service';
import { ActivitiesService } from '../ayaz-crm/activities/activities.service';
import { SlaService } from '../ayaz-crm/sla/sla.service';
import { DatabaseModule } from '../../../core/database/database.module';
import { CommonModule } from '../../../common/module';
import { CacheService } from '../../../common/services/cache.service';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [CRMController],
  providers: [
    CRMService,
    CustomersService,
    LeadsService,
    DealersService,
    ActivitiesService,
    SlaService,
    CacheService,
  ],
  exports: [
    CRMService,
    CustomersService,
    LeadsService,
    DealersService,
    ActivitiesService,
    SlaService,
  ],
})
export class CRMModule {}

