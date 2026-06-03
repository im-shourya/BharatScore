import { IsPhoneNumber, IsString, Length, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber('IN', { message: 'Must be a valid Indian mobile number' })
  mobile: string;

  @ApiProperty({ example: '482931' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
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
