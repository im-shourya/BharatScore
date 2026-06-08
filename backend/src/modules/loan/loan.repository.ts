import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoanApplicationEntity } from './entities/loan-application.entity';
import { LoanState } from '../../common/enums/loan-state.enum';

@Injectable()
export class LoanRepository {
  constructor(
    @InjectRepository(LoanApplicationEntity)
    private readonly repository: Repository<LoanApplicationEntity>,
  ) {}

  async create(data: Partial<LoanApplicationEntity>): Promise<LoanApplicationEntity> {
    const loan = this.repository.create(data);
    return this.repository.save(loan);
  }

  async findByUserId(userId: string): Promise<LoanApplicationEntity[]> {
    return this.repository.find({ where: { user_id: userId }, order: { created_at: 'DESC' } });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<LoanApplicationEntity | null> {
    return this.repository.findOne({ where: { id, user_id: userId } });
  }

  async updateStatus(id: string, state: LoanState): Promise<void> {
    await this.repository.update(id, { state });
  }
}
