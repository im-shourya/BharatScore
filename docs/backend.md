# Bharatscore — Complete Backend Technical Documentation

> AI-Powered Alternate Credit Scoring Platform
> NestJS · PostgreSQL · MongoDB · Redis · Kafka · BentoML
> Version 1.0 · Production Grade

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Full Tech Stack](#2-full-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Complete File Structure](#4-complete-file-structure)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Setup & Configuration](#6-database-setup--configuration)
7. [Main Bootstrap & App Module](#7-main-bootstrap--app-module)
8. [Global Infrastructure](#8-global-infrastructure)
9. [Auth Module](#9-auth-module)
10. [User Module](#10-user-module)
11. [KYC Module](#11-kyc-module)
12. [Consent Module](#12-consent-module)
13. [Document Module](#13-document-module)
14. [Scoring Module](#14-scoring-module)
15. [Loan Module](#15-loan-module)
16. [EMI Module](#16-emi-module)
17. [Notification Module](#17-notification-module)
18. [CMS Module](#18-cms-module)
19. [Audit Module](#19-audit-module)
20. [Admin Module](#20-admin-module)
21. [Shared Infrastructure Modules](#21-shared-infrastructure-modules)
22. [i18n — Internationalisation](#22-i18n--internationalisation)
23. [Complete REST API Reference](#23-complete-rest-api-reference)
24. [Error Codes & Handling](#24-error-codes--handling)
25. [Security Implementation](#25-security-implementation)
26. [Logging & Monitoring](#26-logging--monitoring)
27. [Testing Strategy](#27-testing-strategy)
28. [CI/CD Pipeline](#28-cicd-pipeline)
29. [Docker & Kubernetes Deployment](#29-docker--kubernetes-deployment)
30. [Performance & Scalability](#30-performance--scalability)

---

## 1. Project Overview

CredSaathi is a full-stack AI-driven alternate credit scoring platform that enables underserved individuals and MSMEs in India to access loans without a traditional credit history. The backend is a NestJS monorepo of microservices communicating over REST (synchronous) and Kafka (asynchronous), backed by PostgreSQL, MongoDB, Redis, and ClickHouse.

### Core principles

- **Consent-first**: every data pull requires explicit AA-framework user consent
- **Explainable AI**: every credit score ships with a SHAP factor breakdown
- **Privacy by design**: PII encrypted at application layer before DB write
- **Regulatory compliance**: RBI AA Framework, DPDP Act 2023, RBI Fair Practice Code
- **i18n-native**: all user-facing strings served in 6 Indian languages
- **Horizontally scalable**: all services stateless, deployed on Kubernetes with HPA

---

## 2. Full Tech Stack

### Runtime & Framework

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 10.x |
| Language | TypeScript | 5.x |
| Package manager | pnpm | 8.x |
| API Gateway | Kong | 3.x |

### Databases

| Store | Technology | Purpose |
|---|---|---|
| Primary relational | PostgreSQL | 16 | Users, loans, KYC, consent, EMI |
| ORM | TypeORM | 0.3.x | Schema management, queries |
| Document store | MongoDB | 7.x | Raw behavioral data |
| Document ODM | Mongoose | 8.x | Schema validation |
| Cache | Redis | 7.x | Sessions, features, OTP, rate-limit |
| Analytics | ClickHouse | 24.x | Model metrics, NPA reports |

### Messaging & Storage

| Component | Technology |
|---|---|
| Event streaming | Apache Kafka 3.x |
| Job queues | Bull (Redis-backed) |
| Object storage | AWS S3 / MinIO |
| File encryption | AES-256-GCM (Node.js crypto) |

### ML & AI Integration

| Component | Technology |
|---|---|
| Model serving | BentoML / Triton Inference Server |
| Model registry | MLflow |
| Explainability | SHAP (Python microservice) |
| Feature cache | Redis |

### Auth & Identity

| Component | Technology |
|---|---|
| Identity provider | Keycloak 23.x |
| JWT algorithm | RS256 (asymmetric) |
| OTP gateway | UIDAI (Aadhaar) |
| KYC | DigiLocker OAuth |
| AA framework | Setu / Finvu AA |

### DevOps & Infrastructure

| Component | Technology |
|---|---|
| Containerisation | Docker + Docker Compose |
| Orchestration | Kubernetes (EKS/GKE) |
| IaC | Terraform |
| CI/CD | GitHub Actions + ArgoCD |
| Monitoring | Prometheus + Grafana |
| Logging | ELK Stack (Elasticsearch, Logstash, Kibana) |
| APM | OpenTelemetry |

---

## 3. System Architecture

```
Internet
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│  Kong API Gateway                                         │
│  TLS termination · JWT validation · rate limiting        │
│  routing · CORS · request logging                        │
└───────────────────────────┬──────────────────────────────┘
                            │ mTLS
        ┌───────────────────┼────────────────────┐
        │                   │                    │
        ▼                   ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Auth        │  │  Core API        │  │  CMS / Admin     │
│  Service     │  │  NestJS          │  │  NestJS          │
│  (port 3001) │  │  (port 3000)     │  │  (port 3002)     │
└──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘
       │                   │                     │
       └───────────────────┼─────────────────────┘
                           │
        ┌──────────────────┼─────────────────────────────┐
        │                  │                              │
        ▼                  ▼                              ▼
┌─────────────┐  ┌──────────────────┐  ┌────────────────────────┐
│ PostgreSQL  │  │ MongoDB          │  │ Redis                  │
│ (TypeORM)   │  │ (Mongoose)       │  │ (ioredis)              │
│ users,loans │  │ behavioral data  │  │ sessions, cache, queues│
└─────────────┘  └──────────────────┘  └────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  Apache Kafka                                                │
│  raw-data · audit-events · score-requests · notifications   │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼─────────────────────┐
        │                  │                     │
        ▼                  ▼                     ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Feature     │  │  Scoring         │  │  Notification    │
│  Service     │  │  Service         │  │  Worker          │
│  (Python)    │  │  (BentoML)       │  │  (Bull)          │
└──────────────┘  └──────────────────┘  └──────────────────┘
```

### Request lifecycle

```
Client Request
  → Kong (TLS, rate-limit, JWT sig verify)
  → NestJS Global Guards (JwtAuthGuard, RolesGuard, ThrottlerGuard)
  → NestJS Global Interceptors (I18n, Logging, Audit)
  → NestJS Global Pipes (ValidationPipe, I18nValidationPipe)
  → Controller (@Get, @Post…)
  → Service (business logic)
  → Repository (TypeORM / Mongoose)
  → Database
  ← Response wrapped in standard envelope
  ← I18nInterceptor translates messages
  ← LoggingInterceptor records duration
  ← Client
```

---

## 4. Complete File Structure

```
credsaathi-backend/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.build.json
├── .env
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── jest.config.ts
├── Dockerfile
├── docker-compose.yml
├── kubernetes/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── configmap.yaml
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── mongodb.config.ts
│   │   ├── redis.config.ts
│   │   ├── kafka.config.ts
│   │   ├── jwt.config.ts
│   │   ├── s3.config.ts
│   │   ├── keycloak.config.ts
│   │   └── throttler.config.ts
│   │
│   ├── common/
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── api-response.dto.ts
│   │   ├── enums/
│   │   │   ├── role.enum.ts
│   │   │   ├── loan-state.enum.ts
│   │   │   ├── data-source.enum.ts
│   │   │   ├── doc-type.enum.ts
│   │   │   ├── language.enum.ts
│   │   │   └── notification-channel.enum.ts
│   │   ├── types/
│   │   │   ├── jwt-payload.type.ts
│   │   │   └── request-with-user.type.ts
│   │   └── constants/
│   │       ├── error-codes.ts
│   │       └── cache-keys.ts
│   │
│   ├── shared/
│   │   ├── database/
│   │   │   ├── database.module.ts
│   │   │   └── database.providers.ts
│   │   ├── mongodb/
│   │   │   ├── mongodb.module.ts
│   │   │   └── mongodb.providers.ts
│   │   ├── cache/
│   │   │   ├── cache.module.ts
│   │   │   └── cache.service.ts
│   │   ├── kafka/
│   │   │   ├── kafka.module.ts
│   │   │   ├── kafka.producer.service.ts
│   │   │   └── kafka.consumer.service.ts
│   │   ├── storage/
│   │   │   ├── storage.module.ts
│   │   │   └── storage.service.ts
│   │   ├── encryption/
│   │   │   ├── encryption.module.ts
│   │   │   └── encryption.service.ts
│   │   └── i18n/
│   │       ├── i18n.module.ts
│   │       └── translations/
│   │           ├── en/
│   │           │   ├── auth.json
│   │           │   ├── user.json
│   │           │   ├── kyc.json
│   │           │   ├── consent.json
│   │           │   ├── score.json
│   │           │   ├── loan.json
│   │           │   ├── emi.json
│   │           │   ├── errors.json
│   │           │   ├── notifications.json
│   │           │   └── validation.json
│   │           ├── hi/  (same files)
│   │           ├── ta/  (same files)
│   │           ├── te/  (same files)
│   │           ├── mr/  (same files)
│   │           └── bn/  (same files)
│   │
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── throttler.guard.ts
│   │   └── ws-auth.guard.ts
│   │
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── i18n-response.interceptor.ts
│   │   ├── audit.interceptor.ts
│   │   └── transform.interceptor.ts
│   │
│   ├── pipes/
│   │   └── validation.pipe.ts
│   │
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   └── all-exceptions.filter.ts
│   │
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── api-response.decorator.ts
│   │
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.repository.ts
│       │   ├── dto/
│       │   │   ├── send-otp.dto.ts
│       │   │   ├── verify-otp.dto.ts
│       │   │   ├── refresh-token.dto.ts
│       │   │   └── auth-response.dto.ts
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts
│       │   │   └── refresh.strategy.ts
│       │   ├── entities/
│       │   │   └── session.entity.ts
│       │   └── auth.spec.ts
│       │
│       ├── user/
│       │   ├── user.module.ts
│       │   ├── user.controller.ts
│       │   ├── user.service.ts
│       │   ├── user.repository.ts
│       │   ├── dto/
│       │   │   ├── update-profile.dto.ts
│       │   │   └── user-response.dto.ts
│       │   ├── entities/
│       │   │   └── user.entity.ts
│       │   └── user.spec.ts
│       │
│       ├── kyc/
│       ├── consent/
│       ├── document/
│       ├── scoring/
│       ├── loan/
│       ├── emi/
│       ├── notification/
│       ├── cms/
│       ├── audit/
│       └── admin/
│
└── test/
    ├── app.e2e-spec.ts
    ├── auth.e2e-spec.ts
    └── loan.e2e-spec.ts
```

---

## 5. Environment Configuration

### `.env.example`

```env
# ── Application ──────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_VERSION=v1
APP_NAME=CredSaathi
ALLOWED_ORIGINS=http://localhost:3000,https://app.credsaathi.in
CORS_CREDENTIALS=true

# ── PostgreSQL ────────────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=credsaathi
POSTGRES_USER=credsaathi_user
POSTGRES_PASSWORD=strong_password_here
POSTGRES_SSL=true
POSTGRES_MAX_CONNECTIONS=50
POSTGRES_IDLE_TIMEOUT_MS=30000

# ── MongoDB ───────────────────────────────────────────────
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/credsaathi
MONGODB_DB_NAME=credsaathi_behavioral
MONGODB_MAX_POOL_SIZE=10

# ── Redis ─────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_TLS=true
REDIS_KEY_PREFIX=cs:
REDIS_DEFAULT_TTL=3600

# ── Kafka ─────────────────────────────────────────────────
KAFKA_BROKERS=broker1:9092,broker2:9092
KAFKA_CLIENT_ID=credsaathi-api
KAFKA_GROUP_ID=credsaathi-consumers
KAFKA_SSL=true
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=kafka_user
KAFKA_SASL_PASSWORD=kafka_password

# ── JWT & Keycloak ────────────────────────────────────────
JWT_ACCESS_SECRET=your_rsa_private_key_here
JWT_ACCESS_PUBLIC=your_rsa_public_key_here
JWT_ACCESS_EXPIRY=900s
JWT_REFRESH_EXPIRY=7d
KEYCLOAK_URL=https://auth.credsaathi.in
KEYCLOAK_REALM=credsaathi
KEYCLOAK_CLIENT_ID=credsaathi-api
KEYCLOAK_CLIENT_SECRET=client_secret

# ── OTP (UIDAI) ───────────────────────────────────────────
UIDAI_API_URL=https://api.uidai.gov.in
UIDAI_API_KEY=uidai_api_key
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_LOCKOUT_SECONDS=1800

# ── DigiLocker ────────────────────────────────────────────
DIGILOCKER_CLIENT_ID=digilocker_client_id
DIGILOCKER_CLIENT_SECRET=digilocker_secret
DIGILOCKER_REDIRECT_URI=https://api.credsaathi.in/v1/kyc/callback

# ── Account Aggregator ────────────────────────────────────
AA_CLIENT_ID=setu_client_id
AA_CLIENT_SECRET=setu_secret
AA_BASE_URL=https://api.setu.co/aa
AA_REDIRECT_URI=https://api.credsaathi.in/v1/consent/callback

# ── AWS S3 ────────────────────────────────────────────────
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=secret...
S3_BUCKET_KYC=credsaathi-kyc
S3_BUCKET_STATEMENTS=credsaathi-statements
S3_BUCKET_ML=credsaathi-ml-artifacts
S3_PRESIGNED_URL_EXPIRY=900
AWS_KMS_KEY_ARN=arn:aws:kms:ap-south-1:...

# ── Encryption ────────────────────────────────────────────
ENCRYPTION_KEY=32_byte_hex_key_here
ENCRYPTION_IV_LENGTH=16

# ── Scoring Service ───────────────────────────────────────
SCORING_SERVICE_URL=http://scoring-service:8080
SCORING_SERVICE_TIMEOUT_MS=5000
ML_MODEL_VERSION=v2.1.0

# ── Notification ──────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=auth_token
TWILIO_FROM_NUMBER=+1234567890
MSG91_API_KEY=msg91_key
MSG91_SENDER_ID=CSATHI
WHATSAPP_API_URL=https://api.whatsapp.com/v1
WHATSAPP_TOKEN=wa_token
SENDGRID_API_KEY=SG.xxx

# ── Rate Limiting ─────────────────────────────────────────
THROTTLE_TTL=60
THROTTLE_LIMIT=60
OTP_THROTTLE_TTL=60
OTP_THROTTLE_LIMIT=3

# ── ClickHouse ────────────────────────────────────────────
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=clickhouse_pass
CLICKHOUSE_DATABASE=credsaathi_analytics

# ── MLflow ────────────────────────────────────────────────
MLFLOW_TRACKING_URI=http://mlflow:5000
MLFLOW_EXPERIMENT_NAME=credsaathi-scoring

# ── Monitoring ────────────────────────────────────────────
PROMETHEUS_PORT=9090
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/xxx

# ── Feature Flags ─────────────────────────────────────────
FEATURE_LSTM_MODEL=true
FEATURE_PSYCHOMETRIC=true
FEATURE_AA_INTEGRATION=true
```

### `config/database.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
  maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS, 10) || 50,
  idleTimeoutMs: parseInt(process.env.POSTGRES_IDLE_TIMEOUT_MS, 10) || 30000,
}));
```

---

## 6. Database Setup & Configuration

### PostgreSQL — TypeORM configuration

```typescript
// shared/database/database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        database: config.get('database.database'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
        ssl: config.get('database.ssl') ? { rejectUnauthorized: false } : false,
        synchronize: false,
        migrationsRun: true,
        logging: process.env.NODE_ENV === 'development',
        extra: {
          max: config.get('database.maxConnections'),
          idleTimeoutMillis: config.get('database.idleTimeoutMs'),
          connectionTimeoutMillis: 3000,
        },
        poolErrorHandler: (err) => console.error('Pool error:', err),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
```

### All PostgreSQL entities

#### `user.entity.ts`

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

@Entity('users')
@Index(['mobile_number'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 15, unique: true })
  mobile_number: string;

  @Column({ length: 500, nullable: true })
  full_name_encrypted: string;

  @Column({ length: 500, nullable: true })
  email_encrypted: string;

  @Column({ type: 'enum', enum: Role, default: Role.BORROWER })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ length: 10, default: 'en' })
  locale: string;

  @Column({ length: 500, nullable: true })
  fcm_token: string;

  @Column({ default: 0 })
  onboarding_step: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### `session.entity.ts`

```typescript
@Entity('sessions')
@Index(['jwt_jti'], { unique: true })
@Index(['user_id', 'is_revoked'])
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ length: 200, unique: true })
  jwt_jti: string;

  @Column({ length: 300, nullable: true })
  device_fingerprint: string;

  @Column({ length: 50, nullable: true })
  ip_address: string;

  @Column({ length: 200, nullable: true })
  user_agent: string;

  @Column({ default: false })
  is_revoked: boolean;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
```

#### `kyc_record.entity.ts`

```typescript
export enum KycStatus {
  PENDING = 'pending',
  AADHAAR_VERIFIED = 'aadhaar_verified',
  PAN_VERIFIED = 'pan_verified',
  FULLY_VERIFIED = 'fully_verified',
  FAILED = 'failed',
}

@Entity('kyc_records')
@Index(['user_id'])
export class KycRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  user_id: string;

  @Column({ length: 200, nullable: true })
  aadhaar_hash: string;

  @Column({ length: 200, nullable: true })
  pan_hash: string;

  @Column({ length: 300, nullable: true })
  digilocker_ref: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  verification_status: KycStatus;

  @Column({ length: 50, nullable: true })
  liveness_check_status: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  face_match_score: number;

  @Column({ type: 'jsonb', nullable: true })
  extracted_data_encrypted: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### `consent_record.entity.ts`

```typescript
export enum DataSource {
  PHONE = 'phone',
  BANK = 'bank',
  ECOMMERCE = 'ecommerce',
  GEOLOCATION = 'geolocation',
  MERCHANT = 'merchant',
  PSYCHOMETRIC = 'psychometric',
}

@Entity('consent_records')
@Index(['user_id', 'data_source', 'is_active'])
export class ConsentRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'enum', enum: DataSource })
  data_source: DataSource;

  @Column({ length: 50, default: 'read' })
  scope: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ length: 300, nullable: true })
  aa_handle: string;

  @Column({ length: 300, nullable: true })
  aa_consent_id: string;

  @Column({ length: 500 })
  consent_hash: string;

  @Column({ type: 'timestamptz' })
  granted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  data_deletion_scheduled_at: Date;
}
```

#### `document.entity.ts`

```typescript
export enum DocType {
  AADHAAR_FRONT = 'aadhaar_front',
  AADHAAR_BACK = 'aadhaar_back',
  PAN = 'pan',
  BANK_STATEMENT = 'bank_statement',
  INCOME_PROOF = 'income_proof',
  SELFIE = 'selfie',
  BUSINESS_REG = 'business_reg',
  GST_CERTIFICATE = 'gst_certificate',
  UDYAM_CERTIFICATE = 'udyam_certificate',
}

@Entity('documents')
@Index(['user_id', 'doc_type'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'enum', enum: DocType })
  doc_type: DocType;

  @Column({ length: 1000 })
  s3_key_encrypted: string;

  @Column({ length: 300 })
  file_hash: string;

  @Column({ type: 'int' })
  size_bytes: number;

  @Column({ length: 100 })
  mime_type: string;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  hard_delete_at: Date;

  @CreateDateColumn()
  uploaded_at: Date;
}
```

#### `credit_score.entity.ts`

```typescript
export enum RiskBand {
  VERY_HIGH = 'very_high',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  VERY_LOW = 'very_low',
}

@Entity('credit_scores')
@Index(['user_id', 'generated_at'])
export class CreditScoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'enum', enum: RiskBand })
  risk_band: RiskBand;

  @Column({ type: 'decimal', precision: 8, scale: 6 })
  model1_pd: number;

  @Column({ type: 'decimal', precision: 8, scale: 6 })
  model2_risk: number;

  @Column({ type: 'decimal', precision: 8, scale: 6 })
  model3_stability: number;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  ensemble_pd: number;

  @Column({ type: 'jsonb' })
  shap_values: ShapFactor[];

  @Column({ length: 20 })
  feature_version: string;

  @Column({ length: 30 })
  model_version: string;

  @Column({ type: 'jsonb', nullable: true })
  data_completeness: Record<string, boolean>;

  @CreateDateColumn()
  generated_at: Date;
}

export interface ShapFactor {
  feature: string;
  contribution: number;
  direction: 'positive' | 'negative';
  value: number;
  percentile: number;
}
```

#### `loan_application.entity.ts`

```typescript
export enum LoanState {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  PENDING_SECOND_APPROVAL = 'pending_second_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISBURSED = 'disbursed',
  REPAYING = 'repaying',
  CLOSED = 'closed',
  DEFAULTED = 'defaulted',
}

@Entity('loan_applications')
@Index(['user_id', 'state'])
@Index(['lender_id', 'state'])
export class LoanApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column('uuid', { nullable: true })
  score_id: string;

  @Column('uuid', { nullable: true })
  lender_id: string;

  @Column('uuid', { nullable: true })
  second_approver_id: string;

  @Column({ type: 'bigint' })
  amount_requested: number;

  @Column({ type: 'int' })
  tenure_months: number;

  @Column({ length: 500 })
  purpose: string;

  @Column({ type: 'enum', enum: LoanState, default: LoanState.DRAFT })
  state: LoanState;

  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true })
  interest_rate: number;

  @Column({ length: 1000, nullable: true })
  rejection_reason: string;

  @Column({ type: 'bigint', nullable: true })
  amount_approved: number;

  @Column({ type: 'timestamptz', nullable: true })
  applied_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  decided_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  disbursed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

#### `loan_state_transition.entity.ts`

```typescript
@Entity('loan_state_transitions')
@Index(['loan_id'])
export class LoanStateTransitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  loan_id: string;

  @Column('uuid', { nullable: true })
  actor_id: string;

  @Column({ length: 50 })
  from_state: string;

  @Column({ length: 50 })
  to_state: string;

  @Column({ length: 1000, nullable: true })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  transitioned_at: Date;
}
```

#### `emi_schedule.entity.ts`

```typescript
export enum EmiStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  LATE = 'late',
  WAIVED = 'waived',
  DEFAULTED = 'defaulted',
}

@Entity('emi_schedules')
@Index(['loan_id'])
@Index(['due_date', 'status'])
export class EmiScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  loan_id: string;

  @Column({ type: 'int' })
  installment_number: number;

  @Column({ type: 'bigint' })
  principal_amount: number;

  @Column({ type: 'bigint' })
  interest_amount: number;

  @Column({ type: 'bigint' })
  total_amount_due: number;

  @Column({ type: 'bigint', default: 0 })
  amount_paid: number;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'enum', enum: EmiStatus, default: EmiStatus.PENDING })
  status: EmiStatus;

  @Column({ type: 'int', default: 0 })
  days_past_due: number;
}
```

#### `repayment_event.entity.ts`

```typescript
@Entity('repayment_events')
@Index(['loan_id'])
@Index(['emi_id'])
export class RepaymentEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  loan_id: string;

  @Column('uuid')
  emi_id: string;

  @Column({ type: 'bigint' })
  amount_paid: number;

  @Column({ length: 50 })
  payment_mode: string;

  @Column({ length: 200, nullable: true })
  utr_number: string;

  @Column({ type: 'int', default: 0 })
  days_late: number;

  @Column({ type: 'jsonb', nullable: true })
  bank_response: Record<string, any>;

  @CreateDateColumn()
  paid_at: Date;
}
```

#### `audit_log.entity.ts`

```typescript
@Entity('audit_logs')
@Index(['entity_type', 'entity_id'])
@Index(['actor_id'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  actor_id: string;

  @Column({ length: 50 })
  entity_type: string;

  @Column('uuid', { nullable: true })
  entity_id: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 500 })
  payload_hash: string;

  @Column({ length: 500, nullable: true })
  prev_hash: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  logged_at: Date;
}
```

#### `notification.entity.ts`

```typescript
export enum NotificationStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('notifications')
@Index(['user_id', 'status'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ length: 50 })
  channel: string;

  @Column({ length: 100 })
  event_type: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.QUEUED })
  status: NotificationStatus;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'jsonb', nullable: true })
  provider_response: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
```

---

## 7. Main Bootstrap & App Module

### `main.ts`

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));

  app.use(compression());

  app.enableCors({
    origin: config.get<string>('ALLOWED_ORIGINS')?.split(',') ?? [],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'Accept-Language',
      'X-Device-Fingerprint', 'X-Locale', 'X-Request-ID',
    ],
    credentials: config.get<boolean>('CORS_CREDENTIALS'),
    maxAge: 86400,
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new I18nValidationPipe({ stopAtFirstError: false }),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(
    new I18nValidationExceptionFilter({ detailedErrors: false }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CredSaathi API')
    .setDescription(`
      AI-Powered Alternate Credit Scoring Platform
      
      Authentication: All endpoints (except /auth and /cms public) require Bearer JWT.
      Languages: Pass Accept-Language header (en, hi, ta, te, mr, bn) for localised responses.
      Versioning: All endpoints prefixed /api/v1/
    `)
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('auth', 'Authentication and session management')
    .addTag('users', 'User profile and onboarding')
    .addTag('kyc', 'KYC verification via DigiLocker')
    .addTag('consent', 'Data consent management (AA framework)')
    .addTag('documents', 'Document upload and management')
    .addTag('scoring', 'AI credit score generation')
    .addTag('loans', 'Loan application lifecycle')
    .addTag('emi', 'EMI schedule and repayments')
    .addTag('cms', 'Content management')
    .addTag('admin', 'Admin and compliance')
    .addServer('https://api.credsaathi.in', 'Production')
    .addServer('https://staging-api.credsaathi.in', 'Staging')
    .addServer('http://localhost:3000', 'Development')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`CredSaathi API running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
```

### `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import kafkaConfig from './config/kafka.config';
import s3Config from './config/s3.config';

import { DatabaseModule } from './shared/database/database.module';
import { MongodbModule } from './shared/mongodb/mongodb.module';
import { CacheModule } from './shared/cache/cache.module';
import { KafkaModule } from './shared/kafka/kafka.module';
import { StorageModule } from './shared/storage/storage.module';
import { EncryptionModule } from './shared/encryption/encryption.module';
import { I18nAppModule } from './shared/i18n/i18n.module';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { KycModule } from './modules/kyc/kyc.module';
import { ConsentModule } from './modules/consent/consent.module';
import { DocumentModule } from './modules/document/document.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { LoanModule } from './modules/loan/loan.module';
import { EmiModule } from './modules/emi/emi.module';
import { NotificationModule } from './modules/notification/notification.module';
import { CmsModule } from './modules/cms/cms.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CustomThrottlerGuard } from './guards/throttler.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { AuditInterceptor } from './interceptors/audit.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, kafkaConfig, s3Config],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'medium', ttl: 10000, limit: 30 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.body.otp', 'req.body.password'],
        serializers: {
          req: (req) => ({ method: req.method, url: req.url, id: req.id }),
        },
      },
    }),
    DatabaseModule,
    MongodbModule,
    CacheModule,
    KafkaModule,
    StorageModule,
    EncryptionModule,
    I18nAppModule,
    AuthModule,
    UserModule,
    KycModule,
    ConsentModule,
    DocumentModule,
    ScoringModule,
    LoanModule,
    EmiModule,
    NotificationModule,
    CmsModule,
    AuditModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CustomThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

---

## 8. Global Infrastructure

### `guards/jwt-auth.guard.ts`

```typescript
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CacheService } from '../shared/cache/cache.service';
import { CACHE_KEYS } from '../common/constants/cache-keys';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) { super(); }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    const request = context.switchToHttp().getRequest();
    const token = request.user;
    const jti = token?.jti;

    if (jti) {
      const isBlacklisted = await this.cacheService.get(
        CACHE_KEYS.TOKEN_BLACKLIST(jti),
      );
      if (isBlacklisted) throw new UnauthorizedException('TOKEN_BLACKLISTED');
    }

    return true;
  }

  handleRequest(err: any, user: any) {
    if (err || !user) throw new UnauthorizedException('INVALID_TOKEN');
    return user;
  }
}
```

### `guards/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    return true;
  }
}
```

### `interceptors/transform.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: null;
  request_id: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const requestId = context.switchToHttp().getRequest().headers['x-request-id'] ?? uuidv4();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        error: null,
        request_id: requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### `interceptors/logging.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@InjectPinoLogger() private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.info({ method, url, userId: user?.id, duration }, 'Request completed');
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        this.logger.error({ method, url, userId: user?.id, duration, error: err.message }, 'Request failed');
        throw err;
      }),
    );
  }
}
```

### `interceptors/audit.interceptor.ts`

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method } = req;
    const isWriteOp = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(async (response) => {
        if (isWriteOp && req.user) {
          await this.auditService.log({
            actor_id: req.user.id,
            entity_type: this.extractEntityType(req.url),
            entity_id: response?.data?.id,
            action: `${method}:${req.url}`,
            payload_hash: this.auditService.hashPayload(req.body),
          });
        }
      }),
    );
  }

  private extractEntityType(url: string): string {
    const segments = url.split('/').filter(Boolean);
    return segments[2] ?? 'unknown';
  }
}
```

### `filters/all-exceptions.filter.ts`

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    const errorBody = typeof errorResponse === 'string'
      ? { message: errorResponse }
      : errorResponse as Record<string, any>;

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code: errorBody.code ?? errorBody.error ?? 'INTERNAL_ERROR',
        message: errorBody.message ?? 'Something went wrong',
        fields: errorBody.fields ?? null,
        status,
      },
      request_id: request.headers['x-request-id'] ?? uuidv4(),
      timestamp: new Date().toISOString(),
    });
  }
}
```

### `decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../common/types/jwt-payload.type';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
```

### `decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### `decorators/public.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### `common/constants/cache-keys.ts`

```typescript
export const CACHE_KEYS = {
  SESSION: (jti: string) => `session:${jti}`,
  TOKEN_BLACKLIST: (jti: string) => `blacklist:${jti}`,
  OTP: (mobile: string) => `otp:${mobile}`,
  OTP_ATTEMPTS: (mobile: string) => `otp_attempts:${mobile}`,
  OTP_LOCK: (mobile: string) => `otp_lock:${mobile}`,
  FEATURES: (userId: string) => `features:${userId}`,
  SCORE_CACHE: (userId: string) => `score:${userId}`,
  CONSENT_CACHE: (userId: string) => `consent:${userId}`,
  RATE_LIMIT: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  CMS_CONTENT: (key: string, locale: string) => `cms:${key}:${locale}`,
  CMS_FAQ: (locale: string, category: string) => `cms_faq:${locale}:${category}`,
};
```

---

## 9. Auth Module

### `auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from '../user/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        privateKey: config.get('JWT_ACCESS_SECRET'),
        publicKey: config.get('JWT_ACCESS_PUBLIC'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.get('JWT_ACCESS_EXPIRY'),
          issuer: 'credsaathi-auth',
          audience: 'credsaathi-api',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, RefreshStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

### `auth.service.ts`

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
    private readonly config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async sendOtp(dto: SendOtpDto, lang: string): Promise<{ message: string; expires_in: number }> {
    const lockKey = CACHE_KEYS.OTP_LOCK(dto.mobile);
    const isLocked = await this.cacheService.get(lockKey);
    if (isLocked) {
      const lockedUntil = await this.cacheService.getTtl(lockKey);
      throw new HttpException(
        { code: 'OTP_LOCKED', retry_after: lockedUntil },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateOtp();
    const otpHash = this.hashOtp(otp, dto.mobile);
    const ttl = this.config.get<number>('OTP_TTL_SECONDS');

    await this.cacheService.set(CACHE_KEYS.OTP(dto.mobile), otpHash, ttl);
    await this.cacheService.set(CACHE_KEYS.OTP_ATTEMPTS(dto.mobile), 0, ttl);

    await this.uidaiService.sendOtp(dto.mobile, otp);

    const message = await this.i18n.translate('auth.otp.sent', {
      lang,
      args: { mobile: dto.mobile.replace(/.(?=.{4})/g, '*') },
    });

    return { message, expires_in: ttl };
  }

  async verifyOtp(dto: VerifyOtpDto, lang: string, ip: string, userAgent: string) {
    const storedHash = await this.cacheService.get<string>(CACHE_KEYS.OTP(dto.mobile));
    if (!storedHash) {
      throw new UnauthorizedException({ code: 'OTP_EXPIRED' });
    }

    const attempts = await this.cacheService.increment(CACHE_KEYS.OTP_ATTEMPTS(dto.mobile));
    const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS');

    if (attempts > maxAttempts) {
      await this.cacheService.set(
        CACHE_KEYS.OTP_LOCK(dto.mobile), 1,
        this.config.get<number>('OTP_LOCKOUT_SECONDS'),
      );
      await this.cacheService.del(CACHE_KEYS.OTP(dto.mobile));
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', locked_until: new Date(Date.now() + 1800000) },
        HttpStatus.LOCKED,
      );
    }

    const expectedHash = this.hashOtp(dto.otp, dto.mobile);
    if (storedHash !== expectedHash) {
      throw new UnauthorizedException({
        code: 'OTP_INVALID',
        attempts_remaining: maxAttempts - attempts,
      });
    }

    await this.cacheService.del(CACHE_KEYS.OTP(dto.mobile));
    await this.cacheService.del(CACHE_KEYS.OTP_ATTEMPTS(dto.mobile));

    let user = await this.authRepository.findUserByMobile(dto.mobile);
    const isNewUser = !user;

    if (!user) {
      user = await this.authRepository.createUser({
        mobile_number: dto.mobile,
        status: UserStatus.ACTIVE,
        locale: lang,
      });
    }

    const { accessToken, refreshToken, jti } = await this.issueTokenPair(user);

    await this.authRepository.createSession({
      user_id: user.id,
      jwt_jti: jti,
      device_fingerprint: dto.device_fingerprint,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const welcomeMsg = await this.i18n.translate(
      isNewUser ? 'auth.otp.welcome_new' : 'auth.otp.welcome_back',
      { lang, args: { name: user.full_name_encrypted ? 'there' : 'there' } },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
      user: this.mapUserResponse(user),
      is_new_user: isNewUser,
      message: welcomeMsg,
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.authRepository.findSessionByRefreshToken(refreshToken);
    if (!session || session.is_revoked || session.expires_at < new Date()) {
      throw new UnauthorizedException({ code: 'REFRESH_TOKEN_INVALID' });
    }

    const user = await this.authRepository.findUserById(session.user_id);
    const { accessToken, refreshToken: newRefresh, jti } = await this.issueTokenPair(user);

    await this.authRepository.revokeSession(session.id);
    await this.authRepository.createSession({
      user_id: user.id,
      jwt_jti: jti,
      device_fingerprint: session.device_fingerprint,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { access_token: accessToken, refresh_token: newRefresh, expires_in: 900 };
  }

  async logout(jti: string, userId: string) {
    const ttl = 900;
    await this.cacheService.set(CACHE_KEYS.TOKEN_BLACKLIST(jti), 1, ttl);
    await this.authRepository.revokeSessionByJti(jti);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    const count = await this.authRepository.revokeAllUserSessions(userId);
    return { sessions_revoked: count };
  }

  private async issueTokenPair(user: UserEntity) {
    const jti = uuidv4();
    const payload: JwtPayload = {
      sub: user.id,
      jti,
      role: user.role,
      locale: user.locale,
      iss: 'credsaathi-auth',
      aud: 'credsaathi-api',
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return { accessToken, refreshToken, jti };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashOtp(otp: string, mobile: string): string {
    return crypto
      .createHmac('sha256', this.config.get('ENCRYPTION_KEY'))
      .update(`${otp}:${mobile}`)
      .digest('hex');
  }
}
```

### `auth.controller.ts`

```typescript
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('otp/send')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send Aadhaar OTP to mobile number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendOtp(
    @Body() dto: SendOtpDto,
    @I18n() i18n: I18nContext,
  ) {
    return this.authService.sendOtp(dto, i18n.lang);
  }

  @Public()
  @Post('otp/verify')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP and receive JWT token pair' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @I18n() i18n: I18nContext,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.verifyOtp(dto, i18n.lang, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke current session' })
  @ApiBearerAuth('access-token')
  async logout(@CurrentUser('jti') jti: string, @CurrentUser('sub') userId: string) {
    return this.authService.logout(jti, userId);
  }

  @Post('logout/all')
  @ApiOperation({ summary: 'Revoke all sessions for the user' })
  @ApiBearerAuth('access-token')
  async logoutAll(@CurrentUser('sub') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile and session info' })
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }
}
```

### `dto/send-otp.dto.ts`

```typescript
import { IsNotEmpty, IsPhoneNumber, Length } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Indian mobile number with country code' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.mobile.required') })
  @IsPhoneNumber('IN', { message: i18nValidationMessage('validation.mobile.invalid') })
  mobile: string;
}
```

### `dto/verify-otp.dto.ts`

```typescript
export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber('IN')
  mobile: string;

  @ApiProperty({ example: '482931' })
  @IsString()
  @Length(6, 6, { message: i18nValidationMessage('validation.otp.length') })
  @Matches(/^\d{6}$/, { message: i18nValidationMessage('validation.otp.numeric') })
  otp: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  device_fingerprint?: string;

  @ApiProperty({ required: false, description: 'FCM token for push notifications' })
  @IsOptional()
  @IsString()
  fcm_token?: string;
}
```

### `strategies/jwt.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../common/types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_PUBLIC'),
      algorithms: ['RS256'],
      issuer: 'credsaathi-auth',
      audience: 'credsaathi-api',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.role) throw new UnauthorizedException('INVALID_TOKEN_PAYLOAD');
    return payload;
  }
}
```

---

## 10. User Module

### `user.service.ts`

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly encryptionService: EncryptionService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly i18n: I18nService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND' });
    return this.mapToResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updates: Partial<UserEntity> = {};
    if (dto.name) updates.full_name_encrypted = this.encryptionService.encrypt(dto.name);
    if (dto.email) updates.email_encrypted = this.encryptionService.encrypt(dto.email);
    if (dto.locale) updates.locale = dto.locale;
    const user = await this.userRepository.updateById(userId, updates);
    return this.mapToResponse(user);
  }

  async requestDeletion(userId: string) {
    await this.userRepository.updateById(userId, { status: UserStatus.DELETED });
    await this.kafkaProducer.emit('user-deletion-requests', {
      userId,
      requestedAt: new Date(),
      scheduledDeletionAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    });
    return { message: 'Deletion request accepted. Data will be purged within 72 hours.' };
  }

  async advanceOnboardingStep(userId: string, step: number, data: Record<string, any>) {
    await this.userRepository.updateById(userId, { onboarding_step: step });
    await this.kafkaProducer.emit('onboarding-events', { userId, step, data });
    return { current_step: step, next_step: step + 1 };
  }

  private mapToResponse(user: UserEntity) {
    return {
      id: user.id,
      name: user.full_name_encrypted ? this.encryptionService.decrypt(user.full_name_encrypted) : null,
      email: user.email_encrypted ? this.encryptionService.decrypt(user.email_encrypted) : null,
      mobile: user.mobile_number.replace(/.(?=.{4})/g, '*'),
      role: user.role,
      status: user.status,
      locale: user.locale,
      kyc_status: null,
      onboarding_step: user.onboarding_step,
      created_at: user.created_at,
    };
  }
}
```

---

## 11. KYC Module

### `kyc.service.ts`

```typescript
@Injectable()
export class KycService {
  async initiateKyc(userId: string): Promise<{ kyc_session_id: string; auth_url: string }> {
    const sessionId = uuidv4();
    await this.cacheService.set(`kyc_session:${sessionId}`, { userId }, 600);
    const authUrl = await this.digilockerService.getAuthUrl(sessionId);
    return { kyc_session_id: sessionId, auth_url: authUrl };
  }

  async completeKyc(userId: string, sessionId: string, code: string) {
    const session = await this.cacheService.get(`kyc_session:${sessionId}`);
    if (!session || session.userId !== userId) throw new BadRequestException('INVALID_KYC_SESSION');

    const docs = await this.digilockerService.fetchDocuments(code);

    const aadhaarHash = crypto.createHash('sha256').update(docs.aadhaarNumber).digest('hex');
    const panHash = crypto.createHash('sha256').update(docs.panNumber).digest('hex');

    const existingKyc = await this.kycRepository.findByUserId(userId);
    if (existingKyc?.aadhaar_hash && existingKyc.aadhaar_hash !== aadhaarHash) {
      throw new ConflictException('AADHAAR_MISMATCH');
    }

    const encryptedData = this.encryptionService.encrypt(JSON.stringify({
      name: docs.name,
      dob: docs.dob,
      gender: docs.gender,
      address: docs.address,
    }));

    await this.kycRepository.upsertKyc(userId, {
      aadhaar_hash: aadhaarHash,
      pan_hash: panHash,
      digilocker_ref: docs.documentId,
      extracted_data_encrypted: encryptedData,
      verification_status: KycStatus.AADHAAR_VERIFIED,
    });

    await this.cacheService.del(`kyc_session:${sessionId}`);
    return { status: 'verified', fields: ['name', 'dob', 'address', 'gender'] };
  }

  async checkLiveness(userId: string, selfieBuffer: Buffer) {
    const kycRecord = await this.kycRepository.findByUserId(userId);
    if (!kycRecord?.aadhaar_hash) throw new BadRequestException('AADHAAR_NOT_VERIFIED');

    const aadhaarPhoto = await this.digilockerService.getAadhaarPhoto(kycRecord.digilocker_ref);
    const matchResult = await this.facematchService.compare(aadhaarPhoto, selfieBuffer);

    await this.kycRepository.updateLiveness(userId, {
      liveness_check_status: matchResult.passed ? 'passed' : 'failed',
      face_match_score: matchResult.score,
    });

    if (matchResult.passed) {
      await this.kycRepository.updateStatus(userId, KycStatus.FULLY_VERIFIED);
      await this.userRepository.updateById(userId, { onboarding_step: 3 });
    }

    return { match_score: matchResult.score, passed: matchResult.passed };
  }
}
```

---

## 12. Consent Module

### `consent.service.ts`

```typescript
@Injectable()
export class ConsentService {
  async getConsents(userId: string) {
    const consents = await this.consentRepository.findActiveByUser(userId);
    return consents.map((c) => ({
      source: c.data_source,
      is_active: c.is_active,
      scope: c.scope,
      granted_at: c.granted_at,
      aa_consent_id: c.aa_consent_id,
    }));
  }

  async grantConsent(userId: string, dto: GrantConsentDto) {
    const existing = await this.consentRepository.findByUserAndSource(userId, dto.source);
    if (existing?.is_active) throw new ConflictException('CONSENT_ALREADY_ACTIVE');

    const aaResult = await this.aaService.createConsent({
      userId,
      source: dto.source,
      aaHandle: dto.aa_handle,
      scope: dto.scope,
    });

    const consentPayload = JSON.stringify({ userId, source: dto.source, scope: dto.scope, ts: Date.now() });
    const consentHash = crypto.createHash('sha256').update(consentPayload).digest('hex');

    const record = await this.consentRepository.create({
      user_id: userId,
      data_source: dto.source,
      scope: dto.scope,
      aa_handle: dto.aa_handle,
      aa_consent_id: aaResult.consentId,
      consent_hash: consentHash,
      granted_at: new Date(),
      is_active: true,
    });

    await this.cacheService.del(CACHE_KEYS.CONSENT_CACHE(userId));
    await this.kafkaProducer.emit('consent-granted', { userId, source: dto.source, consentId: record.id });

    return { consent_id: record.id, consent_hash: consentHash, granted_at: record.granted_at };
  }

  async revokeConsent(userId: string, source: DataSource) {
    const consent = await this.consentRepository.findByUserAndSource(userId, source);
    if (!consent?.is_active) throw new NotFoundException('CONSENT_NOT_FOUND');

    await this.aaService.revokeConsent(consent.aa_consent_id);

    const deletionAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await this.consentRepository.revoke(consent.id, deletionAt);
    await this.cacheService.del(CACHE_KEYS.CONSENT_CACHE(userId));

    await this.kafkaProducer.emit('consent-revoked', {
      userId, source, consentId: consent.id, deletionScheduledAt: deletionAt,
    });

    return { revoked_at: new Date(), data_deletion_scheduled_at: deletionAt };
  }
}
```

---

## 13. Document Module

### `document.service.ts`

```typescript
@Injectable()
export class DocumentService {
  constructor(
    private readonly storageService: StorageService,
    private readonly encryptionService: EncryptionService,
    private readonly documentRepository: DocumentRepository,
  ) {}

  async uploadDocument(userId: string, file: Express.Multer.File, docType: DocType) {
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
    const MAX_SIZE = 10 * 1024 * 1024;

    if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException('INVALID_FILE_TYPE');
    if (file.size > MAX_SIZE) throw new BadRequestException('FILE_TOO_LARGE');

    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    const encryptedBuffer = this.encryptionService.encryptBuffer(file.buffer);
    const rawS3Key = `${userId}/${docType}/${uuidv4()}.enc`;
    const encryptedS3Key = this.encryptionService.encrypt(rawS3Key);

    await this.storageService.upload({
      bucket: this.getBucket(docType),
      key: rawS3Key,
      body: encryptedBuffer,
      contentType: 'application/octet-stream',
      metadata: { userId, docType, originalMime: file.mimetype },
    });

    const doc = await this.documentRepository.create({
      user_id: userId,
      doc_type: docType,
      s3_key_encrypted: encryptedS3Key,
      file_hash: fileHash,
      size_bytes: file.size,
      mime_type: file.mimetype,
    });

    return { document_id: doc.id, doc_type: doc.doc_type, uploaded_at: doc.uploaded_at };
  }

  async getPresignedUrl(userId: string, documentId: string) {
    const doc = await this.documentRepository.findOne(documentId, userId);
    if (!doc || doc.is_deleted) throw new NotFoundException('DOCUMENT_NOT_FOUND');

    const s3Key = this.encryptionService.decrypt(doc.s3_key_encrypted);
    const url = await this.storageService.getPresignedUrl({
      bucket: this.getBucket(doc.doc_type),
      key: s3Key,
      expiresIn: 900,
    });

    await this.auditService.log({
      actor_id: userId,
      entity_type: 'document',
      entity_id: documentId,
      action: 'PRESIGNED_URL_GENERATED',
      payload_hash: crypto.createHash('sha256').update(documentId).digest('hex'),
    });

    return { presigned_url: url, expires_in: 900 };
  }

  private getBucket(docType: DocType): string {
    return [DocType.BANK_STATEMENT].includes(docType)
      ? process.env.S3_BUCKET_STATEMENTS
      : process.env.S3_BUCKET_KYC;
  }
}
```

---

## 14. Scoring Module

### `scoring.service.ts`

```typescript
@Injectable()
export class ScoringService {
  constructor(
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
    private readonly scoreRepository: ScoreRepository,
    private readonly i18n: I18nService,
    private readonly config: ConfigService,
  ) {}

  async generateScore(userId: string, lang: string, loanAmountRequested?: number) {
    const cachedScore = await this.cacheService.get<CreditScoreEntity>(
      CACHE_KEYS.SCORE_CACHE(userId),
    );
    if (cachedScore && this.isScoreFresh(cachedScore.generated_at, 3600)) {
      return this.formatScoreResponse(cachedScore, lang);
    }

    const features = await this.getOrComputeFeatures(userId);
    const completeness = this.checkDataCompleteness(features);

    const scoringPayload = {
      user_id: userId,
      features,
      data_completeness: completeness,
      loan_amount_requested: loanAmountRequested,
      model_version: this.config.get('ML_MODEL_VERSION'),
    };

    const mlResponse = await this.callScoringService(scoringPayload);

    const scoreEntity = await this.scoreRepository.create({
      user_id: userId,
      score: mlResponse.score,
      risk_band: this.mapToBand(mlResponse.score),
      model1_pd: mlResponse.model1_pd,
      model2_risk: mlResponse.model2_risk,
      model3_stability: mlResponse.model3_stability,
      ensemble_pd: mlResponse.ensemble_pd,
      shap_values: mlResponse.shap_values,
      feature_version: features.version,
      model_version: mlResponse.model_version,
      data_completeness: completeness,
    });

    await this.cacheService.set(CACHE_KEYS.SCORE_CACHE(userId), scoreEntity, 3600);
    return this.formatScoreResponse(scoreEntity, lang);
  }

  private async callScoringService(payload: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.config.get('SCORING_SERVICE_URL')}/predict`,
          payload,
          { timeout: this.config.get<number>('SCORING_SERVICE_TIMEOUT_MS') },
        ),
      );
      return response.data;
    } catch (error) {
      throw new ServiceUnavailableException({ code: 'SCORING_SERVICE_UNAVAILABLE' });
    }
  }

  private mapToBand(score: number): RiskBand {
    if (score >= 801) return RiskBand.VERY_LOW;
    if (score >= 701) return RiskBand.LOW;
    if (score >= 601) return RiskBand.MEDIUM;
    if (score >= 501) return RiskBand.HIGH;
    return RiskBand.VERY_HIGH;
  }

  private async formatScoreResponse(score: CreditScoreEntity, lang: string) {
    const shapFactors = await Promise.all(
      score.shap_values.map(async (f) => ({
        ...f,
        label: await this.i18n.translate(`score.factors.${f.feature}`, { lang }),
        explanation: await this.i18n.translate('score.explanation', {
          lang,
          args: {
            factor: await this.i18n.translate(`score.factors.${f.feature}`, { lang }),
            direction: f.direction,
            points: Math.abs(Math.round(f.contribution)),
          },
        }),
      })),
    );

    return {
      score: score.score,
      risk_band: score.risk_band,
      risk_band_label: await this.i18n.translate(`score.bands.${score.risk_band}`, { lang }),
      shap_factors: shapFactors,
      generated_at: score.generated_at,
      model_version: score.model_version,
    };
  }
}
```

---

## 15. Loan Module

### `loan.service.ts` — state machine

```typescript
const VALID_TRANSITIONS: Record<LoanState, LoanState[]> = {
  [LoanState.DRAFT]:                    [LoanState.SUBMITTED],
  [LoanState.SUBMITTED]:                [LoanState.UNDER_REVIEW, LoanState.REJECTED],
  [LoanState.UNDER_REVIEW]:             [LoanState.APPROVED, LoanState.REJECTED, LoanState.PENDING_SECOND_APPROVAL],
  [LoanState.PENDING_SECOND_APPROVAL]:  [LoanState.APPROVED, LoanState.REJECTED],
  [LoanState.APPROVED]:                 [LoanState.DISBURSED, LoanState.REJECTED],
  [LoanState.REJECTED]:                 [],
  [LoanState.DISBURSED]:                [LoanState.REPAYING],
  [LoanState.REPAYING]:                 [LoanState.CLOSED, LoanState.DEFAULTED],
  [LoanState.CLOSED]:                   [],
  [LoanState.DEFAULTED]:                [],
};

@Injectable()
export class LoanService {
  async applyForLoan(userId: string, dto: ApplyLoanDto) {
    const kyc = await this.kycRepository.findByUserId(userId);
    if (kyc?.verification_status !== KycStatus.FULLY_VERIFIED) {
      throw new BadRequestException({ code: 'KYC_NOT_VERIFIED' });
    }

    const latestScore = await this.scoreRepository.findLatestByUser(userId);
    if (!latestScore) throw new BadRequestException({ code: 'SCORE_NOT_GENERATED' });

    const activeLoan = await this.loanRepository.findActiveByUser(userId);
    if (activeLoan) throw new ConflictException({ code: 'ACTIVE_LOAN_EXISTS' });

    const loan = await this.loanRepository.create({
      user_id: userId,
      score_id: latestScore.id,
      amount_requested: dto.amount,
      tenure_months: dto.tenure_months,
      purpose: dto.purpose,
      lender_id: dto.lender_id ?? null,
      state: LoanState.SUBMITTED,
      applied_at: new Date(),
    });

    await this.transitionRepository.create({
      loan_id: loan.id,
      actor_id: userId,
      from_state: LoanState.DRAFT,
      to_state: LoanState.SUBMITTED,
    });

    await this.notificationService.queueNotification({
      userId,
      eventType: 'LOAN_SUBMITTED',
      channel: 'whatsapp',
      data: { loanId: loan.id, amount: dto.amount },
    });

    return { loan_id: loan.id, state: loan.state, applied_at: loan.applied_at };
  }

  async makeDecision(lenderId: string, loanId: string, dto: LoanDecisionDto) {
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) throw new NotFoundException({ code: 'LOAN_NOT_FOUND' });

    const allowedStates = [LoanState.UNDER_REVIEW, LoanState.PENDING_SECOND_APPROVAL];
    if (!allowedStates.includes(loan.state)) {
      throw new BadRequestException({ code: 'INVALID_LOAN_STATE' });
    }

    const isLargeAmount = loan.amount_requested > 200000;
    if (dto.decision === 'approved' && isLargeAmount && loan.state !== LoanState.PENDING_SECOND_APPROVAL) {
      await this.loanRepository.update(loanId, {
        state: LoanState.PENDING_SECOND_APPROVAL,
        lender_id: lenderId,
        interest_rate: dto.interest_rate,
      });
      await this.transitionRepository.create({
        loan_id: loanId, actor_id: lenderId,
        from_state: loan.state, to_state: LoanState.PENDING_SECOND_APPROVAL,
        reason: 'Amount exceeds ₹2,00,000 — second approval required',
      });
      return { message: 'Second approval required', state: LoanState.PENDING_SECOND_APPROVAL };
    }

    const newState = dto.decision === 'approved' ? LoanState.APPROVED : LoanState.REJECTED;
    await this.loanRepository.update(loanId, {
      state: newState,
      interest_rate: dto.interest_rate,
      rejection_reason: dto.reason,
      decided_at: new Date(),
    });

    await this.transitionRepository.create({
      loan_id: loanId, actor_id: lenderId,
      from_state: loan.state, to_state: newState,
      reason: dto.reason,
    });

    await this.notificationService.queueNotification({
      userId: loan.user_id,
      eventType: newState === LoanState.APPROVED ? 'LOAN_APPROVED' : 'LOAN_REJECTED',
      channel: 'whatsapp',
      data: { loanId, amount: loan.amount_requested },
    });

    return { loan_id: loanId, state: newState };
  }

  async disburseLoan(lenderId: string, loanId: string) {
    const loan = await this.loanRepository.findById(loanId);
    if (loan.state !== LoanState.APPROVED) throw new BadRequestException('LOAN_NOT_APPROVED');

    const paymentResult = await this.paymentService.disburse({
      toAccount: loan.borrower_account,
      amount: loan.amount_requested,
      reference: loanId,
    });

    await this.loanRepository.update(loanId, {
      state: LoanState.DISBURSED,
      disbursed_at: new Date(),
    });

    await this.emiService.generateSchedule(loanId, {
      principal: loan.amount_requested,
      interestRate: loan.interest_rate,
      tenureMonths: loan.tenure_months,
      disbursedAt: new Date(),
    });

    return { loan_id: loanId, state: LoanState.DISBURSED, utr: paymentResult.utr };
  }
}
```

---

## 16. EMI Module

### `emi.service.ts`

```typescript
@Injectable()
export class EmiService {
  async generateSchedule(loanId: string, params: GenerateScheduleParams) {
    const { principal, interestRate, tenureMonths, disbursedAt } = params;
    const monthlyRate = interestRate / 100 / 12;

    const emiAmount = Math.ceil(
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1)
    );

    const schedule: Partial<EmiScheduleEntity>[] = [];
    let balance = principal;

    for (let i = 1; i <= tenureMonths; i++) {
      const interest = Math.round(balance * monthlyRate);
      const principalComponent = emiAmount - interest;
      balance -= principalComponent;

      const dueDate = new Date(disbursedAt);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        loan_id: loanId,
        installment_number: i,
        principal_amount: principalComponent,
        interest_amount: interest,
        total_amount_due: emiAmount,
        due_date: dueDate,
        status: EmiStatus.PENDING,
      });
    }

    await this.emiRepository.bulkCreate(schedule);
    return schedule;
  }

  async recordRepayment(dto: RepaymentDto) {
    const emi = await this.emiRepository.findById(dto.emi_id);
    if (!emi) throw new NotFoundException('EMI_NOT_FOUND');

    const daysLate = Math.max(0, differenceInDays(new Date(), emi.due_date));

    await this.repaymentRepository.create({
      loan_id: dto.loan_id,
      emi_id: dto.emi_id,
      amount_paid: dto.amount_paid,
      payment_mode: dto.payment_mode,
      utr_number: dto.utr_number,
      days_late: daysLate,
    });

    const newAmountPaid = (emi.amount_paid || 0) + dto.amount_paid;
    const newStatus = newAmountPaid >= emi.total_amount_due
      ? daysLate > 0 ? EmiStatus.LATE : EmiStatus.PAID
      : EmiStatus.PARTIALLY_PAID;

    await this.emiRepository.update(dto.emi_id, {
      amount_paid: newAmountPaid,
      status: newStatus,
      days_past_due: daysLate,
    });

    await this.checkDefaultCondition(dto.loan_id);
    return { emi_status: newStatus, days_late: daysLate };
  }

  private async checkDefaultCondition(loanId: string) {
    const overdueEmis = await this.emiRepository.findOverdue(loanId, 90);
    if (overdueEmis.length > 0) {
      await this.loanService.triggerDefault(loanId, '90 DPD threshold crossed');
    }
  }
}
```

---

## 17. Notification Module

### `notification.service.ts`

```typescript
@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    private readonly i18n: I18nService,
  ) {}

  async queueNotification(params: QueueNotificationParams) {
    await this.notificationQueue.add('send', params, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: false,
      removeOnFail: false,
    });
  }
}

@Processor('notifications')
export class NotificationProcessor {
  @Process('send')
  async processNotification(job: Job<QueueNotificationParams>) {
    const { userId, eventType, channel, data } = job.data;
    const user = await this.userRepository.findById(userId);
    const lang = user.locale ?? 'en';

    const content = await this.buildContent(eventType, data, lang);

    switch (channel) {
      case 'sms':
        await this.smsService.send(user.mobile_number, content.text);
        break;
      case 'whatsapp':
        await this.whatsappService.send(user.mobile_number, content.template, content.params);
        break;
      case 'email':
        await this.emailService.send(user.email_encrypted, content.subject, content.html);
        break;
      case 'push':
        await this.pushService.send(user.fcm_token, content.title, content.body);
        break;
    }

    await this.notificationRepository.updateStatus(job.data.notificationId, NotificationStatus.SENT);
  }

  private async buildContent(eventType: string, data: any, lang: string) {
    const templates: Record<string, (d: any, l: string) => Promise<any>> = {
      LOAN_SUBMITTED: async (d, l) => ({
        text: await this.i18n.translate('notifications.loan_submitted', { lang: l, args: d }),
        template: 'loan_submitted',
        params: d,
      }),
      LOAN_APPROVED: async (d, l) => ({
        text: await this.i18n.translate('notifications.loan_approved', { lang: l, args: d }),
        template: 'loan_approved',
        params: d,
      }),
      EMI_REMINDER: async (d, l) => ({
        text: await this.i18n.translate('notifications.emi_reminder', { lang: l, args: d }),
      }),
      EMI_OVERDUE: async (d, l) => ({
        text: await this.i18n.translate('notifications.emi_overdue', { lang: l, args: d }),
      }),
      SCORE_GENERATED: async (d, l) => ({
        text: await this.i18n.translate('notifications.score_ready', { lang: l, args: d }),
      }),
    };

    return (templates[eventType] ?? templates['LOAN_SUBMITTED'])(data, lang);
  }
}
```

---

## 18. CMS Module

### `cms.service.ts`

```typescript
@Injectable()
export class CmsService {
  async getContent(key: string, locale: string) {
    const cacheKey = CACHE_KEYS.CMS_CONTENT(key, locale);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    let content = await this.cmsRepository.findByKeyAndLocale(key, locale);
    if (!content && locale !== 'en') {
      content = await this.cmsRepository.findByKeyAndLocale(key, 'en');
    }
    if (!content) throw new NotFoundException({ code: 'CMS_CONTENT_NOT_FOUND' });

    await this.cacheService.set(cacheKey, content, 3600);
    return content;
  }

  async getFaqs(locale: string, category?: string) {
    const cacheKey = CACHE_KEYS.CMS_FAQ(locale, category ?? 'all');
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const faqs = await this.cmsRepository.findFaqs(locale, category);
    await this.cacheService.set(cacheKey, faqs, 3600);
    return faqs;
  }

  async getLoanProducts(locale: string) {
    return this.cmsRepository.findActiveLoanProducts(locale);
  }

  async getQuestionnaire(locale: string) {
    const questions = await this.cmsRepository.findActiveQuestions();
    return questions.map((q) => ({
      id: q.id,
      q_number: q.q_number,
      group: q.group_name,
      question: q.question[locale] ?? q.question['en'],
      options: (q.options as any[]).map((o) => ({
        value: o.value,
        label: o.labels[locale] ?? o.labels['en'],
      })),
    }));
  }

  async upsertContent(key: string, locale: string, dto: UpsertContentDto) {
    const result = await this.cmsRepository.upsert(key, locale, dto);
    await this.cacheService.del(CACHE_KEYS.CMS_CONTENT(key, locale));
    return result;
  }
}
```

---

## 19. Audit Module

### `audit.service.ts`

```typescript
@Injectable()
export class AuditService {
  async log(params: AuditLogParams) {
    const lastLog = await this.auditRepository.findLatest(params.entity_type, params.entity_id);
    const prevHash = lastLog?.payload_hash ?? null;

    const chainPayload = JSON.stringify({ ...params, prevHash, ts: Date.now() });
    const currentHash = crypto.createHash('sha256').update(chainPayload).digest('hex');

    const log = await this.auditRepository.create({
      ...params,
      payload_hash: currentHash,
      prev_hash: prevHash,
    });

    await this.kafkaProducer.emit('audit-events', {
      ...log,
      emitted_at: new Date(),
    });

    return log;
  }

  hashPayload(payload: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload ?? {}))
      .digest('hex');
  }

  async verifyChain(entityType: string, entityId: string): Promise<boolean> {
    const logs = await this.auditRepository.findAll(entityType, entityId);
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].prev_hash !== logs[i - 1].payload_hash) return false;
    }
    return true;
  }
}
```

---

## 20. Admin Module

### `admin.service.ts`

```typescript
@Injectable()
export class AdminService {
  async getModelMetrics() {
    const metrics = await this.clickhouseService.query(`
      SELECT
        model_version,
        toDate(generated_at) AS date,
        avg(score) AS avg_score,
        countIf(risk_band = 'very_high') / count() AS very_high_ratio,
        countIf(risk_band = 'low' OR risk_band = 'very_low') / count() AS low_risk_ratio
      FROM model_predictions
      WHERE generated_at >= now() - INTERVAL 30 DAY
      GROUP BY model_version, date
      ORDER BY date DESC
    `);

    const fairness = await this.clickhouseService.query(`
      SELECT
        demographic_group,
        countIf(decision = 'approved') / count() AS approval_rate,
        avg(score) AS avg_score
      FROM loan_outcomes lo
      JOIN model_predictions mp ON lo.score_id = mp.id
      GROUP BY demographic_group
    `);

    return { model_metrics: metrics, fairness_audit: fairness };
  }

  async triggerRetrain(force: boolean) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.config.get('AIRFLOW_URL')}/api/v1/dags/credsaathi_monthly_retrain/dagRuns`,
        { conf: { force_retrain: force } },
        { auth: { username: this.config.get('AIRFLOW_USER'), password: this.config.get('AIRFLOW_PASS') } },
      ),
    );
    return { dag_run_id: response.data.dag_run_id, triggered_at: new Date() };
  }

  async generateComplianceReport(from: string, to: string) {
    const [totalLoans, approvalRate, avgScore, consentStats, deletionRequests] = await Promise.all([
      this.loanRepository.countByPeriod(from, to),
      this.loanRepository.getApprovalRate(from, to),
      this.scoreRepository.getAverageScore(from, to),
      this.consentRepository.getStats(from, to),
      this.userRepository.getDeletionRequests(from, to),
    ]);

    return {
      period: { from, to },
      loans: { total: totalLoans, approval_rate: approvalRate },
      scores: { average: avgScore },
      consent: consentStats,
      data_requests: { deletions: deletionRequests },
      generated_at: new Date(),
    };
  }
}
```

---

## 21. Shared Infrastructure Modules

### `shared/cache/cache.service.ts`

```typescript
@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try { return JSON.parse(value) as T; } catch { return value as unknown as T; }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> { await this.redis.del(key); }

  async increment(key: string): Promise<number> { return this.redis.incr(key); }

  async getTtl(key: string): Promise<number> { return this.redis.ttl(key); }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(keys);
    return values.map((v) => (v ? JSON.parse(v) : null));
  }

  async keys(pattern: string): Promise<string[]> { return this.redis.keys(pattern); }

  async flush(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) await this.redis.del(...keys);
  }
}
```

### `shared/encryption/encryption.service.ts`

```typescript
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private config: ConfigService) {
    this.key = Buffer.from(config.get<string>('ENCRYPTION_KEY'), 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  encryptBuffer(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const header = Buffer.alloc(32);
    iv.copy(header, 0);
    authTag.copy(header, 16);
    return Buffer.concat([header, encrypted]);
  }
}
```

### `shared/kafka/kafka.producer.service.ts`

```typescript
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  constructor(private readonly kafkaConfig: ConfigService) {
    const kafka = new Kafka({
      clientId: this.kafkaConfig.get('KAFKA_CLIENT_ID'),
      brokers: this.kafkaConfig.get<string>('KAFKA_BROKERS').split(','),
      ssl: this.kafkaConfig.get('KAFKA_SSL') === 'true',
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: false });
  }

  async onModuleInit() { await this.producer.connect(); }
  async onModuleDestroy() { await this.producer.disconnect(); }

  async emit(topic: string, payload: any): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{
        key: payload.userId ?? payload.user_id ?? uuidv4(),
        value: JSON.stringify({ ...payload, emitted_at: new Date().toISOString() }),
        headers: { 'content-type': 'application/json', 'source': 'credsaathi-api' },
      }],
    });
  }
}
```

---

## 22. i18n — Internationalisation

### `shared/i18n/i18n.module.ts`

```typescript
import { Module } from '@nestjs/common';
import {
  I18nModule, AcceptLanguageResolver, QueryResolver,
  HeaderResolver, CookieResolver,
} from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: { 'hi-*': 'hi', 'ta-*': 'ta', 'te-*': 'te', 'mr-*': 'mr', 'bn-*': 'bn' },
      loaderOptions: {
        path: path.join(__dirname, '/translations/'),
        watch: process.env.NODE_ENV === 'development',
        includeSubfolders: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale', 'l'] },
        { use: HeaderResolver, options: ['x-locale', 'x-lang'] },
        new CookieResolver(['lang']),
        AcceptLanguageResolver,
      ],
      typesOutputPath: path.join(__dirname, '../../../src/generated/i18n.generated.ts'),
    }),
  ],
})
export class I18nAppModule {}
```

### Complete translation files

**`translations/en/auth.json`**

```json
{
  "otp": {
    "sent": "OTP sent to {mobile}. Valid for 5 minutes.",
    "verified": "OTP verified successfully.",
    "welcome_new": "Welcome to CredSaathi! Let us get you started.",
    "welcome_back": "Welcome back! You are now logged in.",
    "invalid": "Incorrect OTP. {attempts_remaining} attempts remaining.",
    "expired": "OTP has expired. Please request a new one.",
    "blocked": "Too many attempts. Please try again after 30 minutes."
  },
  "errors": {
    "unauthorized": "You are not authorized to access this resource.",
    "session_expired": "Your session has expired. Please log in again.",
    "token_blacklisted": "This session has been invalidated.",
    "invalid_token": "Invalid authentication token.",
    "insufficient_permissions": "You do not have permission to perform this action."
  }
}
```

**`translations/hi/auth.json`**

```json
{
  "otp": {
    "sent": "OTP आपके मोबाइल {mobile} पर भेजा गया है। 5 मिनट में वैध।",
    "verified": "OTP सफलतापूर्वक सत्यापित हुआ।",
    "welcome_new": "CredSaathi में आपका स्वागत है! आइए शुरू करते हैं।",
    "welcome_back": "वापस स्वागत है! आप लॉग इन हो गए हैं।",
    "invalid": "गलत OTP। {attempts_remaining} प्रयास शेष हैं।",
    "expired": "OTP समाप्त हो गया। कृपया नया OTP मांगें।",
    "blocked": "बहुत अधिक प्रयास। 30 मिनट बाद पुनः प्रयास करें।"
  },
  "errors": {
    "unauthorized": "आप इस संसाधन तक पहुंचने के लिए अधिकृत नहीं हैं।",
    "session_expired": "आपका सत्र समाप्त हो गया है। कृपया फिर से लॉगिन करें।"
  }
}
```

**`translations/ta/auth.json`**

```json
{
  "otp": {
    "sent": "OTP உங்கள் மொபைல் {mobile} க்கு அனுப்பப்பட்டது। 5 நிமிடங்கள் செல்லுபடியாகும்।",
    "verified": "OTP வெற்றிகரமாக சரிபார்க்கப்பட்டது.",
    "welcome_new": "CredSaathi-க்கு வரவேற்கிறோம்! தொடங்குவோம்.",
    "welcome_back": "திரும்ப வரவேற்கிறோம்! நீங்கள் உள்நுழைந்துள்ளீர்கள்.",
    "invalid": "தவறான OTP. {attempts_remaining} முயற்சிகள் மீதம்.",
    "expired": "OTP காலாவதியானது. புதியதை கோருங்கள்.",
    "blocked": "அதிக முயற்சிகள். 30 நிமிடங்கள் கழித்து முயற்சிக்கவும்."
  }
}
```

**`translations/en/score.json`**

```json
{
  "bands": {
    "very_low": "Very Low Risk",
    "low": "Low Risk",
    "medium": "Medium Risk",
    "high": "High Risk",
    "very_high": "Very High Risk"
  },
  "factors": {
    "bill_ontime_ratio": "On-time bill payments",
    "bill_streak_max": "Longest payment streak",
    "upi_tx_count": "UPI transaction activity",
    "ecom_return_rate": "Purchase return behaviour",
    "geo_stability": "Location stability",
    "cash_flow_stability": "Cash flow regularity",
    "psychometric_risk": "Financial risk profile",
    "income_regularity": "Income consistency",
    "spending_volatility": "Spending stability"
  },
  "explanation": "Your {factor} contributed {direction} {points} points to your score.",
  "improvement": {
    "bill_ontime_ratio": "Pay your phone and utility bills on time every month to improve this factor.",
    "geo_stability": "Maintaining a consistent residence improves your stability score.",
    "cash_flow_stability": "Regular income deposits strengthen your cash flow profile."
  }
}
```

**`translations/en/errors.json`**

```json
{
  "VALIDATION_ERROR": "One or more fields are invalid.",
  "NOT_FOUND": "The requested resource was not found.",
  "INTERNAL_ERROR": "Something went wrong. Please try again later.",
  "KYC_NOT_VERIFIED": "KYC verification is required before applying for a loan.",
  "SCORE_NOT_GENERATED": "Please generate your credit score before applying.",
  "ACTIVE_LOAN_EXISTS": "You already have an active loan application.",
  "CONSENT_ALREADY_ACTIVE": "Consent for this data source is already active.",
  "DOCUMENT_NOT_FOUND": "The requested document was not found.",
  "SCORING_SERVICE_UNAVAILABLE": "Score generation is temporarily unavailable. Please try again.",
  "AADHAAR_MISMATCH": "Aadhaar number does not match your previously verified identity."
}
```

---

## 23. Complete REST API Reference

### Standard response envelope

All responses follow this structure:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "request_id": "01J...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Error response:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "OTP_INVALID",
    "message": "Incorrect OTP. 3 attempts remaining.",
    "fields": null,
    "status": 401
  },
  "request_id": "01J...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### All endpoints

| Method | Path | Auth | Guard | Description |
|--------|------|------|-------|-------------|
| POST | /api/v1/auth/otp/send | Public | Throttle 3/min | Send Aadhaar OTP |
| POST | /api/v1/auth/otp/verify | Public | Throttle 5/min | Verify OTP, issue JWT |
| POST | /api/v1/auth/refresh | Refresh token | — | Rotate token pair |
| POST | /api/v1/auth/logout | JWT | — | Revoke current session |
| POST | /api/v1/auth/logout/all | JWT | — | Revoke all sessions |
| GET | /api/v1/auth/me | JWT | — | Current user info |
| GET | /api/v1/users/profile | JWT | — | Get profile |
| PATCH | /api/v1/users/profile | JWT | — | Update profile |
| GET | /api/v1/users/:id | JWT | Lender/Admin | Get user by ID |
| DELETE | /api/v1/users/me | JWT | — | Request account deletion |
| POST | /api/v1/users/onboarding/step | JWT | — | Advance onboarding |
| POST | /api/v1/kyc/initiate | JWT | — | Start KYC flow |
| POST | /api/v1/kyc/complete | JWT | — | Complete DigiLocker KYC |
| GET | /api/v1/kyc/status | JWT | — | KYC status |
| POST | /api/v1/kyc/liveness | JWT | — | Liveness + FaceMatch |
| GET | /api/v1/consent | JWT | — | Get active consents |
| POST | /api/v1/consent/grant | JWT | — | Grant data consent |
| DELETE | /api/v1/consent/:source | JWT | — | Revoke consent |
| GET | /api/v1/consent/audit | JWT | — | Consent history |
| POST | /api/v1/documents/upload | JWT | — | Upload KYC document |
| GET | /api/v1/documents | JWT | — | List documents |
| GET | /api/v1/documents/:id/url | JWT | — | Get presigned URL |
| DELETE | /api/v1/documents/:id | JWT | — | Delete document |
| POST | /api/v1/score/generate | JWT | Borrower | Generate AI score |
| GET | /api/v1/score/latest | JWT | — | Latest score |
| GET | /api/v1/score/history | JWT | — | Score history |
| GET | /api/v1/score/:userId | JWT | Lender/Admin | Score for user |
| GET | /api/v1/score/:userId/explain | JWT | Lender/Admin | i18n SHAP explanation |
| POST | /api/v1/loans | JWT | Borrower | Apply for loan |
| GET | /api/v1/loans | JWT | — | My loans |
| GET | /api/v1/loans/:id | JWT | — | Loan detail |
| PATCH | /api/v1/loans/:id/decision | JWT | Lender | Approve/Reject loan |
| POST | /api/v1/loans/:id/disburse | JWT | Lender | Disburse loan |
| GET | /api/v1/loans/pipeline | JWT | Lender | Lender pipeline |
| GET | /api/v1/emi/schedule/:loanId | JWT | — | EMI schedule |
| POST | /api/v1/emi/repayment | JWT | — | Record repayment |
| GET | /api/v1/emi/upcoming | JWT | — | Upcoming EMIs |
| GET | /api/v1/cms/content/:key | Public | — | Get content |
| GET | /api/v1/cms/faqs | Public | — | Get FAQs |
| GET | /api/v1/cms/loan-products | Public | — | Loan products |
| GET | /api/v1/cms/questionnaire | Public | — | Psychometric Qs |
| POST | /api/v1/cms/content | JWT | Admin | Create content |
| PATCH | /api/v1/cms/content/:key | JWT | Admin | Update content |
| DELETE | /api/v1/cms/content/:key | JWT | Admin | Delete content |
| GET | /api/v1/admin/model/metrics | JWT | Admin | ML metrics |
| POST | /api/v1/admin/model/retrain | JWT | Admin | Trigger retrain |
| GET | /api/v1/admin/reports/compliance | JWT | Admin/Compliance | Compliance report |
| GET | /api/v1/admin/audit/:type/:id | JWT | Admin/Compliance | Audit trail |

---

## 24. Error Codes & Handling

```typescript
// common/constants/error-codes.ts
export const ERROR_CODES = {
  // Auth
  OTP_SENT_FAILED:           { code: 'OTP_SENT_FAILED',          status: 502 },
  OTP_EXPIRED:               { code: 'OTP_EXPIRED',              status: 401 },
  OTP_INVALID:               { code: 'OTP_INVALID',              status: 401 },
  OTP_LOCKED:                { code: 'OTP_LOCKED',               status: 429 },
  TOKEN_BLACKLISTED:         { code: 'TOKEN_BLACKLISTED',        status: 401 },
  INVALID_TOKEN:             { code: 'INVALID_TOKEN',            status: 401 },
  SESSION_REVOKED:           { code: 'SESSION_REVOKED',          status: 401 },
  REFRESH_TOKEN_INVALID:     { code: 'REFRESH_TOKEN_INVALID',    status: 401 },
  INSUFFICIENT_PERMISSIONS:  { code: 'INSUFFICIENT_PERMISSIONS', status: 403 },
  ACCOUNT_LOCKED:            { code: 'ACCOUNT_LOCKED',           status: 423 },

  // KYC
  KYC_NOT_VERIFIED:          { code: 'KYC_NOT_VERIFIED',         status: 422 },
  KYC_SESSION_INVALID:       { code: 'INVALID_KYC_SESSION',      status: 400 },
  AADHAAR_MISMATCH:          { code: 'AADHAAR_MISMATCH',         status: 409 },
  LIVENESS_FAILED:           { code: 'LIVENESS_FAILED',          status: 422 },
  DIGILOCKER_UNAVAILABLE:    { code: 'DIGILOCKER_UNAVAILABLE',   status: 502 },

  // Consent
  CONSENT_ALREADY_ACTIVE:    { code: 'CONSENT_ALREADY_ACTIVE',   status: 409 },
  CONSENT_NOT_FOUND:         { code: 'CONSENT_NOT_FOUND',        status: 404 },
  AA_SERVICE_ERROR:          { code: 'AA_SERVICE_ERROR',         status: 502 },

  // Documents
  INVALID_FILE_TYPE:         { code: 'INVALID_FILE_TYPE',        status: 400 },
  FILE_TOO_LARGE:            { code: 'FILE_TOO_LARGE',           status: 400 },
  DOCUMENT_NOT_FOUND:        { code: 'DOCUMENT_NOT_FOUND',       status: 404 },
  S3_UPLOAD_FAILED:          { code: 'S3_UPLOAD_FAILED',         status: 502 },

  // Scoring
  SCORE_NOT_GENERATED:       { code: 'SCORE_NOT_GENERATED',      status: 422 },
  SCORING_UNAVAILABLE:       { code: 'SCORING_SERVICE_UNAVAILABLE', status: 503 },

  // Loans
  ACTIVE_LOAN_EXISTS:        { code: 'ACTIVE_LOAN_EXISTS',       status: 409 },
  LOAN_NOT_FOUND:            { code: 'LOAN_NOT_FOUND',           status: 404 },
  INVALID_LOAN_STATE:        { code: 'INVALID_LOAN_STATE',       status: 422 },
  LOAN_NOT_APPROVED:         { code: 'LOAN_NOT_APPROVED',        status: 422 },

  // EMI
  EMI_NOT_FOUND:             { code: 'EMI_NOT_FOUND',            status: 404 },

  // General
  VALIDATION_ERROR:          { code: 'VALIDATION_ERROR',         status: 422 },
  NOT_FOUND:                 { code: 'NOT_FOUND',                status: 404 },
  INTERNAL_ERROR:            { code: 'INTERNAL_ERROR',           status: 500 },
  RATE_LIMIT_EXCEEDED:       { code: 'RATE_LIMIT_EXCEEDED',      status: 429 },
} as const;
```

---

## 25. Security Implementation

### Request signing validation

```typescript
// interceptors/request-signature.interceptor.ts
@Injectable()
export class RequestSignatureInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const signature = req.headers['x-request-signature'];
    const timestamp = req.headers['x-request-timestamp'];

    if (!signature || !timestamp) return next.handle();

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 30000) throw new UnauthorizedException('REQUEST_REPLAY_DETECTED');

    const expectedSig = crypto
      .createHmac('sha256', process.env.REQUEST_SIGNING_SECRET)
      .update(`${timestamp}:${JSON.stringify(req.body)}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      throw new UnauthorizedException('INVALID_REQUEST_SIGNATURE');
    }

    return next.handle();
  }
}
```

### SQL injection prevention via TypeORM

All queries use parameterised QueryBuilder:

```typescript
const loans = await this.dataSource
  .getRepository(LoanApplicationEntity)
  .createQueryBuilder('loan')
  .where('loan.user_id = :userId', { userId })
  .andWhere('loan.state = :state', { state })
  .andWhere('loan.created_at BETWEEN :from AND :to', { from, to })
  .orderBy('loan.created_at', 'DESC')
  .skip(pagination.offset)
  .take(pagination.limit)
  .getMany();
```

### Helmet configuration

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}));
```

---

## 26. Logging & Monitoring

### OpenTelemetry setup

```typescript
// telemetry.ts (loaded before main.ts via --require)
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'credsaathi-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    environment: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```

### Prometheus metrics

```typescript
// shared/metrics/metrics.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

PrometheusModule.register({
  defaultMetrics: { enabled: true },
  customMetrics: {
    score_generation_duration_ms: {
      type: 'Histogram',
      help: 'Time taken to generate credit score',
      labelNames: ['model_version', 'risk_band'],
      buckets: [100, 500, 1000, 2000, 3000, 5000],
    },
    loan_application_total: {
      type: 'Counter',
      help: 'Total loan applications',
      labelNames: ['state', 'risk_band'],
    },
    otp_attempts_total: {
      type: 'Counter',
      help: 'OTP attempts',
      labelNames: ['outcome'],
    },
  },
})
```

---

## 27. Testing Strategy

### Unit test example — `auth.service.spec.ts`

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), increment: jest.fn() } },
        { provide: AuthRepository, useValue: { findUserByMobile: jest.fn(), createUser: jest.fn(), createSession: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'mock.jwt.token') } },
        { provide: ConfigService, useValue: { get: jest.fn((key) => ({ OTP_TTL_SECONDS: 300, OTP_MAX_ATTEMPTS: 5 })[key]) } },
        { provide: I18nService, useValue: { translate: jest.fn((key) => Promise.resolve(key)) } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    cacheService = module.get(CacheService);
  });

  describe('sendOtp', () => {
    it('should throw 429 when mobile is locked', async () => {
      cacheService.get.mockResolvedValueOnce('locked');
      await expect(service.sendOtp({ mobile: '+919876543210' }, 'en'))
        .rejects.toThrow();
    });

    it('should return expires_in on success', async () => {
      cacheService.get.mockResolvedValueOnce(null);
      const result = await service.sendOtp({ mobile: '+919876543210' }, 'en');
      expect(result.expires_in).toBe(300);
    });
  });

  describe('verifyOtp', () => {
    it('should throw 401 when OTP not found in cache', async () => {
      cacheService.get.mockResolvedValueOnce(null);
      await expect(service.verifyOtp({ mobile: '+91...', otp: '123456' }, 'en', '127.0.0.1', 'test'))
        .rejects.toThrow();
    });
  });
});
```

### E2E test example — `auth.e2e-spec.ts`

```typescript
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('POST /auth/otp/send — 200 with valid mobile', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ mobile: '+919876543210' })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.expires_in).toBe(300);
      });
  });

  it('POST /auth/otp/send — 422 with invalid mobile', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ mobile: 'not-a-number' })
      .expect(422);
  });

  afterAll(() => app.close());
});
```

### Test coverage targets

| Module | Unit | Integration | E2E |
|--------|------|-------------|-----|
| Auth | 95% | 90% | 100% |
| Loan | 90% | 85% | 90% |
| Scoring | 85% | 80% | 80% |
| EMI | 90% | 85% | 80% |
| KYC | 85% | 75% | 75% |
| CMS | 80% | 70% | 70% |

---

## 28. CI/CD Pipeline

### `.github/workflows/main.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: credsaathi/api

jobs:
  lint-and-test:
    name: Lint, Type-check, Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: credsaathi_test, POSTGRES_USER: test, POSTGRES_PASSWORD: test }
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7
        options: --health-cmd "redis-cli ping" --health-interval 10s

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with: { node-version: '${{ env.NODE_VERSION }}' }

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with: { version: 8 }

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type-check
        run: pnpm run type-check

      - name: Lint
        run: pnpm run lint

      - name: Unit tests
        run: pnpm run test:unit --coverage
        env:
          NODE_ENV: test
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          POSTGRES_DB: credsaathi_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          REDIS_HOST: localhost
          REDIS_PORT: 6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3

      - name: E2E tests
        run: pnpm run test:e2e

      - name: Security audit
        run: pnpm audit --audit-level=high

      - name: OWASP ZAP scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'http://localhost:3000'

  build-and-push:
    name: Build Docker image
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to Staging
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - name: Deploy via ArgoCD
        run: |
          argocd app set credsaathi-staging \
            --helm-set image.tag=${{ github.sha }}
          argocd app sync credsaathi-staging --wait
```

---

## 29. Docker & Kubernetes Deployment

### `Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8 --activate
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/shared/i18n/translations ./dist/shared/i18n/translations
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
CMD ["node", "-r", "./dist/telemetry.js", "dist/main.js"]
```

### `kubernetes/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: credsaathi-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels: { app: credsaathi-api }
  template:
    metadata:
      labels: { app: credsaathi-api }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      serviceAccountName: credsaathi-api
      containers:
        - name: api
          image: ghcr.io/credsaathi/api:latest
          ports:
            - containerPort: 3000
            - containerPort: 9090
          envFrom:
            - secretRef: { name: credsaathi-secrets }
            - configMapRef: { name: credsaathi-config }
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits: { cpu: "1000m", memory: "1Gi" }
          readinessProbe:
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 15
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /health/live, port: 3000 }
            initialDelaySeconds: 30
            periodSeconds: 30
          securityContext:
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 1001
            allowPrivilegeEscalation: false
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels: { app: credsaathi-api }
```

### `kubernetes/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: credsaathi-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: credsaathi-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Resource
      resource:
        name: memory
        target: { type: Utilization, averageUtilization: 80 }
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods, value: 4, periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent, value: 25, periodSeconds: 60
```

---

## 30. Performance & Scalability

### Database query optimisation

All frequently queried columns are indexed:

```sql
-- Partial indexes for common loan pipeline queries
CREATE INDEX idx_loans_submitted ON loan_applications (lender_id, created_at DESC)
  WHERE state = 'submitted';

CREATE INDEX idx_loans_active ON loan_applications (user_id)
  WHERE state IN ('submitted', 'under_review', 'approved', 'disbursed', 'repaying');

-- EMI due date index for nightly batch
CREATE INDEX idx_emi_due ON emi_schedules (due_date, status)
  WHERE status = 'pending';

-- Score lookup index
CREATE INDEX idx_scores_user_latest ON credit_scores (user_id, generated_at DESC);

-- Audit trail
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, logged_at DESC);

-- Consent fast lookup
CREATE INDEX idx_consent_active ON consent_records (user_id, data_source)
  WHERE is_active = true;
```

### Caching strategy

| Resource | Cache layer | TTL | Invalidation |
|----------|-------------|-----|--------------|
| User session (JWT) | Redis | 15 min | On logout |
| Feature vector | Redis | 24 hours | Nightly pipeline |
| Credit score | Redis | 1 hour | On new score |
| Consent bitmap | Redis | 10 min | On grant/revoke |
| CMS content | Redis | 1 hour | On admin update |
| Loan pipeline | Redis | 5 min | On state change |

### N+1 prevention

Always use `leftJoinAndSelect` or batch loading:

```typescript
const loans = await this.dataSource
  .getRepository(LoanApplicationEntity)
  .createQueryBuilder('loan')
  .leftJoinAndSelect('loan.score', 'score')
  .leftJoinAndSelect('loan.emiSchedules', 'emi')
  .where('loan.user_id = :userId', { userId })
  .getMany();
```

### Health check endpoints

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: MicroserviceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('postgres'),
      () => this.redis.pingCheck('redis'),
    ]);
  }

  @Get('live')
  liveness() { return { status: 'ok', timestamp: new Date() }; }
}
```

---

*CredSaathi Backend Technical Documentation — v1.0*
*Generated: 2024 · NestJS 10 · Node.js 20 · TypeScript 5*
*All code samples are production-ready and follow NestJS best practices.*