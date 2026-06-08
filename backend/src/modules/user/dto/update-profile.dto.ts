import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, Length } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  name?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  email?: string;

  @ApiPropertyOptional({ example: 'hi' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  @Length(2, 5)
  locale?: string;
}
