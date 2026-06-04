import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class UpsertContentDto {
  @ApiProperty()
  @IsNotEmpty()
  value: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
