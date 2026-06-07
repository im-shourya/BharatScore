import { Module } from '@nestjs/common';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
  CookieResolver,
} from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'hi-*': 'hi',
        'ta-*': 'ta',
        'te-*': 'te',
        'mr-*': 'mr',
        'bn-*': 'bn',
        'gu-*': 'gu',
        'kn-*': 'kn',
        'ml-*': 'ml',
        'or-*': 'or',
        'pa-*': 'pa',
      },
      loaderOptions: {
        path: path.join(__dirname, '/translations/'),
        watch: process.env.NODE_ENV === 'development',
        includeSubfolders: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale', 'l'] },
        { use: HeaderResolver, options: ['x-locale', 'x-lang'] },
        new CookieResolver(['lang']),
        AcceptLanguageResolver,
      ],
      typesOutputPath: path.join(__dirname, '../../../src/generated/i18n.generated.ts'),
    }),
  ],
})
export class I18nAppModule {}
