import { Ctx, On, Start, Update, Command } from 'nestjs-telegraf';
import { Context } from './interfaces/context.interface';
import { UserService } from './services/user.service';
import { CommandHandler } from './commands/command-handler';
import { LOGIN_SCENE_ON_MSG } from './constants/messages';
import { INTERACTION_SCENE } from './constants/scenes';
import { BotCommand } from './enums/commandEnum';
import { LoginScene } from './scenes/login.scene';
import { InteractionScene } from './scenes/interaction.scene';

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
