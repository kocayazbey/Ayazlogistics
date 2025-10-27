import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

export interface ICommand {
  readonly type: string;
}

export interface ICommandHandler<TCommand extends ICommand = any, TResult = any> {
  execute(command: TCommand): Promise<TResult>;
}

@Injectable()
export class CommandBus {
  private readonly logger = new Logger(CommandBus.name);
  private handlers = new Map<string, Type<ICommandHandler>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  register(commandType: string, handler: Type<ICommandHandler>): void {
    this.handlers.set(commandType, handler);
    this.logger.log(`Registered command handler: ${commandType}`);
  }

  async execute<TResult = any>(command: ICommand): Promise<TResult> {
    const HandlerClass = this.handlers.get(command.type);
    if (!HandlerClass) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    const handler = this.moduleRef.get(HandlerClass, { strict: false });
    this.logger.debug(`Executing command: ${command.type}`);
    
    const result = await handler.execute(command);
    this.logger.debug(`Command executed successfully: ${command.type}`);
    
    return result;
  }
}

@Injectable()
export class QueryBus {
  private readonly logger = new Logger(QueryBus.name);
  private handlers = new Map<string, Type<any>>();

  constructor(private readonly moduleRef: ModuleRef) {}

  register(queryType: string, handler: Type<any>): void {
    this.handlers.set(queryType, handler);
  }

  async execute<TResult = any>(query: any): Promise<TResult> {
    const HandlerClass = this.handlers.get(query.type);
    if (!HandlerClass) {
      throw new Error(`No handler registered for query: ${query.type}`);
    }

    const handler = this.moduleRef.get(HandlerClass, { strict: false });
    return handler.execute(query);
  }
}

