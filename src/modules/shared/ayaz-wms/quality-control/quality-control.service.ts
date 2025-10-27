import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityControl } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class QualityControlService {
  constructor(
    @InjectRepository(QualityControl)
    private qualityControlRepository: Repository<QualityControl>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<QualityControl[]> {
    const query = this.qualityControlRepository.createQueryBuilder('qualityControl')
      .where('qualityControl.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('qualityControl.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('qualityControl.type = :type', { type: filters.type });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<QualityControl> {
    return this.qualityControlRepository.findOne({
      where: { id, tenantId },
      relations: ['item', 'inspector'],
    });
  }

  async create(qualityControlData: Partial<QualityControl>, tenantId: string): Promise<QualityControl> {
    const qualityControl = this.qualityControlRepository.create({
      ...qualityControlData,
      tenantId,
      controlNumber: this.generateControlNumber(),
      status: 'pending',
    });
    return this.qualityControlRepository.save(qualityControl);
  }

  async update(id: string, qualityControlData: Partial<QualityControl>, tenantId: string): Promise<QualityControl> {
    await this.qualityControlRepository.update({ id, tenantId }, qualityControlData);
    return this.findOne(id, tenantId);
  }

  async startInspection(id: string, tenantId: string): Promise<QualityControl> {
    const qualityControl = await this.findOne(id, tenantId);
    if (!qualityControl) {
      throw new Error('Quality control not found');
    }

    qualityControl.status = 'in_progress';
    qualityControl.startedAt = new Date();
    return this.qualityControlRepository.save(qualityControl);
  }

  async completeInspection(id: string, results: any, tenantId: string): Promise<QualityControl> {
    const qualityControl = await this.findOne(id, tenantId);
    if (!qualityControl) {
      throw new Error('Quality control not found');
    }

    qualityControl.status = 'completed';
    qualityControl.completedAt = new Date();
    qualityControl.results = results;
    qualityControl.passed = results.passed;
    
    return this.qualityControlRepository.save(qualityControl);
  }

  async getQualityMetrics(tenantId: string): Promise<any> {
    const qualityControls = await this.findAll(tenantId);
    
    const total = qualityControls.length;
    const passed = qualityControls.filter(qc => qc.passed).length;
    const failed = qualityControls.filter(qc => !qc.passed).length;
    const inProgress = qualityControls.filter(qc => qc.status === 'in_progress').length;

    return {
      total,
      passed,
      failed,
      inProgress,
      passRate: total > 0 ? (passed / total) * 100 : 0,
    };
  }

  async getDefectAnalysis(tenantId: string): Promise<any> {
    const qualityControls = await this.findAll(tenantId);
    const defects = [];

    for (const qc of qualityControls) {
      if (qc.results && qc.results.defects) {
        defects.push(...qc.results.defects);
      }
    }

    // Analyze defect patterns
    const defectTypes = {};
    for (const defect of defects) {
      defectTypes[defect.type] = (defectTypes[defect.type] || 0) + 1;
    }

    return {
      totalDefects: defects.length,
      defectTypes,
      topDefects: Object.entries(defectTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
    };
  }

  async generateQualityReport(tenantId: string, dateRange?: any): Promise<any> {
    const qualityControls = await this.findAll(tenantId);
    
    // Filter by date range if provided
    let filteredControls = qualityControls;
    if (dateRange) {
      filteredControls = qualityControls.filter(qc => 
        qc.createdAt >= dateRange.startDate && qc.createdAt <= dateRange.endDate
      );
    }

    const report = {
      totalInspections: filteredControls.length,
      passedInspections: filteredControls.filter(qc => qc.passed).length,
      failedInspections: filteredControls.filter(qc => !qc.passed).length,
      averageInspectionTime: 0,
      defectRate: 0,
      recommendations: [],
    };

    return report;
  }

  private generateControlNumber(): string {
    const timestamp = Date.now();
    return `QC-${timestamp}`;
  }
}