import { Injectable, Logger } from '@nestjs/common';

// TensorFlow and Natural are optional
let tf: any = null;
let natural: any = null;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  console.warn('TensorFlow.js not available - Sentiment analysis features will be limited');
}
try {
  natural = require('natural');
} catch (error) {
  console.warn('Natural NLP not available - Sentiment analysis features will be limited');
}

@Injectable()
export class SentimentAnalysisService {
  private readonly logger = new Logger(SentimentAnalysisService.name);
  private model: tf.LayersModel | null = null;
  private tokenizer: natural.WordTokenizer;

  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.loadModel();
  }

  private async loadModel() {
    try {
      // Load pre-trained sentiment analysis model
      // In production, this would load from a model file or URL
      this.model = await tf.loadLayersModel('file://./models/sentiment-model.json');
      this.logger.log('Sentiment analysis model loaded successfully');
    } catch (error) {
      this.logger.warn('Failed to load sentiment model, using fallback analysis');
      this.model = null;
    }
  }

  async analyzeFeedback(feedback: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    topics: string[];
    urgency: 'low' | 'medium' | 'high';
  }> {
    try {
      // Clean and preprocess text
      const cleanedText = this.preprocessText(feedback);
      
      let sentiment: 'positive' | 'neutral' | 'negative';
      let score: number;

      if (this.model) {
        // Use ML model for prediction
        const prediction = await this.predictWithModel(cleanedText);
        sentiment = prediction.sentiment;
        score = prediction.score;
      } else {
        // Fallback to rule-based analysis
        const analysis = this.ruleBasedAnalysis(cleanedText);
        sentiment = analysis.sentiment;
        score = analysis.score;
      }

      // Extract topics using keyword extraction
      const topics = this.extractTopics(cleanedText);
      
      // Determine urgency based on keywords and sentiment
      const urgency = this.determineUrgency(cleanedText, sentiment, score);

      this.logger.log(`Sentiment analysis completed: ${sentiment} (${score})`);
      
      return {
        sentiment,
        score,
        topics,
        urgency
      };
    } catch (error) {
      this.logger.error('Error in sentiment analysis:', error);
      
      // Return neutral sentiment as fallback
      return {
        sentiment: 'neutral',
        score: 0.5,
        topics: ['general'],
        urgency: 'low'
      };
    }
  }

  private preprocessText(text: string): string {
    // Convert to lowercase
    let processed = text.toLowerCase();
    
    // Remove special characters and numbers
    processed = processed.replace(/[^a-zA-Z\s]/g, '');
    
    // Remove extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  private async predictWithModel(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  }> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Tokenize text
    const tokens = this.tokenizer.tokenize(text) || [];
    
    // Convert tokens to numerical representation
    // This is a simplified version - in production you'd use proper word embeddings
    const tokenIds = tokens.map(token => this.getTokenId(token));
    
    // Pad or truncate to fixed length
    const maxLength = 100;
    const paddedTokens = this.padSequence(tokenIds, maxLength);
    
    // Convert to tensor
    const input = tf.tensor2d([paddedTokens]);
    
    // Make prediction
    const prediction = this.model.predict(input) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Interpret results
    const positiveScore = probabilities[0];
    const negativeScore = probabilities[1];
    const neutralScore = probabilities[2];
    
    let sentiment: 'positive' | 'neutral' | 'negative';
    let score: number;
    
    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      sentiment = 'positive';
      score = positiveScore;
    } else if (negativeScore > positiveScore && negativeScore > neutralScore) {
      sentiment = 'negative';
      score = negativeScore;
    } else {
      sentiment = 'neutral';
      score = neutralScore;
    }
    
    // Clean up tensors
    input.dispose();
    prediction.dispose();
    
    return { sentiment, score };
  }

  private ruleBasedAnalysis(text: string): {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  } {
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'perfect', 'love', 'like', 'happy', 'satisfied', 'pleased',
      'outstanding', 'brilliant', 'superb', 'awesome', 'marvelous'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate',
      'disappointed', 'angry', 'frustrated', 'upset', 'annoyed',
      'disgusted', 'furious', 'lousy', 'pathetic', 'useless'
    ];
    
    const words = text.split(' ');
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) {
        positiveCount++;
      } else if (negativeWords.includes(word)) {
        negativeCount++;
      }
    });
    
    const totalWords = words.length;
    const positiveRatio = positiveCount / totalWords;
    const negativeRatio = negativeCount / totalWords;
    
    let sentiment: 'positive' | 'neutral' | 'negative';
    let score: number;
    
    if (positiveRatio > negativeRatio && positiveRatio > 0.1) {
      sentiment = 'positive';
      score = Math.min(positiveRatio * 2, 1);
    } else if (negativeRatio > positiveRatio && negativeRatio > 0.1) {
      sentiment = 'negative';
      score = Math.min(negativeRatio * 2, 1);
    } else {
      sentiment = 'neutral';
      score = 0.5;
    }
    
    return { sentiment, score };
  }

  private extractTopics(text: string): string[] {
    const topicKeywords = {
      'delivery': ['delivery', 'shipping', 'ship', 'deliver', 'arrive', 'arrival'],
      'service': ['service', 'support', 'help', 'assistance', 'customer'],
      'quality': ['quality', 'condition', 'damage', 'broken', 'perfect'],
      'timing': ['time', 'late', 'early', 'delay', 'schedule', 'appointment'],
      'communication': ['call', 'email', 'message', 'notify', 'update', 'inform'],
      'pricing': ['price', 'cost', 'expensive', 'cheap', 'money', 'payment'],
      'staff': ['staff', 'employee', 'worker', 'driver', 'person', 'guy']
    };
    
    const topics: string[] = [];
    const words = text.toLowerCase().split(' ');
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const hasKeywords = keywords.some(keyword => 
        words.some(word => word.includes(keyword))
      );
      if (hasKeywords) {
        topics.push(topic);
      }
    });
    
    return topics.length > 0 ? topics : ['general'];
  }

  private determineUrgency(text: string, sentiment: string, score: number): 'low' | 'medium' | 'high' {
    const urgentKeywords = [
      'urgent', 'asap', 'immediately', 'emergency', 'critical', 'important',
      'rush', 'priority', 'deadline', 'now', 'today'
    ];
    
    const words = text.toLowerCase().split(' ');
    const hasUrgentKeywords = urgentKeywords.some(keyword => 
      words.some(word => word.includes(keyword))
    );
    
    if (hasUrgentKeywords || (sentiment === 'negative' && score > 0.8)) {
      return 'high';
    } else if (sentiment === 'negative' && score > 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private getTokenId(token: string): number {
    // Simple hash function to convert tokens to IDs
    // In production, you'd use a proper vocabulary mapping
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 10000; // Limit to vocabulary size
  }

  private padSequence(sequence: number[], maxLength: number): number[] {
    if (sequence.length >= maxLength) {
      return sequence.slice(0, maxLength);
    } else {
      const padding = new Array(maxLength - sequence.length).fill(0);
      return [...sequence, ...padding];
    }
  }
}

