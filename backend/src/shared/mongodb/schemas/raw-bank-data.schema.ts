import { Schema, Document } from 'mongoose';

export interface IRawBankData extends Document {
  user_id: string;
  aa_consent_id: string;
  fip_id: string;
  account_type: string;
  account_masked: string;
  statement_period: { from: Date; to: Date };
  opening_balance: number;
  closing_balance: number;
  transactions: any[];
  summary: Record<string, any>;
  account_number_encrypted: string;
  ifsc_encrypted: string;
  fetched_at: Date;
  created_at: Date;
}

export const RawBankDataSchema = new Schema<IRawBankData>(
  {
    user_id: { type: String, required: true, index: true },
    aa_consent_id: { type: String, required: true, index: true },
    fip_id: { type: String, required: true, enum: ['sbi', 'hdfc', 'icici', 'axis', 'kotak'] },
    account_type: { type: String, required: true, enum: ['savings', 'current', 'od'] },
    account_masked: String,
    statement_period: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    opening_balance: Number,
    closing_balance: Number,
    transactions: [
      {
        txn_id: String,
        date: Date,
        amount: Number,
        type: { type: String, enum: ['credit', 'debit'] },
        mode: { type: String, enum: ['imps', 'neft', 'upi', 'atm', 'pos', 'ecs'] },
        description: String,
        balance_after: Number,
        category: { type: String, enum: ['salary', 'emi', 'utility', 'grocery', 'transfer', 'other'] },
        is_recurring: Boolean,
        merchant_code: String,
      },
    ],
    summary: {
      total_credits: Number,
      total_debits: Number,
      avg_daily_balance: Number,
      salary_credits: Number,
      emi_debits: Number,
      bounce_count: Number,
      min_balance_maintained: Boolean,
    },
    account_number_encrypted: String,
    ifsc_encrypted: String,
    fetched_at: { type: Date, required: true },
  },
  {
    collection: 'raw_bank_data',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

RawBankDataSchema.index({ user_id: 1, 'statement_period.from': -1 });
RawBankDataSchema.index({ fip_id: 1, user_id: 1 });
RawBankDataSchema.index({ fetched_at: 1 }, { expireAfterSeconds: 63072000 });
