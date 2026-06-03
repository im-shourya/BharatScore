# BharatScore — Complete Database, Storage & Environment Documentation

> Full technical reference: PostgreSQL · MongoDB · Redis · ClickHouse · Kafka · S3/MinIO
> Schema · DDL · Indexes · Migrations · Pipeline · Feature Store · Backup · Security
> Version 1.0 · Production Grade

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables — Complete Reference](#2-environment-variables--complete-reference)
3. [PostgreSQL — Full Schema & DDL](#3-postgresql--full-schema--ddl)
4. [PostgreSQL — Indexes & Constraints](#4-postgresql--indexes--constraints)
5. [PostgreSQL — Migrations](#5-postgresql--migrations)
6. [PostgreSQL — Partitioning Strategy](#6-postgresql--partitioning-strategy)
7. [PostgreSQL — TypeORM Configuration](#7-postgresql--typeorm-configuration)
8. [MongoDB — All Collection Schemas](#8-mongodb--all-collection-schemas)
9. [MongoDB — Mongoose Models](#9-mongodb--mongoose-models)
10. [MongoDB — Indexes & TTL Policies](#10-mongodb--indexes--ttl-policies)
11. [Redis — Keyspace Design](#11-redis--keyspace-design)
12. [Redis — Configuration & Clustering](#12-redis--configuration--clustering)
13. [ClickHouse — Analytics Schema](#13-clickhouse--analytics-schema)
14. [ClickHouse — Queries & Materialized Views](#14-clickhouse--queries--materialized-views)
15. [Kafka — Topics, Schemas & Pipeline](#15-kafka--topics-schemas--pipeline)
16. [Feature Store — Design & Pipeline](#16-feature-store--design--pipeline)
17. [S3/MinIO — Storage Architecture](#17-s3minio--storage-architecture)
18. [S3/MinIO — Bucket Policies & Lifecycle](#18-s3minio--bucket-policies--lifecycle)
19. [Encryption — At Rest & In Transit](#19-encryption--at-rest--in-transit)
20. [Data Pipeline — End-to-End Flow](#20-data-pipeline--end-to-end-flow)
21. [Database Backup & Recovery](#21-database-backup--recovery)
22. [High Availability & Replication](#22-high-availability--replication)
23. [Performance Optimisation](#23-performance-optimisation)
24. [Monitoring & Alerting](#24-monitoring--alerting)
25. [DPDP Act & RBI Compliance](#25-dpdp-act--rbi-compliance)
26. [Data Retention Policies](#26-data-retention-policies)
27. [Seed Data & Fixtures](#27-seed-data--fixtures)
28. [Database Access Roles & Permissions](#28-database-access-roles--permissions)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  NestJS API (write path)          Python ML Services            │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
       ┌───────▼──────────┐    ┌──────────▼──────────┐
       │  Primary write   │    │  Feature service     │
       │  PostgreSQL 16   │    │  Redis feature store │
       │  (RDS Multi-AZ)  │    │  S3 Parquet snapshots│
       └───────┬──────────┘    └──────────────────────┘
               │ streaming replication
       ┌───────▼──────────┐
       │  Read replicas   │
       │  PostgreSQL 16   │
       │  (2× RDS read)   │
       └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Apache Kafka (event streaming)                                  │
│  Topics: raw-data · audit-events · consent-events               │
│           score-requests · loan-events · notifications          │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼────────────────────┐
         │                   │                    │
  ┌──────▼───────┐   ┌───────▼──────┐   ┌────────▼───────┐
  │  MongoDB 7   │   │  Redis 7     │   │  ClickHouse 24  │
  │  (Atlas)     │   │  (Cluster)   │   │  (Analytics)    │
  │  behavioral  │   │  cache/queue │   │  ML metrics     │
  │  data        │   │  sessions    │   │  NPA reports    │
  └──────────────┘   └──────────────┘   └────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  AWS S3 (ap-south-1)                                            │
│  credsaathi-kyc · credsaathi-statements                         │
│  credsaathi-ml-artifacts · credsaathi-audit-exports             │
└─────────────────────────────────────────────────────────────────┘
```

### Database responsibility matrix

| Database | What lives here | Access pattern |
|---|---|---|
| PostgreSQL (primary) | Users, KYC, sessions, consent, loans, EMI, audit | Write + transactional reads |
| PostgreSQL (replicas) | Same — reads only | Reporting, admin queries |
| MongoDB | Raw phone, bank, ecommerce, geo, psychometric data | Write-heavy ingestion, feature reads |
| Redis | Sessions, OTP, feature vectors, consent bitmap, job queues | Sub-millisecond cache |
| ClickHouse | ML predictions, model metrics, NPA reports, audit exports | Analytical aggregation |
| S3 | KYC files, bank statements, ML model weights, audit Parquet | Object store, presigned access |

---

## 2. Environment Variables — Complete Reference

### `.env.example` — Full file

```env
# ════════════════════════════════════════════════════════
# APPLICATION
# ════════════════════════════════════════════════════════
NODE_ENV=production
PORT=3000
API_VERSION=v1
APP_NAME=CredSaathi
APP_URL=https://app.credsaathi.in
API_URL=https://api.credsaathi.in
ALLOWED_ORIGINS=https://app.credsaathi.in,https://lender.credsaathi.in
CORS_CREDENTIALS=true
REQUEST_TIMEOUT_MS=30000
REQUEST_SIGNING_SECRET=64_byte_hex_signing_secret_here

# ════════════════════════════════════════════════════════
# POSTGRESQL — PRIMARY
# ════════════════════════════════════════════════════════
POSTGRES_HOST=credsaathi-prod.cluster.ap-south-1.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=credsaathi
POSTGRES_USER=credsaathi_app
POSTGRES_PASSWORD=super_strong_password_here
POSTGRES_SSL=true
POSTGRES_SSL_CA=/etc/ssl/certs/rds-ca-2019-root.pem
POSTGRES_MAX_CONNECTIONS=50
POSTGRES_MIN_CONNECTIONS=5
POSTGRES_IDLE_TIMEOUT_MS=30000
POSTGRES_CONNECTION_TIMEOUT_MS=3000
POSTGRES_STATEMENT_TIMEOUT_MS=15000
POSTGRES_POOL_ACQUIRE_TIMEOUT_MS=20000
POSTGRES_LOG_SLOW_QUERIES=true
POSTGRES_SLOW_QUERY_THRESHOLD_MS=1000

# ════════════════════════════════════════════════════════
# POSTGRESQL — READ REPLICA
# ════════════════════════════════════════════════════════
POSTGRES_REPLICA_HOST=credsaathi-prod-ro.cluster.ap-south-1.rds.amazonaws.com
POSTGRES_REPLICA_PORT=5432
POSTGRES_REPLICA_USER=credsaathi_readonly
POSTGRES_REPLICA_PASSWORD=readonly_password_here
POSTGRES_REPLICA_MAX_CONNECTIONS=30

# ════════════════════════════════════════════════════════
# MONGODB
# ════════════════════════════════════════════════════════
MONGODB_URI=mongodb+srv://credsaathi_user:password@cluster0.abc123.mongodb.net/credsaathi?retryWrites=true&w=majority
MONGODB_DB_NAME=credsaathi_behavioral
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
MONGODB_SOCKET_TIMEOUT_MS=45000
MONGODB_CONNECT_TIMEOUT_MS=10000
MONGODB_HEARTBEAT_FREQUENCY_MS=10000
MONGODB_MAX_IDLE_TIME_MS=120000
MONGODB_CSFLE_KEY=64_byte_hex_key_for_client_side_field_level_encryption

# ════════════════════════════════════════════════════════
# REDIS — PRIMARY
# ════════════════════════════════════════════════════════
REDIS_HOST=credsaathi-redis.abc123.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=redis_auth_password
REDIS_TLS=true
REDIS_TLS_SERVERNAME=credsaathi-redis.abc123.cache.amazonaws.com
REDIS_KEY_PREFIX=cs:
REDIS_DEFAULT_TTL=3600
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_MAX_RETRIES_PER_REQUEST=3
REDIS_RETRY_DELAY_MS=100
REDIS_ENABLE_READY_CHECK=true

# Redis cluster nodes (if using cluster mode)
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379

# ════════════════════════════════════════════════════════
# REDIS — BULL QUEUE
# ════════════════════════════════════════════════════════
BULL_REDIS_HOST=credsaathi-queue.abc123.cache.amazonaws.com
BULL_REDIS_PORT=6379
BULL_REDIS_PASSWORD=bull_redis_password
BULL_REDIS_TLS=true
BULL_DEFAULT_JOB_ATTEMPTS=3
BULL_BACKOFF_DELAY_MS=5000
BULL_REMOVE_ON_COMPLETE=100
BULL_REMOVE_ON_FAIL=200

# ════════════════════════════════════════════════════════
# CLICKHOUSE
# ════════════════════════════════════════════════════════
CLICKHOUSE_HOST=clickhouse.credsaathi.internal
CLICKHOUSE_PORT=8123
CLICKHOUSE_NATIVE_PORT=9000
CLICKHOUSE_USER=credsaathi_analytics
CLICKHOUSE_PASSWORD=clickhouse_password_here
CLICKHOUSE_DATABASE=credsaathi_analytics
CLICKHOUSE_MAX_CONNECTIONS=20
CLICKHOUSE_REQUEST_TIMEOUT_MS=30000
CLICKHOUSE_COMPRESSION=true

# ════════════════════════════════════════════════════════
# APACHE KAFKA
# ════════════════════════════════════════════════════════
KAFKA_BROKERS=broker1.credsaathi.internal:9092,broker2.credsaathi.internal:9092,broker3.credsaathi.internal:9092
KAFKA_CLIENT_ID=credsaathi-api
KAFKA_GROUP_ID=credsaathi-main-consumers
KAFKA_FEATURE_GROUP_ID=credsaathi-feature-consumers
KAFKA_AUDIT_GROUP_ID=credsaathi-audit-consumers
KAFKA_SSL=true
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=credsaathi_kafka
KAFKA_SASL_PASSWORD=kafka_sasl_password
KAFKA_CONNECTION_TIMEOUT_MS=3000
KAFKA_REQUEST_TIMEOUT_MS=25000
KAFKA_RETRY_MAX_RETRIES=5
KAFKA_RETRY_INITIAL_RETRY_TIME_MS=300
KAFKA_RETRY_MULTIPLIER=2
KAFKA_SESSION_TIMEOUT_MS=30000
KAFKA_REBALANCE_TIMEOUT_MS=60000
KAFKA_HEARTBEAT_INTERVAL_MS=3000

# ════════════════════════════════════════════════════════
# AWS S3
# ════════════════════════════════════════════════════════
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_SESSION_TOKEN=
S3_BUCKET_KYC=credsaathi-kyc-prod
S3_BUCKET_STATEMENTS=credsaathi-statements-prod
S3_BUCKET_ML_ARTIFACTS=credsaathi-ml-artifacts-prod
S3_BUCKET_AUDIT_EXPORTS=credsaathi-audit-exports-prod
S3_PRESIGNED_URL_EXPIRY_SECONDS=900
S3_MULTIPART_UPLOAD_THRESHOLD_MB=10
S3_MAX_UPLOAD_SIZE_MB=50
S3_UPLOAD_TIMEOUT_MS=120000
AWS_KMS_KEY_ARN=arn:aws:kms:ap-south-1:123456789012:key/mrk-abc123
AWS_KMS_KEY_ARN_STATEMENTS=arn:aws:kms:ap-south-1:123456789012:key/mrk-def456
AWS_KMS_ROTATION_ENABLED=true
S3_OBJECT_LOCK_ENABLED=true
S3_VERSIONING_ENABLED=true

# MinIO (local/staging alternative to S3)
MINIO_ENDPOINT=minio.credsaathi.internal
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=minio_access_key
MINIO_SECRET_KEY=minio_secret_key

# ════════════════════════════════════════════════════════
# ENCRYPTION
# ════════════════════════════════════════════════════════
ENCRYPTION_KEY=64_char_hex_aes256_key_here_never_commit_to_git
ENCRYPTION_IV_LENGTH=16
ENCRYPTION_AUTH_TAG_LENGTH=16
ENCRYPTION_ALGORITHM=aes-256-gcm
DATA_KEY_CACHE_TTL_SECONDS=3600
HASH_SALT=separate_64_char_hex_salt_for_hashing

# ════════════════════════════════════════════════════════
# JWT & KEYCLOAK
# ════════════════════════════════════════════════════════
JWT_ACCESS_PRIVATE_KEY_PATH=/run/secrets/jwt_private_key
JWT_ACCESS_PUBLIC_KEY_PATH=/run/secrets/jwt_public_key
JWT_ACCESS_EXPIRY=900s
JWT_REFRESH_EXPIRY=7d
JWT_ISSUER=credsaathi-auth
JWT_AUDIENCE=credsaathi-api
KEYCLOAK_URL=https://auth.credsaathi.in
KEYCLOAK_REALM=credsaathi
KEYCLOAK_CLIENT_ID=credsaathi-api
KEYCLOAK_CLIENT_SECRET=keycloak_client_secret_here
KEYCLOAK_PUBLIC_KEY_REFRESH_INTERVAL_MS=3600000

# ════════════════════════════════════════════════════════
# OTP (UIDAI / Aadhaar)
# ════════════════════════════════════════════════════════
UIDAI_API_URL=https://api.uidai.gov.in/otp
UIDAI_API_KEY=uidai_registered_api_key
UIDAI_EKYC_URL=https://api.uidai.gov.in/ekyc
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
OTP_LOCKOUT_SECONDS=1800
OTP_LENGTH=6

# ════════════════════════════════════════════════════════
# DIGILOCKER
# ════════════════════════════════════════════════════════
DIGILOCKER_BASE_URL=https://api.digitallocker.gov.in/public/oauth2/1
DIGILOCKER_CLIENT_ID=your_digilocker_client_id
DIGILOCKER_CLIENT_SECRET=your_digilocker_client_secret
DIGILOCKER_REDIRECT_URI=https://api.credsaathi.in/api/v1/kyc/callback
DIGILOCKER_SESSION_TTL_SECONDS=600

# ════════════════════════════════════════════════════════
# ACCOUNT AGGREGATOR (Setu / Finvu)
# ════════════════════════════════════════════════════════
AA_PROVIDER=setu
AA_BASE_URL=https://api.setu.co/api/v1/aa
AA_CLIENT_ID=your_aa_client_id
AA_CLIENT_SECRET=your_aa_client_secret
AA_PRODUCT_INSTANCE_ID=your_product_instance_id
AA_REDIRECT_URI=https://api.credsaathi.in/api/v1/consent/callback
AA_CONSENT_TTL_DAYS=90
AA_DATA_FETCH_TIMEOUT_MS=30000

# ════════════════════════════════════════════════════════
# ML / SCORING SERVICE
# ════════════════════════════════════════════════════════
SCORING_SERVICE_URL=http://scoring-service.credsaathi.internal:8080
SCORING_SERVICE_TIMEOUT_MS=5000
SCORING_SERVICE_API_KEY=internal_service_api_key
ML_MODEL_VERSION=v2.1.0
FEATURE_VERSION=v3.0
MLFLOW_TRACKING_URI=http://mlflow.credsaathi.internal:5000
MLFLOW_EXPERIMENT_NAME=credsaathi-credit-scoring
MLFLOW_S3_ARTIFACT_ROOT=s3://credsaathi-ml-artifacts-prod/mlflow
FEATURE_CACHE_TTL_SECONDS=86400
SCORE_CACHE_TTL_SECONDS=3600
SHAP_TOP_N_FEATURES=10

# ════════════════════════════════════════════════════════
# NOTIFICATIONS
# ════════════════════════════════════════════════════════
# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+919876500000
TWILIO_STATUS_CALLBACK_URL=https://api.credsaathi.in/api/v1/webhooks/twilio

# MSG91 (SMS fallback)
MSG91_API_KEY=your_msg91_api_key
MSG91_SENDER_ID=CSATHI
MSG91_TEMPLATE_ID_OTP=msg91_otp_template_id

# WhatsApp (Meta Cloud API)
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_TOKEN=your_whatsapp_business_token
WHATSAPP_VERIFY_TOKEN=webhook_verify_token

# SendGrid (Email)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@credsaathi.in
SENDGRID_FROM_NAME=CredSaathi

# Firebase (Push)
FIREBASE_PROJECT_ID=credsaathi-prod
FIREBASE_PRIVATE_KEY_ID=firebase_key_id
FIREBASE_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@credsaathi-prod.iam.gserviceaccount.com

# ════════════════════════════════════════════════════════
# PAYMENT GATEWAY
# ════════════════════════════════════════════════════════
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=razorpay_secret
RAZORPAY_WEBHOOK_SECRET=webhook_secret
IMPS_PROVIDER_URL=https://api.paymentgateway.com/imps
IMPS_MERCHANT_ID=merchant_id
IMPS_MERCHANT_KEY=merchant_key

# ════════════════════════════════════════════════════════
# RATE LIMITING
# ════════════════════════════════════════════════════════
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT_DEFAULT=60
THROTTLE_LIMIT_OTP_SEND=3
THROTTLE_LIMIT_OTP_VERIFY=5
THROTTLE_LIMIT_SCORE=10
THROTTLE_LIMIT_UPLOAD=20

# ════════════════════════════════════════════════════════
# MONITORING & OBSERVABILITY
# ════════════════════════════════════════════════════════
PROMETHEUS_PORT=9090
PROMETHEUS_PATH=/metrics
OTEL_SERVICE_NAME=credsaathi-api
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.credsaathi.internal:4318
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
SENTRY_DSN=https://xxx@o123456.ingest.sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.05
LOG_LEVEL=info
LOG_FORMAT=json
PINO_PRETTY=false
HEALTH_CHECK_TIMEOUT_MS=3000

# ════════════════════════════════════════════════════════
# AIRFLOW (ML retraining)
# ════════════════════════════════════════════════════════
AIRFLOW_BASE_URL=http://airflow.credsaathi.internal:8080
AIRFLOW_USERNAME=airflow_admin
AIRFLOW_PASSWORD=airflow_password
AIRFLOW_RETRAIN_DAG_ID=credsaathi_monthly_retrain
AIRFLOW_PSI_THRESHOLD=0.2

# ════════════════════════════════════════════════════════
# FEATURE FLAGS
# ════════════════════════════════════════════════════════
FEATURE_LSTM_MODEL=true
FEATURE_PSYCHOMETRIC_MODEL=true
FEATURE_AA_INTEGRATION=true
FEATURE_WHATSAPP_NOTIFICATIONS=true
FEATURE_PUSH_NOTIFICATIONS=true
FEATURE_SECOND_APPROVER=true
FEATURE_AUTO_DISBURSAL=false
FEATURE_SHADOW_SCORING=false
FEATURE_REJECT_INFERENCE=true
```

---

## 3. PostgreSQL — Full Schema & DDL

### Database initialisation

```sql
-- Create database and extensions
CREATE DATABASE credsaathi
  WITH OWNER = credsaathi_admin
  ENCODING = 'UTF8'
  LOCALE = 'en_IN.UTF-8'
  TEMPLATE = template0;

\c credsaathi

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram indexes for text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN indexes for composite queries
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance tracking
CREATE EXTENSION IF NOT EXISTS "pg_partman";     -- Partition management

-- Set default timezone
SET timezone = 'Asia/Kolkata';
ALTER DATABASE credsaathi SET timezone TO 'Asia/Kolkata';

-- Custom domain types
CREATE DOMAIN mobile_number AS VARCHAR(15)
  CHECK (VALUE ~ '^\+91[6-9][0-9]{9}$');

CREATE DOMAIN currency_amount AS BIGINT
  CHECK (VALUE >= 0);

CREATE DOMAIN credit_score AS INTEGER
  CHECK (VALUE >= 300 AND VALUE <= 900);

CREATE DOMAIN percentage AS DECIMAL(8, 6)
  CHECK (VALUE >= 0 AND VALUE <= 1);
```

### Table 1 — `users`

```sql
CREATE TYPE user_role AS ENUM (
  'borrower', 'lender', 'admin', 'compliance', 'support'
);

CREATE TYPE user_status AS ENUM (
  'pending', 'active', 'suspended', 'deleted', 'banned'
);

CREATE TABLE users (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number         VARCHAR(15)   NOT NULL UNIQUE,
  full_name_encrypted   TEXT,
  email_encrypted       TEXT,
  role                  user_role     NOT NULL DEFAULT 'borrower',
  status                user_status   NOT NULL DEFAULT 'pending',
  locale                VARCHAR(10)   NOT NULL DEFAULT 'en',
  fcm_token             TEXT,
  onboarding_step       SMALLINT      NOT NULL DEFAULT 0
                        CHECK (onboarding_step BETWEEN 0 AND 10),
  referral_code         VARCHAR(20)   UNIQUE,
  referred_by_id        UUID          REFERENCES users(id) ON DELETE SET NULL,
  deletion_requested_at TIMESTAMPTZ,
  deletion_scheduled_at TIMESTAMPTZ,
  last_login_at         TIMESTAMPTZ,
  login_count           INTEGER       NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Prevent hard deletes — use status = 'deleted' instead
CREATE RULE no_delete_users AS ON DELETE TO users DO INSTEAD NOTHING;

COMMENT ON TABLE users IS 'Master identity table. No raw PII — all sensitive fields AES-256-GCM encrypted at application layer.';
COMMENT ON COLUMN users.mobile_number IS 'E.164 format Indian mobile. Unique system identifier.';
COMMENT ON COLUMN users.full_name_encrypted IS 'AES-256-GCM: format iv:authtag:ciphertext';
COMMENT ON COLUMN users.deletion_scheduled_at IS 'DPDP Act: data purge at this timestamp (72h after request)';
```

### Table 2 — `kyc_records`

```sql
CREATE TYPE kyc_status AS ENUM (
  'pending',
  'aadhaar_verified',
  'pan_verified',
  'fully_verified',
  'liveness_passed',
  'failed',
  'expired'
);

CREATE TABLE kyc_records (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  aadhaar_hash              VARCHAR(64),
  pan_hash                  VARCHAR(64),
  digilocker_ref            VARCHAR(300),
  digilocker_access_token   TEXT,
  verification_status       kyc_status    NOT NULL DEFAULT 'pending',
  liveness_check_status     VARCHAR(20),
  face_match_score          DECIMAL(5,2)  CHECK (face_match_score BETWEEN 0 AND 100),
  extracted_data_encrypted  JSONB,
  pan_verified_at           TIMESTAMPTZ,
  aadhaar_verified_at       TIMESTAMPTZ,
  liveness_verified_at      TIMESTAMPTZ,
  verified_at               TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ   DEFAULT NOW() + INTERVAL '1 year',
  failure_reason            TEXT,
  attempts                  SMALLINT      NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN kyc_records.aadhaar_hash IS 'SHA-256 of raw Aadhaar number. Never store raw Aadhaar.';
COMMENT ON COLUMN kyc_records.extracted_data_encrypted IS 'Encrypted JSONB: name, dob, address, gender. Never plaintext.';
```

### Table 3 — `sessions`

```sql
CREATE TABLE sessions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jwt_jti             VARCHAR(200)  NOT NULL UNIQUE,
  refresh_token_hash  VARCHAR(128)  NOT NULL UNIQUE,
  device_fingerprint  VARCHAR(300),
  ip_address          INET,
  user_agent          TEXT,
  platform            VARCHAR(50),
  app_version         VARCHAR(20),
  is_revoked          BOOLEAN       NOT NULL DEFAULT false,
  revoked_at          TIMESTAMPTZ,
  revoked_reason      VARCHAR(100),
  expires_at          TIMESTAMPTZ   NOT NULL,
  last_used_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### Table 4 — `consent_records`

```sql
CREATE TYPE data_source AS ENUM (
  'phone', 'bank', 'ecommerce', 'geolocation', 'merchant', 'psychometric'
);

CREATE TYPE consent_scope AS ENUM (
  'read', 'read_aggregate', 'read_process'
);

CREATE TABLE consent_records (
  id                          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_source                 data_source   NOT NULL,
  scope                       consent_scope NOT NULL DEFAULT 'read',
  is_active                   BOOLEAN       NOT NULL DEFAULT true,
  aa_handle                   VARCHAR(200),
  aa_consent_id               VARCHAR(300),
  aa_fip_id                   VARCHAR(100),
  purpose_code                VARCHAR(50)   NOT NULL DEFAULT 'CREDIT_SCORING',
  purpose_text                TEXT,
  consent_hash                VARCHAR(128)  NOT NULL,
  granted_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  valid_until                 TIMESTAMPTZ   NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  revoked_at                  TIMESTAMPTZ,
  data_deletion_scheduled_at  TIMESTAMPTZ,
  data_deleted_at             TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (user_id, data_source, is_active)
    DEFERRABLE INITIALLY DEFERRED
);

-- Consent is append-only: no updates, no deletes
CREATE RULE no_update_consent AS ON UPDATE TO consent_records DO INSTEAD NOTHING;
CREATE RULE no_delete_consent AS ON DELETE TO consent_records DO INSTEAD NOTHING;
```

### Table 5 — `documents`

```sql
CREATE TYPE doc_type AS ENUM (
  'aadhaar_front', 'aadhaar_back', 'pan',
  'bank_statement', 'income_proof', 'itr',
  'selfie', 'selfie_with_id',
  'business_reg', 'gst_certificate',
  'udyam_certificate', 'trade_licence'
);

CREATE TABLE documents (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  doc_type            doc_type      NOT NULL,
  s3_key_encrypted    TEXT          NOT NULL,
  s3_bucket           VARCHAR(100)  NOT NULL,
  file_hash           VARCHAR(64)   NOT NULL,
  size_bytes          INTEGER       NOT NULL CHECK (size_bytes > 0),
  mime_type           VARCHAR(100)  NOT NULL,
  is_verified         BOOLEAN       NOT NULL DEFAULT false,
  verified_by         UUID          REFERENCES users(id),
  verified_at         TIMESTAMPTZ,
  is_deleted          BOOLEAN       NOT NULL DEFAULT false,
  deletion_reason     VARCHAR(200),
  hard_delete_at      TIMESTAMPTZ,
  hard_deleted_at     TIMESTAMPTZ,
  retention_years     SMALLINT      NOT NULL DEFAULT 7,
  uploaded_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, doc_type, is_deleted)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON COLUMN documents.s3_key_encrypted IS 'AES-256-GCM encrypted S3 object key. Decrypt at app layer to get actual path.';
COMMENT ON COLUMN documents.file_hash IS 'SHA-256 of original (pre-encryption) file for integrity verification.';
COMMENT ON COLUMN documents.retention_years IS 'RBI requires 7 years minimum for loan-related documents.';
```

### Table 6 — `credit_scores`

```sql
CREATE TYPE risk_band AS ENUM (
  'very_high', 'high', 'medium', 'low', 'very_low'
);

CREATE TABLE credit_scores (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score               INTEGER       NOT NULL CHECK (score BETWEEN 300 AND 900),
  risk_band           risk_band     NOT NULL,
  model1_pd           DECIMAL(10,8) NOT NULL CHECK (model1_pd BETWEEN 0 AND 1),
  model2_risk         DECIMAL(10,8) NOT NULL CHECK (model2_risk BETWEEN 0 AND 1),
  model3_stability    DECIMAL(10,8) NOT NULL CHECK (model3_stability BETWEEN 0 AND 1),
  ensemble_pd         DECIMAL(10,8) NOT NULL CHECK (ensemble_pd BETWEEN 0 AND 1),
  shap_values         JSONB         NOT NULL DEFAULT '[]',
  feature_version     VARCHAR(20)   NOT NULL,
  model_version       VARCHAR(30)   NOT NULL,
  data_completeness   JSONB         NOT NULL DEFAULT '{}',
  features_snapshot   JSONB,
  is_valid            BOOLEAN       NOT NULL DEFAULT true,
  invalidated_at      TIMESTAMPTZ,
  invalidation_reason TEXT,
  generated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Scores are immutable: never update a score, create a new one
CREATE RULE no_update_scores AS ON UPDATE TO credit_scores DO INSTEAD NOTHING;

COMMENT ON COLUMN credit_scores.features_snapshot IS 'Snapshot of all 40+ feature values at time of scoring. Used for model auditing.';
COMMENT ON COLUMN credit_scores.shap_values IS 'Array of {feature, contribution, direction, value, percentile} objects.';
```

### Table 7 — `loan_applications`

```sql
CREATE TYPE loan_state AS ENUM (
  'draft', 'submitted', 'under_review',
  'pending_second_approval',
  'approved', 'rejected',
  'disbursed', 'repaying',
  'closed', 'defaulted',
  'written_off'
);

CREATE TYPE loan_purpose AS ENUM (
  'working_capital', 'equipment_purchase', 'inventory',
  'business_expansion', 'personal_emergency', 'education',
  'medical', 'home_improvement', 'agriculture', 'other'
);

CREATE TABLE loan_applications (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score_id              UUID          REFERENCES credit_scores(id),
  lender_id             UUID          REFERENCES users(id),
  second_approver_id    UUID          REFERENCES users(id),
  amount_requested      BIGINT        NOT NULL CHECK (amount_requested BETWEEN 1000 AND 50000000),
  amount_approved       BIGINT        CHECK (amount_approved > 0),
  tenure_months         SMALLINT      NOT NULL CHECK (tenure_months BETWEEN 1 AND 60),
  purpose               loan_purpose  NOT NULL,
  purpose_description   TEXT,
  state                 loan_state    NOT NULL DEFAULT 'draft',
  interest_rate         DECIMAL(6,3)  CHECK (interest_rate BETWEEN 0 AND 100),
  processing_fee        BIGINT        DEFAULT 0,
  rejection_reason      TEXT,
  rejection_code        VARCHAR(50),
  disbursement_account  TEXT,
  disbursement_utr      VARCHAR(50),
  applied_at            TIMESTAMPTZ,
  decided_at            TIMESTAMPTZ,
  disbursed_at          TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  dpd_90_triggered_at   TIMESTAMPTZ,
  metadata              JSONB         NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT one_active_loan_per_user EXCLUDE
    USING btree (user_id WITH =)
    WHERE (state NOT IN ('rejected', 'closed', 'written_off', 'draft'))
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON COLUMN loan_applications.amount_requested IS 'In Indian Paise (1 INR = 100 paise) for precision. Display as INR/100.';
COMMENT ON COLUMN loan_applications.disbursement_account IS 'Encrypted beneficiary account details.';
```

### Table 8 — `loan_state_transitions`

```sql
CREATE TABLE loan_state_transitions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         UUID          NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  actor_id        UUID          REFERENCES users(id),
  from_state      loan_state    NOT NULL,
  to_state        loan_state    NOT NULL,
  reason          TEXT,
  metadata        JSONB         NOT NULL DEFAULT '{}',
  ip_address      INET,
  transitioned_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_transition CHECK (from_state != to_state)
);

-- Append-only: the history must never be altered
CREATE RULE no_delete_transitions AS ON DELETE TO loan_state_transitions DO INSTEAD NOTHING;
CREATE RULE no_update_transitions AS ON UPDATE TO loan_state_transitions DO INSTEAD NOTHING;
```

### Table 9 — `emi_schedules`

```sql
CREATE TYPE emi_status AS ENUM (
  'pending', 'paid', 'partially_paid',
  'late', 'waived', 'defaulted'
);

CREATE TABLE emi_schedules (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id               UUID          NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  installment_number    SMALLINT      NOT NULL CHECK (installment_number > 0),
  principal_amount      BIGINT        NOT NULL CHECK (principal_amount > 0),
  interest_amount       BIGINT        NOT NULL CHECK (interest_amount >= 0),
  total_amount_due      BIGINT        NOT NULL,
  amount_paid           BIGINT        NOT NULL DEFAULT 0,
  outstanding_principal BIGINT,
  due_date              DATE          NOT NULL,
  status                emi_status    NOT NULL DEFAULT 'pending',
  days_past_due         INTEGER       NOT NULL DEFAULT 0,
  late_fee              BIGINT        NOT NULL DEFAULT 0,
  waiver_amount         BIGINT        NOT NULL DEFAULT 0,
  waiver_reason         TEXT,
  UNIQUE (loan_id, installment_number)
) PARTITION BY RANGE (due_date);

-- Monthly partitions (managed by pg_partman)
SELECT partman.create_parent(
  p_parent_table := 'public.emi_schedules',
  p_control := 'due_date',
  p_type := 'range',
  p_interval := 'monthly',
  p_premake := 3
);
```

### Table 10 — `repayment_events`

```sql
CREATE TYPE payment_mode AS ENUM (
  'imps', 'neft', 'rtgs', 'upi', 'nach', 'cash', 'cheque'
);

CREATE TABLE repayment_events (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id           UUID          NOT NULL REFERENCES loan_applications(id) ON DELETE RESTRICT,
  emi_id            UUID          NOT NULL REFERENCES emi_schedules(id),
  amount_paid       BIGINT        NOT NULL CHECK (amount_paid > 0),
  payment_mode      payment_mode  NOT NULL,
  utr_number        VARCHAR(50)   UNIQUE,
  bank_reference    VARCHAR(100),
  days_late         INTEGER       NOT NULL DEFAULT 0,
  is_partial        BOOLEAN       NOT NULL DEFAULT false,
  bank_response     JSONB,
  reconciled        BOOLEAN       NOT NULL DEFAULT false,
  reconciled_at     TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (paid_at);

SELECT partman.create_parent(
  p_parent_table := 'public.repayment_events',
  p_control := 'paid_at',
  p_type := 'range',
  p_interval := 'monthly',
  p_premake := 3
);
```

### Table 11 — `audit_logs`

```sql
CREATE TABLE audit_logs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID          REFERENCES users(id),
  actor_role      VARCHAR(50),
  entity_type     VARCHAR(50)   NOT NULL,
  entity_id       UUID,
  action          VARCHAR(100)  NOT NULL,
  payload_hash    VARCHAR(64)   NOT NULL,
  prev_hash       VARCHAR(64),
  ip_address      INET,
  user_agent      TEXT,
  request_id      VARCHAR(50),
  metadata        JSONB         NOT NULL DEFAULT '{}',
  logged_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (logged_at);

SELECT partman.create_parent(
  p_parent_table := 'public.audit_logs',
  p_control := 'logged_at',
  p_type := 'range',
  p_interval := 'monthly',
  p_premake := 3
);

-- Audit logs are immutable
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
```

### Table 12 — `notifications`

```sql
CREATE TYPE notification_channel AS ENUM (
  'sms', 'whatsapp', 'email', 'push', 'in_app'
);

CREATE TYPE notification_status AS ENUM (
  'queued', 'processing', 'sent', 'delivered', 'failed', 'bounced'
);

CREATE TABLE notifications (
  id                UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID                  NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  channel           notification_channel  NOT NULL,
  event_type        VARCHAR(100)          NOT NULL,
  template_id       VARCHAR(100),
  content_encrypted TEXT,
  locale            VARCHAR(10)           NOT NULL DEFAULT 'en',
  status            notification_status   NOT NULL DEFAULT 'queued',
  retry_count       SMALLINT             NOT NULL DEFAULT 0,
  max_retries       SMALLINT             NOT NULL DEFAULT 3,
  provider          VARCHAR(50),
  provider_msg_id   VARCHAR(200),
  provider_response JSONB,
  scheduled_at      TIMESTAMPTZ,
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  created_at        TIMESTAMPTZ           NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

SELECT partman.create_parent(
  p_parent_table := 'public.notifications',
  p_control := 'created_at',
  p_type := 'range',
  p_interval := 'monthly',
  p_premake := 2
);
```

### CMS Tables

```sql
-- cms_content: all translatable content
CREATE TABLE cms_content (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  key           VARCHAR(200)  NOT NULL,
  locale        VARCHAR(10)   NOT NULL,
  namespace     VARCHAR(50)   NOT NULL,
  content       JSONB         NOT NULL,
  version       INTEGER       NOT NULL DEFAULT 1,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  published_at  TIMESTAMPTZ,
  created_by    UUID          REFERENCES users(id),
  updated_by    UUID          REFERENCES users(id),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (key, locale)
);

-- cms_faqs
CREATE TABLE cms_faqs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(50)   NOT NULL,
  question    TEXT          NOT NULL,
  answer      TEXT          NOT NULL,
  locale      VARCHAR(10)   NOT NULL DEFAULT 'en',
  sort_order  SMALLINT      NOT NULL DEFAULT 0,
  tags        TEXT[],
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- cms_loan_products
CREATE TABLE cms_loan_products (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code          VARCHAR(50)   NOT NULL UNIQUE,
  name_json             JSONB         NOT NULL,
  description_json      JSONB         NOT NULL,
  min_amount            BIGINT        NOT NULL,
  max_amount            BIGINT        NOT NULL,
  min_tenure_months     SMALLINT      NOT NULL,
  max_tenure_months     SMALLINT      NOT NULL,
  interest_rate_min     DECIMAL(6,3)  NOT NULL,
  interest_rate_max     DECIMAL(6,3)  NOT NULL,
  processing_fee_pct    DECIMAL(5,3)  NOT NULL DEFAULT 0,
  eligible_risk_bands   risk_band[]   NOT NULL,
  min_score             INTEGER       NOT NULL DEFAULT 300,
  is_active             BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- cms_questionnaire_questions
CREATE TABLE cms_questionnaire_questions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  version         VARCHAR(10)   NOT NULL,
  q_number        SMALLINT      NOT NULL,
  group_name      VARCHAR(50)   NOT NULL,
  question_json   JSONB         NOT NULL,
  options_json    JSONB         NOT NULL,
  scoring_rule    JSONB         NOT NULL,
  weight          DECIMAL(5,4)  NOT NULL DEFAULT 1.0,
  is_mandatory    BOOLEAN       NOT NULL DEFAULT true,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  UNIQUE (version, q_number)
);
```

---

## 4. PostgreSQL — Indexes & Constraints

```sql
-- ── USERS ────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_users_mobile ON users (mobile_number);
CREATE INDEX idx_users_role_status ON users (role, status);
CREATE INDEX idx_users_created_at ON users (created_at DESC);
CREATE INDEX idx_users_deletion_scheduled ON users (deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL AND status != 'deleted';

-- ── SESSIONS ─────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_sessions_jti ON sessions (jwt_jti);
CREATE UNIQUE INDEX idx_sessions_refresh ON sessions (refresh_token_hash);
CREATE INDEX idx_sessions_user_active ON sessions (user_id, expires_at)
  WHERE is_revoked = false;
CREATE INDEX idx_sessions_expires ON sessions (expires_at)
  WHERE is_revoked = false;

-- ── KYC ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_kyc_user ON kyc_records (user_id);
CREATE INDEX idx_kyc_status ON kyc_records (verification_status);

-- ── CONSENT ──────────────────────────────────────────────────────────
CREATE INDEX idx_consent_user_source ON consent_records (user_id, data_source, is_active);
CREATE INDEX idx_consent_deletion ON consent_records (data_deletion_scheduled_at)
  WHERE data_deletion_scheduled_at IS NOT NULL AND data_deleted_at IS NULL;
CREATE INDEX idx_consent_expiry ON consent_records (valid_until)
  WHERE is_active = true;

-- ── DOCUMENTS ────────────────────────────────────────────────────────
CREATE INDEX idx_docs_user_type ON documents (user_id, doc_type)
  WHERE is_deleted = false;
CREATE INDEX idx_docs_hard_delete ON documents (hard_delete_at)
  WHERE hard_delete_at IS NOT NULL AND hard_deleted_at IS NULL;
CREATE UNIQUE INDEX idx_docs_hash ON documents (file_hash)
  WHERE is_deleted = false;

-- ── CREDIT SCORES ─────────────────────────────────────────────────────
CREATE INDEX idx_scores_user_date ON credit_scores (user_id, generated_at DESC);
CREATE INDEX idx_scores_band ON credit_scores (risk_band, generated_at DESC);
CREATE INDEX idx_scores_model ON credit_scores (model_version, generated_at DESC);

-- ── LOAN APPLICATIONS ─────────────────────────────────────────────────
CREATE INDEX idx_loans_user_state ON loan_applications (user_id, state);
CREATE INDEX idx_loans_lender_state ON loan_applications (lender_id, state, applied_at DESC)
  WHERE lender_id IS NOT NULL;
CREATE INDEX idx_loans_submitted ON loan_applications (applied_at DESC)
  WHERE state = 'submitted';
CREATE INDEX idx_loans_active ON loan_applications (user_id)
  WHERE state NOT IN ('rejected', 'closed', 'written_off', 'draft');
CREATE INDEX idx_loans_band ON loan_applications (state) INCLUDE (amount_requested, interest_rate);

-- ── EMI SCHEDULES ─────────────────────────────────────────────────────
CREATE INDEX idx_emi_loan ON emi_schedules (loan_id, installment_number);
CREATE INDEX idx_emi_due ON emi_schedules (due_date, status)
  WHERE status = 'pending';
CREATE INDEX idx_emi_overdue ON emi_schedules (due_date, days_past_due)
  WHERE status = 'pending' AND days_past_due > 0;

-- ── REPAYMENT EVENTS ──────────────────────────────────────────────────
CREATE INDEX idx_repayment_loan ON repayment_events (loan_id, paid_at DESC);
CREATE INDEX idx_repayment_emi ON repayment_events (emi_id);
CREATE INDEX idx_repayment_unreconciled ON repayment_events (paid_at)
  WHERE reconciled = false;

-- ── AUDIT LOGS ────────────────────────────────────────────────────────
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, logged_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id, logged_at DESC);
CREATE INDEX idx_audit_action ON audit_logs (action, logged_at DESC);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────
CREATE INDEX idx_notif_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notif_status ON notifications (status, scheduled_at)
  WHERE status IN ('queued', 'processing');
CREATE INDEX idx_notif_retry ON notifications (retry_count, created_at)
  WHERE status = 'failed' AND retry_count < max_retries;

-- ── CMS ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX idx_cms_key_locale ON cms_content (key, locale)
  WHERE is_active = true;
CREATE INDEX idx_cms_namespace ON cms_content (namespace, locale);
CREATE INDEX idx_faq_category_locale ON cms_faqs (category, locale)
  WHERE is_active = true;
```

---

## 5. PostgreSQL — Migrations

### Migration naming convention

```
V{YYYYMMDD}{HH}{MM}__description_snake_case.sql
Example: V202401151030__add_loan_products_table.sql
```

### Migration tool setup (TypeORM)

```typescript
// package.json scripts
{
  "migration:generate": "typeorm migration:generate -d src/shared/database/data-source.ts",
  "migration:run":      "typeorm migration:run -d src/shared/database/data-source.ts",
  "migration:revert":   "typeorm migration:revert -d src/shared/database/data-source.ts",
  "migration:show":     "typeorm migration:show -d src/shared/database/data-source.ts"
}
```

### `data-source.ts`

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl: process.env.POSTGRES_SSL === 'true',
  entities:   ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: ['migration'],
});
```

### Sample migration — initial schema

```typescript
// src/database/migrations/1705312200000-InitialSchema.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1705312200000 implements MigrationInterface {
  name = 'InitialSchema1705312200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('borrower','lender','admin','compliance','support')
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mobile_number VARCHAR(15) NOT NULL UNIQUE,
        full_name_encrypted TEXT,
        role user_role NOT NULL DEFAULT 'borrower',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        locale VARCHAR(10) NOT NULL DEFAULT 'en',
        onboarding_step SMALLINT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
  }
}
```

---

## 6. PostgreSQL — Partitioning Strategy

### Why we partition

Tables `emi_schedules`, `repayment_events`, `audit_logs`, `notifications` grow unboundedly. Monthly range partitioning keeps query plans efficient and enables fast archival.

### pg_partman configuration

```sql
-- Automatic partition creation and maintenance
UPDATE partman.part_config
SET
  retention          = '24 months',
  retention_keep_table = false,
  retention_keep_index = false,
  infinite_time_partitions = true,
  premake            = 3,
  automatic_maintenance = 'on'
WHERE parent_table IN (
  'public.emi_schedules',
  'public.repayment_events',
  'public.audit_logs',
  'public.notifications'
);

-- Schedule via pg_cron (runs at 2 AM IST daily)
SELECT cron.schedule('partman_maintenance', '30 20 * * *',
  'SELECT partman.run_maintenance(p_analyze := false)'
);
```

### Archival strategy

```sql
-- Archive partitions older than 24 months to S3 via pg_cron
-- 1. Dump old partition to Parquet via aws_s3 extension
-- 2. Drop the partition
-- 3. ClickHouse reads S3 Parquet for historical queries

SELECT cron.schedule('archive_old_partitions', '0 1 1 * *', $$
  SELECT partman.drop_partition_id(
    p_parent_table := 'public.audit_logs',
    p_retention := '24 months',
    p_keep_table := false
  )
$$);
```

---

## 7. PostgreSQL — TypeORM Configuration

### `shared/database/database.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: 'default',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        database: config.get('POSTGRES_DB'),
        username: config.get('POSTGRES_USER'),
        password: config.get('POSTGRES_PASSWORD'),
        ssl: config.get('POSTGRES_SSL') === 'true'
          ? { ca: require('fs').readFileSync(config.get('POSTGRES_SSL_CA')) }
          : false,
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: true,
        logging: config.get('NODE_ENV') === 'development' ? 'all' : ['error', 'migration'],
        maxQueryExecutionTime: config.get<number>('POSTGRES_SLOW_QUERY_THRESHOLD_MS'),
        extra: {
          max: config.get<number>('POSTGRES_MAX_CONNECTIONS'),
          min: config.get<number>('POSTGRES_MIN_CONNECTIONS'),
          idleTimeoutMillis: config.get<number>('POSTGRES_IDLE_TIMEOUT_MS'),
          connectionTimeoutMillis: config.get<number>('POSTGRES_CONNECTION_TIMEOUT_MS'),
          statement_timeout: config.get<number>('POSTGRES_STATEMENT_TIMEOUT_MS'),
        },
        poolErrorHandler: (err: Error) => {
          console.error('[DB Pool Error]', err.message);
        },
      }),
      inject: [ConfigService],
    }),

    // Read replica
    TypeOrmModule.forRootAsync({
      name: 'replica',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_REPLICA_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        database: config.get('POSTGRES_DB'),
        username: config.get('POSTGRES_REPLICA_USER'),
        password: config.get('POSTGRES_REPLICA_PASSWORD'),
        ssl: config.get('POSTGRES_SSL') === 'true',
        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
        extra: {
          max: config.get<number>('POSTGRES_REPLICA_MAX_CONNECTIONS'),
          application_name: 'credsaathi-api-replica',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

---

## 8. MongoDB — All Collection Schemas

MongoDB stores raw behavioral data — schema-flexible, write-heavy, large documents.

### Collection 1 — `raw_phone_data`

```json
{
  "_id": "ObjectId",
  "user_id": "uuid-string",
  "source": "jio | airtel | vi | bsnl",
  "month_year": "2024-01",
  "plan_type": "prepaid | postpaid",
  "bills": [
    {
      "bill_date": "ISODate",
      "due_date": "ISODate",
      "amount": 599,
      "paid_amount": 599,
      "paid_date": "ISODate",
      "payment_method": "upi | netbanking | auto_debit",
      "is_late": false,
      "days_late": 0,
      "bill_id": "string"
    }
  ],
  "recharges": [
    {
      "date": "ISODate",
      "amount": 239,
      "pack_type": "data | talktime | combo",
      "validity_days": 28,
      "channel": "app | ussd | retailer"
    }
  ],
  "usage": {
    "data_mb": 18432,
    "calls_minutes": 1240,
    "sms_count": 45
  },
  "upi_linked": true,
  "upi_vpa": "user@jio",
  "consent_id": "uuid",
  "collected_at": "ISODate",
  "created_at": "ISODate"
}
```

### Collection 2 — `raw_bank_data`

```json
{
  "_id": "ObjectId",
  "user_id": "uuid-string",
  "aa_consent_id": "uuid",
  "fip_id": "sbi | hdfc | icici | axis | kotak",
  "account_type": "savings | current | od",
  "account_masked": "XXXX1234",
  "statement_period": {
    "from": "ISODate",
    "to": "ISODate"
  },
  "opening_balance": 12500,
  "closing_balance": 34200,
  "transactions": [
    {
      "txn_id": "string",
      "date": "ISODate",
      "amount": 50000,
      "type": "credit | debit",
      "mode": "imps | neft | upi | atm | pos | ecs",
      "description": "SALARY-COMPANY-NAME",
      "balance_after": 62500,
      "category": "salary | emi | utility | grocery | transfer | other",
      "is_recurring": true,
      "merchant_code": "string"
    }
  ],
  "summary": {
    "total_credits": 135000,
    "total_debits": 98000,
    "avg_daily_balance": 28400,
    "salary_credits": 2,
    "emi_debits": 3,
    "bounce_count": 0,
    "min_balance_maintained": true
  },
  "account_number_encrypted": "encrypted-string",
  "ifsc_encrypted": "encrypted-string",
  "fetched_at": "ISODate",
  "created_at": "ISODate"
}
```

### Collection 3 — `raw_ecommerce_data`

```json
{
  "_id": "ObjectId",
  "user_id": "uuid-string",
  "platform": "flipkart | amazon | meesho | myntra | jiomart",
  "profile_linked_at": "ISODate",
  "consent_id": "uuid",
  "orders": [
    {
      "order_id": "string",
      "order_date": "ISODate",
      "delivery_date": "ISODate",
      "status": "delivered | returned | cancelled",
      "items": [
        {
          "category": "electronics | clothing | grocery | ...",
          "subcategory": "string",
          "amount": 1299,
          "quantity": 1
        }
      ],
      "total_amount": 1299,
      "payment_method": "upi | card | cod | emi",
      "is_returned": false,
      "return_date": null,
      "return_reason": null,
      "platform_offer_used": true,
      "emi_months": null
    }
  ],
  "period": {
    "from": "ISODate",
    "to": "ISODate",
    "months": 12
  },
  "aggregates": {
    "total_orders": 24,
    "total_spend": 48500,
    "returned_orders": 2,
    "return_rate": 0.083,
    "avg_ticket_size": 2021,
    "monthly_spend_series": [3200, 4100, 2800, 6500, 3900, 4200, 3600, 2100, 5500, 4800, 3200, 4600],
    "top_categories": ["electronics", "clothing", "grocery"],
    "cod_ratio": 0.12,
    "emi_purchase_count": 3
  },
  "synced_at": "ISODate",
  "created_at": "ISODate"
}
```

### Collection 4 — `raw_geolocation_data`

```json
{
  "_id": "ObjectId",
  "user_id": "uuid-string",
  "consent_id": "uuid",
  "period_days": 90,
  "clusters": {
    "home": {
      "lat": 28.6139,
      "lng": 77.2090,
      "radius_meters": 250,
      "confidence": 0.94,
      "nights_present": 82,
      "first_detected": "ISODate",
      "address_tier": "city",
      "pincode": "110001",
      "state": "Delhi"
    },
    "work": {
      "lat": 28.6304,
      "lng": 77.2177,
      "radius_meters": 300,
      "confidence": 0.87,
      "days_present": 58,
      "address_tier": "city"
    }
  },
  "metrics": {
    "home_anchor_score": 0.91,
    "work_anchor_score": 0.85,
    "mobility_entropy": 1.24,
    "unique_areas_visited": 8,
    "interstate_travel_count": 2,
    "city_tier": 1,
    "state_of_residence": "Delhi"
  },
  "device_os": "android | ios",
  "gps_permission_level": "always | when_in_use | denied",
  "collected_at": "ISODate",
  "created_at": "ISODate"
}
```

### Collection 5 — `raw_merchant_data`

```json
{
  "_id": "ObjectId",
  "user_id": "uuid-string",
  "gstin": "encrypted-string",
  "business_name_encrypted": "encrypted-string",
  "business_type": "retailer | wholesaler | service | manufacturing",
  "gst_filings": [
    {
      "period": "2024-01",
      "filing_type": "GSTR-1 | GSTR-3B",
      "filed_on": "ISODate",
      "due_date": "ISODate",
      "is_late": false,
      "days_late": 0,
      "turnover": 285000,
      "tax_paid": 45600
    }
  ],
  "platform_ratings": [
    {
      "platform": "flipkart_seller | amazon_seller | swiggy_partner",
      "rating": 4.3,
      "review_count": 287,
      "fulfillment_rate": 0.96,
      "return_rate": 0.04,
      "joined_date": "ISODate"
    }
  ],
  "aggregates": {
    "gst_filing_streak": 14,
    "gst_late_count": 1,
    "avg_monthly_turnover": 315000,
    "turnover_growth_pct": 12.5,
    "avg_rating": 4.3,
    "years_in_business": 3.5
  },
  "consent_id": "uuid",
  "synced_at": "ISODate",
  "created_at": "ISODate"
}
```

### Collection 6 — `psychometric_responses`

```json
{
  "_id": "ObjectId",
  "user_id": "uuid-string",
  "questionnaire_version": "v3",
  "locale": "hi",
  "started_at": "ISODate",
  "completed_at": "ISODate",
  "duration_seconds": 312,
  "responses": [
    {
      "q_id": "uuid",
      "q_number": 1,
      "group": "risk_tolerance",
      "answer_value": 3,
      "answer_label": "Invest some, save rest",
      "score": 0.6,
      "time_taken_ms": 8400,
      "changed_answer": false
    }
  ],
  "open_text_responses": [
    {
      "q_id": "uuid",
      "q_number": 13,
      "response_encrypted": "encrypted-string",
      "response_length": 145,
      "language_detected": "hi",
      "bert_embedding_s3_key": "s3://credsaathi-ml-artifacts/embeddings/user_id/v3.npy"
    }
  ],
  "computed_scores": {
    "risk_tolerance": 0.62,
    "delayed_gratification": 0.74,
    "financial_literacy": 0.80,
    "financial_behaviour": 0.68,
    "composite_psychometric": 0.71
  },
  "is_complete": true,
  "created_at": "ISODate"
}
```

---

## 9. MongoDB — Mongoose Models

### `raw-phone.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'raw_phone_data', timestamps: { createdAt: 'created_at' } })
export class RawPhoneData {
  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: true, enum: ['jio', 'airtel', 'vi', 'bsnl'] })
  source: string;

  @Prop({ required: true })
  month_year: string;

  @Prop({ type: [{ type: Object }], default: [] })
  bills: Record<string, any>[];

  @Prop({ type: [{ type: Object }], default: [] })
  recharges: Record<string, any>[];

  @Prop({ type: Object })
  usage: Record<string, any>;

  @Prop({ required: true })
  consent_id: string;

  @Prop({ required: true })
  collected_at: Date;
}

export const RawPhoneDataSchema = SchemaFactory.createForClass(RawPhoneData);

RawPhoneDataSchema.index({ user_id: 1, month_year: -1 });
RawPhoneDataSchema.index({ collected_at: 1 }, { expireAfterSeconds: 63072000 }); // 24 months TTL
```

---

## 10. MongoDB — Indexes & TTL Policies

```javascript
// Run in MongoDB shell or Atlas Data API

// raw_phone_data
db.raw_phone_data.createIndex({ user_id: 1, month_year: -1 });
db.raw_phone_data.createIndex({ consent_id: 1 });
db.raw_phone_data.createIndex(
  { collected_at: 1 },
  { expireAfterSeconds: 63072000, name: 'ttl_24months' }
);

// raw_bank_data
db.raw_bank_data.createIndex({ user_id: 1, 'statement_period.from': -1 });
db.raw_bank_data.createIndex({ aa_consent_id: 1 });
db.raw_bank_data.createIndex({ fip_id: 1, user_id: 1 });
db.raw_bank_data.createIndex(
  { fetched_at: 1 },
  { expireAfterSeconds: 63072000, name: 'ttl_24months' }
);

// raw_ecommerce_data
db.raw_ecommerce_data.createIndex({ user_id: 1, platform: 1 });
db.raw_ecommerce_data.createIndex({ 'aggregates.return_rate': 1 });
db.raw_ecommerce_data.createIndex(
  { synced_at: 1 },
  { expireAfterSeconds: 63072000, name: 'ttl_24months' }
);

// raw_geolocation_data
db.raw_geolocation_data.createIndex({ user_id: 1, collected_at: -1 });
db.raw_geolocation_data.createIndex({ 'clusters.home.state': 1 });
db.raw_geolocation_data.createIndex(
  { collected_at: 1 },
  { expireAfterSeconds: 63072000, name: 'ttl_24months' }
);

// psychometric_responses
db.psychometric_responses.createIndex({ user_id: 1, questionnaire_version: 1 });
db.psychometric_responses.createIndex({ completed_at: -1 });
db.psychometric_responses.createIndex(
  { user_id: 1 },
  { unique: true, partialFilterExpression: { is_complete: true } }
);

// Compound wildcard index for feature queries
db.raw_bank_data.createIndex({ user_id: 1, '$**': 1 });
```

---

## 11. Redis — Keyspace Design

### Full keyspace map

```
cs:{namespace}:{identifier}:{sub-key}

PREFIX: cs: (configurable via REDIS_KEY_PREFIX)

┌─────────────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION                                                           │
├──────────────────────────────────┬──────────────┬───────────────────────┤
│ Key pattern                      │ TTL          │ Value type            │
├──────────────────────────────────┼──────────────┼───────────────────────┤
│ cs:otp:{mobile}                  │ 300s         │ String (SHA-256 hash) │
│ cs:otp_attempts:{mobile}         │ 300s         │ Integer               │
│ cs:otp_lock:{mobile}             │ 1800s        │ Integer (1)           │
│ cs:session:{jti}                 │ 900s         │ JSON (user payload)   │
│ cs:blacklist:{jti}               │ 900s         │ Integer (1)           │
│ cs:refresh:{hash}                │ 604800s      │ JSON (session data)   │
└──────────────────────────────────┴──────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ FEATURE STORE                                                            │
├──────────────────────────────────┬──────────────┬───────────────────────┤
│ cs:features:{userId}             │ 86400s       │ JSON (40+ features)   │
│ cs:features:{userId}:behavioral  │ 86400s       │ JSON (20 features)    │
│ cs:features:{userId}:psycho      │ 0 (persist)  │ JSON (psycho scores)  │
│ cs:features:{userId}:cashflow    │ 604800s      │ JSON (weekly refresh) │
└──────────────────────────────────┴──────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ SCORING & CONSENT                                                        │
├──────────────────────────────────┬──────────────┬───────────────────────┤
│ cs:score:{userId}                │ 3600s        │ JSON (score record)   │
│ cs:consent:{userId}              │ 600s         │ JSON (consent bitmap) │
│ cs:kyc_session:{sessionId}       │ 600s         │ JSON (session data)   │
└──────────────────────────────────┴──────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ CMS CACHE                                                                │
├──────────────────────────────────┬──────────────┬───────────────────────┤
│ cs:cms:{key}:{locale}            │ 3600s        │ JSON (content)        │
│ cs:cms:faq:{locale}:{category}   │ 3600s        │ JSON (faq list)       │
│ cs:cms:products:{locale}         │ 7200s        │ JSON (product list)   │
│ cs:cms:questionnaire:{locale}    │ 86400s       │ JSON (questions)      │
└──────────────────────────────────┴──────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ RATE LIMITING                                                            │
├──────────────────────────────────┬──────────────┬───────────────────────┤
│ cs:rate:{ip}:{endpoint}          │ 60s          │ Integer (count)       │
│ cs:rate:user:{userId}:{endpoint} │ 60s          │ Integer (count)       │
└──────────────────────────────────┴──────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LOAN PIPELINE CACHE                                                      │
├──────────────────────────────────┬──────────────┬───────────────────────┤
│ cs:pipeline:{lenderId}:{state}   │ 300s         │ JSON (loan list)      │
│ cs:loan:{loanId}                 │ 300s         │ JSON (loan detail)    │
└──────────────────────────────────┴──────────────┴───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BULL QUEUE KEYS (managed by Bull)                                        │
├──────────────────────────────────┬──────────────┬───────────────────────┤
│ bull:notifications:{...}         │ varies       │ Bull internals        │
│ bull:data-ingestion:{...}        │ varies       │ Bull internals        │
│ bull:scoring:{...}               │ varies       │ Bull internals        │
│ bull:deletion:{...}              │ varies       │ Bull internals        │
└──────────────────────────────────┴──────────────┴───────────────────────┘
```

### Feature vector structure stored in Redis

```json
{
  "user_id": "uuid",
  "version": "v3.0",
  "computed_at": "2024-01-15T10:00:00Z",
  "ttl_seconds": 86400,
  "behavioral": {
    "bill_ontime_ratio_6m": 0.92,
    "bill_streak_max": 8,
    "bill_avg_days_late": 1.2,
    "upi_tx_count_monthly_avg": 34.5,
    "upi_tx_amount_cv": 0.38,
    "recharge_frequency": 1.1,
    "ecom_orders_monthly": 4.2,
    "ecom_return_rate": 0.08,
    "ecom_avg_ticket_size": 1850,
    "ecom_spend_monthly_cv": 0.42,
    "ecom_category_diversity": 5,
    "geo_home_anchor_score": 0.91,
    "geo_work_anchor_score": 0.85,
    "geo_mobility_entropy": 1.24,
    "geo_city_tier": 1,
    "merchant_gst_streak": 14,
    "merchant_gst_late_count": 1,
    "merchant_rating_avg": 4.3,
    "merchant_revenue_growth": 12.5,
    "days_since_last_bill_pay": 2
  },
  "psychometric": {
    "risk_tolerance": 0.62,
    "delayed_gratification": 0.74,
    "financial_literacy": 0.80,
    "financial_behaviour": 0.68,
    "composite_psychometric": 0.71
  },
  "cashflow": {
    "avg_monthly_net_flow": 36500,
    "income_regularity_score": 0.88,
    "avg_daily_balance": 28400,
    "debt_service_ratio_est": 0.22,
    "salary_regularity": true,
    "bounce_count_6m": 0,
    "monthly_flow_cv": 0.31
  },
  "completeness": {
    "phone": true,
    "bank": true,
    "ecommerce": true,
    "geolocation": true,
    "merchant": false,
    "psychometric": true,
    "completeness_score": 0.83
  }
}
```

---

## 12. Redis — Configuration & Clustering

### `shared/cache/cache.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { BullModule } from '@nestjs/bull';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        options: {
          host: config.get('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
          tls: config.get('REDIS_TLS') === 'true'
            ? { servername: config.get('REDIS_TLS_SERVERNAME') }
            : undefined,
          keyPrefix: config.get('REDIS_KEY_PREFIX'),
          connectTimeout: config.get<number>('REDIS_CONNECT_TIMEOUT'),
          commandTimeout: config.get<number>('REDIS_COMMAND_TIMEOUT'),
          maxRetriesPerRequest: config.get<number>('REDIS_MAX_RETRIES_PER_REQUEST'),
          retryStrategy: (times: number) => {
            if (times > 5) return null;
            return Math.min(times * config.get<number>('REDIS_RETRY_DELAY_MS'), 5000);
          },
          enableReadyCheck: config.get('REDIS_ENABLE_READY_CHECK') === 'true',
          lazyConnect: false,
        },
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('BULL_REDIS_HOST'),
          port: config.get<number>('BULL_REDIS_PORT'),
          password: config.get('BULL_REDIS_PASSWORD'),
          tls: config.get('BULL_REDIS_TLS') === 'true',
        },
        defaultJobOptions: {
          attempts: config.get<number>('BULL_DEFAULT_JOB_ATTEMPTS'),
          backoff: { type: 'exponential', delay: config.get<number>('BULL_BACKOFF_DELAY_MS') },
          removeOnComplete: config.get<number>('BULL_REMOVE_ON_COMPLETE'),
          removeOnFail: config.get<number>('BULL_REMOVE_ON_FAIL'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, BullModule],
})
export class CacheModule {}
```

---

## 13. ClickHouse — Analytics Schema

```sql
-- Connect to ClickHouse
-- Database
CREATE DATABASE IF NOT EXISTS credsaathi_analytics;

USE credsaathi_analytics;

-- ── MODEL PREDICTIONS ─────────────────────────────────────────────────
CREATE TABLE model_predictions
(
  id                String,
  user_id           String,
  score             UInt16,
  risk_band         Enum8('very_high'=1,'high'=2,'medium'=3,'low'=4,'very_low'=5),
  model1_pd         Float32,
  model2_risk       Float32,
  model3_stability  Float32,
  ensemble_pd       Float32,
  model_version     String,
  feature_version   String,
  shap_values       String,          -- JSON serialised
  data_completeness String,          -- JSON serialised
  features_snapshot String,          -- JSON serialised
  loan_id           Nullable(String),
  generated_at      DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(generated_at)
ORDER BY (user_id, generated_at)
TTL generated_at + INTERVAL 5 YEAR
SETTINGS index_granularity = 8192;

-- ── LOAN OUTCOMES ─────────────────────────────────────────────────────
CREATE TABLE loan_outcomes
(
  loan_id           String,
  user_id           String,
  score_id          String,
  score             UInt16,
  risk_band         String,
  amount_requested  UInt64,
  amount_approved   Nullable(UInt64),
  interest_rate     Nullable(Float32),
  tenure_months     UInt8,
  state             String,
  outcome           Enum8('repaid'=1,'defaulted'=2,'prepaid'=3,'active'=4,'rejected'=5),
  days_to_default   Nullable(UInt16),
  total_paid        UInt64,
  dpd_max           UInt16,
  applied_at        DateTime('Asia/Kolkata'),
  decided_at        Nullable(DateTime('Asia/Kolkata')),
  disbursed_at      Nullable(DateTime('Asia/Kolkata')),
  closed_at         Nullable(DateTime('Asia/Kolkata')),
  lender_id         Nullable(String),
  state_code        String,
  city_tier         UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(applied_at)
ORDER BY (applied_at, user_id)
TTL applied_at + INTERVAL 10 YEAR;

-- ── FEATURE DISTRIBUTIONS (for PSI monitoring) ───────────────────────
CREATE TABLE feature_distributions
(
  feature_name    String,
  feature_version String,
  snapshot_date   Date,
  mean            Float64,
  std_dev         Float64,
  min_val         Float64,
  max_val         Float64,
  p5              Float64,
  p25             Float64,
  p50             Float64,
  p75             Float64,
  p95             Float64,
  sample_count    UInt32,
  null_count      UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (snapshot_date, feature_name, feature_version)
TTL snapshot_date + INTERVAL 2 YEAR;

-- ── AUDIT EVENTS (from Kafka, archived from PostgreSQL) ───────────────
CREATE TABLE audit_events
(
  id           String,
  actor_id     Nullable(String),
  actor_role   String,
  entity_type  String,
  entity_id    Nullable(String),
  action       String,
  payload_hash String,
  prev_hash    Nullable(String),
  ip_address   Nullable(String),
  request_id   Nullable(String),
  metadata     String,       -- JSON
  logged_at    DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(logged_at)
ORDER BY (logged_at, entity_type, entity_id)
TTL logged_at + INTERVAL 7 YEAR;

-- ── NOTIFICATION LOGS ─────────────────────────────────────────────────
CREATE TABLE notification_logs
(
  id                String,
  user_id           String,
  channel           String,
  event_type        String,
  status            String,
  provider          String,
  retry_count       UInt8,
  locale            String,
  sent_at           Nullable(DateTime('Asia/Kolkata')),
  delivered_at      Nullable(DateTime('Asia/Kolkata')),
  failed_at         Nullable(DateTime('Asia/Kolkata')),
  created_at        DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, user_id)
TTL created_at + INTERVAL 1 YEAR;

-- ── MODEL DRIFT METRICS ───────────────────────────────────────────────
CREATE TABLE model_drift_metrics
(
  model_version   String,
  feature_version String,
  metric_date     Date,
  metric_name     String,
  metric_value    Float64,
  threshold       Float64,
  is_alerting     UInt8,
  computed_at     DateTime('Asia/Kolkata')
)
ENGINE = MergeTree()
ORDER BY (metric_date, model_version, metric_name)
TTL metric_date + INTERVAL 2 YEAR;
```

---

## 14. ClickHouse — Queries & Materialized Views

```sql
-- ── MATERIALIZED VIEW: daily score distribution ───────────────────────
CREATE MATERIALIZED VIEW mv_daily_score_distribution
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (snapshot_date, risk_band)
AS
SELECT
  toDate(generated_at)           AS snapshot_date,
  risk_band,
  count()                        AS count,
  avg(score)                     AS avg_score,
  min(score)                     AS min_score,
  max(score)                     AS max_score
FROM model_predictions
GROUP BY snapshot_date, risk_band;

-- ── MATERIALIZED VIEW: monthly default rates ──────────────────────────
CREATE MATERIALIZED VIEW mv_monthly_default_rates
ENGINE = SummingMergeTree()
ORDER BY (month, risk_band)
AS
SELECT
  toStartOfMonth(applied_at)     AS month,
  risk_band,
  count()                        AS total_loans,
  countIf(outcome = 'defaulted') AS defaults,
  countIf(outcome = 'repaid')    AS repaid,
  avg(amount_approved)           AS avg_loan_amount
FROM loan_outcomes
GROUP BY month, risk_band;

-- ── QUERY: fairness audit by state ────────────────────────────────────
SELECT
  state_code,
  count()                                       AS applications,
  countIf(state = 'approved' OR state = 'disbursed') / count() AS approval_rate,
  avg(score)                                    AS avg_score
FROM loan_outcomes
WHERE applied_at >= today() - 90
GROUP BY state_code
ORDER BY approval_rate DESC;

-- ── QUERY: PSI computation ────────────────────────────────────────────
SELECT
  feature_name,
  snapshot_date,
  (sum((p_score - p_base) * log(p_score / p_base))) AS psi
FROM (
  SELECT
    f_current.feature_name,
    f_current.snapshot_date,
    f_current.mean / sum_current.total AS p_score,
    f_base.mean    / sum_base.total    AS p_base
  FROM feature_distributions AS f_current
  JOIN feature_distributions AS f_base
    ON f_current.feature_name = f_base.feature_name
  WHERE f_current.snapshot_date = today()
    AND f_base.snapshot_date    = today() - 30
)
GROUP BY feature_name, snapshot_date
HAVING psi > 0.1
ORDER BY psi DESC;

-- ── QUERY: NPA report ─────────────────────────────────────────────────
SELECT
  toStartOfMonth(disbursed_at)  AS month,
  risk_band,
  count()                        AS loans_disbursed,
  sum(amount_approved)           AS total_disbursed,
  countIf(outcome='defaulted')   AS npa_count,
  sum(CASE WHEN outcome='defaulted' THEN amount_approved ELSE 0 END) AS npa_amount,
  npa_amount / total_disbursed   AS npa_ratio
FROM loan_outcomes
WHERE disbursed_at IS NOT NULL
GROUP BY month, risk_band
ORDER BY month DESC, risk_band;
```

---

## 15. Kafka — Topics, Schemas & Pipeline

### Topic design

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Topic name                │ Partitions │ Replication │ Retention │ Purpose   │
├──────────────────────────────────────────────────────────────────────────────┤
│ raw-data-phone            │ 12         │ 3           │ 7 days    │ Phone data │
│ raw-data-bank             │ 12         │ 3           │ 7 days    │ AA data   │
│ raw-data-ecommerce        │ 12         │ 3           │ 7 days    │ Ecom data │
│ raw-data-geolocation      │ 12         │ 3           │ 7 days    │ Geo data  │
│ raw-data-merchant         │ 6          │ 3           │ 7 days    │ GST data  │
│ feature-computation       │ 12         │ 3           │ 3 days    │ Triggers  │
│ score-requests            │ 12         │ 3           │ 3 days    │ ML jobs   │
│ score-results             │ 12         │ 3           │ 7 days    │ Scores    │
│ consent-events            │ 6          │ 3           │ 30 days   │ Consent   │
│ loan-events               │ 12         │ 3           │ 30 days   │ Loans     │
│ notification-events       │ 24         │ 3           │ 3 days    │ Notify    │
│ audit-events              │ 12         │ 3           │ 365 days  │ Audit     │
│ user-deletion-requests    │ 3          │ 3           │ 30 days   │ DPDP      │
│ repayment-webhooks        │ 12         │ 3           │ 7 days    │ Payments  │
│ model-monitoring          │ 6          │ 3           │ 30 days   │ ML ops    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Avro schemas

```json
// Schema: raw-data-phone
{
  "type": "record",
  "name": "RawPhoneEvent",
  "namespace": "in.credsaathi.events",
  "fields": [
    { "name": "event_id",     "type": "string" },
    { "name": "user_id",      "type": "string" },
    { "name": "source",       "type": "string" },
    { "name": "month_year",   "type": "string" },
    { "name": "payload",      "type": "string" },
    { "name": "consent_id",   "type": "string" },
    { "name": "schema_version","type": "string", "default": "1.0" },
    { "name": "emitted_at",   "type": "string" }
  ]
}

// Schema: score-requests
{
  "type": "record",
  "name": "ScoreRequest",
  "namespace": "in.credsaathi.events",
  "fields": [
    { "name": "request_id",   "type": "string" },
    { "name": "user_id",      "type": "string" },
    { "name": "trigger",      "type": { "type": "enum", "name": "Trigger",
        "symbols": ["user_request","loan_application","scheduled","admin"] } },
    { "name": "loan_amount",  "type": ["null", "long"], "default": null },
    { "name": "model_version","type": "string" },
    { "name": "emitted_at",   "type": "string" }
  ]
}

// Schema: audit-events
{
  "type": "record",
  "name": "AuditEvent",
  "namespace": "in.credsaathi.events",
  "fields": [
    { "name": "event_id",     "type": "string" },
    { "name": "actor_id",     "type": ["null","string"], "default": null },
    { "name": "entity_type",  "type": "string" },
    { "name": "entity_id",    "type": ["null","string"], "default": null },
    { "name": "action",       "type": "string" },
    { "name": "payload_hash", "type": "string" },
    { "name": "prev_hash",    "type": ["null","string"], "default": null },
    { "name": "metadata",     "type": "string" },
    { "name": "logged_at",    "type": "string" }
  ]
}
```

### Kafka consumer setup — `kafka.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaProducerService } from './kafka.producer.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([{
      name: 'KAFKA_SERVICE',
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: config.get('KAFKA_CLIENT_ID'),
            brokers: config.get<string>('KAFKA_BROKERS').split(','),
            ssl: config.get('KAFKA_SSL') === 'true',
            sasl: {
              mechanism: config.get('KAFKA_SASL_MECHANISM'),
              username: config.get('KAFKA_SASL_USERNAME'),
              password: config.get('KAFKA_SASL_PASSWORD'),
            },
            connectionTimeout: config.get<number>('KAFKA_CONNECTION_TIMEOUT_MS'),
            requestTimeout: config.get<number>('KAFKA_REQUEST_TIMEOUT_MS'),
            retry: {
              retries: config.get<number>('KAFKA_RETRY_MAX_RETRIES'),
              initialRetryTime: config.get<number>('KAFKA_RETRY_INITIAL_RETRY_TIME_MS'),
              multiplier: config.get<number>('KAFKA_RETRY_MULTIPLIER'),
            },
          },
          consumer: {
            groupId: config.get('KAFKA_GROUP_ID'),
            sessionTimeout: config.get<number>('KAFKA_SESSION_TIMEOUT_MS'),
            rebalanceTimeout: config.get<number>('KAFKA_REBALANCE_TIMEOUT_MS'),
            heartbeatInterval: config.get<number>('KAFKA_HEARTBEAT_INTERVAL_MS'),
          },
          producer: {
            allowAutoTopicCreation: false,
            idempotent: true,
            transactionTimeout: 30000,
          },
        },
      }),
      inject: [ConfigService],
    }]),
  ],
  providers: [KafkaProducerService],
  exports: [KafkaProducerService, ClientsModule],
})
export class KafkaModule {}
```

---

## 16. Feature Store — Design & Pipeline

### Architecture

```
MongoDB (raw data)
  ↓  [Nightly Airflow DAG + on-demand trigger]
Feature Computation Service (Python FastAPI)
  ↓  [compute 40+ features per user]
Redis Feature Store       ← [app reads for scoring]
  ↓  [daily snapshot via Airflow]
S3 Parquet Feature Store  ← [ML training reads]
  ↓  [weekly aggregation]
ClickHouse feature_distributions ← [PSI monitoring]
```

### Feature pipeline DAG (Airflow)

```python
# dags/feature_pipeline.py
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'ml-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'execution_timeout': timedelta(hours=2),
}

with DAG(
    dag_id='credsaathi_feature_pipeline',
    default_args=default_args,
    schedule_interval='0 1 * * *',  # 1 AM IST
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['feature-engineering', 'ml'],
) as dag:

    def compute_behavioral_features(**ctx):
        """Pull MongoDB phone/ecom/geo → compute 20 behavioral features → Redis"""
        from feature_service.behavioral import BehavioralFeatureComputer
        date = ctx['ds']
        computer = BehavioralFeatureComputer()
        updated = computer.compute_all(since_date=date)
        return {'updated_users': updated}

    def compute_cashflow_features(**ctx):
        """Pull MongoDB bank data → compute 7 cash flow features → Redis"""
        from feature_service.cashflow import CashflowFeatureComputer
        computer = CashflowFeatureComputer()
        updated = computer.compute_all()
        return {'updated_users': updated}

    def snapshot_to_s3(**ctx):
        """Dump all Redis feature vectors to S3 Parquet for ML training"""
        import pandas as pd
        from feature_service.snapshot import FeatureSnapshotter
        snapshotter = FeatureSnapshotter()
        path = snapshotter.snapshot_to_parquet(ctx['ds'])
        return {'s3_path': path}

    def compute_psi(**ctx):
        """Compare today's feature distribution against 30-day baseline → ClickHouse"""
        from feature_service.monitoring import PsiComputer
        psi = PsiComputer()
        alerts = psi.compute_and_store(ctx['ds'])
        return {'alerts': alerts}

    t1 = PythonOperator(task_id='compute_behavioral', python_callable=compute_behavioral_features)
    t2 = PythonOperator(task_id='compute_cashflow',   python_callable=compute_cashflow_features)
    t3 = PythonOperator(task_id='snapshot_s3',        python_callable=snapshot_to_s3)
    t4 = PythonOperator(task_id='compute_psi',        python_callable=compute_psi)

    [t1, t2] >> t3 >> t4
```

### S3 Parquet feature store layout

```
s3://credsaathi-ml-artifacts-prod/
└── feature-store/
    ├── snapshots/
    │   └── date=2024-01-15/
    │       ├── behavioral/
    │       │   ├── part-00000.parquet
    │       │   └── part-00001.parquet
    │       ├── cashflow/
    │       │   └── part-00000.parquet
    │       └── psychometric/
    │           └── part-00000.parquet
    ├── training-datasets/
    │   └── v3.0/
    │       ├── train.parquet
    │       ├── validation.parquet
    │       └── test.parquet
    └── metadata/
        ├── feature_schema_v3.0.json
        └── feature_statistics_2024-01-15.json
```

---

## 17. S3/MinIO — Storage Architecture

### Bucket structure

```
credsaathi-kyc-prod/
├── {user_id}/
│   ├── aadhaar_front/
│   │   └── {uuid}.enc
│   ├── aadhaar_back/
│   │   └── {uuid}.enc
│   ├── pan/
│   │   └── {uuid}.enc
│   └── selfie/
│       └── {uuid}.enc

credsaathi-statements-prod/
├── {user_id}/
│   └── {year_month}/
│       └── {fip_id}_{uuid}.enc

credsaathi-ml-artifacts-prod/
├── models/
│   └── {model_name}/
│       └── {version}/
│           ├── model.pkl
│           ├── feature_schema.json
│           └── shap_baseline.pkl
├── feature-store/       (described above)
├── mlflow/              (MLflow tracking artifacts)
└── embeddings/
    └── {user_id}/
        └── v3.npy       (BERT embeddings)

credsaathi-audit-exports-prod/
└── {year}/
    └── {month}/
        └── audit_events_{YYYY-MM-DD}.parquet
```

### Storage service — `shared/storage/storage.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client, PutObjectCommand, GetObjectCommand,
  DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get('AWS_REGION'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async upload(params: UploadParams): Promise<{ key: string; etag: string }> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: this.config.get('AWS_KMS_KEY_ARN'),
      ChecksumAlgorithm: 'SHA256',
      ObjectLockMode: params.withObjectLock ? 'COMPLIANCE' : undefined,
      ObjectLockRetainUntilDate: params.withObjectLock
        ? new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000)
        : undefined,
    });

    const result = await this.s3.send(command);
    return { key: params.key, etag: result.ETag };
  }

  async getPresignedUrl(params: PresignParams): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      ResponseContentDisposition: 'inline',
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: params.expiresIn ?? this.config.get<number>('S3_PRESIGNED_URL_EXPIRY_SECONDS'),
    });
  }

  async softDelete(bucket: string, key: string): Promise<void> {
    await this.s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key + '.deleted',
      Body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    }));
  }

  async hardDelete(bucket: string, key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch { return false; }
  }
}
```

---

## 18. S3/MinIO — Bucket Policies & Lifecycle

### Bucket policy — KYC bucket

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::credsaathi-kyc-prod/*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalArn": [
            "arn:aws:iam::123456789012:role/credsaathi-api-role",
            "arn:aws:iam::123456789012:role/credsaathi-kyc-verifier-role"
          ]
        }
      }
    },
    {
      "Sid": "DenyNonKMSEncryption",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::credsaathi-kyc-prod/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyNonMumbaiRegion",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::credsaathi-kyc-prod/*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": "ap-south-1"
        }
      }
    }
  ]
}
```

### S3 lifecycle rules (Terraform)

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "kyc_lifecycle" {
  bucket = aws_s3_bucket.kyc.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"
    filter { prefix = "" }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
    # KYC docs retained 7 years per RBI mandate
    expiration {
      days = 2555  # 7 years
    }
  }

  rule {
    id     = "delete-soft-deleted"
    status = "Enabled"
    filter { suffix = ".deleted" }
    expiration { days = 3 }   # Hard delete 72h after soft delete
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "statements_lifecycle" {
  bucket = aws_s3_bucket.statements.id

  rule {
    id     = "expire-statements"
    status = "Enabled"
    filter { prefix = "" }
    expiration { days = 730 }   # 24 months DPDP data minimisation
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "audit_lifecycle" {
  bucket = aws_s3_bucket.audit.id

  rule {
    id     = "deep-archive"
    status = "Enabled"
    filter { prefix = "" }
    transition {
      days          = 30
      storage_class = "GLACIER_IR"
    }
    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }
    # Audit logs retained 7 years per RBI mandate
    expiration { days = 2555 }
  }
}
```

---

## 19. Encryption — At Rest & In Transit

### Encryption service — full implementation

```typescript
// shared/encryption/encryption.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength: number;
  private readonly authTagLength: number;
  private masterKey: Buffer;

  constructor(private config: ConfigService) {
    this.ivLength = config.get<number>('ENCRYPTION_IV_LENGTH') ?? 16;
    this.authTagLength = config.get<number>('ENCRYPTION_AUTH_TAG_LENGTH') ?? 16;
  }

  onModuleInit() {
    const keyHex = this.config.get<string>('ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.masterKey = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.authTagLength,
    });
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    // Format: iv_hex:authtag_hex:ciphertext_hex
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new Error('Invalid ciphertext format');
    const [ivHex, authTagHex, encHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  encryptBuffer(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Prepend 32-byte header: [iv(16)] [authTag(16)] [ciphertext...]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decryptBuffer(encBuffer: Buffer): Buffer {
    const iv = encBuffer.subarray(0, this.ivLength);
    const authTag = encBuffer.subarray(this.ivLength, this.ivLength + this.authTagLength);
    const encrypted = encBuffer.subarray(this.ivLength + this.authTagLength);
    const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  hash(value: string): string {
    return crypto
      .createHmac('sha256', this.config.get<string>('HASH_SALT'))
      .update(value)
      .digest('hex');
  }

  timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
```

### mTLS certificate setup (Kubernetes)

```yaml
# kubernetes/mtls-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: credsaathi-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT

---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: credsaathi-tls
  namespace: production
spec:
  host: "*.production.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

---

## 20. Data Pipeline — End-to-End Flow

### Consent → Ingestion → Feature → Score pipeline

```
User grants consent (API)
  ↓
ConsentService writes PostgreSQL consent_records
  ↓
KafkaProducer emits → topic: consent-events
  {user_id, source, consent_id, granted_at}
  ↓
DataIngestionConsumer (NestJS @EventPattern)
  ↓
Connector called for the consented source:
  ├── phone   → Telco API (Jio/Airtel OAuth)
  ├── bank    → Account Aggregator (FIP pull)
  ├── ecom    → Platform affiliate API
  ├── geo     → Device location service
  └── merchant→ NIC GST API
  ↓
Raw data written to MongoDB (raw_{source}_data)
  ↓
KafkaProducer emits → topic: raw-data-{source}
  {user_id, source, document_id, collected_at}
  ↓
FeatureComputationConsumer (Python service)
  ↓
Features computed:
  ├── behavioral  → 20 features from phone+ecom+geo
  ├── cashflow    → 7 features from bank
  └── psychometric→ 5 scores from questionnaire
  ↓
Feature vector written to Redis (cs:features:{userId})
  ↓
S3 snapshot (nightly Airflow)
  ↓
User requests score (API POST /score/generate)
  ↓
ScoringService reads from Redis (cache hit: <10ms)
  ↓
HTTP call to BentoML scoring service
  ↓
3 models run in parallel:
  ├── XGBoost behavioral model
  ├── Random Forest + BERT psychometric model
  └── LSTM cash flow model
  ↓
Ensemble combiner (weighted logistic regression)
  ↓
SHAP values computed
  ↓
Score (300-900) + risk band + SHAP factors returned
  ↓
CreditScoreEntity written to PostgreSQL
  ↓
Score cached in Redis (cs:score:{userId}, TTL 1h)
  ↓
KafkaProducer emits → topic: score-results
  ↓
ClickHouse model_predictions updated
  ↓
User receives score response (<3 seconds)
```

### DPDP deletion pipeline

```
User requests account deletion (DELETE /users/me)
  ↓
UserService: sets status = 'deleted', deletion_requested_at = NOW()
  ↓
KafkaProducer → topic: user-deletion-requests
  {user_id, requested_at, deletion_scheduled_at: +72h}
  ↓
DeletionWorker (Bull queue, runs at scheduled time)
  ↓
Step 1: Revoke all active consents in PostgreSQL
Step 2: Delete MongoDB documents for user
Step 3: Delete Redis keys matching cs:*:{userId}*
Step 4: S3 objects soft-deleted (hard delete after 72h)
Step 5: PostgreSQL PII fields zeroed (encrypted fields → NULL)
Step 6: ClickHouse: anonymise user_id → hash
Step 7: Write deletion completion audit log
Step 8: Emit → topic: deletion-completed
  ↓
Compliance confirmation stored in audit_logs
```

---

## 21. Database Backup & Recovery

### PostgreSQL backup strategy

```bash
# Automated daily backup via AWS Backup or pg_dump
# Backup schedule: daily full + continuous WAL archival

# 1. RDS automated backups (7-day retention, point-in-time recovery)
aws rds modify-db-cluster \
  --db-cluster-identifier credsaathi-prod \
  --backup-retention-period 7 \
  --preferred-backup-window "18:00-19:00" \
  --enable-cloudwatch-logs-exports '["postgresql","upgrade"]'

# 2. Manual snapshot before every deployment
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier credsaathi-prod \
  --db-cluster-snapshot-identifier "pre-deploy-$(date +%Y%m%d%H%M)"

# 3. Cross-region backup copy to ap-southeast-1 (DR)
aws rds copy-db-cluster-snapshot \
  --source-db-cluster-snapshot-identifier arn:aws:rds:ap-south-1:... \
  --target-db-cluster-snapshot-identifier credsaathi-dr-$(date +%Y%m%d) \
  --source-region ap-south-1 \
  --kms-key-id arn:aws:kms:ap-southeast-1:...
```

### MongoDB backup strategy

```bash
# Atlas continuous backup (point-in-time restore, 30-day window)
# Configured via Atlas console or Terraform:

resource "mongodbatlas_cloud_backup_schedule" "credsaathi" {
  project_id   = var.project_id
  cluster_name = "credsaathi-prod"

  reference_hour_of_day    = 18
  reference_minute_of_hour = 0
  restore_window_days      = 30

  policy_item_hourly {
    frequency_interval = 6
    retention_unit     = "days"
    retention_value    = 7
  }
  policy_item_daily {
    frequency_interval = 1
    retention_unit     = "days"
    retention_value    = 30
  }
  policy_item_monthly {
    frequency_interval = 1
    retention_unit     = "months"
    retention_value    = 12
  }
}
```

### Redis backup

```
Persistence strategy:
  RDB: every 900s if ≥1 key changed (good for restarts)
  AOF: appendfsync everysec (balance durability/performance)

AWS ElastiCache:
  - Automatic daily backup at 2 AM IST
  - Snapshot retention: 7 days
  - Cross-AZ failover: enabled (Multi-AZ)
```

### Recovery time objectives

| Database | RPO | RTO | Strategy |
|---|---|---|---|
| PostgreSQL | < 5 min | < 30 min | RDS Multi-AZ + PITR |
| MongoDB | < 1 hour | < 2 hours | Atlas continuous backup |
| Redis | < 15 min | < 5 min | ElastiCache failover (AOF) |
| S3 | 0 (11 nines durability) | < 1 min | Cross-region replication |
| ClickHouse | < 24 hours | < 4 hours | Daily EBS snapshot |

---

## 22. High Availability & Replication

### PostgreSQL HA (RDS Multi-AZ)

```
Primary (ap-south-1a)  ──synchronous replication──>  Standby (ap-south-1b)
       │                                                      │
       │ async replication                                    │
       ▼                                                      │
Read replica 1 (ap-south-1a)                                  │
Read replica 2 (ap-south-1c)                                  │
                                                             failover
                                                           (automatic, <120s)
```

### NestJS connection routing

```typescript
// Use primary for writes, replica for reads
@Injectable()
export class LoanRepository {
  constructor(
    @InjectRepository(LoanApplicationEntity, 'default')
    private primaryRepo: Repository<LoanApplicationEntity>,

    @InjectRepository(LoanApplicationEntity, 'replica')
    private replicaRepo: Repository<LoanApplicationEntity>,
  ) {}

  async create(data: Partial<LoanApplicationEntity>) {
    return this.primaryRepo.save(this.primaryRepo.create(data));
  }

  async findPipeline(lenderId: string, state: LoanState) {
    return this.replicaRepo.find({  // reads go to replica
      where: { lender_id: lenderId, state },
      order: { applied_at: 'DESC' },
    });
  }
}
```

---

## 23. Performance Optimisation

### Query optimisation patterns

```typescript
// ✅ Use select() to avoid loading unused columns
const score = await this.scoreRepository.findOne({
  where: { user_id: userId },
  select: ['id', 'score', 'risk_band', 'generated_at'],
  order: { generated_at: 'DESC' },
});

// ✅ Use pagination correctly
const [loans, total] = await this.loanRepository.findAndCount({
  where: { lender_id },
  skip: (page - 1) * limit,
  take: limit,
  order: { applied_at: 'DESC' },
});

// ✅ Raw query for complex analytics
const stats = await this.dataSource.query(`
  SELECT
    risk_band,
    count(*) AS total,
    avg(score) AS avg_score
  FROM credit_scores
  WHERE generated_at > NOW() - INTERVAL '30 days'
    AND user_id = $1
  GROUP BY risk_band
`, [userId]);

// ✅ Batch insert for EMI schedule generation
await this.emiRepository
  .createQueryBuilder()
  .insert()
  .into(EmiScheduleEntity)
  .values(emiSchedule)
  .orIgnore()
  .execute();
```

### Connection pool tuning

```
PostgreSQL connection pool formula:
  max_connections = (core_count × 2) + effective_spindle_count
  For 4-core RDS: max = 4×2 + 1 = 9 per app instance
  With 3 pods × 50 app connections = 150 max connections
  RDS max_connections: 300 (leave headroom for admin)

Redis pipeline batching:
  For bulk feature reads, use pipeline:
```

```typescript
async getMultipleFeatures(userIds: string[]): Promise<Map<string, any>> {
  const pipeline = this.redis.pipeline();
  userIds.forEach((id) => pipeline.get(CACHE_KEYS.FEATURES(id)));
  const results = await pipeline.exec();
  const map = new Map<string, any>();
  userIds.forEach((id, i) => {
    const [err, value] = results[i];
    if (!err && value) map.set(id, JSON.parse(value as string));
  });
  return map;
}
```

---

## 24. Monitoring & Alerting

### PostgreSQL monitoring queries

```sql
-- Slow queries (run daily)
SELECT
  query,
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2)  AS mean_ms,
  round(stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Table bloat
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS total_size,
  pg_size_pretty(pg_relation_size(tablename::regclass)) AS table_size,
  pg_size_pretty(pg_total_relation_size(tablename::regclass) -
    pg_relation_size(tablename::regclass)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;

-- Lock monitoring
SELECT
  pid, usename, state, wait_event_type, wait_event,
  left(query, 100) AS query_snippet
FROM pg_stat_activity
WHERE wait_event_type = 'Lock'
ORDER BY query_start;

-- Connection count
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

### Prometheus alert rules

```yaml
# prometheus/alerts/database.yml
groups:
  - name: database
    rules:
      - alert: PostgresConnectionsHigh
        expr: pg_stat_activity_count > 250
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "PostgreSQL connection count high ({{ $value }})"

      - alert: PostgresReplicationLag
        expr: pg_replication_slots_confirmed_flush_lsn_diff_bytes > 10485760
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "Replication lag > 10MB"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Redis memory usage > 90%"

      - alert: KafkaConsumerLagHigh
        expr: kafka_consumer_group_lag > 5000
        for: 10m
        labels: { severity: warning }
        annotations:
          summary: "Kafka consumer lag high on {{ $labels.topic }}"

      - alert: S3UploadErrors
        expr: rate(s3_upload_errors_total[5m]) > 0.1
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "S3 upload error rate elevated"

      - alert: ModelPSIAlert
        expr: clickhouse_psi_value > 0.2
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "Feature drift detected — PSI {{ $value }} for {{ $labels.feature }}"
```

---

## 25. DPDP Act & RBI Compliance

### DPDP Act 2023 compliance checklist

```
✅ Purpose limitation:
   - consent_records.purpose_code stored per data pull
   - Data only used for 'CREDIT_SCORING' purpose
   - Cross-purpose use blocked at application layer

✅ Data minimisation:
   - Only required features computed and stored
   - Raw PII never passes to ML layer
   - Geolocation rounded to 100m, not exact coordinates

✅ Storage limitation:
   - MongoDB: TTL indexes delete raw data after 24 months
   - S3 statements: lifecycle expires after 24 months
   - KYC files: retained 7 years per RBI mandate
   - Audit logs: 7 years per RBI (legal obligation override)

✅ Right to erasure:
   - DELETE /users/me triggers 72-hour purge pipeline
   - All raw MongoDB data deleted
   - PostgreSQL PII fields nullified
   - S3 objects hard deleted
   - ClickHouse user_id anonymised

✅ Consent management:
   - Granular per-source consent
   - Revocation available anytime
   - Consent records immutable (append-only)
   - SHA-256 consent hash for tamper detection

✅ Data localisation:
   - All infrastructure in ap-south-1 (Mumbai)
   - S3 bucket policy denies non-Mumbai writes
   - RDS and cache in private subnets, India region

✅ Breach notification:
   - CloudTrail + GuardDuty for anomaly detection
   - CERT-In breach notification within 6 hours
   - Affected users notified within 72 hours
```

### RBI AA Framework compliance

```
✅ FIP-FIU data flow:
   - All bank data via AA (not direct screen-scraping)
   - FI data fetched only with active consent artefact
   - Data not stored beyond consent validity period

✅ Data use restriction:
   - Bank data used only for credit assessment
   - Not shared with third parties
   - Not sold or monetised

✅ Audit trail:
   - Every AA data fetch logged in audit_logs
   - Consent artefact ID stored with each data pull
   - Complete chain from consent → fetch → feature → score
```

---

## 26. Data Retention Policies

```sql
-- Nightly cleanup job (pg_cron)

-- 1. Hard delete S3 documents scheduled for deletion
SELECT cron.schedule('hard_delete_documents', '0 2 * * *', $$
  UPDATE documents
  SET hard_deleted_at = NOW()
  WHERE is_deleted = true
    AND hard_delete_at <= NOW()
    AND hard_deleted_at IS NULL
  RETURNING id, s3_key_encrypted, s3_bucket;
  -- Application picks up this result and calls S3 delete
$$);

-- 2. Complete data deletion for users who requested it
SELECT cron.schedule('complete_user_deletion', '30 2 * * *', $$
  UPDATE users
  SET
    full_name_encrypted = NULL,
    email_encrypted = NULL,
    fcm_token = NULL,
    status = 'deleted'
  WHERE
    deletion_scheduled_at <= NOW()
    AND status != 'deleted';
$$);

-- 3. Expire stale sessions
SELECT cron.schedule('purge_sessions', '0 3 * * *', $$
  DELETE FROM sessions
  WHERE expires_at < NOW() - INTERVAL '7 days';
$$);

-- 4. Prune old notifications
SELECT cron.schedule('prune_notifications', '0 4 1 * *', $$
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('delivered', 'failed');
$$);
```

### Retention schedule

| Data type | Location | Retention | Legal basis |
|---|---|---|---|
| KYC documents | S3 | 7 years | RBI mandate |
| Bank statements | S3 | 24 months | DPDP data minimisation |
| Raw behavioral data | MongoDB | 24 months | DPDP data minimisation |
| Loan records | PostgreSQL | 10 years | RBI |
| EMI/repayment | PostgreSQL | 10 years | RBI |
| Audit logs | PostgreSQL + ClickHouse | 7 years | RBI |
| Credit scores | PostgreSQL | 7 years | RBI |
| Session tokens | PostgreSQL | 30 days after expiry | Auth ops |
| OTP cache | Redis | 5 minutes | Functional |
| Notifications | PostgreSQL | 90 days | Operational |

---

## 27. Seed Data & Fixtures

```typescript
// database/seeds/seed.ts
import { DataSource } from 'typeorm';

export async function seed(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Seed admin user
    await queryRunner.query(`
      INSERT INTO users (id, mobile_number, role, status, locale)
      VALUES
        ('00000000-0000-0000-0000-000000000001', '+919900000001', 'admin', 'active', 'en'),
        ('00000000-0000-0000-0000-000000000002', '+919900000002', 'compliance', 'active', 'en')
      ON CONFLICT DO NOTHING;
    `);

    // Seed loan products
    await queryRunner.query(`
      INSERT INTO cms_loan_products
        (product_code, name_json, description_json,
         min_amount, max_amount, min_tenure_months, max_tenure_months,
         interest_rate_min, interest_rate_max, eligible_risk_bands, min_score)
      VALUES
        ('MSME_WORKING_CAPITAL',
         '{"en":"MSME Working Capital Loan","hi":"MSME कार्यशील पूंजी ऋण"}',
         '{"en":"Short-term working capital for small businesses"}',
         1000000, 10000000, 6, 36, 12.0, 24.0,
         ARRAY['low','medium','very_low']::risk_band[], 600),
        ('PERSONAL_EMERGENCY',
         '{"en":"Personal Emergency Loan","hi":"व्यक्तिगत आपातकालीन ऋण"}',
         '{"en":"Quick personal loan for emergencies"}',
         100000, 500000, 3, 24, 18.0, 30.0,
         ARRAY['medium','low','very_low']::risk_band[], 550)
      ON CONFLICT DO NOTHING;
    `);

    // Seed questionnaire v3
    await queryRunner.query(`
      INSERT INTO cms_questionnaire_questions
        (version, q_number, group_name, question_json, options_json, scoring_rule)
      VALUES
        ('v3', 1, 'risk_tolerance',
         '{"en":"If you won ₹10,000 today, what would you do?",
           "hi":"यदि आपको आज ₹10,000 मिलें, तो आप क्या करेंगे?",
           "ta":"இன்று ₹10,000 கிடைத்தால் என்ன செய்வீர்கள்?"}',
         '[{"value":1,"labels":{"en":"Spend it all","hi":"सब खर्च करें"}},
           {"value":2,"labels":{"en":"Spend half","hi":"आधा खर्च करें"}},
           {"value":3,"labels":{"en":"Save most","hi":"ज्यादातर बचाएं"}},
           {"value":4,"labels":{"en":"Invest all","hi":"सब निवेश करें"}}]',
         '{"type":"linear","min_score":0,"max_score":1,"mapping":{
           "1":0.1,"2":0.4,"3":0.7,"4":1.0}}')
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.commitTransaction();
    console.log('✅ Database seeded successfully');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

## 28. Database Access Roles & Permissions

```sql
-- Create application roles
CREATE ROLE credsaathi_app      LOGIN PASSWORD 'app_password';
CREATE ROLE credsaathi_readonly LOGIN PASSWORD 'readonly_password';
CREATE ROLE credsaathi_ml       LOGIN PASSWORD 'ml_password';
CREATE ROLE credsaathi_admin    LOGIN PASSWORD 'admin_password';
CREATE ROLE credsaathi_compliance LOGIN PASSWORD 'compliance_password';

-- App role: full CRUD on all tables
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_app;
GRANT USAGE ON SCHEMA public TO credsaathi_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO credsaathi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO credsaathi_app;
-- No DELETE (all deletes are logical)
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM credsaathi_app;

-- Read-only role: for replicas and reporting
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_readonly;
GRANT USAGE ON SCHEMA public TO credsaathi_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO credsaathi_readonly;

-- ML role: read features + write scores
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_ml;
GRANT SELECT ON credit_scores, users, kyc_records TO credsaathi_ml;
GRANT INSERT ON credit_scores TO credsaathi_ml;

-- Compliance role: read everything, no write
GRANT CONNECT ON DATABASE credsaathi TO credsaathi_compliance;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO credsaathi_compliance;

-- Admin: full access
GRANT ALL PRIVILEGES ON DATABASE credsaathi TO credsaathi_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO credsaathi_admin;

-- Row-Level Security: users can only see their own data
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_own_loans ON loan_applications
  USING (user_id = current_setting('app.user_id')::uuid);

ALTER TABLE emi_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_own_emis ON emi_schedules
  USING (
    loan_id IN (
      SELECT id FROM loan_applications
      WHERE user_id = current_setting('app.user_id')::uuid
    )
  );

-- Set app context per request (called in NestJS interceptor)
-- SET LOCAL app.user_id = '{userId}';
```

---

*CredSaathi Database & Storage Technical Documentation — v1.0*
*PostgreSQL 16 · MongoDB 7 · Redis 7 · ClickHouse 24 · Kafka 3 · AWS S3*
*All DDL is production-ready. Run migrations before applying schema changes.*
*Data residency: ap-south-1 (Mumbai) only. DPDP Act 2023 compliant.*
