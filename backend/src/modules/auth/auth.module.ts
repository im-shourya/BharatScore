import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { SessionEntity } from './entities/session.entity';
import { UserEntity } from '../user/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        privateKey: config.get<string>('jwt.privateKey'),
        publicKey: config.get<string>('jwt.publicKey'),
        signOptions: {
          algorithm: 'RS256' as const,
          expiresIn: parseInt(config.get<string>('jwt.accessExpiry')?.replace('s', '') || '900', 10),
          issuer: 'credsaathi-auth',
          audience: 'credsaathi-api',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
