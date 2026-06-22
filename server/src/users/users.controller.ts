import { Controller, Get, Body, Param, Patch, Query, UseGuards, Request, Post, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminGuard } from '../auth/admin.guard';
import { ApplySellerDto } from './dto/apply-seller.dto';
import { SellerOnboardingStatus } from './seller-onboarding.entity';
import { RateLimit } from '../rate-limit/rate-limit.decorator';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

class UpdateBankAccountDto {
  @IsString()
  @Matches(/^[0-9]{10}$/)
  accountNumber: string;

  @IsString()
  @Length(1, 20)
  bankCode: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  accountName?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // This endpoint is internal/admin mostly, or for registration check
  @Get('email/:email')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getUserByEmail(@Param('email') email: string, @Request() req: any) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const { passwordHash, refreshTokenHash, ...result } = user as any;
    return result;
  }

  @Get('username/:username')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async getUserByUsername(@Param('username') username: string, @Request() req: any) {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;
    const { passwordHash, refreshTokenHash, ...result } = user as any;
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Request() req: any) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) return null;
    const {
      passwordHash,
      refreshTokenHash,
      bankName,
      accountNumber,
      accountName,
      bankCode,
      bankAccountLast4,
      bankVerifiedAt,
      paystackTransferRecipientCode,
      ...result
    } = user as any;
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/profile')
  async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('banks')
  async listBanks() {
    return this.usersService.listSupportedBanks();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/bank-account')
  async myBankAccount(@Request() req: any) {
    return this.usersService.getMyBankAccount(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/bank-account')
  @RateLimit('bank_account_link')
  async updateMyBankAccount(
    @Body() dto: UpdateBankAccountDto,
    @Request() req: any,
  ) {
    return this.usersService.updateMyBankAccount(
      req.user.userId,
      { bankCode: dto.bankCode, accountNumber: dto.accountNumber, accountName: dto.accountName },
      { ip: req.ip || null, userAgent: req.headers['user-agent'] || null },
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/seller/apply')
  async applySeller(@Body() dto: ApplySellerDto, @Request() req: any) {
    return this.usersService.applyForSeller(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin/seller-onboarding')
  async listSellerOnboarding(@Query('status') status?: SellerOnboardingStatus) {
    return this.usersService.listSellerOnboardingRequests(status);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/seller-onboarding/:id/approve')
  async approveSellerOnboarding(@Param('id', new ParseUUIDPipe()) id: string, @Body('note') note: string | undefined, @Request() req: any) {
    return this.usersService.reviewSellerOnboardingRequest({ requestId: id, adminUserId: req.user.userId, approve: true, note: note || null });
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('admin/seller-onboarding/:id/reject')
  async rejectSellerOnboarding(@Param('id', new ParseUUIDPipe()) id: string, @Body('note') note: string | undefined, @Request() req: any) {
    return this.usersService.reviewSellerOnboardingRequest({ requestId: id, adminUserId: req.user.userId, approve: false, note: note || null });
  }

  @Get('sellers')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async searchSellers(@Query('q') query: string, @Request() req: any) {
    return this.usersService.findAllSellers(query || '');
  }

  @Get('trustytag/:tag')
  async getSellerByTrustyTag(@Param('tag') tag: string) {
    return this.usersService.findVerifiedSellerByTrustyTag(tag);
  }
}
