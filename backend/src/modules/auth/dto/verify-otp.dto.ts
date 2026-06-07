import { IsPhoneNumber, IsString, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber('IN', { message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  mobile: string;

  @ApiProperty({ example: '482931' })
  @IsString()
  @Length(6, 6, { message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  @Matches(/^\d{6}$/, { message: i18nValidationMessage('errors.VALIDATION_ERROR') })
  otp: string;

  @ApiProperty({ required: false, description: 'Device fingerprint for session tracking' })
  @IsOptional()
  @IsString()
  device_fingerprint?: string;

  @ApiProperty({ required: false, description: 'FCM token for push notifications' })
  @IsOptional()
  @IsString()
  fcm_token?: string;
}
