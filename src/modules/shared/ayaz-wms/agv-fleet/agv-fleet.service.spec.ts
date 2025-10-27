import { Test, TestingModule } from '@nestjs/testing';
import { AgvFleetService } from './agv-fleet.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

describe('AgvFleetService', () => {
  let service: AgvFleetService;
  let mockEventBus: any;
  let mockWsGateway: any;

  beforeEach(async () => {
    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };
    mockWsGateway = { broadcast: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgvFleetService,
        { provide: EventBusService, useValue: mockEventBus },
        { provide: WebSocketGateway, useValue: mockWsGateway },
      ],
    }).compile();

    service = module.get<AgvFleetService>(AgvFleetService);
  });

  it('should initialize fleet on startup', async () => {
    const status = await service.getFleetStatus();
    
    expect(status.totalAGVs).toBe(5);
    expect(status.idle).toBe(5);
  });

  it('should assign task to available AGV', async () => {
    const task = {
      taskId: 'task-1',
      type: 'transport' as const,
      fromLocation: 'A1',
      toLocation: 'B2',
    };

    const result = await service.assignTask('AGV-1', task);

    expect(result.status).toBe('busy');
    expect(result.currentTask).toBeDefined();
    expect(mockEventBus.emit).toHaveBeenCalledWith('agv.task.assigned', expect.any(Object));
  });

  it('should find nearest available AGV', async () => {
    const location = { x: 100, y: 100, zone: 'A' };

    const result = await service.findNearestAvailableAGV(location);

    expect(result).toBeDefined();
    expect(result.status).toBe('idle');
  });

  it('should send AGV to charging when battery low', async () => {
    const result = await service.sendAGVToCharging('AGV-1');

    expect(result.status).toBe('charging');
    expect(result.currentLocation.zone).toBe('charging');
  });
});

