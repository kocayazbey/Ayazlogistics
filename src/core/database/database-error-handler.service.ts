import { Injectable, Logger } from '@nestjs/common';
import { DatabaseException, BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class DatabaseErrorHandlerService {
  private readonly logger = new Logger(DatabaseErrorHandlerService.name);

  /**
   * Handle database errors with proper categorization
   */
  handleDatabaseError(error: any, operation: string, context?: any): never {
    this.logger.error(`Database error in ${operation}:`, error);

    // PostgreSQL specific error codes
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          throw new BusinessException(
            'A record with this information already exists',
            'DUPLICATE_ENTRY',
            409,
            { operation, constraint: error.constraint }
          );

        case '23503': // Foreign key violation
          throw new BusinessException(
            'Referenced record does not exist',
            'FOREIGN_KEY_VIOLATION',
            400,
            { operation, constraint: error.constraint }
          );

        case '23502': // Not null violation
          throw new BusinessException(
            'Required field is missing',
            'NOT_NULL_VIOLATION',
            400,
            { operation, column: error.column }
          );

        case '23514': // Check constraint violation
          throw new BusinessException(
            'Data does not meet validation requirements',
            'CHECK_CONSTRAINT_VIOLATION',
            400,
            { operation, constraint: error.constraint }
          );

        case '42P01': // Undefined table
          throw new DatabaseException(
            `Table does not exist: ${operation}`,
            { operation, table: error.table }
          );

        case '42703': // Undefined column
          throw new DatabaseException(
            `Column does not exist: ${operation}`,
            { operation, column: error.column }
          );

        case '40P01': // Deadlock detected
          throw new BusinessException(
            'Database deadlock detected, please retry',
            'DEADLOCK',
            409,
            { operation }
          );

        case '53300': // Too many connections
          throw new BusinessException(
            'Database connection limit exceeded',
            'CONNECTION_LIMIT',
            503,
            { operation }
          );

        case '54000': // Program limit exceeded
          throw new BusinessException(
            'Database operation limit exceeded',
            'PROGRAM_LIMIT_EXCEEDED',
            413,
            { operation }
          );

        default:
          throw new DatabaseException(operation, {
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            context
          });
      }
    }

    // Connection errors
    if (error.message?.includes('connection')) {
      throw new BusinessException(
        'Database connection failed',
        'CONNECTION_ERROR',
        503,
        { operation }
      );
    }

    // Timeout errors
    if (error.message?.includes('timeout')) {
      throw new BusinessException(
        'Database operation timed out',
        'TIMEOUT',
        408,
        { operation }
      );
    }

    // Generic database error
    throw new DatabaseException(operation, {
      message: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Handle transaction errors
   */
  handleTransactionError(error: any, transactionName: string): never {
    this.logger.error(`Transaction error in ${transactionName}:`, error);

    if (error.message?.includes('rollback')) {
      throw new BusinessException(
        'Transaction was rolled back',
        'TRANSACTION_ROLLBACK',
        409,
        { transaction: transactionName }
      );
    }

    if (error.message?.includes('commit')) {
      throw new BusinessException(
        'Transaction commit failed',
        'TRANSACTION_COMMIT_ERROR',
        500,
        { transaction: transactionName }
      );
    }

    this.handleDatabaseError(error, `transaction:${transactionName}`);
  }

  /**
   * Handle query errors
   */
  handleQueryError(error: any, query: string, params?: any[]): never {
    this.logger.error(`Query error:`, { query, params, error });

    if (error.message?.includes('syntax')) {
      throw new DatabaseException('Query syntax error', {
        query: query.substring(0, 100) + '...',
        error: error.message
      });
    }

    if (error.message?.includes('permission')) {
      throw new BusinessException(
        'Insufficient database permissions',
        'INSUFFICIENT_PERMISSIONS',
        403,
        { query: query.substring(0, 100) + '...' }
      );
    }

    this.handleDatabaseError(error, 'query_execution', { query: query.substring(0, 100) });
  }

  /**
   * Handle constraint violations with detailed messages
   */
  handleConstraintError(error: any, table: string, operation: string): never {
    const constraint = error.constraint || 'unknown';
    const column = error.column || 'unknown';

    let message = `Constraint violation in ${table}`;
    let errorCode = 'CONSTRAINT_VIOLATION';

    if (constraint.includes('unique') || constraint.includes('_key')) {
      message = `Duplicate value in ${table}.${column}`;
      errorCode = 'DUPLICATE_ENTRY';
    } else if (constraint.includes('foreign') || constraint.includes('_fkey')) {
      message = `Referenced record does not exist in ${table}`;
      errorCode = 'FOREIGN_KEY_VIOLATION';
    } else if (constraint.includes('check')) {
      message = `Data validation failed in ${table}.${column}`;
      errorCode = 'VALIDATION_ERROR';
    }

    throw new BusinessException(message, errorCode, 400, {
      table,
      operation,
      constraint,
      column
    });
  }

  /**
   * Handle tenant isolation errors
   */
  handleTenantError(error: any, tenantId: string, operation: string): never {
    this.logger.error(`Tenant isolation error for tenant ${tenantId}:`, error);

    if (error.message?.includes('tenant')) {
      throw new BusinessException(
        'Tenant access violation',
        'TENANT_ACCESS_VIOLATION',
        403,
        { tenantId, operation }
      );
    }

    this.handleDatabaseError(error, `tenant:${tenantId}:${operation}`);
  }

  /**
   * Handle migration errors
   */
  handleMigrationError(error: any, migration: string): never {
    this.logger.error(`Migration error in ${migration}:`, error);

    if (error.message?.includes('already exists')) {
      throw new BusinessException(
        'Migration already applied',
        'MIGRATION_ALREADY_APPLIED',
        409,
        { migration }
      );
    }

    if (error.message?.includes('not found')) {
      throw new BusinessException(
        'Migration file not found',
        'MIGRATION_NOT_FOUND',
        404,
        { migration }
      );
    }

    throw new DatabaseException(`migration:${migration}`, {
      migration,
      error: error.message
    });
  }
}
