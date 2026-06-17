import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, ForbiddenException, UseInterceptors, UploadedFile, Res, Headers, ParseUUIDPipe, MethodNotAllowedException, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { AdminGuard } from '../auth/admin.guard';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin')
  adminList(@Query('q') q?: string, @Query('status') status?: 'ALL' | 'SETTLEMENT_PENDING') {
    return this.transactionsService.findAllForAdmin({ q: q || null, status: status || 'ALL' });
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/:id')
  adminGet(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.transactionsService.findOneForAdmin(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/:id/ledger')
  adminLedger(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.transactionsService.getLedgerForAdmin(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/:id/messages')
  adminMessages(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.transactionsService.adminListMessages(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/:id/retry-payout')
  @RateLimit('admin_action')
  adminRetryPayout(@Param('id', new ParseUUIDPipe()) id: string, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.transactionsService.adminRetrySettlement(id, 'payout', idempotencyKey);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/:id/retry-refund')
  @RateLimit('admin_action')
  adminRetryRefund(@Param('id', new ParseUUIDPipe()) id: string, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.transactionsService.adminRetrySettlement(id, 'refund', idempotencyKey);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/:id/reconcile')
  @RateLimit('admin_action')
  adminReconcile(@Param('id', new ParseUUIDPipe()) id: string, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.transactionsService.adminRetrySettlement(id, 'verify', idempotencyKey);
  }

  @Post()
  @RateLimit('tx_mutation')
  create(@Body() createTransactionDto: CreateTransactionDto, @Request() req: any, @Headers('idempotency-key') idempotencyKey?: string) {
    if (req.user?.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can create transactions');
    }
    return this.transactionsService.create(createTransactionDto, req.user.userId, idempotencyKey);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.transactionsService.findAllByUserId(req.user.userId, req.user.role);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any) {
    return this.transactionsService.findOne(id, req.user.userId, req.user.role);
  }

  @Get(':id/events')
  events(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any) {
    return this.transactionsService.getEvents(id, req.user.userId, req.user.role);
  }

  @Get(':id/messages')
  messages(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any) {
    return this.transactionsService.listMessages(id, req.user.userId, req.user.role);
  }

  @Post(':id/messages')
  @RateLimit('tx_mutation')
  sendMessage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SendMessageDto,
    @Request() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.transactionsService.sendMessage(id, req.user.userId, req.user.role, body.text, idempotencyKey);
  }

  @Get(':id/receipt')
  receipt(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any) {
    return this.transactionsService.getReceipt(id, req.user.userId, req.user.role);
  }

  @Post(':id/pay')
  @RateLimit('tx_mutation')
  async pay(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any, @Headers('idempotency-key') idempotencyKey?: string) {
    if (req.user?.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can fund escrow');
    }
    return this.transactionsService.initializePayment(id, req.user.email, req.user.userId, idempotencyKey);
  }

  @Get(':id/verify')
  @RateLimit('tx_mutation')
  async verifyGet() {
    throw new MethodNotAllowedException('Use POST /transactions/:id/verify');
  }

  @Post(':id/verify')
  @RateLimit('tx_mutation')
  async verify(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: VerifyPaymentDto,
    @Request() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (req.user?.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can verify payment');
    }
    return this.transactionsService.verifyPayment(id, body.reference, req.user.userId, idempotencyKey);
  }

  @Post(':id/confirm')
  @RateLimit('tx_mutation')
  async confirm(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any, @Headers('idempotency-key') idempotencyKey?: string) {
    if (req.user?.role !== 'buyer') {
      throw new ForbiddenException('Only buyers can confirm delivery');
    }
    return this.transactionsService.confirmDelivery(id, req.user.userId, idempotencyKey);
  }

  @Patch(':id/shipping')
  @RateLimit('tx_mutation')
  async updateShipping(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateShippingDto,
    @Request() req: any,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (req.user?.role !== 'seller') {
      throw new ForbiddenException('Only sellers can mark shipped');
    }
    return this.transactionsService.updateShipping(id, body.trackingId, req.user.userId, idempotencyKey);
  }

  @Post(':id/dispute')
  @RateLimit('tx_mutation')
  openDispute(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.transactionsService.openDispute(id, req.user.userId, idempotencyKey);
  }

  @Get(':id/proofs')
  proofs(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any) {
    return this.transactionsService.listDeliveryProofs(id, req.user.userId, req.user.role);
  }

  @Post(':id/proofs')
  @RateLimit('tx_mutation')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadProof(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: any,
    @Body('note') note: string,
    @Request() req: any,
  ) {
    return this.transactionsService.addDeliveryProof(id, req.user.userId, req.user.role, file, note);
  }

  @Get(':id/proofs/:proofId/file')
  async proofFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('proofId', new ParseUUIDPipe()) proofId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const file = await this.transactionsService.getProofFile(id, proofId, req.user.userId, req.user.role);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalFileName)}"`);
    res.sendFile(file.fullPath);
  }
}
