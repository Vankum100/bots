import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { OnModuleDestroy } from '@nestjs/common';

import { InteractionService } from '../telegram/services/interaction.service';

export class EventConsumer implements OnModuleDestroy {
  private interval: NodeJS.Timeout = null;
  private isAlive = true;

  constructor(
    @InjectRedis('bot') private readonly redisClient: Redis,
    private interactionService: InteractionService,
  ) {}

  // async onModuleInit() {
  //   this.startConsumer();
  // }

  async onModuleDestroy() {
    clearInterval(this.interval);
    this.isAlive = false;
  }

  async consumeEvents(): Promise<void> {
    const areas = await this.interactionService.getAreas();
    const consumerName = areas[0].areaId;
    const streamKey = `event_stream:${process.env.MICROSERVICE_BOT_NAME}`;
    const consumerGroup = `event_consumers:${process.env.MICROSERVICE_BOT_NAME}`;

    try {
      const keyExists = await this.redisClient.exists(streamKey);
      let groupInfo: any;
      if (keyExists) {
        groupInfo = await this.redisClient.xinfo('GROUPS', streamKey);
      }

      const groupExists = !keyExists
        ? false
        : groupInfo.some((group) => group[1] === consumerGroup);

      if (!keyExists || !groupExists) {
        await this.redisClient.xgroup(
          'CREATE',
          streamKey,
          consumerGroup,
          '$',
          'MKSTREAM',
        );
      }
    } catch (e) {
      console.error('Error creating consumer group:', e);
    }

    let pendingEvents = true;

    const info: any = await this.redisClient.xinfo(
      'CONSUMERS',
      streamKey,
      consumerGroup,
    );
    const consumers = info;
    pendingEvents = consumers.some(
      (consumer) => consumer[1] === consumerName && consumer[3] > 0,
    );
    if (pendingEvents) {
      const messages = await this.redisClient.xreadgroup(
        'GROUP',
        consumerGroup,
        consumerName,
        'COUNT',
        50,
        'STREAMS',
        streamKey,
        '0',
      );

      if (!messages || messages.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const streamMessages = messages[0][1];
      for (const [messageId, message] of streamMessages) {
        const { message: eventMessage, chatId } = JSON.parse(message[1]);
        try {
          await this.interactionService.sendTelegramMessage(
            chatId,
            eventMessage,
          );
          await this.redisClient.xack(streamKey, consumerGroup, messageId);
          await this.redisClient.xdel(streamKey, messageId);
        } catch (e) {
          console.error('Error sending message to Telegram:', e);
        }
      }
    } else {
      const messages = await this.redisClient.xreadgroup(
        'GROUP',
        consumerGroup,
        consumerName,
        'BLOCK',
        0,
        'STREAMS',
        streamKey,
        '>',
      );

      if (!messages || messages.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const streamMessages = messages[0][1];
      for (const [messageId, message] of streamMessages) {
        const { message: eventMessage, chatId } = JSON.parse(message[1]);
        try {
          await this.interactionService.sendTelegramMessage(
            chatId,
            eventMessage,
          );
          await this.redisClient.xack(streamKey, consumerGroup, messageId);
          await this.redisClient.xdel(streamKey, messageId);
        } catch (e) {
          console.error('Error sending message to Telegram:', e);
        }
      }
    }
  }

  // private startConsumer() {
  //   this.interval = setInterval(async () => {
  //     this.consumeEvents();
  //   }, 1000);
  // }
}
