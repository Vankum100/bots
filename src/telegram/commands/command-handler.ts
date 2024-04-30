import { Context } from '../interfaces/context.interface';
import { LOGIN_SCENE } from '../constants/scenes';
import { START_COMMAND_ERROR } from '../constants/messages';
import { UserService } from '../services/user.service';
import { BotCommand } from '../enums/commandEnum';
import { russianStatuses } from '../constants/statuses';
import { Markup } from 'telegraf';

export class CommandHandler {
  constructor() {}
  private async setPersistentMenu(ctx: Context) {
    await ctx.telegram.setMyCommands([
      { command: BotCommand.Restart, description: 'Перезапустить бота' },
      {
        command: BotCommand.Select,
        description: 'Выбрать статусы для отслеживания',
      },
      { command: BotCommand.Enable, description: 'Включить уведомления' },
      { command: BotCommand.Disable, description: 'Отключить уведомления' },
      { command: BotCommand.Logout, description: 'Выйти' },
    ]);
  }
  async startCommand(ctx: Context) {
    await this.setPersistentMenu(ctx);
    // @ts-ignore
    const text = ctx.message.text;
    if (ctx.scene?.current?.id !== LOGIN_SCENE || text === '/restart') {
      await ctx.scene.enter(LOGIN_SCENE);
    } else {
      return START_COMMAND_ERROR;
    }
  }

  async enableCommand(ctx: Context, userService: UserService) {
    const userId = ctx.from.id;
    const isLoggedIn = await userService.isLoggedIn(userId);
    if (!isLoggedIn) {
      await ctx.scene.enter(LOGIN_SCENE, { isLoggedIn });
    } else {
      await userService.updateNotificationStatus(userId, true);
      return 'Уведомления включены';
    }
  }

  async selectStatusCommand(ctx: Context, userService: UserService) {
    const allStatuses = Object.keys(russianStatuses);

    const userId = ctx.from.id;
    const user = await userService.findOne(userId);

    if (!user.isLoggedIn) {
      await ctx.scene.enter(LOGIN_SCENE, { isLoggedIn: user.isLoggedIn });
    } else {
      const activeStatuses = user.selectedStatuses || [];

      const buttons = allStatuses.map((status, index) => {
        const isChecked = activeStatuses.includes(status);
        const activateFlag = !isChecked;
        return [
          Markup.button.callback(
            `${isChecked ? '☑️' : '▫️'} ${status}`,
            `SELECT-STATUS_${activateFlag}_${index}`,
          ),
        ];
      });

      await ctx.reply(`Выберите статусы :`, Markup.inlineKeyboard(buttons));
    }
  }

  async disableCommand(ctx: Context, userService: UserService) {
    const userId = ctx.from.id;
    const isLoggedIn = await userService.isLoggedIn(userId);
    if (!isLoggedIn) {
      await ctx.scene.enter(LOGIN_SCENE, { isLoggedIn });
    } else {
      await userService.updateNotificationStatus(userId, false);
      return 'Уведомления выключены';
    }
  }

  async logoutCommand(ctx: Context, userService: UserService) {
    const userId = ctx.from.id;
    const isLoggedIn = await userService.isLoggedIn(userId);
    if (!isLoggedIn) {
      await ctx.scene.enter(LOGIN_SCENE, {
        isLoggedIn,
        command: BotCommand.Logout,
      });
    } else {
      await userService.updateAuthStatus(userId, false);
      await userService.updateNotificationStatus(userId, false);
      return 'Выход успешно выполнен, уведомления отключены';
    }
  }
}
