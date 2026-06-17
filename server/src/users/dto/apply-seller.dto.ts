import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class ApplySellerDto {
  @IsOptional()
  @IsString()
  @Length(3, 40)
  @Matches(/^@?[a-zA-Z0-9._-]{3,40}$/)
  desiredTrustyTag?: string;

  @IsString()
  @Length(2, 80)
  bankName: string;

  @IsString()
  @Length(6, 20)
  @Matches(/^[0-9]{6,20}$/)
  accountNumber: string;

  @IsString()
  @Length(2, 80)
  accountName: string;
}

