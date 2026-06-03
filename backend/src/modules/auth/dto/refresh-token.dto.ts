import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token received during login' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString()
  refresh_token: string;
}
