import { IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Indian mobile number with country code',
  })
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsPhoneNumber('IN', { message: 'Must be a valid Indian mobile number' })
  mobile: string;
}
