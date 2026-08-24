import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByBankId(bankId: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { bank_id: bankId } });
  }

  async updateById(id: string, updates: Partial<UserEntity>): Promise<UserEntity> {
    await this.repository.update(id, updates as any);
    return this.findById(id) as Promise<UserEntity>;
  }

  async getDeletionRequests(from: string, to: string): Promise<number> {
    return this.repository
      .createQueryBuilder('user')
      .where('user.deletion_requested_at BETWEEN :from AND :to', { from, to })
      .getCount();
  }

  async findAll(skip: number = 0, take: number = 20, filters?: any): Promise<[UserEntity[], number]> {
    const qb = this.repository.createQueryBuilder('user');
    
    if (filters?.role) qb.andWhere('user.role = :role', { role: filters.role });
    if (filters?.status) qb.andWhere('user.status = :status', { status: filters.status });
    
    return qb.orderBy('user.created_at', 'DESC').skip(skip).take(take).getManyAndCount();
  }
}
