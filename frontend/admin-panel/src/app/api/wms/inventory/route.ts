import { NextRequest, NextResponse } from 'next/server';

// Proxy to backend API
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const authHeader = request.headers.get('authorization');
    const res = await fetch(`${baseUrl}/api/v1/wms/inventory${request.nextUrl.search}`, {
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
    const res = await fetch(`${baseUrl}/api/v1/wms/inventory`, {
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
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    // Mock inventory data - replace with actual API call
    const mockInventory = [
      {
        id: '1',
        name: 'iPhone 15 Pro',
        category: 'Electronics',
        sku: 'SKU-001',
        quantity: 100,
        location: 'A-1-15',
        zoneId: 'A-1',
        status: 'active',
        unitPrice: 15000,
        supplier: 'Apple Inc.',
        expiryDate: '2025-12-31',
        description: 'High-end smartphone',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        name: 'Samsung Galaxy S24',
        category: 'Electronics',
        sku: 'SKU-002',
        quantity: 50,
        location: 'A-1-22',
        zoneId: 'A-1',
        status: 'active',
        unitPrice: 12000,
        supplier: 'Samsung Electronics',
        expiryDate: '2025-12-31',
        description: 'Latest Samsung flagship',
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z'
      },
      {
        id: '3',
        name: 'MacBook Pro M3',
        category: 'Electronics',
        sku: 'SKU-003',
        quantity: 25,
        location: 'B-2-08',
        zoneId: 'B-2',
        status: 'active',
        unitPrice: 45000,
        supplier: 'Apple Inc.',
        expiryDate: '2025-12-31',
        description: 'Professional laptop',
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z'
      }
    ];

    // Filter data based on search parameters
    let filteredData = mockInventory;
    
    if (search) {
      filteredData = filteredData.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (category) {
      filteredData = filteredData.filter(item => item.category === category);
    }
    
    if (status) {
      filteredData = filteredData.filter(item => item.status === status);
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
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock inventory creation - replace with actual API call
    const newInventory = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(newInventory, { status: 201 });

  } catch (error) {
    console.error('Inventory creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
