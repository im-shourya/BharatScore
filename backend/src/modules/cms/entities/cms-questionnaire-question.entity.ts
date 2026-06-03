import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';

@Entity('cms_questionnaire_questions')
@Unique(['version', 'q_number'])
export class CmsQuestionnaireQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  version: string;

  @Column({ type: 'smallint' })
  q_number: number;

  @Column({ length: 50 })
  group_name: string;

  @Column({ type: 'jsonb' })
  question_json: Record<string, string>;

  @Column({ type: 'jsonb' })
  options_json: any[];

  @Column({ type: 'jsonb' })
  scoring_rule: Record<string, any>;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  weight: number;

  @Column({ default: true })
  is_mandatory: boolean;

  @Column({ default: true })
  is_active: boolean;
}
