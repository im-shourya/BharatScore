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
}
