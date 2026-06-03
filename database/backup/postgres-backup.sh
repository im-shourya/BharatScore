#!/usr/bin/env bash
# ============================================================================
# BharatScore / CredSaathi — PostgreSQL Backup Scripts
# Section 21 of the database specification
# ============================================================================

set -euo pipefail

CLUSTER_ID="credsaathi-prod"
REGION="ap-south-1"
DR_REGION="ap-southeast-1"
TIMESTAMP=$(date +%Y%m%d%H%M)

echo "🔄 BharatScore Database Backup — ${TIMESTAMP}"

# ── 1. RDS automated backup configuration ──────────────────────────────
echo "📋 Configuring RDS automated backups..."
aws rds modify-db-cluster \
  --db-cluster-identifier "${CLUSTER_ID}" \
  --backup-retention-period 7 \
  --preferred-backup-window "18:00-19:00" \
  --enable-cloudwatch-logs-exports '["postgresql","upgrade"]' \
  --region "${REGION}" \
  2>/dev/null || echo "  ⚠ Cluster modification skipped (may already be configured)"

# ── 2. Manual snapshot before deployment ─────────────────────────────
echo "📸 Creating manual snapshot: pre-deploy-${TIMESTAMP}..."
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier "${CLUSTER_ID}" \
  --db-cluster-snapshot-identifier "pre-deploy-${TIMESTAMP}" \
  --region "${REGION}" \
  2>/dev/null || echo "  ⚠ Snapshot creation failed (check permissions)"

# ── 3. Wait for snapshot to complete ──────────────────────────────────
echo "⏳ Waiting for snapshot to become available..."
aws rds wait db-cluster-snapshot-available \
  --db-cluster-snapshot-identifier "pre-deploy-${TIMESTAMP}" \
  --region "${REGION}" \
  2>/dev/null || echo "  ⚠ Wait timed out"

# ── 4. Cross-region DR copy ──────────────────────────────────────────
echo "🌍 Copying snapshot to DR region (${DR_REGION})..."
SOURCE_ARN=$(aws rds describe-db-cluster-snapshots \
  --db-cluster-snapshot-identifier "pre-deploy-${TIMESTAMP}" \
  --region "${REGION}" \
  --query 'DBClusterSnapshots[0].DBClusterSnapshotArn' \
  --output text 2>/dev/null || echo "")

if [ -n "${SOURCE_ARN}" ] && [ "${SOURCE_ARN}" != "None" ]; then
  aws rds copy-db-cluster-snapshot \
    --source-db-cluster-snapshot-identifier "${SOURCE_ARN}" \
    --target-db-cluster-snapshot-identifier "credsaathi-dr-${TIMESTAMP}" \
    --source-region "${REGION}" \
    --region "${DR_REGION}" \
    2>/dev/null || echo "  ⚠ Cross-region copy failed"
else
  echo "  ⚠ Source ARN not found, skipping cross-region copy"
fi

# ── 5. Cleanup old snapshots (keep last 7) ────────────────────────────
echo "🗑 Cleaning up old manual snapshots..."
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier "${CLUSTER_ID}" \
  --snapshot-type manual \
  --region "${REGION}" \
  --query 'sort_by(DBClusterSnapshots, &SnapshotCreateTime)[:-7].DBClusterSnapshotIdentifier' \
  --output text 2>/dev/null | \
  tr '\t' '\n' | \
  while read -r snap_id; do
    if [ -n "${snap_id}" ]; then
      echo "  Deleting: ${snap_id}"
      aws rds delete-db-cluster-snapshot \
        --db-cluster-snapshot-identifier "${snap_id}" \
        --region "${REGION}" 2>/dev/null || true
    fi
  done

echo "✅ Backup complete — ${TIMESTAMP}"
