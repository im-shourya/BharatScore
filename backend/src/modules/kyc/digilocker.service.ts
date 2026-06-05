import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// ── Types ─────────────────────────────────────────────────
export interface SetuSessionResponse {
  id: string;
  status: 'unauthenticated' | 'authenticated' | 'revoked';
  url: string;
  validUpto: string;
}

export interface SetuStatusResponse extends SetuSessionResponse {
  digilockerUserDetails?: {
    digilockerId: string;
    email: string;
    phoneNumber: string;
  };
  traceId: string;
}

export interface AadhaarKycData {
  maskedNumber: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  address: {
    careOf: string;
    country: string;
    district: string;
    house: string;
    landmark: string;
    locality: string;
    pin: string;
    postOffice: string;
    state: string;
    street: string;
    subDistrict: string;
    vtc: string;
  };
  photo: string; // base64 encoded
  verified: {
    email: boolean;
    phone: boolean;
    signature: boolean; // DigiLocker XML signature validity
  };
  xml: {
    fileUrl: string; // S3 URL to signed Aadhaar XML
    shareCode: string;
    validUntil: string;
  };
}

export interface SetuAadhaarResponse {
  aadhaar: AadhaarKycData;
  id: string;
  status: string;
}

export interface SetuDocumentResponse {
  fileUrl: string;
  validUpto: string;
}

// ── Service ───────────────────────────────────────────────
@Injectable()
export class DigiLockerService {
  private readonly logger = new Logger(DigiLockerService.name);
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('SETU_BASE_URL') || '';
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'BharatScore-Backend/1.0',
      'x-client-id': this.config.get<string>('SETU_CLIENT_ID') || '',
      'x-client-secret': this.config.get<string>('SETU_CLIENT_SECRET') || '',
      'x-product-instance-id': this.config.get<string>('SETU_PRODUCT_INSTANCE_ID') || '',
    };
  }

  private getRequestConfig(extraHeaders: Record<string, string> = {}) {
    return {
      headers: { ...this.headers, ...extraHeaders },
    };
  }

  // ── Step 1: Create DigiLocker Session ────────────────────
  async createSession(redirectUrl: string): Promise<SetuSessionResponse> {
    // Remove any trailing slashes from baseUrl just in case
    const normalizedBase = this.baseUrl.replace(/\/$/, '');
    const url = `${normalizedBase}/api/digilocker`; // No trailing slash!
    
    this.logger.log(`Creating DigiLocker session → ${url}`);
    this.logger.log(`Redirect URL: ${redirectUrl}`);
    this.logger.log(`Headers: x-client-id=${this.headers['x-client-id']?.substring(0, 8)}..., x-product-instance-id=${this.headers['x-product-instance-id']?.substring(0, 8)}...`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          { redirectUrl },
          this.getRequestConfig(),
        ),
      );
      this.logger.log(`DigiLocker session created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const headers = error?.response?.headers;
      this.logger.error(
        `Failed to create DigiLocker session | HTTP ${status} | Response: ${JSON.stringify(data)} | Trace: ${data?.traceId ?? 'none'}`,
      );
      throw new BadGatewayException({
        code: 'DIGILOCKER_SESSION_FAILED',
        message: `Could not initiate DigiLocker session. Setu responded: ${JSON.stringify(data)}`,
        setu_status: status,
        setu_trace: data?.traceId,
      });
    }
  }

  // ── Diagnostic: Test Setu connectivity ────────────────────
  async testConnection(): Promise<{
    status: string;
    base_url: string;
    client_id_prefix: string;
    product_instance_id: string;
    setu_response?: any;
    error?: string;
  }> {
    try {
      const normalizedBase = this.baseUrl.replace(/\/$/, '');
      const response = await firstValueFrom(
        this.httpService.post(
          `${normalizedBase}/api/digilocker`,
          { redirectUrl: 'https://example.com/test' },
          this.getRequestConfig({
            'User-Agent': 'Mozilla/5.0 (Node.js) API-Client/1.0',
          }),
        ),
      );
      return {
        status: 'success',
        base_url: this.baseUrl,
        client_id_prefix: this.headers['x-client-id']?.substring(0, 8) + '...',
        product_instance_id: this.headers['x-product-instance-id'],
        setu_response: response.data,
      };
    } catch (error) {
      return {
        status: 'failed',
        base_url: this.baseUrl,
        client_id_prefix: this.headers['x-client-id']?.substring(0, 8) + '...',
        product_instance_id: this.headers['x-product-instance-id'],
        error: JSON.stringify(error?.response?.data ?? error.message),
      };
    }
  }

  // ── Step 2: Check Session Status ─────────────────────────
  async getStatus(sessionId: string): Promise<SetuStatusResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/digilocker/${sessionId}/status`,
          this.getRequestConfig()
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get DigiLocker status for: ${sessionId}`);
      throw new BadGatewayException({ code: 'DIGILOCKER_STATUS_FAILED' });
    }
  }

  // ── Step 3: Fetch Aadhaar XML (KYC Core) ─────────────────
  // API: GET /api/digilocker/:id/aadhaar
  async fetchAadhaarXml(sessionId: string): Promise<SetuAadhaarResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/digilocker/${sessionId}/aadhaar`,
          this.getRequestConfig()
        ),
      );

      const data: SetuAadhaarResponse = response.data;

      // Validate XML signature is verified by DigiLocker
      if (!data.aadhaar.verified?.signature) {
        this.logger.warn(`Aadhaar XML signature not verified for session: ${sessionId}`);
      }

      this.logger.log(`Aadhaar KYC fetched successfully for session: ${sessionId}`);
      return data;
    } catch (error) {
      this.logger.error(`Aadhaar fetch failed for session: ${sessionId}`, error?.response?.data);
      throw new BadGatewayException({
        code: 'AADHAAR_FETCH_FAILED',
        message: 'Could not fetch Aadhaar data from DigiLocker.',
      });
    }
  }

  // ── Step 4: Fetch Other Documents (PAN, DL, etc.) ────────
  async fetchDocument(
    sessionId: string,
    docType: string,
    orgId: string,
    format: 'pdf' | 'xml' | 'jpeg',
    parameters: Array<{ name: string; value: string }>,
  ): Promise<SetuDocumentResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/digilocker/${sessionId}/document`,
          {
            docType,
            orgId,
            format,
            consent: 'Y',
            parameters,
          },
          this.getRequestConfig()
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Document fetch failed for session: ${sessionId}, docType: ${docType}`);
      throw new BadGatewayException({ code: 'DOCUMENT_FETCH_FAILED' });
    }
  }

  // ── Step 5: Revoke Token ──────────────────────────────────
  async revokeSession(sessionId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/digilocker/${sessionId}/revoke`,
          this.getRequestConfig()
        ),
      );
      this.logger.log(`DigiLocker session revoked: ${sessionId}`);
    } catch (error) {
      // Non-critical — log but don't throw
      this.logger.warn(`Failed to revoke session: ${sessionId}`);
    }
  }

  // ── Utility: Get List of Available Documents ──────────────
  async listAvailableDocuments() {
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/api/digilocker/documents`,
        this.getRequestConfig()
      ),
    );
    return response.data;
  }
}
