import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRepository } from './document.repository';
// import { AzureStorageService } from '../../shared/storage/azure-storage.service';
// import { KafkaProducerService } from '../../shared/kafka/kafka-producer.service';
import { DocType } from '../../common/enums/doc-type.enum';

@Injectable()
export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    // private readonly storageService: AzureStorageService,
    // private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async uploadDocument(userId: string, type: DocType, file: any) {
    // 1. Upload to Azure Blob Storage
    // const fileUrl = await this.storageService.upload(file.buffer, file.originalname, 'documents');
    const fileUrl = `https://mock-storage.com/${userId}/${file.originalname}`;

    // 2. Create DB Record
    const doc = await this.documentRepository.create({
      user_id: userId,
      doc_type: type,
      s3_key_encrypted: fileUrl,
      s3_bucket: 'mock-bucket',
      file_hash: 'mock-hash',
      size_bytes: file.size ?? 0,
      mime_type: file.mimetype ?? 'application/pdf',
      is_verified: false,
    });

    // 3. Emit event for OCR/Parsing
    // await this.kafkaProducer.emit('document-uploaded', { documentId: doc.id, type, fileUrl });

    return doc;
  }

  async getDocumentsForUser(userId: string) {
    return this.documentRepository.findByUserId(userId);
  }

  async getDocumentUrl(userId: string, documentId: string) {
    const doc = await this.documentRepository.findByIdAndUserId(documentId, userId);
    if (!doc) throw new NotFoundException('Document not found');
    
    // return this.storageService.getSignedUrl(doc.s3_key_encrypted);
    return { url: `${doc.s3_key_encrypted}?sas=mock_token` };
  }
}
