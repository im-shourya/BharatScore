# ============================================================================
# BharatScore / CredSaathi — S3 Lifecycle Rules (Terraform)
# Section 18 of the database specification
# ============================================================================

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
      days = 2555 # 7 years
    }
  }

  rule {
    id     = "delete-soft-deleted"
    status = "Enabled"
    filter { suffix = ".deleted" }
    expiration { days = 3 } # Hard delete 72h after soft delete
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "statements_lifecycle" {
  bucket = aws_s3_bucket.statements.id

  rule {
    id     = "expire-statements"
    status = "Enabled"
    filter { prefix = "" }
    expiration { days = 730 } # 24 months DPDP data minimisation
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

resource "aws_s3_bucket_lifecycle_configuration" "ml_artifacts_lifecycle" {
  bucket = aws_s3_bucket.ml_artifacts.id

  rule {
    id     = "archive-old-models"
    status = "Enabled"
    filter { prefix = "models/" }
    transition {
      days          = 180
      storage_class = "STANDARD_IA"
    }
  }

  rule {
    id     = "expire-old-snapshots"
    status = "Enabled"
    filter { prefix = "feature-store/snapshots/" }
    expiration { days = 365 } # Keep feature snapshots for 1 year
  }
}
