import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity } from './entities/document.entity';

@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly repository: Repository<DocumentEntity>,
  ) {}

  async create(data: Partial<DocumentEntity>): Promise<DocumentEntity> {
    const doc = this.repository.create(data);
    return this.repository.save(doc);
  }

  async findByUserId(userId: string): Promise<DocumentEntity[]> {
    return this.repository.find({ where: { user_id: userId } });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<DocumentEntity | null> {
    return this.repository.findOne({ where: { id, user_id: userId } });
  }

  async updateVerification(id: string, isVerified: boolean, verifiedBy: string): Promise<void> {
    await this.repository.update(id, { 
      is_verified: isVerified,
      verified_by: verifiedBy,
      verified_at: new Date()
    });
  }
}
