import { IsEmail, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 200)
  password: string;

  @ValidateIf((o) => !o.name)
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @ValidateIf((o) => !o.fullName)
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username?: string;
}
