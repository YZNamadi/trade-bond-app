import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddDisputeNoteDto {
  @IsString()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  evidenceId?: string;
}

