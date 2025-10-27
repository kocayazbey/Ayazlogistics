import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: string;
  confidence: number;
  intent?: string;
  entities?: Record<string, any>;
  suggestions?: string[];
}

@Injectable()
export class NLPChatbotService {
  private readonly logger = new Logger(NLPChatbotService.name);
  private openai: OpenAI;
  private conversationHistory = new Map<string, ChatMessage[]>();

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(userId: string, message: string): Promise<ChatResponse> {
    const history = this.conversationHistory.get(userId) || [];
    
    history.push({ role: 'user', content: message });

    const systemPrompt: ChatMessage = {
      role: 'system',
      content: 'You are a helpful logistics assistant for AyazLogistics. You help users track shipments, manage warehouses, and answer questions about their logistics operations. Be concise and professional.',
    };

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4'),
        messages: [systemPrompt, ...history.slice(-10)],
        temperature: 0.7,
        max_tokens: this.configService.get<number>('OPENAI_MAX_TOKENS', 500),
      });

      const response = completion.choices[0].message.content || '';
      
      history.push({ role: 'assistant', content: response });
      this.conversationHistory.set(userId, history);

      const intent = await this.extractIntent(message);
      const entities = await this.extractEntities(message);

      this.logger.log(`Chatbot responded to user ${userId}`);

      return {
        message: response,
        confidence: 0.9,
        intent,
        entities,
        suggestions: this.generateSuggestions(intent),
      };
    } catch (error) {
      this.logger.error('Chatbot failed:', error);
      return {
        message: 'I apologize, but I encountered an error. Please try again or contact support.',
        confidence: 0,
      };
    }
  }

  async analyzeDocument(documentText: string): Promise<{
    summary: string;
    keyPoints: string[];
    sentiment: 'positive' | 'neutral' | 'negative';
  }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Analyze this logistics document and provide a summary, key points, and sentiment.',
          },
          {
            role: 'user',
            content: documentText,
          },
        ],
      });

      const analysis = completion.choices[0].message.content || '';
      
      return {
        summary: analysis,
        keyPoints: [],
        sentiment: 'neutral',
      };
    } catch (error) {
      this.logger.error('Document analysis failed:', error);
      throw error;
    }
  }

  private async extractIntent(message: string): Promise<string | undefined> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('track') || lowerMessage.includes('where')) return 'track_shipment';
    if (lowerMessage.includes('order') || lowerMessage.includes('create')) return 'create_order';
    if (lowerMessage.includes('invoice') || lowerMessage.includes('billing')) return 'billing_inquiry';
    if (lowerMessage.includes('warehouse') || lowerMessage.includes('inventory')) return 'inventory_query';
    
    return 'general_inquiry';
  }

  private async extractEntities(message: string): Promise<Record<string, any>> {
    const entities: Record<string, any> = {};
    
    const trackingPattern = /TRACK-\d{8}-\d{6}/g;
    const trackingNumbers = message.match(trackingPattern);
    if (trackingNumbers) {
      entities.trackingNumbers = trackingNumbers;
    }

    return entities;
  }

  private generateSuggestions(intent?: string): string[] {
    const suggestions: Record<string, string[]> = {
      track_shipment: [
        'Show me all active shipments',
        'Get shipment details',
        'Track by tracking number',
      ],
      create_order: [
        'Create a new order',
        'View recent orders',
        'Check order status',
      ],
      billing_inquiry: [
        'View invoices',
        'Check payment status',
        'Download invoice',
      ],
    };

    return suggestions[intent || 'general_inquiry'] || [
      'Track a shipment',
      'View warehouses',
      'Check inventory',
    ];
  }

  clearHistory(userId: string): void {
    this.conversationHistory.delete(userId);
  }
}


