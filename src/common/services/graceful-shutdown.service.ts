import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void> | void;
  timeout?: number;
  critical?: boolean;
}

@Injectable()
export class GracefulShutdownService implements OnModuleDestroy {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private shutdownHandlers: ShutdownHandler[] = [];
  private isShuttingDown = false;

  constructor(private configService: ConfigService) {
    this.setupSignalHandlers();
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  registerShutdownHandler(handler: ShutdownHandler): void {
    this.shutdownHandlers.push(handler);
    this.logger.log(`Registered shutdown handler: ${handler.name}`);
  }

  unregisterShutdownHandler(name: string): void {
    const index = this.shutdownHandlers.findIndex(h => h.name === name);
    if (index !== -1) {
      this.shutdownHandlers.splice(index, 1);
      this.logger.log(`Unregistered shutdown handler: ${name}`);
    }
  }

  private setupSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        this.logger.log(`Received ${signal}, starting graceful shutdown...`);
        await this.shutdown();
      });
    });

    process.on('uncaughtException', async (error) => {
      this.logger.fatal('Uncaught Exception', error.stack);
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      this.logger.fatal('Unhandled Rejection', { reason, promise });
      await this.shutdown();
      process.exit(1);
    });
  }

  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    this.logger.log('Starting graceful shutdown...');

    const shutdownTimeout = this.configService.get('SHUTDOWN_TIMEOUT', 30000);
    const startTime = Date.now();

    try {
      // Execute critical handlers first
      const criticalHandlers = this.shutdownHandlers.filter(h => h.critical);
      const nonCriticalHandlers = this.shutdownHandlers.filter(h => !h.critical);

      await this.executeHandlers(criticalHandlers, 'critical');
      await this.executeHandlers(nonCriticalHandlers, 'non-critical');

      const duration = Date.now() - startTime;
      this.logger.log(`Graceful shutdown completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', error.stack);
    }
  }

  private async executeHandlers(handlers: ShutdownHandler[], type: string): Promise<void> {
    if (handlers.length === 0) return;

    this.logger.log(`Executing ${type} shutdown handlers (${handlers.length})`);

    const promises = handlers.map(async handler => {
      const timeout = handler.timeout || 5000;
      const startTime = Date.now();

      try {
        this.logger.log(`Executing shutdown handler: ${handler.name}`);
        
        await Promise.race([
          Promise.resolve(handler.handler()),
          this.createTimeoutPromise(timeout, handler.name)
        ]);

        const duration = Date.now() - startTime;
        this.logger.log(`Shutdown handler ${handler.name} completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(
          `Shutdown handler ${handler.name} failed after ${duration}ms`,
          error.stack
        );
        
        if (handler.critical) {
          throw error;
        }
      }
    });

    await Promise.allSettled(promises);
  }

  private createTimeoutPromise(timeout: number, handlerName: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Shutdown handler ${handlerName} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  getRegisteredHandlers(): string[] {
    return this.shutdownHandlers.map(h => h.name);
  }
}
