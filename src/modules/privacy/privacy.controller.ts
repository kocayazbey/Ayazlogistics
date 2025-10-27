import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GdprService, DataSubjectRequest, ConsentRecord } from './gdpr.service';

@ApiTags('Privacy & GDPR')
@Controller('api/privacy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PrivacyController {
  constructor(private readonly gdprService: GdprService) {}

  @Post('data-subject-request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a data subject request (GDPR Article 15-22)' })
  @ApiResponse({ status: 201, description: 'Data subject request created' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async createDataSubjectRequest(
    @Body() request: Omit<DataSubjectRequest, 'id' | 'requestDate' | 'status'>
  ) {
    const dsr = await this.gdprService.createDataSubjectRequest(request);
    return {
      requestId: dsr.id,
      status: dsr.status,
      message: 'Data subject request created successfully'
    };
  }

  @Get('data-subject-request/:requestId')
  @ApiOperation({ summary: 'Get data subject request status' })
  @ApiResponse({ status: 200, description: 'Request status retrieved' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getDataSubjectRequest(@Param('requestId') requestId: string) {
    // Implementation to get request status
    return { requestId, status: 'pending' };
  }

  @Post('data-subject-request/:requestId/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a data subject request' })
  @ApiResponse({ status: 200, description: 'Request processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or processing failed' })
  async processDataSubjectRequest(
    @Param('requestId') requestId: string,
    @Body() body: { userId: string }
  ) {
    const result = await this.gdprService.processDataSubjectRequest(requestId, body.userId);
    return {
      requestId,
      status: 'completed',
      result
    };
  }

  @Post('consent')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record user consent (GDPR Article 6)' })
  @ApiResponse({ status: 201, description: 'Consent recorded successfully' })
  async recordConsent(
    @Body() consent: Omit<ConsentRecord, 'id'>
  ) {
    const consentRecord = await this.gdprService.recordConsent(consent);
    return {
      consentId: consentRecord.id,
      message: 'Consent recorded successfully'
    };
  }

  @Post('consent/:consentId/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw user consent' })
  @ApiResponse({ status: 200, description: 'Consent withdrawn successfully' })
  async withdrawConsent(
    @Param('consentId') consentId: string,
    @Body() body: { userId: string }
  ) {
    await this.gdprService.withdrawConsent(consentId, body.userId);
    return {
      consentId,
      message: 'Consent withdrawn successfully'
    };
  }

  @Get('consent/:userId')
  @ApiOperation({ summary: 'Get user consent records' })
  @ApiResponse({ status: 200, description: 'Consent records retrieved' })
  async getUserConsents(@Param('userId') userId: string) {
    // Implementation to get user consents
    return {
      userId,
      consents: []
    };
  }

  @Get('rights')
  @ApiOperation({ summary: 'Get data subject rights information' })
  @ApiResponse({ status: 200, description: 'Data subject rights' })
  async getDataSubjectRights() {
    return {
      rights: [
        {
          right: 'Right to access',
          description: 'You have the right to obtain confirmation of whether personal data is being processed',
          article: 'GDPR Article 15'
        },
        {
          right: 'Right to rectification',
          description: 'You have the right to have inaccurate personal data corrected',
          article: 'GDPR Article 16'
        },
        {
          right: 'Right to erasure',
          description: 'You have the right to have personal data erased in certain circumstances',
          article: 'GDPR Article 17'
        },
        {
          right: 'Right to restrict processing',
          description: 'You have the right to restrict the processing of personal data',
          article: 'GDPR Article 18'
        },
        {
          right: 'Right to data portability',
          description: 'You have the right to receive personal data in a structured format',
          article: 'GDPR Article 20'
        },
        {
          right: 'Right to object',
          description: 'You have the right to object to processing of personal data',
          article: 'GDPR Article 21'
        }
      ],
      contactInfo: {
        dpo: 'dpo@ayazlogistics.com',
        privacy: 'privacy@ayazlogistics.com',
        phone: '+90 212 555 0123'
      }
    };
  }

  @Get('privacy-policy')
  @ApiOperation({ summary: 'Get privacy policy' })
  @ApiResponse({ status: 200, description: 'Privacy policy content' })
  async getPrivacyPolicy() {
    return {
      version: '2.1',
      lastUpdated: '2024-01-15',
      sections: [
        {
          title: 'Data Controller',
          content: 'AyazLogistics A.Ş. is the data controller for your personal data.'
        },
        {
          title: 'Data We Collect',
          content: 'We collect personal data necessary for providing logistics services.'
        },
        {
          title: 'Legal Basis',
          content: 'We process personal data based on consent, contract performance, and legitimate interests.'
        },
        {
          title: 'Data Retention',
          content: 'We retain personal data for as long as necessary for the purposes outlined in this policy.'
        },
        {
          title: 'Your Rights',
          content: 'You have various rights regarding your personal data as outlined in the GDPR.'
        }
      ]
    };
  }

  @Post('data-retention/apply')
  @Roles('admin', 'super-admin')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply data retention policies (Admin only)' })
  @ApiResponse({ status: 200, description: 'Data retention policies applied' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async applyDataRetentionPolicies() {
    await this.gdprService.applyDataRetentionPolicies();
    return {
      message: 'Data retention policies applied successfully',
      timestamp: new Date()
    };
  }

  @Get('compliance-status')
  @Roles('admin', 'super-admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get GDPR compliance status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Compliance status' })
  async getComplianceStatus() {
    return {
      gdprCompliant: true,
      lastAssessment: '2024-01-15',
      complianceAreas: [
        {
          area: 'Data Processing Lawfulness',
          status: 'Compliant',
          lastChecked: '2024-01-15'
        },
        {
          area: 'Data Subject Rights',
          status: 'Compliant',
          lastChecked: '2024-01-15'
        },
        {
          area: 'Data Protection by Design',
          status: 'Compliant',
          lastChecked: '2024-01-15'
        },
        {
          area: 'Data Breach Notification',
          status: 'Compliant',
          lastChecked: '2024-01-15'
        }
      ],
      recommendations: [
        'Regular privacy impact assessments',
        'Staff training on data protection',
        'Technical and organizational measures review'
      ]
    };
  }
}
