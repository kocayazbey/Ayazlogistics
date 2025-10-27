import { NextRequest, NextResponse } from 'next/server';

// Proxy to backend API
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const authHeader = request.headers.get('authorization');
    const res = await fetch(`${baseUrl}/api/v1/billing/invoices${request.nextUrl.search}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const authHeader = request.headers.get('authorization');
    const body = await request.json();
    const res = await fetch(`${baseUrl}/api/v1/billing/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const customer = searchParams.get('customer') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Mock invoices data - replace with actual API call
    const mockInvoices = [
      {
        id: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customer: 'ABC Teknoloji',
        customerEmail: 'billing@abcteknoloji.com',
        customerAddress: 'İstanbul, Kadıköy',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        currency: 'TRY',
        taxRate: 18,
        subtotal: 15000,
        taxAmount: 2700,
        totalAmount: 17700,
        status: 'sent',
        notes: 'Lojistik hizmetleri için fatura',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: 'INV002',
        invoiceNumber: 'INV-2024-002',
        customer: 'XYZ Lojistik',
        customerEmail: 'finance@xyzltd.com',
        customerAddress: 'Ankara, Çankaya',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        currency: 'TRY',
        taxRate: 18,
        subtotal: 8500,
        taxAmount: 1530,
        totalAmount: 10030,
        status: 'paid',
        notes: 'Taşıma hizmetleri için fatura',
        createdAt: '2024-01-15T11:15:00Z',
        updatedAt: '2024-01-15T11:15:00Z'
      },
      {
        id: 'INV003',
        invoiceNumber: 'INV-2024-003',
        customer: 'DEF Mağazacılık',
        customerEmail: 'accounting@defmagaza.com',
        customerAddress: 'İzmir, Konak',
        invoiceDate: '2024-01-14',
        dueDate: '2024-02-14',
        currency: 'TRY',
        taxRate: 18,
        subtotal: 12000,
        taxAmount: 2160,
        totalAmount: 14160,
        status: 'draft',
        notes: 'Depo hizmetleri için fatura',
        createdAt: '2024-01-14T09:20:00Z',
        updatedAt: '2024-01-14T09:20:00Z'
      }
    ];

    // Filter data based on search parameters
    let filteredData = mockInvoices;
    
    if (status) {
      filteredData = filteredData.filter(item => item.status === status);
    }
    
    if (customer) {
      filteredData = filteredData.filter(item => 
        item.customer.toLowerCase().includes(customer.toLowerCase())
      );
    }
    
    if (dateFrom) {
      filteredData = filteredData.filter(item => 
        new Date(item.createdAt) >= new Date(dateFrom)
      );
    }
    
    if (dateTo) {
      filteredData = filteredData.filter(item => 
        new Date(item.createdAt) <= new Date(dateTo)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return NextResponse.json({
      items: paginatedData,
      pagination: {
        page,
        limit,
        total: filteredData.length,
        pages: Math.ceil(filteredData.length / limit)
      }
    });

  } catch (error) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock invoice creation - replace with actual API call
    const newInvoice = {
      id: 'INV' + Date.now().toString().slice(-3),
      ...body,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(newInvoice, { status: 201 });

  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
