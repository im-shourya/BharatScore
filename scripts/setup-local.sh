#!/usr/bin/env bash
# ============================================================================
# BharatScore — Post Docker-Compose Setup
# Run after: docker compose up -dnkk do un what is bharat
# ============================================================================
set -e

echo "⏳ Waiting for services to be healthy..."
sleep 10

# ── 1. Create MinIO Buckets ───────────────────────────────────────────
echo ""
echo "📦 Setting up MinIO (S3) buckets..."
docker exec credsaathi-minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
docker exec credsaathi-minio mc mb local/credsaathi-kyc-dev --ignore-existing 2>/dev/null || true
docker exec credsaathi-minio mc mb local/credsaathi-statements-dev --ignore-existing 2>/dev/null || true
docker exec credsaathi-minio mc mb local/credsaathi-ml-artifacts-dev --ignore-existing 2>/dev/null || true
docker exec credsaathi-minio mc mb local/credsaathi-audit-exports-dev --ignore-existing 2>/dev/null || true
echo "  ✅ MinIO buckets created"

# ── 2. Create Kafka Topics (via Redpanda) ─────────────────────────────
echo ""
echo "📨 Creating Kafka topics..."
TOPICS=(
  "raw-data-phone"
  "raw-data-bank"
  "raw-data-ecommerce"
  "raw-data-geolocation"
  "raw-data-merchant"
  "feature-computation"
  "score-requests"
  "score-results"
  "consent-events"
  "loan-events"
  "notification-events"
  "audit-events"
  "user-deletion-requests"
  "repayment-webhooks"
  "model-monitoring"
)

for topic in "${TOPICS[@]}"; do
  docker exec credsaathi-kafka rpk topic create "$topic" --partitions 3 --replicas 1 2>/dev/null || true
done
echo "  ✅ Kafka topics created"

# ── 3. Create MongoDB indexes ─────────────────────────────────────────
echo ""
echo "🗂️  Creating MongoDB indexes..."
docker exec credsaathi-mongo mongosh \
  -u mongo -p mongo --authenticationDatabase admin \
  credsaathi_behavioral \
  --eval "
    db.raw_phone_data.createIndex({ user_id: 1, month_year: -1 });
    db.raw_phone_data.createIndex({ collected_at: 1 }, { expireAfterSeconds: 63072000 });
    db.raw_bank_data.createIndex({ user_id: 1, 'statement_period.from': -1 });
    db.raw_bank_data.createIndex({ fetched_at: 1 }, { expireAfterSeconds: 63072000 });
    db.raw_ecommerce_data.createIndex({ user_id: 1, platform: 1 });
    db.raw_ecommerce_data.createIndex({ synced_at: 1 }, { expireAfterSeconds: 63072000 });
    db.raw_geolocation_data.createIndex({ user_id: 1, collected_at: -1 });
    db.raw_geolocation_data.createIndex({ collected_at: 1 }, { expireAfterSeconds: 63072000 });
    db.raw_merchant_data.createIndex({ user_id: 1, synced_at: -1 });
    db.psychometric_responses.createIndex({ user_id: 1, questionnaire_version: 1 });
    print('Indexes created successfully');
  " 2>/dev/null || true
echo "  ✅ MongoDB indexes created"

# ── 4. Init ClickHouse materialized views ─────────────────────────────
echo ""
echo "📊 Setting up ClickHouse views..."
docker exec -i credsaathi-clickhouse clickhouse-client \
  --database credsaathi_analytics \
  < database/clickhouse/002-materialized-views.sql 2>/dev/null || true
echo "  ✅ ClickHouse materialized views created"

echo ""
echo "════════════════════════════════════════════════════"
echo "✅ BharatScore local stack is READY!"
echo ""
echo "Services running:"
echo "  PostgreSQL  → localhost:5432"
echo "  MongoDB     → localhost:27017"
echo "  Redis       → localhost:6379"
echo "  Kafka API   → localhost:19092"
echo "  Kafka UI    → http://localhost:8080"
echo "  ClickHouse  → localhost:8123"
echo "  MinIO S3    → localhost:9000"
echo "  MinIO UI    → http://localhost:9090"
echo "════════════════════════════════════════════════════"
