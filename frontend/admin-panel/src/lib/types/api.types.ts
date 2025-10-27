// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: string;
  requestId?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// WMS Types
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  unitPrice?: number;
  totalValue: number;
  location: string;
  status: 'available' | 'low_stock' | 'out_of_stock';
  supplier?: string;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryDto {
  sku: string;
  name: string;
  description?: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  unitPrice?: number;
  location: string;
  supplier?: string;
}

export interface UpdateInventoryDto {
  name?: string;
  description?: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  unitCost?: number;
  unitPrice?: number;
  location?: string;
  supplier?: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  supplier: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  totalValue: number;
  items: number;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceiptDto {
  receiptNumber: string;
  supplier: string;
  items: ReceiptItem[];
  totalValue: number;
}

export interface ReceiptItem {
  sku: string;
  quantity: number;
  unitCost: number;
  location?: string;
}

export interface Pick {
  id: string;
  pickNumber: string;
  orderId: string;
  customer: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  items: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePickDto {
  pickNumber: string;
  orderId: string;
  customer: string;
  items: PickItem[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
}

export interface PickItem {
  sku: string;
  quantity: number;
  location: string;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  orderId: string;
  customer: string;
  status: 'pending' | 'ready' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  driver?: string;
  vehicle?: string;
  items: number;
  totalValue: number;
  destination: string;
  expectedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShipmentDto {
  shipmentNumber: string;
  orderId: string;
  customer: string;
  items: ShipmentItem[];
  destination: string;
  carrier: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  driver?: string;
  vehicle?: string;
}

export interface ShipmentItem {
  sku: string;
  quantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface Operation {
  id: string;
  operationNumber: string;
  type: 'receiving' | 'picking' | 'shipping' | 'inventory' | 'cycle_count';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  operator: string;
  items: number;
  duration?: number;
  createdAt: string;
  completedAt?: string;
}

export interface Zone {
  id: string;
  name: string;
  code: string;
  description: string;
  capacity: number;
  usedCapacity: number;
  availableCapacity: number;
  temperature?: string;
  humidity?: string;
  status: 'active' | 'maintenance' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// TMS Types
export interface Route {
  id: string;
  routeNumber: string;
  vehicleId: string;
  driverId: string;
  routeDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  totalDistance?: string;
  estimatedDuration?: number;
  totalStops?: number;
  optimizationAlgorithm?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: 'available' | 'in_use' | 'maintenance' | 'out_of_service';
  lastMaintenance?: string;
  nextMaintenance?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'warehouse_manager' | 'warehouse_worker' | 'driver' | 'forklift_operator';
  tenantId: string;
  warehouseId?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
  tenantId?: string;
  warehouseId?: string;
  permissions?: string[];
}

// AI Types
export interface ChurnPrediction {
  customerId: string;
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
}

export interface FraudDetection {
  transactionId: string;
  isFraud: boolean;
  confidence: number;
  riskScore: number;
  factors: string[];
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  topics: string[];
  urgency: 'low' | 'medium' | 'high';
}

// Real-time Types
export interface RealtimeUpdate {
  type: string;
  data: any;
  timestamp: string;
  warehouseId?: string;
  tenantId?: string;
}

export interface InventoryAlert {
  type: 'low_stock' | 'out_of_stock' | 'overstock';
  item: InventoryItem;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface OperationUpdate {
  operationId: string;
  type: string;
  status: string;
  progress?: number;
  message?: string;
}

// Filter Types
export interface InventoryFilter {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  supplier?: string;
  location?: string;
}

export interface OperationsFilter {
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  operator?: string;
}

export interface RoutesFilter {
  page?: number;
  limit?: number;
  status?: string;
  driverId?: string;
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Statistics Types
export interface InventoryStats {
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  averageValue: number;
}

export interface OperationsStats {
  totalOperations: number;
  completedOperations: number;
  pendingOperations: number;
  inProgressOperations: number;
  averageDuration: number;
  efficiency: number;
  todayOperations: number;
  weeklyOperations: number;
  monthlyOperations: number;
}

export interface RoutesStats {
  totalRoutes: number;
  completedRoutes: number;
  inProgressRoutes: number;
  plannedRoutes: number;
  averageDistance: number;
  averageDuration: number;
  totalDistance: number;
  totalDuration: number;
}
