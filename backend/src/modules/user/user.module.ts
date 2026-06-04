import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { UserEntity } from './entities/user.entity';
import { EncryptionModule } from '../../shared/encryption/encryption.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    EncryptionModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
