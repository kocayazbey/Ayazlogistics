import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface CustomsDeclaration {
  id: string;
  shipmentId: string;
  declarationType: 'import' | 'export' | 'transit';
  hsCode: string;
  description: string;
  origin: string;
  destination: string;
  value: number;
  currency: string;
  weight: number;
  quantity: number;
  invoiceNumber: string;
  certifications: string[];
  documents: Array<{
    type: string;
    url: string;
    number: string;
  }>;
}

interface CustomsClearance {
  declarationId: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cleared';
  referenceNumber: string;
  submittedAt: Date;
  clearedAt?: Date;
  duties: number;
  taxes: number;
  fees: number;
  totalCost: number;
  inspectionRequired: boolean;
  notes?: string;
}

@Injectable()
export class CustomsAPIService {
  private readonly logger = new Logger(CustomsAPIService.name);
  private readonly apiUrl = process.env.CUSTOMS_API_URL || 'https://api.customs.gov.tr';
  private readonly apiKey = process.env.CUSTOMS_API_KEY;

  async submitDeclaration(declaration: CustomsDeclaration): Promise<CustomsClearance> {
    this.logger.log(`Submitting customs declaration: ${declaration.id}`);

    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/declarations`,
        {
          shipment_id: declaration.shipmentId,
          type: declaration.declarationType,
          hs_code: declaration.hsCode,
          description: declaration.description,
          origin_country: declaration.origin,
          destination_country: declaration.destination,
          declared_value: declaration.value,
          currency: declaration.currency,
          weight_kg: declaration.weight,
          quantity: declaration.quantity,
          invoice_number: declaration.invoiceNumber,
          certificates: declaration.certifications,
          supporting_documents: declaration.documents,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const clearance: CustomsClearance = {
        declarationId: declaration.id,
        status: 'submitted',
        referenceNumber: response.data.reference_number,
        submittedAt: new Date(),
        duties: response.data.estimated_duties || 0,
        taxes: response.data.estimated_taxes || 0,
        fees: response.data.processing_fees || 0,
        totalCost: 0,
        inspectionRequired: response.data.requires_inspection || false,
      };

      clearance.totalCost = clearance.duties + clearance.taxes + clearance.fees;

      this.logger.log(`Declaration submitted: ${clearance.referenceNumber}`);
      return clearance;
    } catch (error) {
      this.logger.error('Customs declaration failed:', error);
      throw error;
    }
  }

  async checkClearanceStatus(referenceNumber: string): Promise<CustomsClearance> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/declarations/${referenceNumber}/status`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        declarationId: response.data.declaration_id,
        status: response.data.status,
        referenceNumber,
        submittedAt: new Date(response.data.submitted_at),
        clearedAt: response.data.cleared_at ? new Date(response.data.cleared_at) : undefined,
        duties: response.data.duties || 0,
        taxes: response.data.taxes || 0,
        fees: response.data.fees || 0,
        totalCost: response.data.total_cost || 0,
        inspectionRequired: response.data.inspection_required || false,
        notes: response.data.notes,
      };
    } catch (error) {
      this.logger.error('Status check failed:', error);
      throw error;
    }
  }

  async calculateDutiesAndTaxes(hsCode: string, value: number, origin: string): Promise<{ duties: number; taxes: number; total: number }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/calculate`,
        {
          hs_code: hsCode,
          declared_value: value,
          origin_country: origin,
        },
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        duties: response.data.customs_duty || 0,
        taxes: response.data.vat || 0,
        total: (response.data.customs_duty || 0) + (response.data.vat || 0),
      };
    } catch (error) {
      this.logger.error('Calculation failed:', error);
      return { duties: 0, taxes: 0, total: 0 };
    }
  }

  async getHSCodeInfo(hsCode: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/hscodes/${hsCode}`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        code: hsCode,
        description: response.data.description,
        dutyRate: response.data.duty_rate,
        taxRate: response.data.tax_rate,
        restrictions: response.data.restrictions || [],
        requiredDocuments: response.data.required_documents || [],
      };
    } catch (error) {
      this.logger.error('HS Code lookup failed:', error);
      return null;
    }
  }

  async uploadDocument(declarationId: string, documentType: string, fileBuffer: Buffer, fileName: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer]), fileName);
      formData.append('document_type', documentType);

      const response = await axios.post(
        `${this.apiUrl}/v1/declarations/${declarationId}/documents`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      this.logger.log(`Document uploaded: ${response.data.document_id}`);
      return response.data.document_id;
    } catch (error) {
      this.logger.error('Document upload failed:', error);
      throw error;
    }
  }
}

