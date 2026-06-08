import { Controller, Get, Param, Query, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { UpsertContentDto } from './dto/upsert-content.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Public } from '../../decorators/public.decorator';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('content/:key')
  @Public()
  @ApiOperation({ summary: 'Get CMS content by key and locale' })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  async getContent(@Param('key') key: string, @Query('locale') locale: string = 'en') {
    return this.cmsService.getContent(key, locale);
  }

  @Get('faqs')
  @Public()
  @ApiOperation({ summary: 'Get FAQs by locale and optional category' })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  @ApiQuery({ name: 'category', required: false })
  async getFaqs(@Query('locale') locale: string = 'en', @Query('category') category?: string) {
    return this.cmsService.getFaqs(locale, category);
  }

  @Get('products')
  @Public()
  @ApiOperation({ summary: 'Get active loan products' })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  async getLoanProducts(@Query('locale') locale: string = 'en') {
    return this.cmsService.getLoanProducts(locale);
  }

  @Get('questionnaire')
  @Public()
  @ApiOperation({ summary: 'Get psychometric questionnaire' })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  async getQuestionnaire(@Query('locale') locale: string = 'en') {
    return this.cmsService.getQuestionnaire(locale);
  }

  @Post('content/:key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upsert CMS content (Admin only, auth required)' })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  async upsertContent(
    @Param('key') key: string,
    @Query('locale') locale: string = 'en',
    @Body() dto: UpsertContentDto,
  ) {
    return this.cmsService.upsertContent(key, locale, dto);
  }
}
