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

@Scene(INTERACTION_SELECT_SCENE)
export class InteractionSelectScene {
  constructor(
    private interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    await ctx.telegram.sendMessage(ctx.from.id, 'Выбери вид операции', {
      reply_markup: interactionSelectKeyboard,
    });
  }
  @Command('restart')
  async startCommand(@Ctx() ctx: Context) {
    return this.commandHandler.startCommand(ctx);
  }

  @Command('enable')
  async enableCommand(@Ctx() ctx: Context) {
    return this.commandHandler.enableCommand(ctx, this.userService);
  }

  @Command('disable')
  async disableCommand(@Ctx() ctx: Context) {
    return this.commandHandler.disableCommand(ctx, this.userService);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    // @ts-ignore
    const text = ctx.message.text;
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
}
