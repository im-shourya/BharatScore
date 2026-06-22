import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DocumentRepository } from './document.repository';
import { StorageService } from '../../shared/storage/storage.service';
import { DocType } from '../../common/enums/doc-type.enum';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  async uploadDocument(userId: string, type: DocType, file: any) {
    const bucket = this.config.get<string>('STORAGE_CONTAINER_STATEMENTS') || 'credsaathi-documents';
    const key = `${userId}/${type}/${Date.now()}-${file.originalname}`;

    // Compute file hash for dedup/integrity
    const fileHash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Upload to Azure Blob Storage (falls back to mock if not configured)
    const uploadResult = await this.storageService.upload({
      bucket,
      key,
      body: file.buffer,
      contentType: file.mimetype ?? 'application/pdf',
      metadata: { userId, docType: type, fileHash },
    });

    this.logger.log(`Document uploaded: ${key} (hash: ${fileHash.substring(0, 12)}...)`);

    // Create DB Record
    const doc = await this.documentRepository.create({
      user_id: userId,
      doc_type: type,
      s3_key_encrypted: key,
      s3_bucket: bucket,
      file_hash: fileHash,
      size_bytes: file.size ?? file.buffer.length,
      mime_type: file.mimetype ?? 'application/pdf',
      is_verified: false,
    });

    return doc;
  }

  async getDocumentsForUser(userId: string) {
    return this.documentRepository.findByUserId(userId);
  }

  async getDocumentUrl(userId: string, documentId: string) {
    const doc = await this.documentRepository.findByIdAndUserId(documentId, userId);
    if (!doc) throw new NotFoundException('Document not found');

    const url = await this.storageService.getPresignedUrl({
      bucket: doc.s3_bucket,
      key: doc.s3_key_encrypted,
      expiresIn: 900,
    });

    return { url };
  }
}

