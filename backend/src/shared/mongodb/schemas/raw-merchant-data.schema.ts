import { Schema, Document } from 'mongoose';

export interface IRawMerchantData extends Document {
  user_id: string;
  gstin: string;
  business_name_encrypted: string;
  business_type: string;
  gst_filings: any[];
  platform_ratings: any[];
  aggregates: Record<string, any>;
  consent_id: string;
  synced_at: Date;
  created_at: Date;
}

export const RawMerchantDataSchema = new Schema<IRawMerchantData>(
  {
    user_id: { type: String, required: true, index: true },
    gstin: String, // encrypted
    business_name_encrypted: String,
    business_type: {
      type: String,
      enum: ['retailer', 'wholesaler', 'service', 'manufacturing'],
    },
    gst_filings: [
      {
        period: String,
        filing_type: { type: String, enum: ['GSTR-1', 'GSTR-3B'] },
        filed_on: Date,
        due_date: Date,
        is_late: Boolean,
        days_late: { type: Number, default: 0 },
        turnover: Number,
        tax_paid: Number,
      },
    ],
    platform_ratings: [
      {
        platform: { type: String, enum: ['flipkart_seller', 'amazon_seller', 'swiggy_partner'] },
        rating: Number,
        review_count: Number,
        fulfillment_rate: Number,
        return_rate: Number,
        joined_date: Date,
      },
    ],
    aggregates: {
      gst_filing_streak: Number,
      gst_late_count: Number,
      avg_monthly_turnover: Number,
      turnover_growth_pct: Number,
      avg_rating: Number,
      years_in_business: Number,
    },
    consent_id: { type: String, required: true },
    synced_at: { type: Date, required: true },
  },
  {
    collection: 'raw_merchant_data',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

RawMerchantDataSchema.index({ user_id: 1, synced_at: -1 });
RawMerchantDataSchema.index({ synced_at: 1 }, { expireAfterSeconds: 63072000 });
