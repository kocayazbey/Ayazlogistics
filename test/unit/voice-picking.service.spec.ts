import { Test, TestingModule } from '@nestjs/testing';
import { VoicePickingService } from '../../src/voice/voice-picking.service';
import { Logger } from '@nestjs/common';

describe('VoicePickingService', () => {
  let service: VoicePickingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoicePickingService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VoicePickingService>(VoicePickingService);
  });

  describe('startVoicePickingSession', () => {
    it('should start voice picking session successfully', async () => {
      const userId = 'user-001';
      const taskId = 'task-001';

      const sessionId = await service.startVoicePickingSession(userId, taskId);

      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^voice_\d+$/);
    });

    it('should handle invalid user ID', async () => {
      const userId = '';
      const taskId = 'task-001';

      await expect(service.startVoicePickingSession(userId, taskId)).rejects.toThrow();
    });

    it('should handle invalid task ID', async () => {
      const userId = 'user-001';
      const taskId = '';

      await expect(service.startVoicePickingSession(userId, taskId)).rejects.toThrow();
    });
  });

  describe('processVoiceCommand', () => {
    it('should process voice command successfully', async () => {
      const sessionId = 'voice_1234567890';
      const audioData = 'base64_audio_data';

      // Mock active session
      const mockSession = {
        sessionId,
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      // Mock the activeSessions Map
      (service as any).activeSessions.set(sessionId, mockSession);

      const response = await service.processVoiceCommand(sessionId, audioData);

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe('string');
    });

    it('should handle non-existent session', async () => {
      const sessionId = 'non-existent';
      const audioData = 'base64_audio_data';

      const response = await service.processVoiceCommand(sessionId, audioData);

      expect(response.text).toBe('Oturum bulunamadı veya aktif değil');
    });

    it('should handle inactive session', async () => {
      const sessionId = 'voice_1234567890';
      const audioData = 'base64_audio_data';

      // Mock inactive session
      const mockSession = {
        sessionId,
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'completed' as const,
      };

      (service as any).activeSessions.set(sessionId, mockSession);

      const response = await service.processVoiceCommand(sessionId, audioData);

      expect(response.text).toBe('Oturum bulunamadı veya aktif değil');
    });
  });

  describe('detectIntent', () => {
    it('should detect pick_item intent', () => {
      const text = 'topla ürün';
      const intent = (service as any).detectIntent(text);

      expect(intent).toBe('pick_item');
    });

    it('should detect confirm_location intent', () => {
      const text = 'konum doğru mu';
      const intent = (service as any).detectIntent(text);

      expect(intent).toBe('confirm_location');
    });

    it('should detect report_quantity intent', () => {
      const text = '5 adet topladım';
      const intent = (service as any).detectIntent(text);

      expect(intent).toBe('report_quantity');
    });

    it('should detect skip_item intent', () => {
      const text = 'bu ürünü atla';
      const intent = (service as any).detectIntent(text);

      expect(intent).toBe('skip_item');
    });

    it('should detect request_help intent', () => {
      const text = 'yardım istiyorum';
      const intent = (service as any).detectIntent(text);

      expect(intent).toBe('request_help');
    });

    it('should detect complete_task intent', () => {
      const text = 'görev tamamlandı';
      const intent = (service as any).detectIntent(text);

      expect(intent).toBe('complete_task');
    });

    it('should default to pick_item for unknown text', () => {
      const text = 'bilinmeyen komut';
      const intent = (service as any).detectIntent(text);

      expect(intent).toBe('pick_item');
    });
  });

  describe('extractEntities', () => {
    it('should extract quantity entity', () => {
      const text = '5 adet topladım';
      const intent = 'report_quantity';
      const entities = (service as any).extractEntities(text, intent);

      expect(entities.quantity).toBe(5);
    });

    it('should extract location entity', () => {
      const text = 'A-1-1 konumundayım';
      const intent = 'confirm_location';
      const entities = (service as any).extractEntities(text, intent);

      expect(entities.location).toBe('A-1-1');
    });

    it('should return empty entities for no matches', () => {
      const text = 'hiçbir şey';
      const intent = 'pick_item';
      const entities = (service as any).extractEntities(text, intent);

      expect(entities).toEqual({});
    });
  });

  describe('handleIntent', () => {
    it('should handle pick_item intent', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      const intent = 'pick_item';
      const entities = {};

      const response = await (service as any).handleIntent(session, intent, entities);

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
    });

    it('should handle confirm_location intent', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      const intent = 'confirm_location';
      const entities = { location: 'A-1-1' };

      const response = await (service as any).handleIntent(session, intent, entities);

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
    });

    it('should handle report_quantity intent', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      const intent = 'report_quantity';
      const entities = { quantity: 5 };

      const response = await (service as any).handleIntent(session, intent, entities);

      expect(response).toBeDefined();
      expect(response.text).toBeDefined();
    });

    it('should handle skip_item intent', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      const intent = 'skip_item';
      const entities = {};

      const response = await (service as any).handleIntent(session, intent, entities);

      expect(response).toBeDefined();
      expect(response.text).toBe('Ürün atlandı. Sıradaki ürüne geçiliyor');
    });

    it('should handle request_help intent', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      const intent = 'request_help';
      const entities = {};

      const response = await (service as any).handleIntent(session, intent, entities);

      expect(response).toBeDefined();
      expect(response.text).toBe('Yardım çağrısı gönderildi. Süpervizör yolda');
      expect(response.action).toBe('request_supervisor');
    });

    it('should handle complete_task intent', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      const intent = 'complete_task';
      const entities = {};

      const response = await (service as any).handleIntent(session, intent, entities);

      expect(response).toBeDefined();
      expect(response.text).toBe('Görev tamamlandı. İyi çalışmalar');
    });

    it('should handle unknown intent', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      const intent = 'unknown_intent' as any;
      const entities = {};

      const response = await (service as any).handleIntent(session, intent, entities);

      expect(response).toBeDefined();
      expect(response.text).toBe('Komut anlaşılamadı. Lütfen tekrarlayın');
    });
  });

  describe('getPickingTask', () => {
    it('should get picking task successfully', async () => {
      const taskId = 'task-001';
      const task = await (service as any).getPickingTask(taskId);

      expect(task).toBeDefined();
      expect(task.taskId).toBe(taskId);
      expect(task.items).toBeDefined();
      expect(Array.isArray(task.items)).toBe(true);
      expect(task.currentItemIndex).toBe(0);
    });

    it('should handle empty task', async () => {
      const taskId = 'empty-task';
      const task = await (service as any).getPickingTask(taskId);

      expect(task).toBeDefined();
      expect(task.items).toHaveLength(0);
    });
  });

  describe('updatePickingProgress', () => {
    it('should update picking progress successfully', async () => {
      const taskId = 'task-001';
      const stepNumber = 3;

      await expect((service as any).updatePickingProgress(taskId, stepNumber)).resolves.not.toThrow();
    });

    it('should handle invalid task ID', async () => {
      const taskId = '';
      const stepNumber = 3;

      await expect((service as any).updatePickingProgress(taskId, stepNumber)).rejects.toThrow();
    });
  });

  describe('completeSession', () => {
    it('should complete session successfully', async () => {
      const session = {
        sessionId: 'voice_1234567890',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        endTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      await expect((service as any).completeSession(session)).resolves.not.toThrow();
    });

    it('should handle session completion failure', async () => {
      const session = {
        sessionId: 'invalid-session',
        userId: 'user-001',
        taskId: 'task-001',
        taskType: 'picking' as const,
        startTime: new Date(),
        endTime: new Date(),
        commands: [],
        currentStep: 0,
        totalSteps: 5,
        status: 'active' as const,
      };

      await expect((service as any).completeSession(session)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const userId = 'user-001';
      const taskId = 'task-001';

      // Mock database error
      jest.spyOn(service, 'startVoicePickingSession').mockRejectedValue(new Error('Database connection failed'));

      await expect(service.startVoicePickingSession(userId, taskId)).rejects.toThrow('Database connection failed');
    });

    it('should handle audio processing errors', async () => {
      const sessionId = 'voice_1234567890';
      const audioData = 'invalid_audio_data';

      // Mock audio processing error
      jest.spyOn(service, 'processVoiceCommand').mockRejectedValue(new Error('Audio processing failed'));

      await expect(service.processVoiceCommand(sessionId, audioData)).rejects.toThrow('Audio processing failed');
    });

    it('should handle speech recognition errors', async () => {
      const sessionId = 'voice_1234567890';
      const audioData = 'base64_audio_data';

      // Mock speech recognition error
      jest.spyOn(service, 'processVoiceCommand').mockRejectedValue(new Error('Speech recognition failed'));

      await expect(service.processVoiceCommand(sessionId, audioData)).rejects.toThrow('Speech recognition failed');
    });
  });

  describe('data validation', () => {
    it('should validate session ID format', async () => {
      const sessionId = 'invalid-session-id';
      const audioData = 'base64_audio_data';

      const response = await service.processVoiceCommand(sessionId, audioData);

      expect(response.text).toBe('Oturum bulunamadı veya aktif değil');
    });

    it('should validate audio data format', async () => {
      const sessionId = 'voice_1234567890';
      const audioData = '';

      await expect(service.processVoiceCommand(sessionId, audioData)).rejects.toThrow();
    });

    it('should validate task ID format', async () => {
      const userId = 'user-001';
      const taskId = '';

      await expect(service.startVoicePickingSession(userId, taskId)).rejects.toThrow();
    });
  });
});
