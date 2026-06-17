import { IsString, Length, Matches } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  @Length(10, 200)
  @Matches(/^[A-Za-z0-9_.:-]+$/)
  reference: string;
}

