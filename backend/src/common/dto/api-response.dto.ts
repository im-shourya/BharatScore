import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiProperty({ nullable: true })
  error: any;

  @ApiProperty()
  request_id: string;

  @ApiProperty()
  timestamp: string;
}
