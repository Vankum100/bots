import { Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import { LOGIN_SCENE, INTERACTION_SELECT_SCENE } from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { helloKeyboard } from '../keyboards/hello.keyboard';
import {
  AUTH_COMPLETED,
  HELLO_MESSAGE,
  LOGIN_SCENE_ON_MSG,
} from '../constants/messages';
import { UserService } from '../services/user.service';
import axios from 'axios';

@Scene(LOGIN_SCENE)
export class LoginScene {
  constructor(private readonly userService: UserService) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: Context) {
    await ctx.telegram.sendMessage(ctx.chat.id, HELLO_MESSAGE, {
      reply_markup: helloKeyboard,
    });
  }

  @On('contact')
  async authorization(@Ctx() ctx: Context) {
    const currentUser = await this.userService.findOne(ctx.from.id);
    const userName = ctx.from.username;
    // @ts-expect-error
    const phone = ctx.message.contact.phone_number;
    // @ts-expect-error
    const userId = ctx.message.contact.user_id;

    let response: any;
    try {
      response = await axios.get(
        `${process.env.MICROSERVICE_SSO_URL}/user/phone`,
        {
          data: {
            phone,
            botToken: process.env.TELEGRAM_BOT_TOKEN,
          },
        },
      );
    } catch (err) {
      console.error('error ', err.code || err.response.data);
      return 'ошибка при авторизации';
    }

    if (response.data.status === 400 || response.data.status === 403) {
      return 'У вас нет разрешения к боту.';
    }
    const userData = response.data;
    if (
      userData.roleId !== process.env.ROLE_ROOT_ID &&
      userData.roleId !== process.env.ROLE_MANAGER_ID
    ) {
      return 'У вас нет разрешения на использование бота.';
    }

    if (!currentUser) {
      await this.userService.create({
        userName,
        phone,
        userId,
        notificationEnabled: true,
      });
    }
    await ctx.telegram.sendMessage(ctx.chat.id, AUTH_COMPLETED);
    await ctx.scene.enter(INTERACTION_SELECT_SCENE);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    await ctx.telegram.sendMessage(ctx.chat.id, LOGIN_SCENE_ON_MSG);
  }
}
