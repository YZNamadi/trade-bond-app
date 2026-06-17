import { logInfo } from './logger';
import type { Logger as TypeOrmLoggerInterface, QueryRunner } from 'typeorm';

export class TypeOrmLogger implements TypeOrmLoggerInterface {
  logQuery(query: string, parameters?: any[], _queryRunner?: QueryRunner) {
    if (process.env.TYPEORM_LOG_QUERIES !== 'true') return;
    logInfo('db.query', { query, parameters: undefined });
  }

  logQueryError(error: string | Error, query: string, _parameters?: any[], _queryRunner?: QueryRunner) {
    logInfo('db.query_error', { query, error: error instanceof Error ? error.message : error });
  }

  logQuerySlow(time: number, query: string, _parameters?: any[], _queryRunner?: QueryRunner) {
    logInfo('db.query_slow', { query, time });
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    logInfo('db.schema', { message });
  }

  logMigration(message: string, _queryRunner?: QueryRunner) {
    logInfo('db.migration', { message });
  }

  log(level: 'log' | 'info' | 'warn', message: any, _queryRunner?: QueryRunner) {
    logInfo('db.log', { level, message });
  }
}

