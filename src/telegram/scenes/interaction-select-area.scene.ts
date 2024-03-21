import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import {
  INTERACTION_ADD_AREA_SCENE,
  INTERACTION_SELECT_AREA_SCENE,
  INTERACTION_SELECT_CONTAINER_SCENE,
} from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { interactionSelectAreaKeyboard } from '../keyboards/interaction-select-area.keyboard';
import { InteractionAreaEnum } from '../enums/interactionAreaEnum';
import { InteractionService } from '../services/interaction.service';
import { formattedAreas, formattedContainers } from '../utils/areas';
import { UserService } from '../services/user.service';
import { CommandHandler } from '../commands/command-handler';
import { BotCommand } from '../enums/commandEnum';
import { InteractionActionsEnum } from '../enums/interaction-actions.enum';
import { SELECT_AREA_TEXT, SELECT_CONTAINER_TEXT } from '../constants/menu';
import { InteractionContainerEnum } from '../enums/interactionContainerEnum';

@Scene(INTERACTION_SELECT_AREA_SCENE)
export class InteractionSelectAreaScene {
  constructor(
    private interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    // @ts-ignore
    const text = ctx.message.text;
    if (Object.values(InteractionAreaEnum).includes(text)) {
      return this.onTextHandler(ctx, text);
    } else {
      await ctx.telegram.sendMessage(
        ctx.from.id,
        'Выберите вид операции из меню',
        {
          reply_markup: interactionSelectAreaKeyboard,
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
      text === InteractionAreaEnum.INTERACTION_AREA_SUBSCRIBE ||
      text === InteractionAreaEnum.INTERACTION_AREA_UNSUBSCRIBE ||
      text === SELECT_CONTAINER_TEXT ||
      text === SELECT_AREA_TEXT
    ) {
      await ctx.scene.enter(INTERACTION_ADD_AREA_SCENE, {
        interactionType: text,
      });
    } else if (text === InteractionAreaEnum.INTERACTION_SHOW) {
      const names = await this.interactionService.getAreas();
      return `все плошадки :\n${formattedAreas(names)}`;
    } else if (text === InteractionAreaEnum.INTERACTION_SHOW_SUBSCRIBED_AREAS) {
      const { userId } = await this.userService.findOne(ctx.from.id);
      const names =
        await this.interactionService.getSubscribedAreasByChatId(userId);
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
    const [interactionType, message] = callbackData.split('_');
    if (
      callbackData.indexOf(InteractionActionsEnum.REVERT_INTERACTION) !== -1
    ) {
      if (
        interactionType ===
          InteractionContainerEnum.INTERACTION_CONTAINER_SUBSCRIBE ||
        interactionType ===
          InteractionContainerEnum.INTERACTION_CONTAINER_UNSUBSCRIBE
      ) {
        const { rangeipId: containerId, rangeipName: name } =
          await this.interactionService.getRangeipDataByNumber(Number(message));
        const { userId } = await this.userService.findOne(ctx.from.id);
        // @ts-ignore
        const area = ctx.scene.session.state.name;

        if (
          interactionType ===
          InteractionContainerEnum.INTERACTION_CONTAINER_SUBSCRIBE
        ) {
          await this.interactionService.unsubscribeUserFromContainer(
            userId,
            containerId,
          );
          return `Успешно отписал от контейнера: ${name}  площадка: ${area}`;
        } else if (
          interactionType ===
          InteractionContainerEnum.INTERACTION_CONTAINER_UNSUBSCRIBE
        ) {
          await this.interactionService.subscribeUserToContainer(
            userId,
            containerId,
          );
          return `Успешно подписал на контейнер ${name}  площадка: ${area}`;
        } else {
          return 'уже завершил этот действие ранее';
        }
      } else {
        const { areaId, name } = await this.interactionService.getAreaByNumber(
          Number(message),
        );
        const { userId } = await this.userService.findOne(ctx.from.id);

        if (
          interactionType === InteractionAreaEnum.INTERACTION_AREA_SUBSCRIBE
        ) {
          await this.interactionService.unsubscribeUserFromArea(userId, areaId);
          return `Успешно отписал от плошадки ${name}`;
        } else if (
          interactionType === InteractionAreaEnum.INTERACTION_AREA_UNSUBSCRIBE
        ) {
          await this.interactionService.subscribeUserToArea(userId, areaId);
          return `Успешно подписал на плошадку ${name}`;
        } else {
          return 'уже завершил этот действие ранее';
        }
      }
    } else if (
      callbackData.indexOf(InteractionActionsEnum.SHOW_SUBSCRIBED_AREAS) !== -1
    ) {
      const { userId } = await this.userService.findOne(ctx.from.id);
      const names =
        await this.interactionService.getSubscribedAreasByChatId(userId);

      return names.length === 0
        ? 'Вы не подписали еще на плошдки'
        : `Вы подписаны на следующие плошадки:\n${formattedAreas(names)}`;
    } else if (
      callbackData.indexOf(
        InteractionContainerEnum.INTERACTION_SHOW_SUBSCRIBED_CONTAINERS,
      ) !== -1 ||
      callbackData.indexOf(
        InteractionActionsEnum.SHOW_SUBSCRIBED_CONTAINERS,
      ) !== -1
    ) {
      const { userId } = await this.userService.findOne(ctx.from.id);
      const containers_ =
        await this.interactionService.getRangeipNamesByChatId(userId);
      const uniqueRangeipNames = new Map();
      containers_.forEach((container) => {
        if (
          !uniqueRangeipNames.has(
            `${container.rangeipName}_${container.areaId}`,
          )
        ) {
          container.rangeipName = `${container.areaName} ${container.rangeipName}`;
          uniqueRangeipNames.set(container.rangeipName, container);
        }
      });
      const names = Array.from(uniqueRangeipNames.values());

      return names.length === 0
        ? 'Вы не подписали еще на контейнеры'
        : `Вы подписаны на следующие контейнеры:\n${formattedContainers(names)}`;
    } else if (
      interactionType === InteractionAreaEnum.INTERACTION_AREA_UNSUBSCRIBE
    ) {
      const { areaId, name } = await this.interactionService.getAreaByNumber(
        Number(message),
      );
      const { userId } = await this.userService.findOne(ctx.from.id);
      await this.interactionService.unsubscribeUserFromArea(userId, areaId);
      const responseText = `Успешно отписал от плошадки ${name}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Узнать свои плошадки',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.SHOW_SUBSCRIBED_AREAS}`,
              },
            ],
          ],
        },
      });
    } else if (
      interactionType === InteractionAreaEnum.INTERACTION_AREA_SUBSCRIBE
    ) {
      const { areaId, name } = await this.interactionService.getAreaByNumber(
        Number(message),
      );
      const { userId } = await this.userService.findOne(ctx.from.id);

      await this.interactionService.subscribeUserToArea(userId, areaId);
      const responseText = `Успешно подписал на плошадку ${name}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Узнать свои плошадки',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.SHOW_SUBSCRIBED_AREAS}`,
              },
            ],
          ],
        },
      });
    } else if (
      interactionType === SELECT_CONTAINER_TEXT ||
      interactionType === SELECT_AREA_TEXT
    ) {
      const { areaId, name, number } =
        await this.interactionService.getAreaByNumber(Number(message));
      return ctx.scene.enter(INTERACTION_SELECT_CONTAINER_SCENE, {
        interactionType,
        areaId,
        number,
        name,
      });
    } else if (
      interactionType ===
      InteractionContainerEnum.INTERACTION_CONTAINER_UNSUBSCRIBE
    ) {
      const { rangeipId: containerId, rangeipName: name } =
        await this.interactionService.getRangeipDataByNumber(Number(message));
      const { userId } = await this.userService.findOne(ctx.from.id);
      await this.interactionService.unsubscribeUserFromContainer(
        userId,
        containerId,
      );
      // @ts-ignore
      const area = ctx.scene.session.state.name;
      const responseText = `Успешно отписал от контейнера: ${name}  площадка: ${area} `;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Узнать свои контейнеры',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.SHOW_SUBSCRIBED_CONTAINERS}`,
              },
            ],
          ],
        },
      });
    } else if (
      interactionType ===
      InteractionContainerEnum.INTERACTION_CONTAINER_SUBSCRIBE
    ) {
      const { rangeipId: containerId, rangeipName: name } =
        await this.interactionService.getRangeipDataByNumber(Number(message));
      const { userId } = await this.userService.findOne(ctx.from.id);
      await this.interactionService.subscribeUserToContainer(
        userId,
        containerId,
      );
      // @ts-ignore
      const area = ctx.scene.session.state.name;

      const responseText = `Успешно подписал на контейнер: ${name}  площадка: ${area}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Узнать свои контейнеры',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.SHOW_SUBSCRIBED_CONTAINERS}`,
              },
            ],
          ],
        },
      });
    }
  }
}
