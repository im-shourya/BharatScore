// ============================================================================
// BharatScore / CredSaathi — MongoDB Indexes & TTL Policies
// Run in MongoDB shell: mongosh < indexes.js
// Section 10 of the database specification
// ============================================================================

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

// raw_merchant_data
db.raw_merchant_data.createIndex({ user_id: 1, synced_at: -1 });
db.raw_merchant_data.createIndex(
  { synced_at: 1 },
  { expireAfterSeconds: 63072000, name: 'ttl_24months' }
);

// psychometric_responses
db.psychometric_responses.createIndex({ user_id: 1, questionnaire_version: 1 });
db.psychometric_responses.createIndex({ completed_at: -1 });
db.psychometric_responses.createIndex(
  { user_id: 1 },
  { unique: true, partialFilterExpression: { is_complete: true } }
);

print('✅ MongoDB indexes created successfully');
