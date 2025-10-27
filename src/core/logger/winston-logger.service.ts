import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          context,
          message,
          ...meta,
          ...(trace && { trace }),
        });
      }),
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
            }),
          ),
        }),

        // File transport for errors
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true,
        }),

        // File transport for combined logs
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          zippedArchive: true,
        }),

        // File transport for info logs
        new DailyRotateFile({
          filename: 'logs/info-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          maxSize: '20m',
          maxFiles: '14d',
          zippedArchive: true,
        }),

        // File transport for debug logs
        new DailyRotateFile({
          filename: 'logs/debug-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'debug',
          maxSize: '20m',
          maxFiles: '7d',
          zippedArchive: true,
        }),
      ],
      exceptionHandlers: [
        new DailyRotateFile({
          filename: 'logs/exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: 'logs/rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Structured logging methods
  logWithMetadata(level: string, message: string, metadata: any) {
    this.logger.log(level, message, metadata);
  }

  logHTTPRequest(req: any, res: any, responseTime: number) {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
    });
  }

  logDatabaseQuery(query: string, duration: number, context?: string) {
    this.logger.debug('Database Query', {
      context: context || 'Database',
      query,
      duration: `${duration}ms`,
    });
  }

  logBusinessEvent(event: string, data: any, context?: string) {
    this.logger.info('Business Event', {
      context: context || 'Business',
      event,
      data,
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', data: any) {
    this.logger.warn('Security Event', {
      context: 'Security',
      event,
      severity,
      data,
    });
  }

  logPerformanceMetric(metric: string, value: number, unit: string) {
    this.logger.info('Performance Metric', {
      context: 'Performance',
      metric,
      value,
      unit,
    });
  }
}

