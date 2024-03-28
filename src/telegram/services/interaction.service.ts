import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import axios from 'axios';
import {
  OFFLINE_STATUS_ID,
  ONLINE_STATUS_ID,
  WARNING_STATUS_ID,
} from '../constants/statuses';

interface RangeipData {
  rangeipId: string;
  rangeipNumber: number;
  rangeipName: string;
  areaId: string;
  areaName: string;
  areaNumber: number;
  chatIds?: number[];
}

export interface AreaData {
  areaId: string;
  name: string;
  number: number;
}

@Injectable()
export class InteractionService {
  private readonly AREA_PREFIX = 'area:';
  private readonly RANGEIP_PREFIX = 'rangeip:';
  private readonly logger = new Logger('Device Status Handler');
  constructor(@InjectRedis('bot') private readonly redisClient: Redis) {}

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

  async subscribeUserToAllArea(chatId: number): Promise<string> {
    const allAreas = await this.getAreas();

    for (const area of allAreas) {
      await this.subscribeUserToArea(chatId, area.areaId);
    }

    return 'OK';
  }

  async unsubscribeUserFromAllArea(chatId: number): Promise<string> {
    const allAreas = await this.getAreas();

    for (const area of allAreas) {
      await this.unsubscribeUserFromArea(chatId, area.areaId);
    }

    return 'OK';
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

  async containerStats(areaId: string, rangeipId: string): Promise<string> {
    const rangeipsInArea = await this.getRangeipsByAreaId(areaId);
    const targetRangeip = rangeipsInArea.find(
      (rangeip) => rangeip.rangeipId === rangeipId,
    );
    if (!targetRangeip) return 'Rangeip not found in the specified area.';

    const relevantRangeips = rangeipsInArea.filter(
      (rangeip) => rangeip.rangeipName === targetRangeip.rangeipName,
    );

    let onlineCount = 0;
    let offlineCount = 0;
    let warningCount = 0;
    let totalConsumption = 0;
    let totalHashRate = 0;
    let totalUpTime = 0;

    for (const rangeip of relevantRangeips) {
      const rangeipData = await this.getCachedAreaStats(
        areaId,
        rangeip.rangeipId,
      );

      onlineCount += rangeipData.onlineCount;
      offlineCount += rangeipData.offlineCount;
      warningCount += rangeipData.warningCount;
      totalConsumption += rangeipData.totalConsumption;
      totalHashRate += rangeipData.totalHashRate;
      totalUpTime += rangeipData.totalUpTime;
    }

    return (
      `Статистика по ${targetRangeip.rangeipName}:\n` +
      `Онлайн: ${onlineCount}\n` +
      `Предупреждение: ${warningCount}\n` +
      `Не в сети: ${offlineCount}\n` +
      `Текущее потребление: ${totalConsumption}\n` +
      `Текущий хэш-рейт: ${totalHashRate}\n` +
      `Текущий UpTime: ${totalUpTime}\n`
    );
  }

  async areaStats(areaNumber: number): Promise<string> {
    const area = await this.getAreaByNumber(areaNumber);
    if (!area) return 'Area not found.';

    const {
      onlineCount,
      offlineCount,
      warningCount,
      totalConsumption,
      totalHashRate,
      totalUpTime,
    }: any = await this.getCachedAreaStats(area.areaId);

    return (
      `Статистика по площадке ${area.name}:\n` +
      `Онлайн: ${onlineCount}\n` +
      `Предупреждение: ${warningCount}\n` +
      `Не в сети: ${offlineCount}\n` +
      `Текущее потребление: ${totalConsumption}\n` +
      `Текущий хэш-рейт: ${totalHashRate}\n` +
      `Текущий UpTime: ${totalUpTime}\n`
    );
  }

  private async getCachedAreaStats(
    areaId: string,
    rangeipId: string | null = null,
  ) {
    const logUrl = process.env.MICROSERVICE_LOG_URL;
    const minerUrl = process.env.MICROSERVICE_MINER_URL;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const currentDate = new Date();
    const startDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
      0,
      0,
      0,
    );
    const endDate = currentDate;

    let hashRate: any,
      energyConsumption: any,
      uptime: any,
      onlineCount: any,
      offlineCount: any,
      warningCount: any;

    try {
      const hashRateResponse: any = await axios.get(
        `${logUrl}/log-cache-hashrate-day`,
        {
          params: {
            where: JSON.stringify({
              createdAt: `$Between(["${startDate.toISOString()}","${endDate.toISOString()}"])`,
              areaId,
              modelId: '',
              statusId: '',
              algorithmId: '',
              rangeipId,
              userId: '',
            }),
            order: JSON.stringify({ createdAt: 'DESC' }),
            limit: 1,
            select: JSON.stringify({ value: true }),
            botToken,
          },
        },
      );

      hashRate = hashRateResponse.data.total;
    } catch (error) {
      console.error('Error fetching hash rate:', error);
    }

    try {
      const energyResponse: any = await axios.get(
        `${logUrl}/log-cache-energy-day`,
        {
          params: {
            where: JSON.stringify({
              createdAt: `$Between(["${startDate.toISOString()}","${endDate.toISOString()}"])`,
              areaId,
              modelId: '',
              statusId: '',
              algorithmId: '',
              rangeipId,
              userId: '',
            }),
            order: JSON.stringify({ createdAt: 'DESC' }),
            limit: 1,
            select: JSON.stringify({ value: true }),
            botToken,
          },
        },
      );

      energyConsumption = energyResponse.data.total;
    } catch (error) {
      console.error('Error fetching energy consumption:', error);
    }

    try {
      const uptimeResponse: any = await axios.get(
        `${logUrl}/log-cache-uptime-day/avg`,
        {
          params: {
            where: JSON.stringify({
              createdAt: `$Between(["${startDate.toISOString()}","${endDate.toISOString()}"])`,
              areaId,
              modelId: '',
              statusId: '',
              algorithmId: '',
              rangeipId,
              userId: '',
            }),
            order: JSON.stringify({ createdAt: 'DESC' }),
            limit: 1,
            select: JSON.stringify({ value: true }),
            botToken,
          },
        },
      );
      uptime = uptimeResponse.data.total;
    } catch (error) {
      console.error('Error fetching uptime:', error);
    }

    try {
      const onlineResponse: any = await axios.get(`${minerUrl}/device/count`, {
        params: {
          where: JSON.stringify({
            userId: null,
            areaId,
            algorithmId: null,
            modelId: null,
            statusId: ONLINE_STATUS_ID,
            rangeipId,
          }),
          botToken,
        },
      });
      onlineCount = onlineResponse.data.total;
    } catch (error) {
      console.error('Error fetching online count:', error);
    }

    try {
      const warningResponse: any = await axios.get(`${minerUrl}/device/count`, {
        params: {
          where: JSON.stringify({
            userId: null,
            areaId,
            algorithmId: null,
            modelId: null,
            statusId: WARNING_STATUS_ID,
            rangeipId,
          }),
          botToken,
        },
      });
      warningCount = warningResponse.data.total;
    } catch (error) {
      console.error('Error fetching warning count:', error);
    }

    try {
      const offlineResponse: any = await axios.get(`${minerUrl}/device/count`, {
        params: {
          where: JSON.stringify({
            userId: null,
            areaId,
            algorithmId: null,
            modelId: null,
            statusId: OFFLINE_STATUS_ID,
            rangeipId,
          }),
          botToken,
        },
      });
      offlineCount = offlineResponse.data.total;
    } catch (error) {
      console.error('Error fetching offline count:', error);
    }

    return {
      areaId,
      onlineCount,
      offlineCount,
      warningCount,
      totalConsumption: energyConsumption,
      totalHashRate: hashRate,
      totalUpTime: uptime,
    };
  }
}
