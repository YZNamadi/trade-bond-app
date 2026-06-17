import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private dataSource: DataSource) {}

  @Get('healthz')
  healthz() {
    return { ok: true };
  }

  @Get('readyz')
  async readyz() {
    const ok = this.dataSource.isInitialized;
    if (!ok) return { ok: false };
    try {
      await this.dataSource.query('SELECT 1');
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}

