import { IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SendOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Indian mobile number with country code',
  })
  @IsNotEmpty({ message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  @IsPhoneNumber('IN', { message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  mobile: string;
}
