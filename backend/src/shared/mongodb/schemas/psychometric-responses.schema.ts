import { Schema, Document } from 'mongoose';

export interface IPsychometricResponses extends Document {
  user_id: string;
  questionnaire_version: string;
  locale: string;
  started_at: Date;
  completed_at: Date;
  duration_seconds: number;
  responses: any[];
  open_text_responses: any[];
  computed_scores: Record<string, number>;
  is_complete: boolean;
  created_at: Date;
}

export const PsychometricResponsesSchema = new Schema<IPsychometricResponses>(
  {
    user_id: { type: String, required: true, index: true },
    questionnaire_version: { type: String, required: true },
    locale: { type: String, default: 'en' },
    started_at: Date,
    completed_at: Date,
    duration_seconds: Number,
    responses: [
      {
        q_id: String,
        q_number: Number,
        group: String,
        answer_value: Number,
        answer_label: String,
        score: Number,
        time_taken_ms: Number,
        changed_answer: { type: Boolean, default: false },
      },
    ],
    open_text_responses: [
      {
        q_id: String,
        q_number: Number,
        response_encrypted: String,
        response_length: Number,
        language_detected: String,
        bert_embedding_s3_key: String,
      },
    ],
    computed_scores: {
      risk_tolerance: Number,
      delayed_gratification: Number,
      financial_literacy: Number,
      financial_behaviour: Number,
      composite_psychometric: Number,
    },
    is_complete: { type: Boolean, default: false },
  },
  {
    collection: 'psychometric_responses',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
);

PsychometricResponsesSchema.index({ user_id: 1, questionnaire_version: 1 });
PsychometricResponsesSchema.index({ completed_at: -1 });
// Only one complete response per user
PsychometricResponsesSchema.index(
  { user_id: 1 },
  { unique: true, partialFilterExpression: { is_complete: true } },
);
