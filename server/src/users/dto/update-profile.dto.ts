import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(7, 30)
  @Matches(/^\+?[0-9][0-9\s-]{6,29}$/)
  phone?: string;
}

