import { Schema, Document } from 'mongoose';

export interface IRawGeolocationData extends Document {
  user_id: string;
  consent_id: string;
  period_days: number;
  clusters: Record<string, any>;
  metrics: Record<string, any>;
  device_os: string;
  gps_permission_level: string;
  collected_at: Date;
  created_at: Date;
}

export const RawGeolocationDataSchema = new Schema<IRawGeolocationData>(
  {
    user_id: { type: String, required: true, index: true },
    consent_id: { type: String, required: true },
    period_days: { type: Number, default: 90 },
    clusters: {
      home: {
        lat: Number,
        lng: Number,
        radius_meters: Number,
        confidence: Number,
        nights_present: Number,
        first_detected: Date,
        address_tier: String,
        pincode: String,
        state: String,
      },
      work: {
        lat: Number,
        lng: Number,
        radius_meters: Number,
        confidence: Number,
        days_present: Number,
        address_tier: String,
      },
    },
    metrics: {
      home_anchor_score: Number,
      work_anchor_score: Number,
      mobility_entropy: Number,
      unique_areas_visited: Number,
      interstate_travel_count: Number,
      city_tier: Number,
      state_of_residence: String,
    },
    device_os: { type: String, enum: ['android', 'ios'] },
    gps_permission_level: { type: String, enum: ['always', 'when_in_use', 'denied'] },
    collected_at: { type: Date, required: true },
  },
  {
    collection: 'raw_geolocation_data',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

RawGeolocationDataSchema.index({ user_id: 1, collected_at: -1 });
RawGeolocationDataSchema.index({ 'clusters.home.state': 1 });
RawGeolocationDataSchema.index({ collected_at: 1 }, { expireAfterSeconds: 63072000 });
