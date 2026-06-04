import { Schema, Document } from 'mongoose';

export interface IRawPhoneData extends Document {
  user_id: string;
  source: string;
  month_year: string;
  plan_type: string;
  bills: any[];
  recharges: any[];
  usage: Record<string, any>;
  upi_linked: boolean;
  upi_vpa: string;
  consent_id: string;
  collected_at: Date;
  created_at: Date;
}

export const RawPhoneDataSchema = new Schema<IRawPhoneData>(
  {
    user_id: { type: String, required: true, index: true },
    source: { type: String, required: true, enum: ['jio', 'airtel', 'vi', 'bsnl'] },
    month_year: { type: String, required: true },
    plan_type: { type: String, enum: ['prepaid', 'postpaid'] },
    bills: [
      {
        bill_date: Date,
        due_date: Date,
        amount: Number,
        paid_amount: Number,
        paid_date: Date,
        payment_method: { type: String, enum: ['upi', 'netbanking', 'auto_debit'] },
        is_late: Boolean,
        days_late: { type: Number, default: 0 },
        bill_id: String,
      },
    ],
    recharges: [
      {
        date: Date,
        amount: Number,
        pack_type: { type: String, enum: ['data', 'talktime', 'combo'] },
        validity_days: Number,
        channel: { type: String, enum: ['app', 'ussd', 'retailer'] },
      },
    ],
    usage: {
      data_mb: Number,
      calls_minutes: Number,
      sms_count: Number,
    },
    upi_linked: Boolean,
    upi_vpa: String,
    consent_id: { type: String, required: true, index: true },
    collected_at: { type: Date, required: true },
  },
  {
    collection: 'raw_phone_data',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

// Compound index for user queries
RawPhoneDataSchema.index({ user_id: 1, month_year: -1 });
// TTL: auto-delete after 24 months (DPDP compliance)
RawPhoneDataSchema.index({ collected_at: 1 }, { expireAfterSeconds: 63072000 });
