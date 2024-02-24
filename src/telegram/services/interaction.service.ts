import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import axios from 'axios';

interface AreaData {
  areaId: string;
  number: number;
  name: string;
  chatIds?: number[];
}

@Injectable()
export class InteractionService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly AREA_PREFIX = 'area:';
  private isAlive = true;
  private sentCount = 0;
  private readonly logger = new Logger('Device Status Handler');
  constructor(@InjectRedis('bot') private readonly redisClient: Redis) {}

  async onApplicationBootstrap() {
    await this.getAllAreaIds();
    setInterval(async () => {
      await this.getAllAreaIds();
    }, 60 * 60000);
  }
  onModuleDestroy() {
    this.isAlive = false;
  }
  async handleStatusChange(): Promise<void> {
    const batchSize = 100;

    while (this.isAlive) {
      const queries = await this.redisClient.lrange(
        `device.status.${process.env.MICROSERVICE_BOT_NAME}.${3000}`,
        0,
        batchSize - 1,
      );

      if (queries.length === 0) {
        this.logger.warn(
          `Delaying for 60 seconds because  all messages already sent `,
        );
        await new Promise((resolve) => setTimeout(resolve, 60000));
      } else {
        for (const data of queries) {
          const { message, areaId } = JSON.parse(data);
          const chatIds = await this.getChatIdsByAreaId(areaId);

          for (const chatId of chatIds) {
            try {
              const result = await this.sendTelegramMessage(chatId, message);
              this.logger.log(
                `Message sent to chatId ${chatId}, Status: ${result?.status}`,
              );
            } catch (e) {
              this.logger.error('Sending to telegram error ', e);
            }

            this.sentCount++;

            if (this.sentCount >= 60) {
              this.logger.warn(
                `Delaying for 60 seconds because  ${this.sentCount} messages already sent `,
              );
              await new Promise((resolve) => setTimeout(resolve, 60000));
              this.sentCount = 0;
            }
          }
        }

        await this.redisClient.ltrim(
          `device.status.${process.env.MICROSERVICE_BOT_NAME}.${3000}`,
          batchSize,
          -1,
        );
      }
    }
  }

  private async getAllAreaIds(): Promise<any> {
    let response: any;
    try {
      response = await axios.get(
        `${process.env.MICROSERVICE_MINER_URL}/area/all`,
        {
          data: {
            botToken: process.env.TELEGRAM_BOT_TOKEN,
          },
        },
      );
    } catch (err) {
      this.logger.log('getAreas error ', err);
      return 'ошибка при получении всех площадок';
    }
    const areas = response.data;
    const newAreaIds: string[] = [];
    let areaNumber = 1;
    for (const [key, value] of Object.entries(areas)) {
      const areaId = String(value);
      const redisKey = `${this.AREA_PREFIX}${areaId}`;

      const areaData = await this.redisClient.get(redisKey);

      if (!areaData) {
        await this.redisClient.set(
          redisKey,
          JSON.stringify({
            areaId,
            name: key,
            number: areaNumber,
            chatIds: [],
          }),
        );
        newAreaIds.push(areaId);
      }
      areaNumber++;
    }

    return { areaIds: Object.values(areas), newAreaIds };
  }

  async sendTelegramMessage(chatId: number, message: string): Promise<any> {
    this.logger.log(`Sending message to chatId ${chatId}`);
    try {
      const finalUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      return axios.post(finalUrl, {
        chat_id: chatId,
        text: message,
      });
    } catch (err) {
      this.logger.error('telegram error ', err);
      throw new Error(`Error sending telegram message: ${err.message}`);
    }
  }

  async getAreaData(areaId: string): Promise<AreaData | null> {
    const key = `${this.AREA_PREFIX}${areaId}`;
    const areaData = await this.redisClient.get(key);
    return areaData ? JSON.parse(areaData) : null;
  }

  async subscribeUser(chatId: number, areaData: AreaData): Promise<string> {
    const key = `${this.AREA_PREFIX}${areaData.areaId}`;
    const currentAreaData = (await this.getAreaData(areaData.areaId)) || {
      areaId: areaData.areaId,
      name: areaData.name,
      number: areaData.number,
      chatIds: [],
    };

    if (!currentAreaData.chatIds.includes(chatId)) {
      currentAreaData.chatIds.push(chatId);
      await this.redisClient.set(key, JSON.stringify(currentAreaData));
    }

    return 'OK';
  }

  async unsubscribeUser(chatId: number, areaId: string): Promise<string> {
    const key = `${this.AREA_PREFIX}${areaId}`;
    const currentAreaData = await this.getAreaData(areaId);

    if (currentAreaData) {
      currentAreaData.chatIds = currentAreaData.chatIds.filter(
        (id) => id !== chatId,
      );
      await this.redisClient.set(key, JSON.stringify(currentAreaData));
    }

    return 'OK';
  }

  async isUserSubscribed(chatId: number, areaId: string): Promise<boolean> {
    const currentAreaData = await this.getAreaData(areaId);
    return currentAreaData ? currentAreaData.chatIds.includes(chatId) : false;
  }

  async getChatIdsByAreaId(areaId: string): Promise<number[]> {
    const currentAreaData = await this.getAreaData(areaId);
    return currentAreaData ? currentAreaData.chatIds || [] : [];
  }

  async getAreaNamesByChatId(chatId: number): Promise<AreaData[]> {
    const subscribedAreaKeys = await this.redisClient.keys(
      `${this.AREA_PREFIX}*`,
    );
    const subscribedAreaDataList = await Promise.all(
      subscribedAreaKeys.map((key) => this.redisClient.get(key)),
    );

    const subscribedAreas: AreaData[] = [];

    for (const area of subscribedAreaDataList) {
      const areaData = JSON.parse(area);

      if (areaData && areaData.chatIds && areaData.chatIds.includes(chatId)) {
        subscribedAreas.push(areaData);
      }
    }

    return subscribedAreas;
  }

  async getAreas(): Promise<AreaData[]> {
    const areaKeys = await this.redisClient.keys(`${this.AREA_PREFIX}*`);
    const areaDataList = await Promise.all(
      areaKeys.map((key) => this.redisClient.get(key)),
    );

    return areaDataList.map((areaData) => JSON.parse(areaData));
  }

  async getAreaByNumber(index: number): Promise<AreaData> {
    const areas = await this.getAreas();
    return areas.find((area) => area.number === index);
  }
}
