import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import { LOGIN_SCENE, INTERACTION_SCENE } from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { helloKeyboard } from '../keyboards/hello.keyboard';
import {
  AUTH_COMPLETED,
  HELLO_MESSAGE,
  LOGIN_SCENE_ON_MSG,
} from '../constants/messages';
import { UserService } from '../services/user.service';
import axios from 'axios';
import { CommandHandler } from '../commands/command-handler';
import { BotCommand } from '../enums/commandEnum';

@Scene(LOGIN_SCENE)
export class LoginScene {
  constructor(
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: Context) {
    // @ts-ignore
    const loggedIn = ctx.scene.session.state.isLoggedIn;
    // @ts-ignore
    const command = ctx.scene.session.state.command;

    if (!loggedIn && command === BotCommand.Logout) {
      return 'Уже вышел';
    }

    if (!loggedIn) {
      await ctx.telegram.sendMessage(ctx.chat.id, LOGIN_SCENE_ON_MSG, {
        reply_markup: helloKeyboard,
      });
    } else {
      await ctx.telegram.sendMessage(ctx.chat.id, HELLO_MESSAGE, {
        reply_markup: helloKeyboard,
      });
    }
  }

  @Command(BotCommand.Restart)
  async startCommand(@Ctx() ctx: Context) {
    await this.commandHandler.startCommand(ctx);
  }

  @Command(BotCommand.Enable)
  async enableCommand(@Ctx() ctx: Context) {
    return this.commandHandler.enableCommand(ctx, this.userService);
  }

  @Command(BotCommand.Disable)
  async disableCommand(@Ctx() ctx: Context) {
    return this.commandHandler.disableCommand(ctx, this.userService);
  }

  @Command(BotCommand.Logout)
  async logoutCommand(@Ctx() ctx: Context) {
    return this.commandHandler.logoutCommand(ctx, this.userService);
  }

  @On('contact')
  async authorization(@Ctx() ctx: Context) {
    return this.onContactHandler(ctx);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    await ctx.telegram.sendMessage(ctx.chat.id, LOGIN_SCENE_ON_MSG);
  }

  async onContactHandler(@Ctx() ctx: Context) {
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
            phone: phone.startsWith('+') ? phone : `+${phone}`,
            botToken: process.env.TELEGRAM_BOT_TOKEN,
          },
        },
      );
      if (process.env.DEBUG === 'true') {
        console.log('logging response ', response);
      }
    } catch (err) {
      if (process.env.DEBUG === 'true') {
        console.error('logging error ', err);
      }
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
        isLoggedIn: true,
      });
    }

    await this.userService.updateAuthStatus(userId, true);
    await ctx.telegram.sendMessage(ctx.chat.id, AUTH_COMPLETED);
    await ctx.scene.enter(INTERACTION_SCENE);
  }
}
