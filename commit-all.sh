#!/bin/bash
set -e

echo "Starting commits..."

git add docs/bharascore-database-complete.md
git commit -m "docs: Add database architecture specification"

git add backend/src/common/enums/
git commit -m "feat(enums): Add core data type and status enums"

git add backend/src/modules/auth/entities/session.entity.ts backend/src/modules/user/entities/user.entity.ts
git commit -m "feat(user): Add user and session entity enhancements"

git add backend/src/modules/kyc/ backend/src/modules/consent/ backend/src/modules/document/
git commit -m "feat(kyc): Add KYC and Consent record entities"

git add backend/src/modules/loan/
git commit -m "feat(loan): Add Loan, EMI, and Repayment entities"

git add backend/src/modules/audit/ backend/src/modules/notification/
git commit -m "feat(audit): Add Audit log and Notification entities"

git add backend/src/modules/cms/
git commit -m "feat(cms): Add CMS content, FAQ, and product entities"

git add backend/src/modules/scoring/
git commit -m "feat(scoring): Add credit score entity"

git add backend/src/config/database.config.ts backend/src/shared/database/
git commit -m "feat(db): Update database module and TypeORM data source"

git add backend/src/database/
git commit -m "chore(db): Add initial TypeORM schema migration"

git add database/sql/001-init.sql database/sql/002-partitioning.sql database/sql/003-indexes.sql
git commit -m "feat(sql): Add SQL scripts for schemas, partitioning and indexing"

git add database/sql/004-roles-rls.sql database/sql/005-retention-jobs.sql database/seeds/seed.ts
git commit -m "feat(sql): Add RLS, retention jobs, and DB seed"

git add backend/src/config/mongodb.config.ts backend/src/shared/mongodb/ database/mongodb/
git commit -m "feat(mongodb): Add Mongoose schemas for NoSQL storage"

git add backend/src/shared/cache/ backend/src/common/constants/cache-keys.ts
git commit -m "feat(cache): Implement Redis feature store and Bull queues"

git add database/clickhouse/
git commit -m "feat(clickhouse): Add analytics schema and materialized views"

git add backend/src/config/kafka.config.ts backend/src/shared/kafka/ database/avro-schemas/
git commit -m "feat(kafka): Add Kafka module, producer, and Avro schemas"

git add backend/src/config/storage.config.ts backend/src/shared/storage/ database/s3/
git commit -m "feat(storage): Implement S3 service with KMS encryption"

git add ml/dags/
git commit -m "feat(ml): Add Airflow DAG for feature pipeline"

git add database/monitoring/ database/kubernetes/ database/backup/
git commit -m "chore(infra): Add Prometheus alerts, mTLS, and backup scripts"

git add backend/package.json backend/package-lock.json backend/.env.example backend/src/app.module.ts backend/src/guards/jwt-auth.guard.ts backend/src/modules/auth/auth.service.ts
git commit -m "chore(deps): Update package dependencies and app config"

echo "All commits done."
