import { Ctx, On, Start, Update, Command } from 'nestjs-telegraf';
import { Context } from './interfaces/context.interface';
import { InteractionService } from './services/interaction.service';
import { InteractionActionsEnum } from './enums/interaction-actions.enum';
import { InteractionEnum } from './enums/interactionEnum';
import { UserService } from './services/user.service';
import { formattedAreas } from './utils/areas';
import { CommandHandler } from './commands/command-handler';

@Update()
export class TelegramUpdate {
  constructor(
    private interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}
  private async setPersistentMenu(ctx: Context) {
    await ctx.telegram.setMyCommands([
      { command: 'restart', description: 'Перезапустить бота' },
      { command: 'enable', description: 'Включить уведомления' },
      { command: 'disable', description: 'Отключить уведомления' },
    ]);
  }
  @Start()
  async start(@Ctx() ctx: Context) {
    await this.setPersistentMenu(ctx);
    await this.commandHandler.startCommand(ctx);
  }

  @Command('restart')
  async startCommand(@Ctx() ctx: Context) {
    await this.commandHandler.startCommand(ctx);
  }

  @Command('enable')
  async enableCommand(@Ctx() ctx: Context) {
    return this.commandHandler.enableCommand(ctx, this.userService);
  }

  @Command('disable')
  async disableCommand(@Ctx() ctx: Context) {
    return this.commandHandler.disableCommand(ctx, this.userService);
  }

  @On('callback_query')
  async callbackQuery(@Ctx() ctx: Context) {
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
