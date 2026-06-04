import { ApiProperty } from '@nestjs/swagger';

export class InitiateKycResponseDto {
  @ApiProperty({ example: 'uuid-session-id' })
  kyc_session_id: string;

  @ApiProperty({ example: 'https://digilocker.meripehchaan.gov.in/public/oauth2/...' })
  auth_url: string;

  @ApiProperty({ example: '2024-01-15T10:45:00+05:30' })
  valid_upto: string;

  @ApiProperty({ example: 'Redirect user to auth_url to complete DigiLocker KYC' })
  message: string;
}

export class KycStatusResponseDto {
  @ApiProperty({ enum: ['pending', 'aadhaar_verified', 'pan_verified', 'fully_verified', 'failed'] })
  status: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', nullable: true })
  verified_at: Date | null;

  @ApiProperty({ example: ['aadhaar', 'name', 'dob', 'gender', 'address'] })
  fields_verified: string[];
}
