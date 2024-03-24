import { TelegrafModule } from 'nestjs-telegraf';
require('dotenv').config();
import { InteractionService } from './telegram/services/interaction.service';

import { Module } from '@nestjs/common';
import { UserService } from './telegram/services/user.service';

import { RedisModule } from '@liaoliaots/nestjs-redis';
import { EventProducer } from './broker/event-producer.service';
import { EventConsumer } from './broker/event-consumer.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { sessionMiddleware } from './telegram/middlewares/session.middleware';

const services = [
  InteractionService,
  UserService,
  EventProducer,
  EventConsumer,
];
@Module({
  imports: [
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
  providers: [...services],
})
export class SyncModule {}
