import { Test, TestingModule } from '@nestjs/testing';
import { IotSensorsService } from './iot-sensors.service';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

describe('IotSensorsService', () => {
  let service: IotSensorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IotSensorsService,
        { provide: EventBusService, useValue: { emit: jest.fn() } },
        { provide: WebSocketGateway, useValue: { broadcast: jest.fn() } },
      ],
    }).compile();

    service = module.get<IotSensorsService>(IotSensorsService);
  });

  it('should register sensor', async () => {
    const result = await service.registerSensor({
      sensorId: 'TEMP-001',
      sensorType: 'temperature',
      locationId: 'loc-1',
      zone: 'A',
      threshold: {
        sensorId: 'TEMP-001',
        minValue: 2,
        maxValue: 8,
        alertOnBreach: true,
      },
    });

    expect(result.status).toBe('registered');
  });

  it('should detect threshold breach', async () => {
    await service.registerSensor({
      sensorId: 'TEMP-001',
      sensorType: 'temperature',
      threshold: {
        sensorId: 'TEMP-001',
        minValue: 2,
        maxValue: 8,
        alertOnBreach: true,
      },
    });

    const reading = {
      sensorId: 'TEMP-001',
      sensorType: 'temperature' as const,
      value: 15, // Above threshold
      unit: 'C',
      timestamp: new Date(),
    };

    const result = await service.processSensorReading(reading);

    expect(result.processed).toBe(true);
  });
});

