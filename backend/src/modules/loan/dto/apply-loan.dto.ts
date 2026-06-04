import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ApplyLoanDto {
  @ApiProperty({ example: 'product_123' })
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @ApiProperty({ example: 50000 })
  @IsNotEmpty()
  @IsNumber()
  amount_requested: number;

  @ApiProperty({ example: 12, description: 'Duration in months' })
  @IsNotEmpty()
  @IsNumber()
  tenure_months: number;
}
