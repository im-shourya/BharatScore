import { Controller, Get, Patch, Body, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../decorators/public.decorator';
import { Param } from '@nestjs/common';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.userService.getProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.sub, dto);
  }

  @Post('delete')
  @ApiOperation({ summary: 'Request account deletion' })
  async requestDeletion(@CurrentUser() user: JwtPayload) {
    return this.userService.requestDeletion(user.sub);
  }

  @Public()
  @Get('score/bank/:bankId')
  @ApiOperation({ summary: 'Get user score by Bank ID (Used by Banks)' })
  async getScoreByBankId(@Param('bankId') bankId: string) {
    return this.userService.getScoreByBankId(bankId);
  }
}
