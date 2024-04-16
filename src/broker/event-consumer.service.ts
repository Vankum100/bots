import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as process from 'process';
import axios from 'axios';
import { UserService } from '../telegram/services/user.service';

interface MessageInfo {
  messageId: string;
  link: string;
  ipaddr: string;
  prevStatus: string;
  currentStatus: string;
  time: string;
  reason?: string;
}

export class EventConsumer implements OnModuleDestroy, OnModuleInit {
  private interval: NodeJS.Timeout = null;
  private isAlive = true;
  private readonly streamKey: string;
  private readonly consumerGroup: string;
  private readonly consumerName: string;
  private readonly messageQueue: any[] = [];
  private isProcessingQueue = false;
  private isRateLimited = false;
  private retryAfterSeconds = 0;
  private readonly MAX_MESSAGES_PER_DELAY = 60;
  private readonly MAX_QUEUE_SIZE = 1500;
  private readonly delayInterval = 60000;
  private messageCounter = 0;
  private lastMessageTime = Date.now();
  private readonly logger = new Logger('Event Consumer');

  constructor(
    @InjectRedis('bot') private readonly redisClient: Redis,
    private readonly userService: UserService,
  ) {
    this.streamKey = `event_stream:${process.env.MICROSERVICE_BOT_NAME}`;
    this.consumerGroup = `event_consumers:${process.env.MICROSERVICE_BOT_NAME}`;
    this.consumerName = process.env.consumerName;
  }

  async onModuleInit() {
    this.startConsumer();
  }

  async onModuleDestroy() {
    clearInterval(this.interval);
    this.isAlive = false;
  }
  async sendTelegramMessage(
    chatId: number,
    messageInfo: MessageInfo,
  ): Promise<any> {
    const {
      messageId,
      link: linkUrl,
      ipaddr,
      prevStatus,
      currentStatus,
      time,
      reason,
    } = messageInfo;

    if (await this.userService.isNotificationEnabled(chatId)) {
      this.logger.log(`Sending message ${messageId} to chatId ${chatId}`);
      try {
        const escapedIpaddr = ipaddr.replace(/[.@:]/g, '\\$&');
        const escapedTime = time.replace(/[:-]/g, '\\$&');
        let formattedMessage: string;
        if (reason !== '' && currentStatus === 'Ошибка') {
          formattedMessage = `
        Изменение статуса устройства: [${escapedIpaddr}](${linkUrl}) \nПредыдущий:  *${prevStatus}* \nТекущий: *${currentStatus}* \nПричина: *${reason}* \nДата: _${escapedTime}_
      `;
        } else {
          formattedMessage = `
        Изменение статуса устройства: [${escapedIpaddr}](${linkUrl}) \nПредыдущий:  *${prevStatus}* \nТекущий: *${currentStatus}* \nДата: _${escapedTime}_
      `;
        }

        const finalUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

        const response = await axios.post(finalUrl, {
          chat_id: chatId,
          text: formattedMessage,
          parse_mode: 'MarkdownV2',
        });

        return response.data;
      } catch (err) {
        console.log('err ', err);
        this.logger.error('telegram error ', err);
        throw new Error(`Error sending telegram message: ${err.message}`);
      }
    } else {
      this.logger.warn(`Notifications currently disabled for userId ${chatId}`);
    }
  }

  async consumeEvents() {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logger.warn(
        `Maximum queue size exceeded. Current queue size: ${this.messageQueue.length} consumerName: ${this.consumerName}`,
      );
      return;
    }
    const messages = await this.getMessagesFromStream();
    if (!messages || messages.length === 0) {
      return;
    }

    messages.forEach(([messageId, message]) => {
      const { message: eventMessage, chatId } = JSON.parse(message[1]);
      this.messageQueue.push({ messageId, eventMessage, chatId });
    });

    await this.processMessageQueue();
  }

  private async processMessageQueue() {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const { messageId, eventMessage, chatId } = this.messageQueue.shift();
      try {
        if (this.isRateLimited) {
          this.logger.warn(
            `Rate limit exceeded on consumerName: ${this.consumerName}. Waiting ${this.retryAfterSeconds} seconds before retrying. lastProcessedMessageId: ${messageId}`,
          );
          await this.delay(this.retryAfterSeconds * 1000);
          this.isRateLimited = false;
        }

        await this.sendTelegramMessage(chatId, {
          ...eventMessage,
          messageId,
        });
        await this.redisClient.xack(
          this.streamKey,
          this.consumerGroup,
          messageId,
        );
        await this.redisClient.xdel(this.streamKey, messageId);

        this.messageCounter++;
        if (this.messageCounter >= this.MAX_MESSAGES_PER_DELAY) {
          const elapsedTime = Date.now() - this.lastMessageTime;
          if (elapsedTime < this.delayInterval) {
            const delayTime = this.delayInterval - elapsedTime;
            this.logger.warn(
              `Delayed for ${delayTime} milliseconds on consumerName: ${this.consumerName} because ${this.messageCounter} messages already sent delayedMessage : ${messageId}`,
            );
            await this.delay(delayTime);
          }
          this.messageCounter = 0;
          this.lastMessageTime = Date.now();
        }
      } catch (error) {
        if (error.response && error.response.status === 429) {
          this.isRateLimited = true;
          this.retryAfterSeconds = error.response.data.parameters.retry_after;
        } else {
          this.isRateLimited = true;
          this.retryAfterSeconds = 15;
          this.logger.error('Error sending message to Telegram:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async getMessagesFromStream() {
    try {
      const consumersInfo: any = await this.redisClient.xinfo(
        'CONSUMERS',
        this.streamKey,
        this.consumerGroup,
      );
      const pendingEvents = consumersInfo.some(
        (consumer) => consumer[1] === this.consumerName && consumer[3] > 0,
      );

      let messages;
      if (pendingEvents) {
        messages = await this.redisClient.xreadgroup(
          'GROUP',
          this.consumerGroup,
          this.consumerName,
          'COUNT',
          50,
          'BLOCK',
          10000,
          'STREAMS',
          this.streamKey,
          '0',
        );
      } else {
        messages = await this.redisClient.xreadgroup(
          'GROUP',
          this.consumerGroup,
          this.consumerName,
          'COUNT',
          50,
          'BLOCK',
          10000,
          'STREAMS',
          this.streamKey,
          '>',
        );
      }

      if (!messages || messages.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        this.logger.log(
          `${pendingEvents ? 'Pending messages:' : 'New messages:'} ${messages.length} messageQueueSize: ${this.messageQueue.length} lastQueuedMessageId: ${this.messageQueue.length !== 0 ? this.messageQueue.at(-1).messageId : 'none'} consumerName: ${this.consumerName}`,
        );
        return messages[0][1];
      }
    } catch (error) {
      console.log('error ', error);
      this.logger.error('Error consuming events:', error);
      return [];
    }
  }

  async createConsumerGroupIfNeeded() {
    const keyExists = await this.redisClient.exists(this.streamKey);
    if (!keyExists) {
      await this.redisClient.xgroup(
        'CREATE',
        this.streamKey,
        this.consumerGroup,
        '$',
        'MKSTREAM',
      );
    } else {
      try {
        await this.redisClient.xgroup(
          'CREATE',
          this.streamKey,
          this.consumerGroup,
          '$',
          'MKSTREAM',
        );
      } catch (error) {
        if (
          error.message.includes('BUSYGROUP Consumer Group name already exists')
        ) {
          console.log(`Consumer group ${this.consumerGroup} already exists.`);
          return;
        } else {
          throw error;
        }
      }
    }
  }

  private async startConsumer() {
    this.interval = setInterval(async () => {
      await this.consumeEvents();
    }, 5 * 6000);
  }

  private delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async deleteExistingConsumers() {
    try {
      const consumersInfo: any = await this.redisClient.xinfo(
        'CONSUMERS',
        this.streamKey,
        this.consumerGroup,
      );

      if (consumersInfo && consumersInfo.length > 0) {
        for (const consumer of consumersInfo) {
          const consumerName = consumer[1];
          try {
            await this.redisClient.xgroup(
              'DELCONSUMER',
              this.streamKey,
              this.consumerGroup,
              consumerName,
            );
            console.log(
              `Deleted consumer ${consumerName} from group ${this.consumerGroup}`,
            );
          } catch (deleteError) {
            console.error(
              `Error deleting consumer ${consumerName}:`,
              deleteError,
            );
          }
        }
        return consumersInfo.length;
      } else {
        console.log(`No consumers found in group ${this.consumerGroup}`);
        return 0;
      }
    } catch (error) {
      if (
        error.command &&
        error.command.name === 'xinfo' &&
        error.message === 'ERR no such key'
      ) {
        console.log(`Key ${this.streamKey} does not exist`);
        return 0;
      } else {
        console.error(
          `Error deleting existing consumers from group ${this.consumerGroup}:`,
          error,
        );
        throw error;
      }
    }
  }
}
