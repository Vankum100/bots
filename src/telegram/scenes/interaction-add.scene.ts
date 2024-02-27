import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import {
  INTERACTION_ADD_SCENE,
  INTERACTION_SELECT_SCENE,
} from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { InteractionService } from '../services/interaction.service';
import { UserService } from '../services/user.service';
import { InteractionActionsEnum } from '../enums/interaction-actions.enum';
import { InteractionEnum } from '../enums/interactionEnum';
import { formattedAreas } from '../utils/areas';
import { CommandHandler } from '../commands/command-handler';
import { BotCommand } from '../enums/commandEnum';

@Scene(INTERACTION_ADD_SCENE)
export class InteractionAddScene {
  constructor(
    private readonly interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    const names = await this.interactionService.getAreas();
    await ctx.telegram.sendMessage(
      ctx.from.id,
      `все плошадки :\n${formattedAreas(names)}\n Введите номер площадки`,
      {
        reply_markup: {
          resize_keyboard: true,
          keyboard: [[{ text: 'Назад' }]],
        },
      },
    );
  }

  @Command(BotCommand.Start)
  async startCommand(@Ctx() ctx: Context) {
    await this.commandHandler.startCommand(ctx);
  }

  @Command(BotCommand.Restart)
  async restartCommand(@Ctx() ctx: Context) {
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

  @On('text')
  async addInteraction(@Ctx() ctx: Context) {
    // @ts-expect-error
    const message = ctx.message.text;
    const areas = await this.interactionService.getAreas();
    if (!isNaN(message) && message < areas.length + 1) {
      let responseText = '';
      const { areaId, name, number } =
        await this.interactionService.getAreaByNumber(Number(message));
      console.log('areaNumber ', message, 'areaName ', name, 'areaId', areaId);
      const { userId } = await this.userService.findOne(ctx.from.id);
      // @ts-expect-error
      const interactionType = ctx.scene.state.interactionType;
      if (interactionType === InteractionEnum.INTERACTION_SUBSCRIBE) {
        await this.interactionService.subscribeUser(userId, {
          areaId,
          name,
          number,
        });
        responseText = `Успешно подписал на плошадку ${name}`;
      } else if (interactionType === InteractionEnum.INTERACTION_UNSUBSCRIBE) {
        await this.interactionService.unsubscribeUser(userId, areaId);
        responseText = `Успешно отписал от плошадки ${name}`;
      }
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Узнать свои подписки',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.SHOW_SUBSCRIBED}`,
              },
            ],
          ],
        },
      });
    } else if (message === 'Назад') {
      await ctx.scene.enter(INTERACTION_SELECT_SCENE);
    } else {
      const command = message.trim().split(' ')[0];
      switch (command) {
        case BotCommand.Start:
          return this.commandHandler.startCommand(ctx);
        case BotCommand.Restart:
          return this.commandHandler.startCommand(ctx);
        case BotCommand.Enable:
          return this.commandHandler.enableCommand(ctx, this.userService);
        case BotCommand.Disable:
          return this.commandHandler.disableCommand(ctx, this.userService);
        case BotCommand.Logout:
          return this.commandHandler.logoutCommand(ctx, this.userService);
        default:
          await ctx.telegram.sendMessage(
            ctx.from.id,
            'Введите корректную номер площадки',
          );
      }
    }
  }
}
