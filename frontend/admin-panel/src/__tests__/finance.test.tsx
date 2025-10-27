import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financeApi } from '../lib/api/finance.api';

// Mock the API
vi.mock('../lib/api/finance.api', () => ({
  financeApi: {
    invoices: {
      getAll: vi.fn(),
      create: vi.fn(),
      markAsPaid: vi.fn(),
    },
    payments: {
      getAll: vi.fn(),
      create: vi.fn(),
    },
    reports: {
      getSummary: vi.fn(),
      getOutstanding: vi.fn(),
    }
  }
}));

describe('Finance Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch invoices', async () => {
    const mockInvoices = [
      {
        id: '1',
        invoiceNumber: 'INV-001',
        status: 'sent',
        totals: { total: 5000, currency: 'USD' }
      }
    ];

    (financeApi.invoices.getAll as any).mockResolvedValue({ data: mockInvoices });

    const result = await financeApi.invoices.getAll({ status: 'sent' });
    
    expect(financeApi.invoices.getAll).toHaveBeenCalledWith({ status: 'sent' });
    expect(result.data).toEqual(mockInvoices);
  });

  it('should create invoice', async () => {
    const newInvoice = {
      orderId: '1',
      customerId: '1',
      issueDate: '2025-01-01',
      dueDate: '2025-01-31',
      items: []
    };

    (financeApi.invoices.create as any).mockResolvedValue({ 
      data: { id: '1', ...newInvoice } 
    });

    const result = await financeApi.invoices.create(newInvoice);
    
    expect(financeApi.invoices.create).toHaveBeenCalledWith(newInvoice);
    expect(result.data.id).toBe('1');
  });

  it('should fetch financial summary', async () => {
    const mockSummary = {
      totalRevenue: 100000,
      totalExpenses: 50000,
      profitMargin: 50
    };

    (financeApi.reports.getSummary as any).mockResolvedValue({ data: mockSummary });

    const result = await financeApi.reports.getSummary();
    
    expect(financeApi.reports.getSummary).toHaveBeenCalled();
    expect(result.data).toEqual(mockSummary);
  });
});

