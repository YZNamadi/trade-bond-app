import { Body, Controller, Get, Headers, NotFoundException, Param, ParseUUIDPipe, Post, Query, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DisputesService } from './disputes.service';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { AdminGuard } from '../auth/admin.guard';
import { AddDisputeNoteDto } from './dto/add-dispute-note.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('disputes')
export class DisputesController {
  constructor(private disputesService: DisputesService) {}

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin')
  async adminList(@Query('status') status?: 'OPEN' | 'CLOSED') {
    return this.disputesService.listForAdmin(status);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/:id')
  async adminGet(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.disputesService.hydrateForAdmin(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/:id/evidence/:evidenceId/file')
  async adminEvidenceFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('evidenceId', new ParseUUIDPipe()) evidenceId: string,
    @Res() res: Response,
  ) {
    const file = await this.disputesService.getEvidenceFileForAdmin(id, evidenceId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalFileName)}"`);
    res.send(file.buffer);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async list(@Request() req: any) {
    return this.disputesService.listForUser(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('transaction/:transactionId')
  async byTransaction(@Param('transactionId', new ParseUUIDPipe()) transactionId: string, @Request() req: any) {
    return this.disputesService.getByTransactionForUser(transactionId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe()) id: string, @Request() req: any) {
    return this.disputesService.hydrate(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/notes')
  @RateLimit('dispute_action')
  async addNote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AddDisputeNoteDto,
    @Request() req: any,
  ) {
    const deviceId = (req.cookies?.device_id as string | undefined) || null;
    return this.disputesService.addNote(id, { userId: req.user.userId, role: req.user.role, deviceId }, body.text, body.evidenceId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/evidence')
  @RateLimit('dispute_evidence')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadEvidence(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: any,
    @Body('note') note: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Request() req: any,
  ) {
    const deviceId = (req.cookies?.device_id as string | undefined) || null;
    return this.disputesService.submitEvidence(id, { userId: req.user.userId, role: req.user.role, deviceId }, file ?? null, note, idempotencyKey);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/evidence/:evidenceId/file')
  async evidenceFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('evidenceId', new ParseUUIDPipe()) evidenceId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const file = await this.disputesService.getEvidenceFile(id, evidenceId, req.user.userId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalFileName)}"`);
    res.send(file.buffer);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post(':id/admin/resolve')
  @RateLimit('admin_action')
  async adminResolve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ResolveDisputeDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Request() req: any,
  ) {
    const deviceId = (req.cookies?.device_id as string | undefined) || null;
    const updated = await this.disputesService.adminResolve(id, { userId: req.user.userId, role: req.user.role, deviceId }, body, idempotencyKey);
    if (!updated) throw new NotFoundException('Dispute not found');
    return updated;
  }
}
