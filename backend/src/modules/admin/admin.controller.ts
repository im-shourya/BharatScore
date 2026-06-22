import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Roles } from '../../decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard & Reports ────────────────────────────────────

  @Get('model/metrics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get ML model performance and fairness metrics' })
  async getModelMetrics() {
    return this.adminService.getModelMetrics();
  }

  @Post('model/retrain')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Trigger ML model retrain pipeline (Airflow)' })
  @ApiQuery({ name: 'force', type: Boolean, required: false })
  async triggerRetrain(@Query('force') force?: string) {
    const isForce = force === 'true';
    return this.adminService.triggerRetrain(isForce);
  }

  @Get('reports/compliance')
  @Roles(Role.ADMIN, Role.COMPLIANCE)
  @ApiOperation({ summary: 'Generate overall compliance and stats report' })
  @ApiQuery({ name: 'from', required: true, example: '2026-05-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-06-30' })
  async getComplianceReport(@Query('from') from: string, @Query('to') to: string) {
    return this.adminService.generateComplianceReport(from, to);
  }

  // ── User Management ────────────────────────────────────────

  @Get('users')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiOperation({ summary: 'List users with pagination and filters' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'status', required: false, enum: UserStatus })
  async getUsers(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('role') role?: Role,
    @Query('status') status?: UserStatus,
  ) {
    const filters = { role, status };
    return this.adminService.getUsers(
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 20,
      filters
    );
  }

  @Get('users/:id')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiOperation({ summary: 'Get specific user details by ID' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user status (e.g. freeze, activate)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }
}
