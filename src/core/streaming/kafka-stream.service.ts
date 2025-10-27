import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import * as tf from '@tensorflow/tfjs-node';

export interface StreamConfig {
  id: string;
  name: string;
  type: 'producer' | 'consumer' | 'processor';
  topic: string;
  partitions: number;
  replicationFactor: number;
  retention: number; // hours
  compression: 'none' | 'gzip' | 'lz4' | 'snappy';
  enabled: boolean;
  schema?: StreamSchema;
  transformations?: StreamTransformation[];
  filters?: StreamFilter[];
}

export interface StreamSchema {
  fields: StreamField[];
  version: string;
  strict: boolean;
}

export interface StreamField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
}

export interface StreamTransformation {
  type: 'map' | 'filter' | 'aggregate' | 'enrich' | 'normalize';
  field: string;
  expression: string;
  enabled: boolean;
}

export interface StreamFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'regex';
  value: any;
  enabled: boolean;
}

export interface StreamMessage {
  id: string;
  topic: string;
  partition: number;
  offset: number;
  key?: string;
  value: any;
  timestamp: Date;
  headers: Record<string, string>;
  size: number;
}

export interface ConsumerGroup {
  id: string;
  topic: string;
  members: string[];
  partitionAssignment: Record<number, string>;
  committedOffsets: Record<number, number>;
  status: 'active' | 'rebalancing' | 'dead';
}

export interface StreamMetrics {
  topic: string;
  messagesPerSecond: number;
  totalMessages: number;
  totalBytes: number;
  activeProducers: number;
  activeConsumers: number;
  partitions: number;
  lag: Record<number, number>;
  throughput: number;
  errorRate: number;
}

export interface StreamProcessor {
  id: string;
  name: string;
  inputTopics: string[];
  outputTopics: string[];
  logic: string;
  stateful: boolean;
  parallelism: number;
  enabled: boolean;
}

@Injectable()
export class KafkaStreamService {
  private readonly logger = new Logger(KafkaStreamService.name);
  private redis: Redis;
  private streams: Map<string, StreamConfig> = new Map();
  private consumerGroups: Map<string, ConsumerGroup> = new Map();
  private processors: Map<string, StreamProcessor> = new Map();
  private messageBuffer: Map<string, StreamMessage[]> = new Map();
  private metrics: Map<string, StreamMetrics> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.initializeStreams();
    this.startMetricsCollection();
  }

  private async initializeStreams(): Promise<void> {
    this.logger.log('Initializing Kafka-style streams...');

    // Default streams
    const defaultStreams: StreamConfig[] = [
      {
        id: 'orders-stream',
        name: 'Orders Stream',
        type: 'producer',
        topic: 'orders',
        partitions: 3,
        replicationFactor: 1,
        retention: 168, // 7 days
        compression: 'lz4',
        enabled: true,
        schema: {
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'customerId', type: 'string', required: true },
            { name: 'amount', type: 'number', required: true },
            { name: 'items', type: 'array', required: true },
            { name: 'timestamp', type: 'date', required: true },
            { name: 'status', type: 'string', required: true },
          ],
          version: '1.0',
          strict: true,
        },
        transformations: [
          {
            type: 'normalize',
            field: 'amount',
            expression: 'value / 100', // Convert cents to currency
            enabled: true,
          },
        ],
        filters: [
          {
            field: 'amount',
            operator: 'gt',
            value: 0,
            enabled: true,
          },
        ],
      },
      {
        id: 'inventory-stream',
        name: 'Inventory Stream',
        type: 'processor',
        topic: 'inventory',
        partitions: 2,
        replicationFactor: 1,
        retention: 72, // 3 days
        compression: 'snappy',
        enabled: true,
        schema: {
          fields: [
            { name: 'productId', type: 'string', required: true },
            { name: 'warehouseId', type: 'string', required: true },
            { name: 'quantity', type: 'number', required: true },
            { name: 'operation', type: 'string', required: true },
            { name: 'timestamp', type: 'date', required: true },
          ],
          version: '1.0',
          strict: true,
        },
        transformations: [
          {
            type: 'enrich',
            field: 'productInfo',
            expression: 'lookupProduct(productId)',
            enabled: true,
          },
        ],
        filters: [
          {
            field: 'quantity',
            operator: 'ne',
            value: 0,
            enabled: true,
          },
        ],
      },
      {
        id: 'analytics-stream',
        name: 'Analytics Stream',
        type: 'consumer',
        topic: 'analytics',
        partitions: 1,
        replicationFactor: 1,
        retention: 24, // 1 day
        compression: 'gzip',
        enabled: true,
        schema: {
          fields: [
            { name: 'event', type: 'string', required: true },
            { name: 'userId', type: 'string', required: false },
            { name: 'data', type: 'object', required: true },
            { name: 'timestamp', type: 'date', required: true },
          ],
          version: '1.0',
          strict: false,
        },
      },
    ];

    for (const stream of defaultStreams) {
      this.streams.set(stream.id, stream);
      await this.createRedisStream(stream.topic);
    }

    // Default processors
    const defaultProcessors: StreamProcessor[] = [
      {
        id: 'order-aggregator',
        name: 'Order Aggregator',
        inputTopics: ['orders'],
        outputTopics: ['orders-aggregated'],
        logic: 'aggregateOrdersByCustomer',
        stateful: true,
        parallelism: 2,
        enabled: true,
      },
      {
        id: 'inventory-monitor',
        name: 'Inventory Monitor',
        inputTopics: ['inventory'],
        outputTopics: ['inventory-alerts'],
        logic: 'checkInventoryLevels',
        stateful: true,
        parallelism: 1,
        enabled: true,
      },
      {
        id: 'fraud-detector',
        name: 'Fraud Detector',
        inputTopics: ['orders', 'user-behavior'],
        outputTopics: ['fraud-alerts'],
        logic: 'detectFraudulentOrders',
        stateful: true,
        parallelism: 3,
        enabled: true,
      },
    ];

    for (const processor of defaultProcessors) {
      this.processors.set(processor.id, processor);
    }

    this.logger.log(`Initialized ${this.streams.size} streams and ${this.processors.size} processors`);
  }

  private async createRedisStream(topic: string): Promise<void> {
    try {
      // Create Redis stream if it doesn't exist
      await this.redis.xinfo('STREAM', topic);
    } catch (error) {
      // Stream doesn't exist, create it
      await this.redis.xadd(topic, '*', 'created', 'true');
      this.logger.debug(`Created Redis stream: ${topic}`);
    }
  }

  // ============================================
  // PRODUCER METHODS
  // ============================================

  async produce(topic: string, messages: Array<{ key?: string; value: any; headers?: Record<string, string> }>): Promise<string[]> {
    const stream = this.streams.get(topic);
    if (!stream || !stream.enabled) {
      throw new Error(`Stream not found or disabled: ${topic}`);
    }

    const messageIds: string[] = [];

    for (const msg of messages) {
      try {
        // Validate message against schema
        const validatedMessage = this.validateMessage(msg.value, stream.schema);

        // Apply transformations
        const transformedMessage = this.applyTransformations(validatedMessage, stream.transformations);

        // Apply filters
        if (!this.applyFilters(transformedMessage, stream.filters)) {
          continue; // Skip filtered messages
        }

        // Determine partition
        const partition = this.getPartition(msg.key || '', stream.partitions);

        // Add to Redis stream
        const messageId = await this.redis.xadd(
          topic,
          '*',
          'partition', partition.toString(),
          'key', msg.key || '',
          'value', JSON.stringify(transformedMessage),
          'headers', JSON.stringify(msg.headers || {}),
          'timestamp', new Date().toISOString(),
        );

        messageIds.push(messageId);

        // Store message in buffer for processing
        const streamMessage: StreamMessage = {
          id: messageId,
          topic,
          partition,
          offset: await this.getStreamLength(topic, partition),
          key: msg.key,
          value: transformedMessage,
          timestamp: new Date(),
          headers: msg.headers || {},
          size: JSON.stringify(transformedMessage).length,
        };

        this.addToMessageBuffer(topic, streamMessage);

        // Emit event
        this.eventEmitter.emit('stream.message.produced', {
          topic,
          message: streamMessage,
        });

        this.logger.debug(`Message produced to ${topic}: ${messageId}`);

      } catch (error) {
        this.logger.error(`Failed to produce message to ${topic}:`, error);
      }
    }

    // Update metrics
    this.updateStreamMetrics(topic);

    return messageIds;
  }

  private validateMessage(value: any, schema?: StreamSchema): any {
    if (!schema || !schema.strict) return value;

    const validated: any = {};

    for (const field of schema.fields) {
      const fieldValue = this.getNestedValue(value, field.name);

      if (field.required && (fieldValue === undefined || fieldValue === null)) {
        throw new Error(`Required field missing: ${field.name}`);
      }

      if (fieldValue !== undefined && fieldValue !== null) {
        validated[field.name] = this.validateFieldType(fieldValue, field);
      } else if (field.defaultValue !== undefined) {
        validated[field.name] = field.defaultValue;
      }
    }

    return validated;
  }

  private validateFieldType(value: any, field: StreamField): any {
    switch (field.type) {
      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number value for field ${field.name}: ${value}`);
        }
        return numValue;
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      default:
        return String(value);
    }
  }

  private applyTransformations(data: any, transformations: StreamTransformation[]): any {
    let transformed = { ...data };

    for (const transformation of transformations) {
      if (!transformation.enabled) continue;

      try {
        switch (transformation.type) {
          case 'map':
            transformed = this.applyMapping(transformed, transformation);
            break;
          case 'filter':
            transformed = this.applyStreamFilter(transformed, transformation);
            break;
          case 'aggregate':
            transformed = this.applyAggregation(transformed, transformation);
            break;
          case 'normalize':
            transformed = this.applyNormalization(transformed, transformation);
            break;
          case 'enrich':
            transformed = this.applyEnrichment(transformed, transformation);
            break;
        }
      } catch (error) {
        this.logger.error(`Transformation failed for field ${transformation.field}:`, error);
      }
    }

    return transformed;
  }

  private applyMapping(data: any, transformation: StreamTransformation): any {
    // Simple field mapping implementation
    const expression = transformation.expression;
    // In a real implementation, this would use a proper expression evaluator

    return data;
  }

  private applyStreamFilter(data: any, transformation: StreamTransformation): any {
    // Filter implementation
    return data;
  }

  private applyAggregation(data: any, transformation: StreamTransformation): any {
    // Aggregation implementation
    return data;
  }

  private applyNormalization(data: any, transformation: StreamTransformation): any {
    // Normalization implementation
    return data;
  }

  private applyEnrichment(data: any, transformation: StreamTransformation): any {
    // Data enrichment implementation
    return data;
  }

  private applyFilters(data: any, filters: StreamFilter[]): boolean {
    for (const filter of filters) {
      if (!filter.enabled) continue;

      const fieldValue = this.getNestedValue(data, filter.field);

      if (!this.checkFilterCondition(fieldValue, filter.operator, filter.value)) {
        return false;
      }
    }

    return true;
  }

  private checkFilterCondition(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'eq':
        return value === filterValue;
      case 'ne':
        return value !== filterValue;
      case 'gt':
        return value > filterValue;
      case 'lt':
        return value < filterValue;
      case 'gte':
        return value >= filterValue;
      case 'lte':
        return value <= filterValue;
      case 'like':
        return String(value).includes(String(filterValue));
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'regex':
        return new RegExp(filterValue).test(String(value));
      default:
        return true;
    }
  }

  private getPartition(key: string, partitionCount: number): number {
    // Simple partitioning based on hash
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % partitionCount;
  }

  private async getStreamLength(topic: string, partition: number): Promise<number> {
    try {
      const length = await this.redis.xlen(topic);
      return length;
    } catch (error) {
      return 0;
    }
  }

  private addToMessageBuffer(topic: string, message: StreamMessage): void {
    if (!this.messageBuffer.has(topic)) {
      this.messageBuffer.set(topic, []);
    }

    const buffer = this.messageBuffer.get(topic)!;
    buffer.push(message);

    // Keep only recent messages (last 1000)
    if (buffer.length > 1000) {
      buffer.shift();
    }
  }

  // ============================================
  // CONSUMER METHODS
  // ============================================

  async createConsumerGroup(groupId: string, topics: string[]): Promise<string> {
    const consumerGroup: ConsumerGroup = {
      id: groupId,
      topic: topics[0], // Simplified to single topic
      members: [],
      partitionAssignment: {},
      committedOffsets: {},
      status: 'active',
    };

    this.consumerGroups.set(groupId, consumerGroup);

    // Assign partitions to consumer group
    await this.assignPartitionsToGroup(groupId, topics);

    this.logger.log(`Consumer group created: ${groupId} for topics: ${topics.join(', ')}`);
    return groupId;
  }

  async consume(
    groupId: string,
    consumerId: string,
    options: {
      autoCommit?: boolean;
      batchSize?: number;
      timeout?: number;
    } = {},
  ): Promise<StreamMessage[]> {
    const consumerGroup = this.consumerGroups.get(groupId);
    if (!consumerGroup) {
      throw new Error(`Consumer group not found: ${groupId}`);
    }

    const { autoCommit = true, batchSize = 10, timeout = 5000 } = options;

    // Get assigned partitions for this consumer
    const assignedPartitions = this.getConsumerPartitions(groupId, consumerId);

    const messages: StreamMessage[] = [];

    for (const partition of assignedPartitions) {
      const partitionMessages = await this.consumeFromPartition(
        consumerGroup.topic,
        partition,
        consumerId,
        batchSize,
        timeout
      );

      messages.push(...partitionMessages);
    }

    // Auto-commit offsets if enabled
    if (autoCommit && messages.length > 0) {
      await this.commitOffsets(groupId, consumerId, messages);
    }

    return messages;
  }

  private async assignPartitionsToGroup(groupId: string, topics: string[]): Promise<void> {
    const consumerGroup = this.consumerGroups.get(groupId)!;
    const topic = topics[0]; // Simplified
    const stream = this.streams.get(topic);

    if (!stream) return;

    // Simple round-robin partition assignment
    consumerGroup.partitionAssignment = {};
    for (let i = 0; i < stream.partitions; i++) {
      consumerGroup.partitionAssignment[i] = consumerId || 'default-consumer';
    }

    consumerGroup.members = [consumerId || 'default-consumer'];
  }

  private getConsumerPartitions(groupId: string, consumerId: string): number[] {
    const consumerGroup = this.consumerGroups.get(groupId);
    if (!consumerGroup) return [];

    return Object.keys(consumerGroup.partitionAssignment)
      .filter(partition => consumerGroup.partitionAssignment[parseInt(partition)] === consumerId)
      .map(partition => parseInt(partition));
  }

  private async consumeFromPartition(
    topic: string,
    partition: number,
    consumerId: string,
    batchSize: number,
    timeout: number,
  ): Promise<StreamMessage[]> {
    try {
      // Get consumer offset
      const offset = await this.getConsumerOffset(topic, consumerId, partition);

      // Read from Redis stream
      const results = await this.redis.xread(
        'BLOCK', timeout,
        'STREAMS', topic, offset
      );

      if (!results || results.length === 0) {
        return [];
      }

      const messages: StreamMessage[] = [];

      for (const [messageId, fields] of results) {
        const messageData: any = {};
        for (let i = 0; i < fields.length; i += 2) {
          messageData[fields[i]] = fields[i + 1];
        }

        const streamMessage: StreamMessage = {
          id: messageId,
          topic,
          partition: parseInt(messageData.partition),
          offset: parseInt(messageId.split('-')[0]) || 0,
          key: messageData.key,
          value: JSON.parse(messageData.value),
          timestamp: new Date(messageData.timestamp),
          headers: JSON.parse(messageData.headers || '{}'),
          size: parseInt(messageData.size || '0'),
        };

        messages.push(streamMessage);

        if (messages.length >= batchSize) {
          break;
        }
      }

      return messages;

    } catch (error) {
      this.logger.error(`Error consuming from partition ${partition}:`, error);
      return [];
    }
  }

  private async getConsumerOffset(topic: string, consumerId: string, partition: number): Promise<string> {
    const consumerGroup = this.consumerGroups.get(consumerId);
    if (!consumerGroup) {
      return '0'; // Start from beginning
    }

    const offset = consumerGroup.committedOffsets[partition];
    return offset ? offset.toString() : '0';
  }

  private async commitOffsets(groupId: string, consumerId: string, messages: StreamMessage[]): Promise<void> {
    const consumerGroup = this.consumerGroups.get(groupId);
    if (!consumerGroup) return;

    // Update committed offsets
    for (const message of messages) {
      consumerGroup.committedOffsets[message.partition] = message.offset;
    }

    // In a real implementation, this would also update the consumer group offset in Redis
    this.logger.debug(`Offsets committed for consumer ${consumerId}`);
  }

  // ============================================
  // STREAM PROCESSOR METHODS
  // ============================================

  async startProcessor(processorId: string): Promise<void> {
    const processor = this.processors.get(processorId);
    if (!processor || !processor.enabled) {
      throw new Error(`Processor not found or disabled: ${processorId}`);
    }

    this.logger.log(`Starting stream processor: ${processor.name} (${processorId})`);

    // Start consumer for input topics
    await this.createConsumerGroup(`processor-${processorId}`, processor.inputTopics);

    // Start processing loop
    const processingInterval = setInterval(async () => {
      try {
        await this.processStreamData(processor);
      } catch (error) {
        this.logger.error(`Error in processor ${processorId}:`, error);
      }
    }, 1000); // Process every second

    // Store processing interval for cleanup
    (processor as any).processingInterval = processingInterval;

    processor.enabled = true;
    this.processors.set(processorId, processor);

    this.logger.log(`Stream processor started: ${processorId}`);
  }

  async stopProcessor(processorId: string): Promise<void> {
    const processor = this.processors.get(processorId);
    if (!processor) return;

    // Stop processing interval
    if ((processor as any).processingInterval) {
      clearInterval((processor as any).processingInterval);
    }

    processor.enabled = false;
    this.processors.set(processorId, processor);

    this.logger.log(`Stream processor stopped: ${processorId}`);
  }

  private async processStreamData(processor: StreamProcessor): Promise<void> {
    // Consume messages from input topics
    const messages: StreamMessage[] = [];

    for (const topic of processor.inputTopics) {
      const topicMessages = await this.consume(`processor-${processor.id}`, `consumer-${processor.id}`, {
        batchSize: 10,
        autoCommit: false,
      });

      messages.push(...topicMessages);
    }

    if (messages.length === 0) return;

    // Apply processing logic
    const processedData = await this.applyProcessingLogic(processor, messages);

    // Produce to output topics
    for (const outputTopic of processor.outputTopics) {
      await this.produce(outputTopic, processedData.map(data => ({
        value: data,
        headers: { processor: processor.id },
      })));
    }

    // Commit offsets
    await this.commitOffsets(`processor-${processor.id}`, `consumer-${processor.id}`, messages);
  }

  private async applyProcessingLogic(processor: StreamProcessor, messages: StreamMessage[]): Promise<any[]> {
    // Apply processor-specific logic
    switch (processor.logic) {
      case 'aggregateOrdersByCustomer':
        return this.aggregateOrdersByCustomer(messages);
      case 'checkInventoryLevels':
        return this.checkInventoryLevels(messages);
      case 'detectFraudulentOrders':
        return this.detectFraudulentOrders(messages);
      default:
        return messages.map(msg => msg.value);
    }
  }

  private aggregateOrdersByCustomer(messages: StreamMessage[]): any[] {
    // Group orders by customer and aggregate
    const customerOrders = new Map<string, any[]>();

    for (const message of messages) {
      const customerId = message.value.customerId;
      if (!customerOrders.has(customerId)) {
        customerOrders.set(customerId, []);
      }
      customerOrders.get(customerId)!.push(message.value);
    }

    const aggregated: any[] = [];

    for (const [customerId, orders] of customerOrders.entries()) {
      const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
      const orderCount = orders.length;

      aggregated.push({
        customerId,
        totalAmount,
        orderCount,
        averageOrderValue: totalAmount / orderCount,
        lastOrderDate: orders.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0].timestamp,
      });
    }

    return aggregated;
  }

  private checkInventoryLevels(messages: StreamMessage[]): any[] {
    // Check inventory levels and generate alerts
    const alerts: any[] = [];

    for (const message of messages) {
      const { productId, warehouseId, quantity, operation } = message.value;

      if (operation === 'sale' && quantity < 10) {
        alerts.push({
          type: 'low_inventory',
          productId,
          warehouseId,
          currentQuantity: quantity,
          threshold: 10,
          severity: 'high',
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  private detectFraudulentOrders(messages: StreamMessage[]): any[] {
    // Simple fraud detection logic
    const alerts: any[] = [];

    for (const message of messages) {
      const { amount, customerId, items } = message.value;

      // Flag high-value orders
      if (amount > 10000) {
        alerts.push({
          type: 'high_value_order',
          orderId: message.value.id,
          customerId,
          amount,
          risk: 'medium',
          timestamp: new Date(),
        });
      }

      // Flag orders with many items
      if (items.length > 50) {
        alerts.push({
          type: 'bulk_order',
          orderId: message.value.id,
          customerId,
          itemCount: items.length,
          risk: 'low',
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  // ============================================
  // METRICS AND MONITORING
  // ============================================

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateAllMetrics();
    }, 5000); // Every 5 seconds
  }

  private async updateAllMetrics(): Promise<void> {
    for (const stream of this.streams.values()) {
      if (stream.enabled) {
        await this.updateStreamMetrics(stream.topic);
      }
    }
  }

  private async updateStreamMetrics(topic: string): Promise<void> {
    try {
      const metrics: StreamMetrics = {
        topic,
        messagesPerSecond: 0,
        totalMessages: await this.redis.xlen(topic),
        totalBytes: 0, // Would need to calculate actual byte size
        activeProducers: 0, // Would need to track producers
        activeConsumers: 0, // Would need to track consumers
        partitions: this.streams.get(topic)?.partitions || 1,
        lag: {},
        throughput: 0,
        errorRate: 0,
      };

      // Calculate lag for each partition
      for (let i = 0; i < metrics.partitions; i++) {
        const consumerGroups = Array.from(this.consumerGroups.values())
          .filter(cg => cg.topic === topic);

        let maxLag = 0;
        for (const cg of consumerGroups) {
          const committedOffset = cg.committedOffsets[i] || 0;
          const streamLength = await this.getPartitionLength(topic, i);
          const lag = streamLength - committedOffset;
          maxLag = Math.max(maxLag, lag);
        }

        metrics.lag[i] = maxLag;
      }

      this.metrics.set(topic, metrics);

    } catch (error) {
      this.logger.error(`Error updating metrics for topic ${topic}:`, error);
    }
  }

  private async getPartitionLength(topic: string, partition: number): Promise<number> {
    // In a real implementation, this would get the length of a specific partition
    return await this.redis.xlen(topic);
  }

  // ============================================
  // PUBLIC API METHODS
  // ============================================

  async createStream(config: Omit<StreamConfig, 'id'>): Promise<string> {
    const id = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stream: StreamConfig = {
      id,
      ...config,
    };

    this.streams.set(id, stream);
    await this.createRedisStream(stream.topic);

    this.logger.log(`Stream created: ${id} (${stream.name})`);
    return id;
  }

  async getStream(streamId: string): Promise<StreamConfig | null> {
    return this.streams.get(streamId) || null;
  }

  async listStreams(): Promise<StreamConfig[]> {
    return Array.from(this.streams.values());
  }

  async getStreamMetrics(topic: string): Promise<StreamMetrics | null> {
    return this.metrics.get(topic) || null;
  }

  async getAllMetrics(): Promise<Record<string, StreamMetrics>> {
    const allMetrics: Record<string, StreamMetrics> = {};

    for (const [topic, metrics] of this.metrics.entries()) {
      allMetrics[topic] = metrics;
    }

    return allMetrics;
  }

  async getConsumerGroups(): Promise<ConsumerGroup[]> {
    return Array.from(this.consumerGroups.values());
  }

  async getProcessors(): Promise<StreamProcessor[]> {
    return Array.from(this.processors.values());
  }

  async deleteStream(streamId: string): Promise<boolean> {
    const stream = this.streams.get(streamId);
    if (!stream) return false;

    // Stop all processors using this stream
    for (const processor of this.processors.values()) {
      if (processor.inputTopics.includes(stream.topic) || processor.outputTopics.includes(stream.topic)) {
        await this.stopProcessor(processor.id);
      }
    }

    // Delete Redis stream
    await this.redis.del(stream.topic);

    this.streams.delete(streamId);
    this.metrics.delete(stream.topic);

    this.logger.log(`Stream deleted: ${streamId}`);
    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
