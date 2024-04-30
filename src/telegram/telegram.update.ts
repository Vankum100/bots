import { Ctx, On, Start, Update, Command, Action } from 'nestjs-telegraf';
import { Context } from './interfaces/context.interface';
import { UserService } from './services/user.service';
import { CommandHandler } from './commands/command-handler';
import { LOGIN_SCENE_ON_MSG } from './constants/messages';
import { INTERACTION_SCENE } from './constants/scenes';
import { BotCommand } from './enums/commandEnum';
import { LoginScene } from './scenes/login.scene';
import { InteractionScene } from './scenes/interaction.scene';
import { russianStatuses } from './constants/statuses';

@Update()
export class TelegramUpdate {
  constructor(
    private interactionSelectionService: InteractionScene,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
    private readonly loginService: LoginScene,
  ) {}

  @Start()
  async start(@Ctx() ctx: Context) {
    await this.commandHandler.startCommand(ctx);
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

  @Command(BotCommand.Select)
  async selectStatusCommand(@Ctx() ctx: Context) {
    return this.commandHandler.selectStatusCommand(ctx, this.userService);
  }

  @Action(/^SELECT-STATUS_(true|false)_(.+)$/)
  async selectStatusAction(@Ctx() ctx: Context) {
    // @ts-expect-error if there is no callback
    const data = ctx.callbackQuery?.data as string;
    const [, activateFlagStr, index] = data.split('_');
    const activateFlag = activateFlagStr === 'true';
    const userId = ctx.from.id;
    const status = Object.keys(russianStatuses)[Number(index)];
    await this.userService.updateSelectedStatus(userId, status, activateFlag);
    await ctx.answerCbQuery(`Выбор Статуса: ${status} обновлен`);
    const previousMessageId = ctx.callbackQuery.message.message_id;
    await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 200)));
    await ctx.deleteMessage(previousMessageId);
    await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 100)));
    await this.commandHandler.selectStatusCommand(ctx, this.userService);
  }
  @On('callback_query')
  async callbackQuery(@Ctx() ctx: Context) {
    return this.interactionSelectionService.onCallbackQueryHandler(ctx);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const userId = ctx.from.id;
    const isLoggedIn = await this.userService.isLoggedIn(userId);
    if (!isLoggedIn) {
      await ctx.telegram.sendMessage(ctx.chat.id, LOGIN_SCENE_ON_MSG);
    } else {
      await ctx.scene.enter(INTERACTION_SCENE);
    }
  }

  @On('contact')
  async authorization(@Ctx() ctx: Context) {
    return this.loginService.onContactHandler(ctx);
  }
}
