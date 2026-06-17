import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { Currency } from '../transaction.entity';

export class CreateTransactionDto {
  @IsUUID()
  sellerId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Max(100000000)
  amount: number;

  @IsString()
  @Length(1, 500)
  description: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
