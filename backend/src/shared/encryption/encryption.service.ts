import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM encryption service for PII fields.
 * Encrypts data at the application layer before writing to the database.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const hexKey = this.config.get<string>('ENCRYPTION_KEY');
    if (!hexKey || hexKey.length !== 64) {
      this.logger.warn(
        'ENCRYPTION_KEY not set or invalid. Using a deterministic dev key. DO NOT use in production.',
      );
      this.key = crypto.scryptSync('dev-key-insecure', 'salt', 32);
    } else {
      this.key = Buffer.from(hexKey, 'hex');
    }
  }

  /**
   * Encrypt a plaintext string.
   * Returns base64-encoded string: iv:authTag:ciphertext
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt a previously encrypted string.
   */
  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, ciphertext] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt a buffer (for file encryption).
   */
  encryptBuffer(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: [16-byte IV][16-byte authTag][ciphertext]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt a buffer.
   */
  decryptBuffer(encryptedBuffer: Buffer): Buffer {
    const iv = encryptedBuffer.subarray(0, this.ivLength);
    const authTag = encryptedBuffer.subarray(this.ivLength, this.ivLength + 16);
    const ciphertext = encryptedBuffer.subarray(this.ivLength + 16);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}
