import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { BillingService } from '../services/BillingService';
import { ValidationService } from '../../common/validation/validation.service';
import { Logger } from '../../common/utils/Logger';

@Controller('billing')
export class BillingController {
  private logger: Logger;

  constructor(
    private billingService: BillingService,
    private validationService: ValidationService,
  ) {
    this.logger = new Logger('BillingController');
  }

  /**
   * Fatura listesini filtreleme ve sayfalama ile getir
   */
  @Get('invoices')
  public async getInvoices(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('customer_id') customer_id?: string,
    @Query('status') status?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('search') search?: string,
    @Query('sort_by') sort_by = 'created_at',
    @Query('sort_order') sort_order = 'desc',
  ) {
    try {
      const filters = {
        customer_id,
        status,
        start_date,
        end_date,
        search,
      };

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const sorting = {
        sort_by,
        sort_order: sort_order as 'asc' | 'desc',
      };

      const result = await this.billingService.getInvoices(filters, pagination, sorting);

      return {
        success: true,
        data: result.items,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          pages: result.pagination.pages,
        },
      };
    } catch (error) {
      this.logger.error('Fatura listesi alınırken hata:', error);
      throw error;
    }
  }

  /**
   * ID'ye göre fatura getir
   */
  public async getInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!this.validationService.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fatura ID formatı'
        });
        return;
      }

      const invoice = await this.billingService.getInvoiceById(id);

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Fatura bulunamadı'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      this.logger.error('Fatura ID ile alınırken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura alınamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Yeni fatura oluştur
   */
  public async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const invoiceData = req.body;

      // Gerekli alanları doğrula
      const validation = this.validationService.validateInvoice(invoiceData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Doğrulama başarısız',
          errors: validation.errors
        });
        return;
      }

      const invoice = await this.billingService.createInvoice(invoiceData);

      res.status(201).json({
        success: true,
        message: 'Fatura başarıyla oluşturuldu',
        data: invoice
      });
    } catch (error) {
      this.logger.error('Fatura oluşturulurken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura oluşturulamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Fatura güncelle
   */
  public async updateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!this.validationService.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fatura ID formatı'
        });
        return;
      }

      // Güncelleme verilerini doğrula
      const validation = this.validationService.validateInvoiceUpdate(updateData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Doğrulama başarısız',
          errors: validation.errors
        });
        return;
      }

      const invoice = await this.billingService.updateInvoice(id, updateData);

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Fatura bulunamadı'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Fatura başarıyla güncellendi',
        data: invoice
      });
    } catch (error) {
      this.logger.error('Fatura güncellenirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura güncellenemedi',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Fatura sil
   */
  public async deleteInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!this.validationService.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fatura ID formatı'
        });
        return;
      }

      const deleted = await this.billingService.deleteInvoice(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Fatura bulunamadı'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Fatura başarıyla silindi'
      });
    } catch (error) {
      this.logger.error('Fatura silinirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura silinemedi',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Fatura gönder
   */
  public async sendInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email, method = 'email' } = req.body;

      if (!this.validationService.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fatura ID formatı'
        });
        return;
      }

      const result = await this.billingService.sendInvoice(id, email, method);

      if (!result) {
        res.status(404).json({
          success: false,
          message: 'Fatura bulunamadı'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Fatura başarıyla gönderildi',
        data: result
      });
    } catch (error) {
      this.logger.error('Fatura gönderilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura gönderilemedi',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Fatura ödemelerini getir
   */
  public async getInvoicePayments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      if (!this.validationService.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fatura ID formatı'
        });
        return;
      }

      const pagination = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      const result = await this.billingService.getInvoicePayments(id, pagination);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.pagination.page,
          limit: result.pagination.limit,
          total: result.pagination.total,
          pages: result.pagination.pages
        }
      });
    } catch (error) {
      this.logger.error('Fatura ödemeleri alınırken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura ödemeleri alınamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Ödeme kaydet
   */
  public async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const paymentData = req.body;

      if (!this.validationService.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fatura ID formatı'
        });
        return;
      }

      const validation = this.validationService.validatePayment(paymentData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Doğrulama başarısız',
          errors: validation.errors
        });
        return;
      }

      const payment = await this.billingService.recordPayment(id, paymentData, req.user?.id);

      res.status(201).json({
        success: true,
        message: 'Ödeme başarıyla kaydedildi',
        data: payment
      });
    } catch (error) {
      this.logger.error('Ödeme kaydedilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Ödeme kaydedilemedi',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Fatura istatistikleri
   */
  public async getInvoiceStats(req: Request, res: Response): Promise<void> {
    try {
      const { start_date, end_date, customer_id } = req.query;

      const filters = {
        start_date: start_date as string,
        end_date: end_date as string,
        customer_id: customer_id as string
      };

      const stats = await this.billingService.getInvoiceStats(filters);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error('Fatura istatistikleri alınırken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura istatistikleri alınamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Ödeme istatistikleri
   */
  public async getPaymentStats(req: Request, res: Response): Promise<void> {
    try {
      const { start_date, end_date, payment_method } = req.query;

      const filters = {
        start_date: start_date as string,
        end_date: end_date as string,
        payment_method: payment_method as string
      };

      const stats = await this.billingService.getPaymentStats(filters);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.logger.error('Ödeme istatistikleri alınırken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Ödeme istatistikleri alınamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Otomatik fatura oluştur
   */
  public async generateAutomaticInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'monthly', customer_id } = req.body;

      const result = await this.billingService.generateAutomaticInvoices(period, customer_id);

      res.status(200).json({
        success: true,
        message: 'Otomatik faturalar başarıyla oluşturuldu',
        data: result
      });
    } catch (error) {
      this.logger.error('Otomatik faturalar oluşturulurken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Otomatik faturalar oluşturulamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * Fatura şablonu oluştur
   */
  public async generateInvoiceTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { format = 'pdf' } = req.query;

      if (!this.validationService.isValidUUID(id)) {
        res.status(400).json({
          success: false,
          message: 'Geçersiz fatura ID formatı'
        });
        return;
      }

      const template = await this.billingService.generateInvoiceTemplate(id, format as string);

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Fatura bulunamadı'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Fatura şablonu başarıyla oluşturuldu',
        data: template
      });
    } catch (error) {
      this.logger.error('Fatura şablonu oluşturulurken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Fatura şablonu oluşturulamadı',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }
}
