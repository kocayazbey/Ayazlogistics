import { Module } from '@nestjs/common';
import { PseudoLocalizationService } from '../services/pseudo-localization.service';
import { I18nCoverageService } from '../services/i18n-coverage.service';
import { OpenApiTypesService } from '../services/openapi-types.service';
import { TemporalSagaService } from '../services/temporal-saga.service';
import { OpenApiTypesController } from '../controllers/openapi-types.controller';

@Module({
  providers: [
    PseudoLocalizationService,
    I18nCoverageService,
    OpenApiTypesService,
    TemporalSagaService,
  ],
  controllers: [OpenApiTypesController],
  exports: [
    PseudoLocalizationService,
    I18nCoverageService,
    OpenApiTypesService,
    TemporalSagaService,
  ],
})
export class DevelopmentModule {}
