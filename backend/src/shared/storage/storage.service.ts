import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface UploadParams {
  bucket: string; // Used as container name in Azure
  key: string;    // Used as blob name in Azure
  body: Buffer | string;
  contentType: string;
  metadata?: Record<string, string>;
  withObjectLock?: boolean; // Note: For real Azure immutability, this requires container-level immutability policies
}

interface PresignParams {
  bucket: string;
  key: string;
  expiresIn?: number;
}

/**
 * Azure Blob Storage Service implementation.
 *
 * Replaces the AWS S3 implementation to work with Azure Blob Storage.
 *
 * Features:
 *   - Uploads to Blob Storage
 *   - SAS (Shared Access Signature) generation for Presigned URLs
 *   - Soft delete (marker) + hard delete
 *
 * NOTE: Requires @azure/storage-blob.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private blobServiceClient: any = null;
  private initialized = false;

  constructor(private config: ConfigService) {
    this.initAzureClient();
  }

  private async initAzureClient(): Promise<void> {
    try {
      const { BlobServiceClient } = await import('@azure/storage-blob');
      const connectionString = this.config.get<string>('storage.azure.connectionString');
      
      if (connectionString) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        this.initialized = true;
        this.logger.log('Azure Blob Storage client initialized');
      } else {
        this.logger.warn('Azure Blob Storage connection string missing.');
      }
    } catch (err) {
      this.logger.warn(`Azure Blob Storage client not available: ${(err as Error).message}`);
    }
  }

  async upload(params: UploadParams): Promise<{ key: string; etag: string }> {
    if (!this.initialized) {
      this.logger.warn(`[AZURE-MOCK] Upload to ${params.bucket}/${params.key}`);
      return { key: params.key, etag: 'mock-etag' };
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(params.bucket);
      const blockBlobClient = containerClient.getBlockBlobClient(params.key);

      const data = Buffer.isBuffer(params.body) ? params.body : Buffer.from(params.body);

      const result = await blockBlobClient.uploadData(data, {
        blobHTTPHeaders: { blobContentType: params.contentType },
        metadata: params.metadata,
      });

      return { key: params.key, etag: result.etag || '' };
    } catch (err) {
      this.logger.error(`Azure Upload Error for ${params.key}: ${(err as Error).message}`);
      throw err;
    }
  }

  async getPresignedUrl(params: PresignParams): Promise<string> {
    if (!this.initialized) {
      return `https://mock-azure.example.com/${params.bucket}/${params.key}`;
    }

    try {
      const { generateBlobSASQueryParameters, StorageSharedKeyCredential, BlobSASPermissions } = await import('@azure/storage-blob');
      
      const accountName = this.config.get<string>('storage.azure.accountName');
      const accountKey = this.config.get<string>('storage.azure.accountKey');
      
      if (!accountName || !accountKey) {
        throw new Error('Azure account name or key missing for SAS generation.');
      }

      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      const containerClient = this.blobServiceClient.getContainerClient(params.bucket);
      const blockBlobClient = containerClient.getBlockBlobClient(params.key);

      const expiresInSeconds = params.expiresIn ?? this.config.get<number>('storage.presignedUrlExpiry', 900);
      const expiresOn = new Date(new Date().valueOf() + expiresInSeconds * 1000);

      const sasOptions = {
        containerName: params.bucket,
        blobName: params.key,
        permissions: BlobSASPermissions.parse('r'), // Read permission
        startsOn: new Date(),
        expiresOn,
      };

      const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
      return `${blockBlobClient.url}?${sasToken}`;
    } catch (err) {
      this.logger.error(`Azure SAS Error for ${params.key}: ${(err as Error).message}`);
      throw err;
    }
  }

  async softDelete(bucket: string, key: string): Promise<void> {
    if (!this.initialized) {
      this.logger.warn(`[AZURE-MOCK] Soft delete ${bucket}/${key}`);
      return;
    }

    // A soft delete implementation could be setting a metadata flag or moving to a different path
    try {
      const containerClient = this.blobServiceClient.getContainerClient(bucket);
      const blockBlobClient = containerClient.getBlockBlobClient(key);
      
      // We simulate soft delete by renaming/copying it with a .deleted suffix
      const deletedBlobClient = containerClient.getBlockBlobClient(key + '.deleted');
      await deletedBlobClient.uploadData(Buffer.from(JSON.stringify({ deleted_at: new Date().toISOString() })));
      // Note: We don't actually delete the original here to simulate S3 marker behavior, 
      // or we could delete the original blob depending on exact requirements.
    } catch (err) {
      this.logger.error(`Azure Soft Delete Error for ${key}: ${(err as Error).message}`);
    }
  }

  async hardDelete(bucket: string, key: string): Promise<void> {
    if (!this.initialized) {
      this.logger.warn(`[AZURE-MOCK] Hard delete ${bucket}/${key}`);
      return;
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(bucket);
      const blockBlobClient = containerClient.getBlockBlobClient(key);
      await blockBlobClient.delete();
    } catch (err) {
      this.logger.error(`Azure Hard Delete Error for ${key}: ${(err as Error).message}`);
    }
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      const containerClient = this.blobServiceClient.getContainerClient(bucket);
      const blockBlobClient = containerClient.getBlockBlobClient(key);
      return await blockBlobClient.exists();
    } catch {
      return false;
    }
  }
}
