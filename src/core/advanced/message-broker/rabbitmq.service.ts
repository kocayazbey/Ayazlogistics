import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async onModuleInit() {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
    }
  }

  async publish(exchange: string, routingKey: string, message: any): Promise<void> {
    if (!this.channel) await this.connect();

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
      persistent: true,
      timestamp: Date.now(),
    });

    this.logger.debug(`Message published to ${exchange}/${routingKey}`);
  }

  async consume(queue: string, handler: (msg: any) => Promise<void>): Promise<void> {
    if (!this.channel) await this.connect();

    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.prefetch(10);

    this.channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        await handler(content);
        this.channel.ack(msg);
      } catch (error) {
        this.logger.error('Message processing failed:', error);
        this.channel.nack(msg, false, false);
      }
    });

    this.logger.log(`Consuming messages from queue: ${queue}`);
  }

  async publishBatch(exchange: string, routingKey: string, messages: any[]): Promise<void> {
    for (const message of messages) {
      await this.publish(exchange, routingKey, message);
    }
  }
}

