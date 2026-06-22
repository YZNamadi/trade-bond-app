import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { MoneyService } from './money.service';

@Controller('money/admin/reconciliation')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class MoneyAdminController {
  constructor(private readonly moneyService: MoneyService) {}

  @Get('overview')
  overview(@Query('provider') provider?: string) {
    return this.moneyService.getReconciliationOverview(provider || null);
  }

  @Get('movements')
  movements(
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('transactionId') transactionId?: string,
    @Query('take') take?: string,
  ) {
    return this.moneyService.listMoneyMovements({
      provider: provider || null,
      status: status || null,
      transactionId: transactionId || null,
      take: take ? Number(take) : 100,
    });
  }

  @Get('events')
  events(
    @Query('provider') provider?: string,
    @Query('eventType') eventType?: string,
    @Query('take') take?: string,
  ) {
    return this.moneyService.listProviderEvents({
      provider: provider || null,
      eventType: eventType || null,
      take: take ? Number(take) : 100,
    });
  }

  @Get('runs')
  runs(
    @Query('provider') provider?: string,
    @Query('runType') runType?: string,
    @Query('take') take?: string,
  ) {
    return this.moneyService.listReconciliationRuns({
      provider: provider || null,
      runType: (runType as any) || null,
      take: take ? Number(take) : 50,
    });
  }

  @Post('runs')
  run(@Body('provider') provider?: string) {
    return this.moneyService.runOperationalReconciliation({ provider: provider || null });
  }
}
