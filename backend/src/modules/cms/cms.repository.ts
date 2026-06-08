import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CmsContentEntity } from './entities/cms-content.entity';
import { CmsFaqEntity } from './entities/cms-faq.entity';
import { CmsLoanProductEntity } from './entities/cms-loan-product.entity';
import { CmsQuestionnaireQuestionEntity } from './entities/cms-questionnaire-question.entity';
import { UpsertContentDto } from './dto/upsert-content.dto';

@Injectable()
export class CmsRepository {
  constructor(
    @InjectRepository(CmsContentEntity) private readonly contentRepo: Repository<CmsContentEntity>,
    @InjectRepository(CmsFaqEntity) private readonly faqRepo: Repository<CmsFaqEntity>,
    @InjectRepository(CmsLoanProductEntity) private readonly loanProductRepo: Repository<CmsLoanProductEntity>,
    @InjectRepository(CmsQuestionnaireQuestionEntity) private readonly questionRepo: Repository<CmsQuestionnaireQuestionEntity>,
  ) {}

  async findByKeyAndLocale(key: string, locale: string): Promise<CmsContentEntity | null> {
    return this.contentRepo.findOne({ where: { key, locale, is_active: true } });
  }

  async findFaqs(locale: string, category?: string): Promise<CmsFaqEntity[]> {
    const where: any = { locale, is_active: true };
    if (category && category !== 'all') {
      where.category = category;
    }
    return this.faqRepo.find({ where, order: { sort_order: 'ASC' } });
  }

  async findActiveLoanProducts(locale: string): Promise<CmsLoanProductEntity[]> {
    return this.loanProductRepo.find({ where: { is_active: true } });
  }

  async findActiveQuestions(): Promise<CmsQuestionnaireQuestionEntity[]> {
    return this.questionRepo.find({ where: { is_active: true }, order: { q_number: 'ASC' } });
  }

  async upsert(key: string, locale: string, dto: UpsertContentDto) {
    let content = await this.contentRepo.findOne({ where: { key, locale } });
    if (content) {
      content.content = dto.value;
      content.is_active = dto.is_published ?? content.is_active;
    } else {
      content = this.contentRepo.create({
        key,
        locale,
        namespace: 'default',
        content: dto.value,
        is_active: dto.is_published ?? true,
      });
    }
    return this.contentRepo.save(content);
  }
}
