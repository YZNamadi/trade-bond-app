import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ResolveDisputeDto {
  @IsIn(['refund', 'partial_refund', 'release', 'reject'])
  outcome: 'refund' | 'partial_refund' | 'release' | 'reject';

  @IsString()
  @MaxLength(4000)
  justification: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  refundAmountMinor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}

