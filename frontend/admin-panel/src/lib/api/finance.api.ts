import { api } from '../api';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerId: string;
  customerName: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: InvoiceItem[];
  totals: {
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  payment: {
    method: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    transactionId?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'online';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  reference?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceDto {
  orderId: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  notes?: string;
}

export interface CreatePaymentDto {
  invoiceId: string;
  orderId: string;
  customerId: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'online';
  transactionId?: string;
  reference?: string;
  notes?: string;
}

export interface FinanceFilter {
  type?: 'invoice' | 'payment';
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const financeApi = {
  // Invoices
  invoices: {
    // Get all invoices
    getAll: (filter: FinanceFilter = {}) => 
      api.get('/v1/finance/invoices', { params: filter }),

    // Get invoice by ID
    getById: (id: string) => 
      api.get(`/v1/finance/invoices/${id}`),

    // Create new invoice
    create: (invoice: CreateInvoiceDto) => 
      api.post('/v1/finance/invoices', invoice),

    // Update invoice
    update: (id: string, invoice: Partial<CreateInvoiceDto>) => 
      api.put(`/v1/finance/invoices/${id}`, invoice),

    // Delete invoice
    delete: (id: string) => 
      api.delete(`/v1/finance/invoices/${id}`),

    // Send invoice
    send: (id: string) => 
      api.post(`/v1/finance/invoices/${id}/send`),

    // Mark as paid
    markAsPaid: (id: string, paymentData: { method: string; transactionId?: string }) => 
      api.patch(`/v1/finance/invoices/${id}/paid`, paymentData),

    // Generate PDF
    generatePDF: (id: string) => 
      api.get(`/v1/finance/invoices/${id}/pdf`, { responseType: 'blob' })
  },

  // Payments
  payments: {
    getAll: (filter: FinanceFilter = {}) => 
      api.get('/v1/finance/payments', { params: filter }),
    
    getById: (id: string) => 
      api.get(`/v1/finance/payments/${id}`),
    
    create: (payment: CreatePaymentDto) => 
      api.post('/v1/finance/payments', payment),
    
    update: (id: string, payment: Partial<CreatePaymentDto>) => 
      api.put(`/v1/finance/payments/${id}`, payment),
    
    delete: (id: string) => 
      api.delete(`/v1/finance/payments/${id}`),
    
    process: (id: string) => 
      api.post(`/v1/finance/payments/${id}/process`),
    
    refund: (id: string, amount?: number, reason?: string) => 
      api.post(`/v1/finance/payments/${id}/refund`, { amount, reason })
  },

  // Reports
  reports: {
    getSummary: (dateFrom?: string, dateTo?: string) => 
      api.get('/v1/finance/reports/summary', { params: { dateFrom, dateTo } }),
    
    getRevenue: (period: 'daily' | 'weekly' | 'monthly' | 'yearly', dateFrom?: string, dateTo?: string) => 
      api.get('/v1/finance/reports/revenue', { params: { period, dateFrom, dateTo } }),
    
    getOutstanding: () => 
      api.get('/v1/finance/reports/outstanding'),
    
    getAging: () => 
      api.get('/v1/finance/reports/aging'),
    
    export: (reportType: string, format: 'csv' | 'excel' | 'pdf' = 'csv', filter?: any) => 
      api.get('/v1/finance/reports/export', { 
        params: { type: reportType, format, ...filter },
        responseType: 'blob' 
      })
  }
};
