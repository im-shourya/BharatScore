import { Injectable, NotFoundException } from '@nestjs/common';
import { CmsRepository } from './cms.repository';
import { CacheService } from '../../shared/cache/cache.service';
import { UpsertContentDto } from './dto/upsert-content.dto';

const CACHE_KEYS = {
  CMS_CONTENT: (key: string, locale: string) => `cms:content:${key}:${locale}`,
  CMS_FAQ: (locale: string, category: string) => `cms:faq:${category}:${locale}`,
};

@Injectable()
export class CmsService {
  constructor(
    private readonly cmsRepository: CmsRepository,
    private readonly cacheService: CacheService,
  ) {}

  async getContent(key: string, locale: string) {
    const cacheKey = CACHE_KEYS.CMS_CONTENT(key, locale);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    let content = await this.cmsRepository.findByKeyAndLocale(key, locale);
    if (!content && locale !== 'en') {
      content = await this.cmsRepository.findByKeyAndLocale(key, 'en');
    }
    if (!content) throw new NotFoundException({ code: 'CMS_CONTENT_NOT_FOUND' });

    await this.cacheService.set(cacheKey, content, 3600);
    return content;
  }

  async getFaqs(locale: string, category?: string) {
    const cacheKey = CACHE_KEYS.CMS_FAQ(locale, category ?? 'all');
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const faqs = await this.cmsRepository.findFaqs(locale, category);
    await this.cacheService.set(cacheKey, faqs, 3600);
    return faqs;
  }

  async getLoanProducts(locale: string) {
    return this.cmsRepository.findActiveLoanProducts(locale);
  }

  async getQuestionnaire(locale: string) {
    const questions = await this.cmsRepository.findActiveQuestions();
    return questions.map((q) => ({
      id: q.id,
      q_number: q.q_number,
      group: q.group_name,
      question: (q.question_json as Record<string, string>)[locale] ?? (q.question_json as Record<string, string>)['en'],
      options: (q.options_json as any[]).map((o) => ({
        value: o.value,
        label: o.labels[locale] ?? o.labels['en'],
      })),
    }));
  }

  async upsertContent(key: string, locale: string, dto: UpsertContentDto) {
    const result = await this.cmsRepository.upsert(key, locale, dto);
    await this.cacheService.del(CACHE_KEYS.CMS_CONTENT(key, locale));
    return result;
  }
}
