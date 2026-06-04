import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { CmsRepository } from './cms.repository';
import { CmsContentEntity } from './entities/cms-content.entity';
import { CmsFaqEntity } from './entities/cms-faq.entity';
import { CmsLoanProductEntity } from './entities/cms-loan-product.entity';
import { CmsQuestionnaireQuestionEntity } from './entities/cms-questionnaire-question.entity';
import { CacheModule } from '../../shared/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CmsContentEntity,
      CmsFaqEntity,
      CmsLoanProductEntity,
      CmsQuestionnaireQuestionEntity,
    ]),
    CacheModule,
  ],
  controllers: [CmsController],
  providers: [CmsService, CmsRepository],
  exports: [CmsService],
})
export class CmsModule {}
