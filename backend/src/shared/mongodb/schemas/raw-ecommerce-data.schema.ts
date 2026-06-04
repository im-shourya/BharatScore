import { Schema, Document } from 'mongoose';

export interface IRawEcommerceData extends Document {
  user_id: string;
  platform: string;
  profile_linked_at: Date;
  consent_id: string;
  orders: any[];
  period: { from: Date; to: Date; months: number };
  aggregates: Record<string, any>;
  synced_at: Date;
  created_at: Date;
}

export const RawEcommerceDataSchema = new Schema<IRawEcommerceData>(
  {
    user_id: { type: String, required: true, index: true },
    platform: { type: String, required: true, enum: ['flipkart', 'amazon', 'meesho', 'myntra', 'jiomart'] },
    profile_linked_at: Date,
    consent_id: { type: String, required: true },
    orders: [
      {
        order_id: String,
        order_date: Date,
        delivery_date: Date,
        status: { type: String, enum: ['delivered', 'returned', 'cancelled'] },
        items: [
          {
            category: String,
            subcategory: String,
            amount: Number,
            quantity: Number,
          },
        ],
        total_amount: Number,
        payment_method: { type: String, enum: ['upi', 'card', 'cod', 'emi'] },
        is_returned: Boolean,
        return_date: Date,
        return_reason: String,
        platform_offer_used: Boolean,
        emi_months: Number,
      },
    ],
    period: {
      from: Date,
      to: Date,
      months: Number,
    },
    aggregates: {
      total_orders: Number,
      total_spend: Number,
      returned_orders: Number,
      return_rate: Number,
      avg_ticket_size: Number,
      monthly_spend_series: [Number],
      top_categories: [String],
      cod_ratio: Number,
      emi_purchase_count: Number,
    },
    synced_at: { type: Date, required: true },
  },
  {
    collection: 'raw_ecommerce_data',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

RawEcommerceDataSchema.index({ user_id: 1, platform: 1 });
RawEcommerceDataSchema.index({ 'aggregates.return_rate': 1 });
RawEcommerceDataSchema.index({ synced_at: 1 }, { expireAfterSeconds: 63072000 });
