import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class VoiceAssistantService {
  private readonly logger = new Logger(VoiceAssistantService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });
      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'tr',
      });

      this.logger.log('Audio transcribed successfully');
      return transcription.text;
    } catch (error) {
      this.logger.error('Audio transcription failed:', error);
      throw error;
    }
  }

  async processVoiceCommand(command: string): Promise<{
    action: string;
    parameters: Record<string, any>;
    response: string;
  }> {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('pick') || lowerCommand.includes('al')) {
      const match = command.match(/(\d+)/);
      const quantity = match ? parseInt(match[1]) : 1;
      
      return {
        action: 'pick_item',
        parameters: { quantity },
        response: `${quantity} adet ürün alınıyor`,
      };
    }

    if (lowerCommand.includes('location') || lowerCommand.includes('konum')) {
      return {
        action: 'get_location',
        parameters: {},
        response: 'Konum bilgisi getiriliyor',
      };
    }

    if (lowerCommand.includes('confirm') || lowerCommand.includes('onayla')) {
      return {
        action: 'confirm',
        parameters: {},
        response: 'Onaylandı',
      };
    }

    return {
      action: 'unknown',
      parameters: {},
      response: 'Komutu anlayamadım, lütfen tekrar edin',
    };
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      this.logger.log('Text converted to speech');
      return buffer;
    } catch (error) {
      this.logger.error('Text-to-speech failed:', error);
      throw error;
    }
  }
}

