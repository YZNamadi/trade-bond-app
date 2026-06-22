import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SellerOnboardingRequest } from './seller-onboarding.entity';
import { CommonModule } from '../common/common.module';
import { PaystackModule } from '../paystack/paystack.module';
import { AnchorModule } from '../anchor/anchor.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, SellerOnboardingRequest]), CommonModule, PaystackModule, AnchorModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
