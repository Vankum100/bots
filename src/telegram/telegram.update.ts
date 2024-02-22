import { Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context } from './interfaces/context.interface';
import { LOGIN_SCENE } from './constants/scenes';
import { START_COMMAND_ERROR } from './constants/messages';
import { InteractionService } from './services/interaction.service';
import { InteractionActionsEnum } from './enums/interaction-actions.enum';
import { InteractionEnum } from './enums/interactionEnum';
import { UserService } from './services/user.service';
import { formattedAreas } from './utils/areas';

@Update()
export class TelegramUpdate {
  constructor(
    private interactionService: InteractionService,
    private readonly userService: UserService,
  ) {}

  @Start()
  start(@Ctx() ctx: Context) {
    if (ctx.scene?.current?.id !== LOGIN_SCENE) {
      ctx.scene.enter(LOGIN_SCENE);
    } else {
      return START_COMMAND_ERROR;
    }
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

      return `Вы подписаны на следующие плошадки:\n${formattedAreas(names)}`;
    }
  }
}
