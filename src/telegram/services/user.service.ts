import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

export type User = {
  userName?: string;
  userId: number;
  phone: string;
  notificationEnabled?: boolean;
  isLoggedIn?: boolean;
  selectedStatuses?: string[];
};
@Injectable()
export class UserService {
  constructor(@InjectRedis('bot') private readonly redisClient: Redis) {}
  async findOne(userId: number): Promise<User | null> {
    const userString = await this.redisClient.get(`user:${userId}`);
    return userString ? JSON.parse(userString) : null;
  }

  async create(user: User): Promise<User> {
    await this.redisClient.set(`user:${user.userId}`, JSON.stringify(user));
    return user;
  }
  async updateSelectedStatus(
    userId: number,
    selectedStatus: string,
    activateFlag: boolean,
  ): Promise<void> {
    const user = await this.findOne(userId);
    if (user) {
      user.selectedStatuses = activateFlag
        ? (user.selectedStatuses || []).concat(selectedStatus)
        : (user.selectedStatuses || []).filter(
            (status) => status === selectedStatus,
          );
      await this.redisClient.set(`user:${userId}`, JSON.stringify(user));
    }
  }
  async updateNotificationStatus(
    userId: number,
    notificationEnabled: boolean,
  ): Promise<void> {
    const user = await this.findOne(userId);
    if (user) {
      user.notificationEnabled = notificationEnabled;
      await this.redisClient.set(`user:${userId}`, JSON.stringify(user));
    }
  }

  async isNotificationEnabled(userId: number): Promise<boolean> {
    const user = await this.findOne(userId);
    return user && user.notificationEnabled !== undefined
      ? user.notificationEnabled
      : false;
  }

  async isLoggedIn(userId: number): Promise<boolean> {
    const user = await this.findOne(userId);
    return user && user.isLoggedIn !== undefined ? user.isLoggedIn : false;
  }

  async updateAuthStatus(userId: number, isLoggedIn: boolean): Promise<void> {
    const user = await this.findOne(userId);
    if (user) {
      user.isLoggedIn = isLoggedIn;
      await this.redisClient.set(`user:${userId}`, JSON.stringify(user));
    }
  }
}
