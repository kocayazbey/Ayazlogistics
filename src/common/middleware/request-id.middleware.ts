import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestIdMiddleware');

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    
    req['requestId'] = requestId;
    req['startTime'] = Date.now();
    
    this.logger.debug(`Request ${requestId} started for ${req.method} ${req.url}`);
    
    next();
  }
}
