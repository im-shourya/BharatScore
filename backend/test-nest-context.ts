import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/modules/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  
  console.log('Testing OTP Send...');
  try {
    const result = await authService.sendOtp({ mobile: '9876543210' }, 'en');
    console.log('Result:', result);
  } catch (err) {
    console.error('Service Error:', err);
  }
  
  await app.close();
}

bootstrap().catch(err => {
  console.error('Bootstrap Error:', err);
  process.exit(1);
});
