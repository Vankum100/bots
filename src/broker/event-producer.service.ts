import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

import { InteractionService } from '../telegram/services/interaction.service';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export class EventProducer implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout = null;
  private isAlive = true;
  private readonly logger = new Logger('Event Producer');

  constructor(
    @InjectRedis('bot') private readonly redisClient: Redis,
    private interactionService: InteractionService,
  ) {}

  async onModuleInit() {
    this.populateEvents();
  }

  async onModuleDestroy() {
    clearInterval(this.interval);
    this.isAlive = false;
  }

  private async produceEvents(): Promise<void> {
    const streamKey = `event_stream:${process.env.MICROSERVICE_BOT_NAME}`;

    const processEvent = async (event: string) => {
      const { message, rangeipId } = JSON.parse(event);
      const chatIds =
        await this.interactionService.getChatIdsByRangeipId(rangeipId);
      const streamData = chatIds.map((chatId) => ({
        message,
        chatId,
      }));

      return Promise.all(
        streamData.map(async (data) => {
          await this.redisClient.xadd(
            streamKey,
            '*',
            'message',
            JSON.stringify(data),
          );
        }),
      );
    };
    let events: string[] = [];
    try {
      const deviceStatusKey = `device.status.${process.env.MICROSERVICE_BOT_NAME}.${3000}`;
      const keyExists = await this.redisClient.exists(deviceStatusKey);
      if (keyExists) {
        events = await this.redisClient.lrange(deviceStatusKey, 0, -1);
        this.logger.log(`Produced events: ${events.length}`);
      } else {
        this.logger.log('No events found.');
      }
    } catch (e) {
      this.logger.error('Redis raw events error:', e);
    }

    await Promise.all(events.map(processEvent));

    await this.redisClient.del(
      `device.status.${process.env.MICROSERVICE_BOT_NAME}.${3000}`,
    );
  }

  private populateEvents() {
    this.interval = setInterval(() => {
      this.produceEvents();
    }, 7 * 6000);
  }
}
