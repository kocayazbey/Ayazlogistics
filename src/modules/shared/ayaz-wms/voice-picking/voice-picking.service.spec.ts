import { Test, TestingModule } from '@nestjs/testing';
import { VoicePickingService } from './voice-picking.service';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('VoicePickingService', () => {
  let service: VoicePickingService;
  let mockEventBus: any;

  beforeEach(async () => {
    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoicePickingService,
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<VoicePickingService>(VoicePickingService);
  });

  it('should initialize voice session with multi-language support', async () => {
    const result = await service.initializeVoiceSession('picker-1', 'wh-1', 'tr-TR');

    expect(result.sessionId).toBeDefined();
    expect(result.language).toBe('tr-TR');
    expect(result.ttsConfig).toBeDefined();
    expect(result.sttConfig).toBeDefined();
    expect(mockEventBus.emit).toHaveBeenCalledWith('voice.session.started', expect.any(Object));
  });

  it('should process voice commands with fuzzy matching', async () => {
    const session = await service.initializeVoiceSession('picker-1', 'wh-1', 'en-US');
    
    // Test fuzzy matching (slight variation in command)
    const result = await service.processVoiceCommand(session.sessionId, 'nexxt task', 0.85);

    expect(result).toBeDefined();
    expect(result.action).toBeDefined();
  });

  it('should support Turkish voice commands', async () => {
    const session = await service.initializeVoiceSession('picker-1', 'wh-1', 'tr-TR');
    
    const result = await service.processVoiceCommand(session.sessionId, 'ileri', 0.95);

    expect(result.action).toBe('next_task');
  });

  it('should extract quantity from voice input', async () => {
    const session = await service.initializeVoiceSession('picker-1', 'wh-1', 'en-US');
    
    const result = await service.processVoiceCommand(session.sessionId, '5 pieces', 0.9);

    expect(result.action).toBe('quantity_spoken');
  });

  it('should provide command suggestions for unknown input', async () => {
    const session = await service.initializeVoiceSession('picker-1', 'wh-1', 'en-US');
    
    const result = await service.processVoiceCommand(session.sessionId, 'nexto', 0.7);

    expect(result.suggestions).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

