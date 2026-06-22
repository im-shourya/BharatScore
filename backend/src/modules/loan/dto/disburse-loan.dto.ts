import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class DisburseLoanDto {
  @ApiProperty({ example: '1234567890@upi', description: 'Borrower disbursement account (UPI/bank)' })
  @IsNotEmpty()
  @IsString()
  disbursement_account: string;

  @ApiPropertyOptional({ example: 'UTR20260622001', description: 'Payment UTR reference' })
  @IsOptional()
  @IsString()
  utr_number?: string;
}
