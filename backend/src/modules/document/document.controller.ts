import { Controller, Post, Get, Param, UseGuards, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { DocType } from '../../common/enums/doc-type.enum';

@ApiTags('documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document (Bank Statement, ITR, etc)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: JwtPayload,
    @Body('type') type: DocType,
    @UploadedFile() file: any,
  ) {
    return this.documentService.uploadDocument(user.sub, type, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents for current user' })
  async getDocuments(@CurrentUser() user: JwtPayload) {
    return this.documentService.getDocumentsForUser(user.sub);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed URL to view document' })
  async getDocumentUrl(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.documentService.getDocumentUrl(user.sub, id);
  }
}
