import { Controller, Get, Res, UseGuards, Request } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SseService } from '../services/sse.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@ApiTags('Server-Sent Events')
@Controller('sse')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Get('stream')
  @ApiOperation({ summary: 'Establish SSE connection' })
  @ApiResponse({ status: 200, description: 'SSE connection established' })
  stream(@Request() req: any, @Res() res: Response) {
    const userId = req.user.id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Add client to SSE service
    this.sseService.addClient(userId, res);

    // Handle client disconnect
    req.on('close', () => {
      this.sseService.removeClient(userId);
    });

    // Send initial connection event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ message: 'SSE connection established', userId })}\n\n`);
  }
}