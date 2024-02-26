import { Context } from '../interfaces/context.interface';
import { LOGIN_SCENE } from '../constants/scenes';
import { START_COMMAND_ERROR } from '../constants/messages';
import { UserService } from '../services/user.service';

export class CommandHandler {
  constructor() {}

  async startCommand(ctx: Context) {
    if (ctx.scene?.current?.id !== LOGIN_SCENE) {
      await ctx.scene.enter(LOGIN_SCENE);
    } else {
      return START_COMMAND_ERROR;
    }
  }

  async enableCommand(ctx: Context, userService: UserService) {
    const userId = ctx.from.id;
    await userService.updateNotificationStatus(userId, true);
    return 'Уведомления включены';
  }

  async disableCommand(ctx: Context, userService: UserService) {
    const userId = ctx.from.id;
    await userService.updateNotificationStatus(userId, false);
    return 'Уведомления выключены';
  }
}
