import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * Advanced Logger Middleware
 * Winston-based structured logging with daily rotation
 */

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'ayazlogistics-api' },
      transports: [
        new winston.transports.DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
            }),
          ),
        }),
      ],
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;

    // Log request
    this.logger.info('Incoming request', {
      method,
      url: originalUrl,
      ip,
      userAgent: headers['user-agent'],
      contentType: headers['content-type'],
      contentLength: headers['content-length'],
      tenantId: req['tenantId'],
      userId: req['user']?.id,
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data): Response {
      res.send = originalSend;
      
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const statusCategory = Math.floor(statusCode / 100);

      // Log response
      const logLevel = statusCategory >= 5 ? 'error' : statusCategory >= 4 ? 'warn' : 'info';
      
      const logData = {
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length'),
        tenantId: req['tenantId'],
        userId: req['user']?.id,
      };

      if (statusCategory >= 4) {
        logData['errorData'] = typeof data === 'string' ? data.substring(0, 500) : JSON.stringify(data).substring(0, 500);
      }

      const logMessage = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;
      
      if (logLevel === 'error') {
        this.logger.error(logMessage, logData);
      } else if (logLevel === 'warn') {
        this.logger.warn(logMessage, logData);
      } else {
        this.logger.info(logMessage, logData);
      }

      return originalSend.call(this, data);
    }.bind(res);

    next();
  }

  // Utility methods for application logging
  logInfo(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  logError(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, {
      ...meta,
      error: error?.message,
      stack: error?.stack,
    });
  }

  logWarn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  logDebug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}

