import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import axios from 'axios';
import { UserService } from './user.service';

interface MessageInfo {
  messageId: string;
  link: string;
  ipaddr: string;
  prevStatus: string;
  currentStatus: string;
  time: string;
}

interface RangeipData {
  rangeipId: string;
  rangeipNumber: number;
  rangeipName: string;
  areaId: string;
  areaName: string;
  areaNumber: number;
  chatIds?: number[];
}

interface AreaData {
  areaId: string;
  name: string;
  number: number;
}

@Injectable()
export class InteractionService {
  private readonly AREA_PREFIX = 'area:';
  private readonly RANGEIP_PREFIX = 'rangeip:';
  private readonly logger = new Logger('Device Status Handler');
  constructor(
    @InjectRedis('bot') private readonly redisClient: Redis,
    private readonly userService: UserService,
  ) {}

  async getAllRangeips(): Promise<any> {
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
      this.logger.log('getRangeips error ', err);
      return 'Error fetching all rangeips';
    }

    const rangeips = response.data;
    const newRangeipIds: string[] = [];
    let rangeipNumber = 1;
    let areaNumber = 1;

    for (const { areaName, areaId, rangeipId, rangeipName } of rangeips) {
      const rangeId = String(rangeipId);
      const redisKey = `${this.RANGEIP_PREFIX}${rangeId}`;
      const rangeipData = await this.redisClient.get(redisKey);
      const areaKey = `${this.AREA_PREFIX}${String(areaId)}`;
      const areaInfo: any = await this.redisClient.get(areaKey);

      if (areaInfo) {
        areaNumber = JSON.parse(areaInfo).number;
      } else {
        const areaKeys = await this.redisClient.keys(`${this.AREA_PREFIX}*`);
        areaNumber = areaKeys === null ? areaNumber : areaKeys.length + 1;
        await this.redisClient.set(
          areaKey,
          JSON.stringify({
            areaId,
            name: areaName,
            number: areaNumber,
          }),
        );
      }
      if (!rangeipData) {
        await this.redisClient.set(
          redisKey,
          JSON.stringify({
            rangeipNumber,
            rangeipId,
            rangeipName,
            areaId,
            areaName,
            areaNumber,
            chatIds: [],
          }),
        );
        newRangeipIds.push(rangeId);
      }
      rangeipNumber++;
    }
    return newRangeipIds;
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
    } = messageInfo;

    if (await this.userService.isNotificationEnabled(chatId)) {
      this.logger.log(`Sending message ${messageId} to chatId ${chatId}`);
      try {
        const escapedIpaddr = ipaddr.replace(/[.@:]/g, '\\$&');
        const escapedTime = time.replace(/[:-]/g, '\\$&');
        const formattedMessage = `
        Изменение статуса устройства: [${escapedIpaddr}](${linkUrl}) \nПредыдущий:  *${prevStatus}* \nТекущий: *${currentStatus}* \nДата: _${escapedTime}_
      `;

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

  async getRangeipData(rangeipId: string): Promise<RangeipData | null> {
    const key = `${this.RANGEIP_PREFIX}${rangeipId}`;
    const rangeipData = await this.redisClient.get(key);
    return rangeipData ? JSON.parse(rangeipData) : null;
  }

  async subscribeUserToContainer(
    chatId: number,
    rangeipId: string,
  ): Promise<string> {
    const currentRangeipData = await this.getRangeipData(rangeipId);
    if (!currentRangeipData) {
      return 'Rangeip data not found.';
    }
    const rangeipsInArea = await this.getRangeipsByAreaId(
      currentRangeipData.areaId,
    );
    const relevantRangeips = rangeipsInArea.filter(
      (rangeip) => rangeip.rangeipName === currentRangeipData.rangeipName,
    );

    for (const rangeip of relevantRangeips) {
      if (!rangeip.chatIds.includes(chatId)) {
        rangeip.chatIds.push(chatId);
        await this.redisClient.set(
          `${this.RANGEIP_PREFIX}${rangeip.rangeipId}`,
          JSON.stringify(rangeip),
        );
      }
    }
    return 'OK';
  }

  async unsubscribeUserFromContainer(
    chatId: number,
    rangeipId: string,
  ): Promise<string> {
    const currentRangeipData = await this.getRangeipData(rangeipId);
    if (!currentRangeipData) {
      return 'Rangeip data not found.';
    }
    const rangeipsInArea = await this.getRangeipsByAreaId(
      currentRangeipData.areaId,
    );
    const relevantRangeips = rangeipsInArea.filter(
      (rangeip) => rangeip.rangeipName === currentRangeipData.rangeipName,
    );
    for (const rangeip of relevantRangeips) {
      rangeip.chatIds = rangeip.chatIds.filter((id) => id !== chatId);
      await this.redisClient.set(
        `${this.RANGEIP_PREFIX}${rangeip.rangeipId}`,
        JSON.stringify(rangeip),
      );
    }
    return 'OK';
  }

  async isUserSubscribedToRangeip(
    chatId: number,
    rangeipId: string,
  ): Promise<boolean> {
    const currentRangeipData = await this.getRangeipData(rangeipId);
    return currentRangeipData
      ? currentRangeipData.chatIds.includes(chatId)
      : false;
  }

  async getUnsubscribedRangeips(
    chatId: number,
    areaId: string,
  ): Promise<RangeipData[]> {
    const rangeipKeys = await this.redisClient.keys(`${this.RANGEIP_PREFIX}*`);

    const rangeipDataList = await Promise.all(
      rangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const unsubscribedRangeips: RangeipData[] = [];

    for (const rangeip of rangeipDataList) {
      const rangeipData = JSON.parse(rangeip);

      if (
        rangeipData &&
        rangeipData.areaId === areaId &&
        !rangeipData.chatIds.includes(chatId)
      ) {
        unsubscribedRangeips.push(rangeipData);
      }
    }

    return unsubscribedRangeips;
  }

  async getSubscribedRangeips(
    chatId: number,
    areaId: string,
  ): Promise<RangeipData[]> {
    const rangeipKeys = await this.redisClient.keys(`${this.RANGEIP_PREFIX}*`);

    const rangeipDataList = await Promise.all(
      rangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const unsubscribedRangeips: RangeipData[] = [];

    for (const rangeip of rangeipDataList) {
      const rangeipData = JSON.parse(rangeip);

      if (
        rangeipData &&
        rangeipData.areaId === areaId &&
        rangeipData.chatIds.includes(chatId)
      ) {
        unsubscribedRangeips.push(rangeipData);
      }
    }

    return unsubscribedRangeips;
  }

  async getChatIdsByRangeipId(rangeipId: string): Promise<number[]> {
    const currentRangeipData = await this.getRangeipData(rangeipId);
    return currentRangeipData ? currentRangeipData.chatIds || [] : [];
  }

  async getRangeipNamesByChatId(chatId: number): Promise<RangeipData[]> {
    const subscribedRangeipKeys = await this.redisClient.keys(
      `${this.RANGEIP_PREFIX}*`,
    );
    const subscribedRangeipDataList = await Promise.all(
      subscribedRangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const subscribedRangeips: RangeipData[] = [];

    for (const rangeip of subscribedRangeipDataList) {
      const rangeipData = JSON.parse(rangeip);

      if (
        rangeipData &&
        rangeipData.chatIds &&
        rangeipData.chatIds.includes(chatId)
      ) {
        subscribedRangeips.push(rangeipData);
      }
    }

    return subscribedRangeips;
  }
  async getRangeipDataByNumber(index: number): Promise<RangeipData | null> {
    const rangeipKeys = await this.redisClient.keys(`${this.RANGEIP_PREFIX}*`);

    const rangeipDataList = await Promise.all(
      rangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const parsedRangeipDataList: RangeipData[] = rangeipDataList.map(
      (rangeipData) => JSON.parse(rangeipData),
    );

    return (
      parsedRangeipDataList.find(
        (rangeip) => rangeip.rangeipNumber === index,
      ) || null
    );
  }

  async getRangeipsByAreaId(areaId: string): Promise<RangeipData[]> {
    const subscribedRangeipKeys = await this.redisClient.keys(
      `${this.RANGEIP_PREFIX}*`,
    );
    const subscribedRangeipDataList = await Promise.all(
      subscribedRangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const rangeipsInArea: RangeipData[] = [];

    for (const rangeip of subscribedRangeipDataList) {
      const rangeipData = JSON.parse(rangeip);

      if (rangeipData && rangeipData.areaId === areaId) {
        rangeipsInArea.push(rangeipData);
      }
    }

    return rangeipsInArea;
  }

  async subscribeUserToArea(chatId: number, areaId: string): Promise<string> {
    const rangeipsInArea = await this.getRangeipsByAreaId(areaId);

    for (const rangeip of rangeipsInArea) {
      const key = `${this.RANGEIP_PREFIX}${rangeip.rangeipId}`;
      const currentRangeipData = (await this.getRangeipData(
        rangeip.rangeipId,
      )) || {
        rangeipId: rangeip.rangeipId,
        rangeipName: rangeip.rangeipName,
        rangeipNumber: rangeip.rangeipNumber,
        areaId: rangeip.areaId,
        areaName: rangeip.areaName,
        areaNumber: rangeip.areaNumber,
        chatIds: [],
      };

      if (!currentRangeipData.chatIds.includes(chatId)) {
        currentRangeipData.chatIds.push(chatId);
        await this.redisClient.set(key, JSON.stringify(currentRangeipData));
      }
    }

    return 'OK';
  }

  async unsubscribeUserFromArea(
    chatId: number,
    areaId: string,
  ): Promise<string> {
    const rangeipsInArea = await this.getRangeipsByAreaId(areaId);

    for (const rangeip of rangeipsInArea) {
      const key = `${this.RANGEIP_PREFIX}${rangeip.rangeipId}`;
      const currentRangeipData = await this.getRangeipData(rangeip.rangeipId);

      if (currentRangeipData) {
        currentRangeipData.chatIds = currentRangeipData.chatIds.filter(
          (id) => id !== chatId,
        );
        await this.redisClient.set(key, JSON.stringify(currentRangeipData));
      }
    }

    return 'OK';
  }

  async getAreasByChatId(
    chatId: number,
    subscribed: boolean,
  ): Promise<AreaData[]> {
    const subscribedRangeipKeys = await this.redisClient.keys(
      `${this.RANGEIP_PREFIX}*`,
    );
    const subscribedRangeipDataList = await Promise.all(
      subscribedRangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const subscribedAreasMap: { [areaId: string]: AreaData } = {};
    const unSubscribedAreasMap: { [areaId: string]: AreaData } = {};

    for (const rangeip of subscribedRangeipDataList) {
      const rangeipData = JSON.parse(rangeip);

      if (
        rangeipData &&
        rangeipData.chatIds &&
        rangeipData.chatIds.includes(chatId)
      ) {
        subscribedAreasMap[rangeipData.areaId] = {
          areaId: rangeipData.areaId,
          name: rangeipData.areaName,
          number: rangeipData.areaNumber,
        };
      } else {
        unSubscribedAreasMap[rangeipData.areaId] = {
          areaId: rangeipData.areaId,
          name: rangeipData.areaName,
          number: rangeipData.areaNumber,
        };
      }
    }

    return subscribed
      ? Object.values(subscribedAreasMap)
      : Object.values(unSubscribedAreasMap);
  }

  async getSubscribedAreasByChatId(chatId: number): Promise<AreaData[]> {
    const subscribedRangeipKeys = await this.redisClient.keys(
      `${this.RANGEIP_PREFIX}*`,
    );
    const subscribedRangeipDataList = await Promise.all(
      subscribedRangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const subscribedAreasMap: { [areaId: string]: AreaData } = {};

    for (const rangeip of subscribedRangeipDataList) {
      const rangeipData = JSON.parse(rangeip);

      if (
        rangeipData &&
        rangeipData.chatIds &&
        rangeipData.chatIds.includes(chatId)
      ) {
        if (!subscribedAreasMap[rangeipData.areaId]) {
          subscribedAreasMap[rangeipData.areaId] = {
            areaId: rangeipData.areaId,
            name: rangeipData.areaName,
            number: rangeipData.areaNumber,
          };
        }
      }
    }

    return Object.values(subscribedAreasMap);
  }

  async getUnsubscribedAreasByChatId(chatId: number): Promise<AreaData[]> {
    const subscribedRangeipKeys = await this.redisClient.keys(
      `${this.RANGEIP_PREFIX}*`,
    );
    const subscribedRangeipDataList = await Promise.all(
      subscribedRangeipKeys.map((key) => this.redisClient.get(key)),
    );

    const unsubscribedAreasMap: { [areaId: string]: AreaData } = {};

    for (const rangeip of subscribedRangeipDataList) {
      const rangeipData = JSON.parse(rangeip);

      if (
        rangeipData &&
        rangeipData.chatIds &&
        !rangeipData.chatIds.includes(chatId)
      ) {
        let areaIdHasChatId = false;
        for (const otherRangeip of subscribedRangeipDataList) {
          const otherRangeipData = JSON.parse(otherRangeip);
          if (
            otherRangeipData.areaId === rangeipData.areaId &&
            otherRangeipData.chatIds &&
            otherRangeipData.chatIds.includes(chatId)
          ) {
            areaIdHasChatId = true;
            break;
          }
        }
        if (!areaIdHasChatId) {
          unsubscribedAreasMap[rangeipData.areaId] = {
            areaId: rangeipData.areaId,
            name: rangeipData.areaName,
            number: rangeipData.areaNumber,
          };
        }
      }
    }

    return Object.values(unsubscribedAreasMap);
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

  async flushAreas() {
    const areaKeys = await this.redisClient.keys(`${this.AREA_PREFIX}*`);
    if (areaKeys.length === 0) {
      return [];
    }

    const pipeline = this.redisClient.pipeline();

    areaKeys.forEach((key) => {
      pipeline.del(key);
    });

    return pipeline.exec();
  }

  async flushRangeips() {
    const rangeipKeys = await this.redisClient.keys(`${this.RANGEIP_PREFIX}*`);

    if (rangeipKeys.length === 0) {
      return [];
    }

    const pipeline = this.redisClient.pipeline();

    rangeipKeys.forEach((key) => {
      pipeline.del(key);
    });

    return pipeline.exec();
  }
}
