import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import {
  INTERACTION_ADD_AREA_SCENE,
  INTERACTION_SELECT_AREA_SCENE,
  INTERACTION_SELECT_CONTAINER_SCENE,
} from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { InteractionService } from '../services/interaction.service';
import { UserService } from '../services/user.service';
import { InteractionActionsEnum } from '../enums/interaction-actions.enum';
import { InteractionAreaEnum } from '../enums/interactionAreaEnum';
import { formattedAreas } from '../utils/areas';
import { CommandHandler } from '../commands/command-handler';
import { BotCommand } from '../enums/commandEnum';
import {
  BACK,
  SELECT_AREA_TEXT,
  SELECT_CONTAINER_TEXT,
} from '../constants/menu';
import { interactionAddAreaKeyboard } from '../keyboards/interaction-add.keyboard';

@Scene(INTERACTION_ADD_AREA_SCENE)
export class InteractionAddAreaScene {
  constructor(
    private readonly interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    const state_ = ctx.scene.session.state;
    console.log('ctx scene-session- ADD ', state_);
    // @ts-ignore
    const text = ctx.message.text;
    if (Object.values(InteractionAreaEnum).includes(text)) {
      return this.addInteraction(ctx);
    } else {
      const names = await this.interactionService.getAreas();
      await ctx.telegram.sendMessage(
        ctx.from.id,
        `все плошадки :\n${formattedAreas(names)}\n Введите номер площадки`,
        {
          reply_markup: interactionAddAreaKeyboard,
        },
      );
    }
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
      console.log('interactionType ', interactionType);
      if (
        interactionType === SELECT_CONTAINER_TEXT ||
        interactionType === SELECT_AREA_TEXT
      ) {
        return ctx.scene.enter(INTERACTION_SELECT_CONTAINER_SCENE, {
          interactionType,
          areaId,
          number,
          name,
        });
      } else {
        if (
          interactionType === InteractionAreaEnum.INTERACTION_AREA_SUBSCRIBE
        ) {
          await this.interactionService.subscribeUserToArea(userId, areaId);
          responseText = `Успешно подписал на плошадку ${name}`;
        } else if (
          interactionType === InteractionAreaEnum.INTERACTION_AREA_UNSUBSCRIBE
        ) {
          await this.interactionService.unsubscribeUserFromArea(userId, areaId);
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
                  callback_data: `${interactionType}_${message}_${InteractionActionsEnum.SHOW_SUBSCRIBED_AREAS}`,
                },
              ],
            ],
          },
        });
      }
    } else if (message === BACK) {
      await ctx.scene.enter(INTERACTION_SELECT_AREA_SCENE);
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
