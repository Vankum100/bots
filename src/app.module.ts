import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AppController } from './app.controller';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramModule } from './telegram/telegram.module';
import { sessionMiddleware } from './telegram/middlewares/session.middleware';
import { SyncModule } from './sync.module';

@Module({
  imports: [
    TelegramModule,
    SyncModule,
    RedisModule.forRoot({
      config: [
        {
          namespace: 'bot',
          host: process.env.REDIS_BOT_HOST,
          port: Number(process.env.REDIS_BOT_PORT),
          password: process.env.REDIS_BOT_PASSWORD,
          db: Number(process.env.REDIS_BOT_DB),
          ...(process.env.NODE_ENV === 'production'
            ? {
                tls: {
                  ca: [process.env.REDIS_TLS_CA_CRT],
                },
              }
            : {}),
        },
      ],
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get('TELEGRAM_BOT_TOKEN'),
        middlewares: [sessionMiddleware],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
