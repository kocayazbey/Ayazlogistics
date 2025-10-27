import { Test, TestingModule } from '@nestjs/testing';
import { RfidService } from './rfid.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

describe('RfidService', () => {
  let service: RfidService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfidService,
        { provide: EventBusService, useValue: { emit: jest.fn() } },
        { provide: WebSocketGateway, useValue: { broadcast: jest.fn() } },
      ],
    }).compile();

    service = module.get<RfidService>(RfidService);
  });

  it('should reconcile RFID inventory accurately', async () => {
    const scannedTags = [
      { epc: 'TAG-001', tid: 'TID-001' },
      { epc: 'TAG-002', tid: 'TID-002' },
    ];

    const systemInventory = [
      { rfidTag: 'TAG-001' },
      { rfidTag: 'TAG-002' },
    ];

    const result = await service.reconcileRFIDInventory('scan-1', scannedTags, systemInventory);

    expect(result.accuracy).toBe(100);
    expect(result.matched).toBe(2);
    expect(result.missing.length).toBe(0);
    expect(result.extra.length).toBe(0);
  });

  it('should detect missing items', async () => {
    const scannedTags = [{ epc: 'TAG-001', tid: 'TID-001' }];
    const systemInventory = [{ rfidTag: 'TAG-001' }, { rfidTag: 'TAG-002' }];

    const result = await service.reconcileRFIDInventory('scan-1', scannedTags, systemInventory);

    expect(result.missing.length).toBe(1);
    expect(result.accuracy).toBe(50);
  });
});

