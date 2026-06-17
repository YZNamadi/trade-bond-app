import { IsString, Length, Matches } from 'class-validator';

export class UpdateShippingDto {
  @IsString()
  @Length(3, 80)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/)
  trackingId: string;
}

