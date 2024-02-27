import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import {
  INTERACTION_ADD_SCENE,
  INTERACTION_SELECT_SCENE,
} from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { interactionSelectKeyboard } from '../keyboards/interaction-select.keyboard';
import { InteractionEnum } from '../enums/interactionEnum';
import { InteractionService } from '../services/interaction.service';
import { formattedAreas } from '../utils/areas';
import { UserService } from '../services/user.service';
import { CommandHandler } from '../commands/command-handler';
import { BotCommand } from '../enums/commandEnum';
import { InteractionActionsEnum } from '../enums/interaction-actions.enum';

@Scene(INTERACTION_SELECT_SCENE)
export class InteractionSelectScene {
  constructor(
    private interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    // @ts-ignore
    const text = ctx.message.text;
    if (Object.values(InteractionEnum).includes(text)) {
      return this.onTextHandler(ctx, text);
    } else {
      await ctx.telegram.sendMessage(ctx.from.id, 'Выбери вид операции', {
        reply_markup: interactionSelectKeyboard,
      });
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
  async onText(@Ctx() ctx: Context) {
    // @ts-ignore
    const text = ctx.message.text;
    const command = text.trim().split(' ')[0];

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
        return this.onTextHandler(ctx, text);
    }
  }

  private async onTextHandler(ctx: Context, text: any) {
    if (
      text === InteractionEnum.INTERACTION_SUBSCRIBE ||
      text === InteractionEnum.INTERACTION_UNSUBSCRIBE
    ) {
      await ctx.scene.enter(INTERACTION_ADD_SCENE, {
        interactionType: text,
      });
    } else if (text === InteractionEnum.INTERACTION_SHOW) {
      const names = await this.interactionService.getAreas();
      return `все плошадки :\n${formattedAreas(names)}`;
    } else if (text === InteractionEnum.INTERACTION_SHOW_SUBSCRIBED) {
      const { userId } = await this.userService.findOne(ctx.from.id);
      const names = await this.interactionService.getAreaNamesByChatId(userId);

      return names.length === 0
        ? 'Вы не подписали еще на плошдки'
        : `Вы подписаны на следующие плошадки:\n${formattedAreas(names)}`;
    } else {
      await this.sceneEnter(ctx);
    }
  }

  async onCallbackQueryHandler(@Ctx() ctx: Context) {
    // @ts-expect-error
    const callbackData = ctx.callbackQuery?.data as string;
    if (
      callbackData.indexOf(InteractionActionsEnum.REVERT_INTERACTION) !== -1
    ) {
      const [interactionType, message] = callbackData.split('_');
      const { areaId, name, number } =
        await this.interactionService.getAreaByNumber(Number(message));
      const { userId } = await this.userService.findOne(ctx.from.id);

      if (interactionType === InteractionEnum.INTERACTION_SUBSCRIBE) {
        await this.interactionService.unsubscribeUser(userId, areaId);
        return `Успешно отписал от плошадки ${name}`;
      } else if (interactionType === InteractionEnum.INTERACTION_UNSUBSCRIBE) {
        await this.interactionService.subscribeUser(userId, {
          areaId,
          name,
          number,
        });
        return `Успешно подписал на плошадку ${name}`;
      } else {
        return 'уже завершил этот действие ранее';
      }
    } else if (
      callbackData.indexOf(InteractionActionsEnum.SHOW_SUBSCRIBED) !== -1
    ) {
      const { userId } = await this.userService.findOne(ctx.from.id);
      const names = await this.interactionService.getAreaNamesByChatId(userId);

      return names.length === 0
        ? 'Вы не подписали еще на плошдки'
        : `Вы подписаны на следующие плошадки:\n${formattedAreas(names)}`;
    }
  }
}
