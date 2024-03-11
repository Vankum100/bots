import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import {
  INTERACTION_ADD_AREA_SCENE,
  INTERACTION_SELECT_CONTAINER_SCENE,
} from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { interactionSelectContainerKeyboard } from '../keyboards/interaction-select-container.keyboard';
import { InteractionContainerEnum } from '../enums/interactionContainerEnum';
import { formattedContainers } from '../utils/areas';
import { UserService } from '../services/user.service';
import { CommandHandler } from '../commands/command-handler';
import { BotCommand } from '../enums/commandEnum';
import { InteractionService } from '../services/interaction.service';

@Scene(INTERACTION_SELECT_CONTAINER_SCENE)
export class InteractionSelectContainerScene {
  constructor(
    private interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    const state_ = ctx.scene.session.state;
    console.log('ctx scene-session- CONTAINER ', state_);
    // @ts-ignore
    const text = ctx.message.text;
    if (Object.values(InteractionContainerEnum).includes(text)) {
      return this.onTextHandler(ctx, text);
    } else {
      // @ts-ignore
      const areaId = ctx.scene.session.state.areaId;
      // @ts-ignore
      const name = ctx.scene.session.state.name;
      const names = await this.interactionService.getRangeipsByAreaId(areaId);
      console.log('names ', names);
      await ctx.telegram.sendMessage(
        ctx.from.id,
        `все контейнеры для площадкой ${name}:\n\n${formattedContainers(names)}\n\n Выбери вид операции:`,
        {
          reply_markup: interactionSelectContainerKeyboard,
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
      text === InteractionContainerEnum.INTERACTION_CONTAINER_SUBSCRIBE ||
      text === InteractionContainerEnum.INTERACTION_CONTAINER_UNSUBSCRIBE
    ) {
      await ctx.scene.enter(INTERACTION_ADD_AREA_SCENE, {
        interactionType: text,
      });
    } else if (
      text === InteractionContainerEnum.INTERACTION_SHOW_AREA_CONTAINERS
    ) {
      // @ts-expect-error
      const areaId = ctx.scene.state.areaId;
      // @ts-expect-error
      const name = ctx.scene.state.name;
      const names = await this.interactionService.getRangeipsByAreaId(areaId);
      return `все контейнеры для площадкой ${name}:\n${formattedContainers(names)}`;
    } else if (
      text === InteractionContainerEnum.INTERACTION_SHOW_SUBSCRIBED_CONTAINERS
    ) {
      const { userId } = await this.userService.findOne(ctx.from.id);
      const names =
        await this.interactionService.getRangeipNamesByChatId(userId);
      console.log('names ', names);
      return names.length === 0
        ? 'Вы не подписали еще на контейнеры'
        : `Вы подписаны на следующие контейнеры:\n${formattedContainers(names)}`;
    } else {
      await this.sceneEnter(ctx);
    }
  }
}
