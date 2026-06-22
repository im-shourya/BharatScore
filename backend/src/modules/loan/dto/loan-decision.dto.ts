import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsDecimal, Min, Max } from 'class-validator';

export class LoanDecisionDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'] })
  @IsNotEmpty()
  @IsString()
  decision: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 12.5, description: 'Annual interest rate (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(36)
  interest_rate?: number;

  @ApiPropertyOptional({ example: 'Low credit score', description: 'Reason for rejection or approval notes' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Approved amount (may differ from requested)' })
  @IsOptional()
  @IsNumber()
  amount_approved?: number;
}
