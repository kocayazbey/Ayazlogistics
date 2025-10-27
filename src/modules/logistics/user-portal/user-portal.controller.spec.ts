import { Test, TestingModule } from '@nestjs/testing';
import { UserPortalController } from './user-portal.controller';
import { PortalUserService } from '../ayaz-user-portal/user-management/portal-user.service';
import { OrderTrackingService } from '../ayaz-user-portal/order-tracking/order-tracking.service';
import { InventoryViewService } from '../ayaz-user-portal/inventory-view/inventory-view.service';
import { NotificationsService } from '../ayaz-user-portal/notifications/notifications.service';
import { StorageService } from '../../../core/storage/storage.service';

describe('UserPortalController', () => {
  let controller: UserPortalController;
  let portalUserService: PortalUserService;
  let orderTrackingService: OrderTrackingService;
  let inventoryViewService: InventoryViewService;
  let notificationsService: NotificationsService;
  let storageService: StorageService;

  const mockPortalUserService = {
    getPortalUsersByCustomer: jest.fn(),
    createPortalUser: jest.fn(),
    updatePermissions: jest.fn(),
  };

  const mockOrderTrackingService = {
    getCustomerOrders: jest.fn(),
    trackOrder: jest.fn(),
    trackByTrackingNumber: jest.fn(),
    subscribeToOrderUpdates: jest.fn(),
    getDeliveryProof: jest.fn(),
  };

  const mockInventoryViewService = {
    getCustomerInventory: jest.fn(),
    getInventorySummary: jest.fn(),
    getInventoryMovements: jest.fn(),
    getStockLevelsOverTime: jest.fn(),
    requestInventoryReport: jest.fn(),
  };

  const mockNotificationsService = {
    getUserNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPortalController],
      providers: [
        {
          provide: PortalUserService,
          useValue: mockPortalUserService,
        },
        {
          provide: OrderTrackingService,
          useValue: mockOrderTrackingService,
        },
        {
          provide: InventoryViewService,
          useValue: mockInventoryViewService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    controller = module.get<UserPortalController>(UserPortalController);
    portalUserService = module.get<PortalUserService>(PortalUserService);
    orderTrackingService = module.get<OrderTrackingService>(
      OrderTrackingService,
    );
    inventoryViewService = module.get<InventoryViewService>(
      InventoryViewService,
    );
    notificationsService = module.get<NotificationsService>(
      NotificationsService,
    );
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management', () => {
    it('should get my profile', async () => {
      const result = await controller.getMyProfile('user-1');

      expect(result).toEqual({
        success: true,
        data: { userId: 'user-1' },
      });
    });

    it('should update my profile', async () => {
      const updateData = { firstName: 'John', lastName: 'Doe' };

      const result = await controller.updateMyProfile('user-1', updateData);

      expect(result).toEqual({
        success: true,
        message: 'Profile updated successfully',
        data: { userId: 'user-1', ...updateData },
      });
    });

    it('should get customer users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com' },
        { id: 'user-2', email: 'user2@test.com' },
      ];

      mockPortalUserService.getPortalUsersByCustomer.mockResolvedValue(
        mockUsers,
      );

      const result = await controller.getCustomerUsers('customer-1', 'tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockUsers,
        count: 2,
      });
    });

    it('should create portal user', async () => {
      const userData = {
        email: 'newuser@test.com',
        customerId: 'customer-1',
        password: 'password123',
      };

      const mockCreated = { id: 'user-3', ...userData };
      mockPortalUserService.createPortalUser.mockResolvedValue(mockCreated);

      const result = await controller.createPortalUser(userData, 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Portal user created successfully');
    });

    it('should update user permissions', async () => {
      const permissions = { canViewOrders: true, canEditInventory: false };
      const mockUpdated = { id: 'user-1', permissions };

      mockPortalUserService.updatePermissions.mockResolvedValue(mockUpdated);

      const result = await controller.updateUserPermissions(
        'user-1',
        { permissions },
        'tenant-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Permissions updated successfully',
        data: mockUpdated,
      });
    });
  });

  describe('Order Tracking', () => {
    it('should get orders', async () => {
      const mockOrders = {
        customerId: 'customer-1',
        orders: [],
        totalOrders: 10,
      };

      mockOrderTrackingService.getCustomerOrders.mockResolvedValue(mockOrders);

      const result = await controller.getOrders('customer-1');

      expect(result).toEqual({
        success: true,
        data: mockOrders,
      });
    });

    it('should track order by order number', async () => {
      const mockTracking = {
        orderNumber: 'ORDER-001',
        currentStatus: 'in_transit',
        events: [],
      };

      mockOrderTrackingService.trackOrder.mockResolvedValue(mockTracking);

      const result = await controller.trackOrder('ORDER-001', 'customer-1');

      expect(result).toEqual({
        success: true,
        data: mockTracking,
      });
    });

    it('should track by tracking number', async () => {
      const mockTracking = {
        trackingNumber: 'TRACK-001',
        shipmentNumber: 'SHIP-001',
        currentStatus: 'delivered',
      };

      mockOrderTrackingService.trackByTrackingNumber.mockResolvedValue(
        mockTracking,
      );

      const result = await controller.trackByTrackingNumber('TRACK-001');

      expect(result).toEqual({
        success: true,
        data: mockTracking,
      });
    });

    it('should subscribe to order updates', async () => {
      const mockResult = {
        orderNumber: 'ORDER-001',
        subscribed: true,
        email: 'customer@test.com',
      };

      mockOrderTrackingService.subscribeToOrderUpdates.mockResolvedValue(
        mockResult,
      );

      const result = await controller.subscribeToOrderUpdates('ORDER-001', {
        email: 'customer@test.com',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscribed to order updates');
    });

    it('should get delivery proof', async () => {
      const mockProof = {
        orderNumber: 'ORDER-001',
        deliveredAt: new Date(),
        signature: 'signature-data',
      };

      mockOrderTrackingService.getDeliveryProof.mockResolvedValue(mockProof);

      const result = await controller.getDeliveryProof('ORDER-001');

      expect(result).toEqual({
        success: true,
        data: mockProof,
      });
    });
  });

  describe('Inventory Management', () => {
    it('should get inventory', async () => {
      const mockInventory = [
        { id: '1', productId: 'prod-1', quantityOnHand: 100 },
      ];

      mockInventoryViewService.getCustomerInventory.mockResolvedValue(
        mockInventory,
      );

      const result = await controller.getInventory('customer-1');

      expect(result).toEqual({
        success: true,
        data: mockInventory,
        count: 1,
      });
    });

    it('should get inventory summary', async () => {
      const mockSummary = {
        totalSKUs: 50,
        totalQuantity: 5000,
        totalValue: 100000,
        lowStockItems: [],
      };

      mockInventoryViewService.getInventorySummary.mockResolvedValue(
        mockSummary,
      );

      const result = await controller.getInventorySummary('customer-1');

      expect(result).toEqual({
        success: true,
        data: mockSummary,
      });
    });

    it('should get inventory movements', async () => {
      const mockMovements = {
        customerId: 'customer-1',
        movements: [],
        totalMovements: 0,
      };

      mockInventoryViewService.getInventoryMovements.mockResolvedValue(
        mockMovements,
      );

      const result = await controller.getInventoryMovements(
        'product-1',
        'customer-1',
      );

      expect(result).toEqual({
        success: true,
        data: mockMovements,
      });
    });

    it('should get stock levels over time', async () => {
      const mockLevels = {
        productId: 'product-1',
        period: { days: 30 },
        dataPoints: [],
        trend: 'stable',
      };

      mockInventoryViewService.getStockLevelsOverTime.mockResolvedValue(
        mockLevels,
      );

      const result = await controller.getStockLevels(
        'product-1',
        'customer-1',
        30,
      );

      expect(result).toEqual({
        success: true,
        data: mockLevels,
      });
    });

    it('should request inventory report', async () => {
      const mockReport = {
        reportId: 'RPT-001',
        customerId: 'customer-1',
        format: 'pdf',
        status: 'generating',
      };

      mockInventoryViewService.requestInventoryReport.mockResolvedValue(
        mockReport,
      );

      const result = await controller.requestInventoryReport(
        { format: 'pdf' },
        'customer-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Report generation started',
        data: mockReport,
      });
    });
  });

  describe('Notifications', () => {
    it('should get notifications', async () => {
      const mockNotifications = {
        total: 10,
        unread: 5,
        notifications: [],
      };

      mockNotificationsService.getUserNotifications.mockResolvedValue(
        mockNotifications,
      );

      const result = await controller.getNotifications('user-1');

      expect(result).toEqual({
        success: true,
        data: mockNotifications,
      });
    });

    it('should mark notification as read', async () => {
      const mockNotification = { id: 'notif-1', read: true };

      mockNotificationsService.markAsRead.mockResolvedValue(mockNotification);

      const result = await controller.markNotificationAsRead('notif-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification marked as read');
    });

    it('should mark all notifications as read', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ updated: 5 });

      const result = await controller.markAllNotificationsAsRead('user-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('All notifications marked as read');
    });

    it('should delete notification', async () => {
      mockNotificationsService.deleteNotification.mockResolvedValue({
        deleted: true,
      });

      const result = await controller.deleteNotification('notif-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification deleted');
    });
  });

  describe('Documents', () => {
    it('should upload document', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      mockStorageService.upload.mockResolvedValue({
        url: 'https://storage.example.com/test.pdf',
      });

      const result = await controller.uploadDocument(
        mockFile,
        {},
        'user-1',
        'customer-1',
        'tenant-1',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Document uploaded successfully');
      expect(result.data.fileName).toBe('test.pdf');
    });
  });

  describe('Analytics', () => {
    it('should get dashboard analytics', async () => {
      const mockOrders = { totalOrders: 10, orders: [] };
      const mockInventory = {
        totalSKUs: 50,
        totalQuantity: 5000,
        totalValue: 100000,
        lowStockItems: [],
      };
      const mockNotifications = { total: 10, unread: 5, notifications: [] };

      mockOrderTrackingService.getCustomerOrders.mockResolvedValue(mockOrders);
      mockInventoryViewService.getInventorySummary.mockResolvedValue(
        mockInventory,
      );
      mockNotificationsService.getUserNotifications.mockResolvedValue(
        mockNotifications,
      );

      const result = await controller.getDashboardAnalytics('customer-1');

      expect(result.success).toBe(true);
      expect(result.data.orders).toBeDefined();
      expect(result.data.inventory).toBeDefined();
      expect(result.data.notifications).toBeDefined();
    });
  });
});

