import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import { INTERACTION_SCENE } from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { interactionKeyboard } from '../keyboards/interaction.keyboard';
import { AreaData, InteractionService } from '../services/interaction.service';
import { splitArrayIntoChunks } from '../utils';
import { UserService } from '../services/user.service';
import { CommandHandler } from '../commands/command-handler';
import { BotCommand } from '../enums/commandEnum';
import { InteractionActionsEnum } from '../enums/interaction-actions.enum';
import {
  SELECT_ALL_AREA_CONTAINERS,
  SELECT_ALL_AREA_CONTAINERS_CB,
  SELECT_ALL_AREAS,
  SUBSCRIBE_AREA_CONTAINER_CB,
  SELECT_AREAS_OR_CONTAINERS_CB,
  SELECT_AREAS_OR_CONTAINERS_TEXT,
  UNSUBSCRIBE_AREA_CONTAINER_CB,
  SELECT_ALL_AREAS_CB,
  SHOW_MY_AREAS_OR_CONTAINERS_TEXT,
  UNSELECT_ALL_AREAS,
  UNSELECT_ALL_AREAS_CB,
  UNSELECT_ALL_AREA_CONTAINERS,
  UNSELECT_ALL_AREA_CONTAINERS_CB,
  UNSELECT_AREAS_OR_CONTAINERS_CB,
} from '../constants/menu';

const ELEMENTS_PER_PAGE = parseInt(process.env.TELEGRAM_PAGINATION_SIZE) || 4;
@Scene(INTERACTION_SCENE)
export class InteractionScene {
  constructor(
    private interactionService: InteractionService,
    private readonly userService: UserService,
    private readonly commandHandler: CommandHandler,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    await ctx.telegram.sendMessage(
      ctx.from.id,
      'Выберите вид операции из меню',
      {
        reply_markup: interactionKeyboard,
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

  @Command(BotCommand.Select)
  async selectStatusCommand(@Ctx() ctx: Context) {
    return this.commandHandler.selectStatusCommand(ctx, this.userService);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    // @ts-expect-error if there is no text
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
      case BotCommand.Select:
        return this.commandHandler.selectStatusCommand(ctx, this.userService);
      default:
        return this.onTextHandler(ctx, text);
    }
  }
  private async paginateInlineKeyboard(
    ctx: Context,
    elements: any[],
    currentPage: number,
    totalPages: number,
    callbackDataPrefix: string,
    message: string,
    otherButtons: any[],
  ) {
    const startIndex = (currentPage - 1) * ELEMENTS_PER_PAGE;
    const endIndex = Math.min(startIndex + ELEMENTS_PER_PAGE, elements.length);
    const inline_keyboard = elements.slice(startIndex, endIndex);

    const prevButton = {
      text: '◀️ Пред.',
      callback_data: `${callbackDataPrefix}_${currentPage - 1}`,
    };

    const nextButton = {
      text: 'След. ▶️',
      callback_data: `${callbackDataPrefix}_${currentPage + 1}`,
    };

    const navigationButtons = [];
    if (currentPage > 1) navigationButtons.push(prevButton);
    if (currentPage < totalPages) navigationButtons.push(nextButton);

    const inline_buttons: any = splitArrayIntoChunks([...inline_keyboard], 2);

    await ctx.telegram.sendMessage(ctx.from.id, message, {
      reply_markup: {
        inline_keyboard: [
          ...inline_buttons,
          ...otherButtons,
          [...navigationButtons],
        ],
      },
    });
  }

  private async selectionHandler(ctx: Context, currentPage = 1) {
    const areas = await this.interactionService.getUnsubscribedAreasByChatId(
      ctx.from.id,
    );
    const totalPages = Math.ceil(areas.length / ELEMENTS_PER_PAGE);
    if (areas.length === 0) {
      const responseText = `Вы подписаны на все площадки`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Узнать мои площадки',
                callback_data: `${UNSELECT_AREAS_OR_CONTAINERS_CB}_${0}`,
              },
              {
                text: 'Назад в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${0}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else {
      const inline_keyboard = areas
        .sort((a, b) => a.number - b.number)
        .map((area) => ({
          text: `${area.name}`,
          callback_data: `${InteractionActionsEnum.SUBSCRIBE_MORE}_${area.number}`,
        }));
      const otherButtons = [
        [
          {
            text: `${SELECT_ALL_AREAS}`,
            callback_data: `${SELECT_ALL_AREAS_CB}_${0}`,
          },
        ],
      ];
      await this.paginateInlineKeyboard(
        ctx,
        inline_keyboard,
        currentPage,
        totalPages,
        `${SELECT_AREAS_OR_CONTAINERS_CB}_${0}`,
        'Выберите площадку',
        otherButtons,
      );
    }
  }

  private async showInfoHandler(ctx: Context, currentPage: number = 1) {
    const { userId } = await this.userService.findOne(ctx.from.id);
    const myAreas: AreaData[] =
      await this.interactionService.getSubscribedAreasByChatId(userId);
    const totalPages = Math.ceil(myAreas.length / ELEMENTS_PER_PAGE);
    if (myAreas.length === 0) {
      const responseText = `Вы не подписаны на площадки`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Подписаться на площадки',
                callback_data: `${SELECT_AREAS_OR_CONTAINERS_CB}_${0}`,
              },
              {
                text: 'Назад в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${0}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else {
      const inline_keyboard = myAreas
        .sort((a, b) => a.number - b.number)
        .map((area) => ({
          text: `${area.name}`,
          callback_data: `${InteractionActionsEnum.UNSUBSCRIBE_MORE}_${area.number}`,
        }));

      const otherButtons = [
        [
          {
            text: `${UNSELECT_ALL_AREAS}`,
            callback_data: `${UNSELECT_ALL_AREAS_CB}_${0}`,
          },
        ],
        [
          {
            text: 'Назад в главное меню',
            callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${0}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
          },
        ],
      ];

      await this.paginateInlineKeyboard(
        ctx,
        inline_keyboard,
        currentPage,
        totalPages,
        `${UNSELECT_AREAS_OR_CONTAINERS_CB}_${0}`,
        'Список площадок',
        otherButtons,
      );
    }
  }

  private async unsubscriptionHandler(
    ctx: Context,
    message: any,
    currentPage: number = 1,
  ): Promise<void> {
    const { areaId, name, number } =
      await this.interactionService.getAreaByNumber(Number(message));
    const containers_ = await this.interactionService.getSubscribedRangeips(
      ctx.from.id,
      areaId,
    );
    const uniqueRangeipNames = new Map();
    containers_.forEach((container) => {
      if (!uniqueRangeipNames.has(container.rangeipName)) {
        uniqueRangeipNames.set(container.rangeipName, container);
      }
    });
    const containers = Array.from(uniqueRangeipNames.values());
    const inline_keyboard = containers
      .sort((a, b) => a.rangeipNumber - b.rangeipNumber)
      .map((container) => ({
        text: `${container.rangeipName}`,
        callback_data: `${InteractionActionsEnum.SHOW_CONTAINER}_${container.rangeipNumber}`,
      }));

    const areaStatsMessage = await this.interactionService.areaStats(number);
    const totalPages = Math.ceil(containers.length / ELEMENTS_PER_PAGE);
    if (containers_.length === 0) {
      const responseText = `Вы отписаны ото всех контейнеров площадкой ${name}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Выбрать другую площадку',
                callback_data: `${UNSELECT_AREAS_OR_CONTAINERS_CB}_${message}`,
              },
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else {
      const otherButtons = [
        [
          {
            text: `${UNSELECT_ALL_AREA_CONTAINERS}`,
            callback_data: `${UNSELECT_ALL_AREA_CONTAINERS_CB}_${number}`,
          },
        ],
        [
          {
            text: 'Назад в главное меню',
            callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${0}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
          },
        ],
      ];

      await this.paginateInlineKeyboard(
        ctx,
        inline_keyboard,
        currentPage,
        totalPages,
        `${InteractionActionsEnum.UNSUBSCRIBE_MORE}_${number}`,
        areaStatsMessage,
        otherButtons,
      );
    }
  }

  private async subscriptionHandler(
    ctx: Context,
    message: any,
    currentPage: number = 1,
  ) {
    const { areaId, name, number } =
      await this.interactionService.getAreaByNumber(Number(message));
    const containers_ = await this.interactionService.getUnsubscribedRangeips(
      ctx.from.id,
      areaId,
    );

    const uniqueRangeipNames = new Map();
    containers_.forEach((container) => {
      if (!uniqueRangeipNames.has(container.rangeipName)) {
        uniqueRangeipNames.set(container.rangeipName, container);
      }
    });
    const containers = Array.from(uniqueRangeipNames.values());
    const inline_keyboard = containers
      .sort((a, b) => a.rangeipNumber - b.rangeipNumber)
      .map((container) => ({
        text: `${container.rangeipName}`,
        callback_data: `${SUBSCRIBE_AREA_CONTAINER_CB}_${container.rangeipNumber}`,
      }));
    const totalPages = Math.ceil(containers.length / ELEMENTS_PER_PAGE);

    if (containers_.length === 0) {
      const responseText = `Вы уже подписаны на все контейнеры площадкой ${name}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Выбрать другую площадку',
                callback_data: `${SELECT_AREAS_OR_CONTAINERS_CB}_${message}`,
              },
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else {
      const otherButtons = [
        [
          {
            text: `${SELECT_ALL_AREA_CONTAINERS}`,
            callback_data: `${SELECT_ALL_AREA_CONTAINERS_CB}_${number}`,
          },
        ],
        [
          {
            text: 'Назад к выбору площадок',
            callback_data: `${SELECT_AREAS_OR_CONTAINERS_CB}_${message}`,
          },
        ],
      ];

      await this.paginateInlineKeyboard(
        ctx,
        inline_keyboard,
        currentPage,
        totalPages,
        `${InteractionActionsEnum.SUBSCRIBE_MORE}_${number}`,
        'Выберите контейнер',
        otherButtons,
      );
    }
  }

  private async onTextHandler(ctx: Context, text: any) {
    if (text === SELECT_AREAS_OR_CONTAINERS_TEXT) {
      await this.selectionHandler(ctx);
    } else if (text === SHOW_MY_AREAS_OR_CONTAINERS_TEXT) {
      await this.showInfoHandler(ctx);
    } else {
      await this.sceneEnter(ctx);
    }
  }

  async onCallbackQueryHandler(@Ctx() ctx: Context) {
    // @ts-expect-error if there is no callback
    const callbackData = ctx.callbackQuery?.data as string;
    const [interactionType, message, actionPage] = callbackData.split('_');
    let currentPage = parseInt(actionPage);
    if (isNaN(currentPage)) currentPage = 1;
    if (
      callbackData.indexOf(InteractionActionsEnum.REVERT_INTERACTION) !== -1
    ) {
      if (
        interactionType === SUBSCRIBE_AREA_CONTAINER_CB ||
        interactionType === UNSUBSCRIBE_AREA_CONTAINER_CB
      ) {
        const {
          rangeipId: containerId,
          rangeipName,
          areaName,
          areaNumber,
        } = await this.interactionService.getRangeipDataByNumber(
          Number(message),
        );
        const { userId } = await this.userService.findOne(ctx.from.id);

        if (interactionType === SUBSCRIBE_AREA_CONTAINER_CB) {
          await this.interactionService.unsubscribeUserFromContainer(
            userId,
            containerId,
          );
          const responseText = `Вы успешно отписаны от площадкой ${areaName}, ${rangeipName}`;
          await ctx.telegram.sendMessage(ctx.from.id, responseText);
          await this.subscriptionHandler(ctx, areaNumber, currentPage);
        } else if (interactionType === UNSUBSCRIBE_AREA_CONTAINER_CB) {
          await this.interactionService.subscribeUserToContainer(
            userId,
            containerId,
          );
          const responseText = `Вы успешно подписаны на площадку ${areaName}, ${rangeipName}`;
          await ctx.telegram.sendMessage(ctx.from.id, responseText);
          await this.unsubscriptionHandler(ctx, areaNumber, currentPage);
        }
      } else if (interactionType === SELECT_ALL_AREAS_CB) {
        await this.interactionService.unsubscribeUserFromAllArea(ctx.from.id);
        const responseText = `Вы успешно отписаны ото всех площадок`;
        await ctx.telegram.sendMessage(ctx.from.id, responseText);
        await this.selectionHandler(ctx, currentPage);
      } else if (interactionType === UNSELECT_ALL_AREAS_CB) {
        await this.interactionService.subscribeUserToAllArea(ctx.from.id);
        const responseText = `Вы успешно подписаны на все площадки`;
        await ctx.telegram.sendMessage(ctx.from.id, responseText);
        await this.showInfoHandler(ctx, currentPage);
      } else {
        const { areaId, name, number } =
          await this.interactionService.getAreaByNumber(Number(message));
        const { userId } = await this.userService.findOne(ctx.from.id);

        if (interactionType === SELECT_ALL_AREA_CONTAINERS_CB) {
          await this.interactionService.unsubscribeUserFromArea(userId, areaId);
          const responseText = `Вы успешно отписаны от площадкой ${name}`;
          await ctx.telegram.sendMessage(ctx.from.id, responseText);
          await this.subscriptionHandler(ctx, number, currentPage);
        } else if (interactionType === UNSELECT_ALL_AREA_CONTAINERS_CB) {
          await this.interactionService.subscribeUserToArea(userId, areaId);
          const responseText = `Вы подписаны на все контейнеры площадки ${name}`;
          await ctx.telegram.sendMessage(ctx.from.id, responseText);
          await this.unsubscriptionHandler(ctx, message, currentPage);
        }
      }
    } else if (interactionType === UNSELECT_ALL_AREA_CONTAINERS_CB) {
      const { areaId, name } = await this.interactionService.getAreaByNumber(
        Number(message),
      );
      const { userId } = await this.userService.findOne(ctx.from.id);

      await this.interactionService.unsubscribeUserFromArea(userId, areaId);
      const responseText = `Вы отписаны ото всех контейнеров площадкой ${name}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else if (interactionType === SELECT_ALL_AREA_CONTAINERS_CB) {
      const { areaId, name } = await this.interactionService.getAreaByNumber(
        Number(message),
      );
      const { userId } = await this.userService.findOne(ctx.from.id);

      await this.interactionService.subscribeUserToArea(userId, areaId);
      const responseText = `Вы подписаны на все контейнеры площадки ${name}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else if (interactionType === InteractionActionsEnum.SUBSCRIBE_MORE) {
      await this.subscriptionHandler(ctx, message, currentPage);
    } else if (interactionType === InteractionActionsEnum.UNSUBSCRIBE_MORE) {
      await this.unsubscriptionHandler(ctx, message, currentPage);
    } else if (interactionType === UNSUBSCRIBE_AREA_CONTAINER_CB) {
      const {
        rangeipId: containerId,
        rangeipName,
        areaName,
        areaNumber,
      } = await this.interactionService.getRangeipDataByNumber(Number(message));
      const { userId } = await this.userService.findOne(ctx.from.id);
      await this.interactionService.unsubscribeUserFromContainer(
        userId,
        containerId,
      );
      const responseText = `Вы успешно отписаны от площадкой ${areaName}, ${rangeipName}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Отписаться еще',
                callback_data: `${InteractionActionsEnum.UNSUBSCRIBE_MORE}_${areaNumber}_${InteractionActionsEnum.UNSUBSCRIBE_MORE}`,
              },
            ],
            [
              {
                text: 'Назад к выбору площадок',
                callback_data: `${UNSELECT_AREAS_OR_CONTAINERS_CB}_${message}`,
              },
            ],
            [
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else if (interactionType === SUBSCRIBE_AREA_CONTAINER_CB) {
      const {
        rangeipId: containerId,
        rangeipName,
        areaName,
        areaNumber,
      } = await this.interactionService.getRangeipDataByNumber(Number(message));
      const { userId } = await this.userService.findOne(ctx.from.id);
      await this.interactionService.subscribeUserToContainer(
        userId,
        containerId,
      );
      const responseText = `Вы успешно подписаны на площадку ${areaName}, ${rangeipName}`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Подписаться еще',
                callback_data: `${InteractionActionsEnum.SUBSCRIBE_MORE}_${areaNumber}_${InteractionActionsEnum.SUBSCRIBE_MORE}`,
              },
            ],
            [
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else if (interactionType === InteractionActionsEnum.SHOW_CONTAINER) {
      const { rangeipId, rangeipNumber, areaId } =
        await this.interactionService.getRangeipDataByNumber(Number(message));
      const containerStatsMessage =
        await this.interactionService.containerStats(areaId, rangeipId);

      await ctx.telegram.sendMessage(ctx.from.id, containerStatsMessage, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отписаться',
                callback_data: `${UNSUBSCRIBE_AREA_CONTAINER_CB}_${rangeipNumber}_${UNSUBSCRIBE_AREA_CONTAINER_CB}`,
              },
            ],
            [
              {
                text: 'Назад к выбору площадок',
                callback_data: `${UNSELECT_AREAS_OR_CONTAINERS_CB}_${message}`,
              },
            ],
            [
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else if (interactionType === InteractionActionsEnum.RETURN_TO_MAIN_MENU) {
      await this.sceneEnter(ctx);
    } else if (interactionType === SELECT_AREAS_OR_CONTAINERS_CB) {
      await this.selectionHandler(ctx, currentPage);
    } else if (interactionType === UNSELECT_AREAS_OR_CONTAINERS_CB) {
      await this.showInfoHandler(ctx, currentPage);
    } else if (interactionType === SELECT_ALL_AREAS_CB) {
      await this.interactionService.subscribeUserToAllArea(ctx.from.id);
      const responseText = `Вы успешно подписаны на все площадки`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    } else if (interactionType === UNSELECT_ALL_AREAS_CB) {
      await this.interactionService.unsubscribeUserFromAllArea(ctx.from.id);
      const responseText = `Вы успешно отписаны ото всех площадок`;
      await ctx.telegram.sendMessage(ctx.from.id, responseText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отменить действие',
                callback_data: `${interactionType}_${message}_${InteractionActionsEnum.REVERT_INTERACTION}`,
              },
              {
                text: 'Вернутся в главное меню',
                callback_data: `${InteractionActionsEnum.RETURN_TO_MAIN_MENU}_${message}_${InteractionActionsEnum.RETURN_TO_MAIN_MENU}`,
              },
            ],
          ],
        },
      });
    }
  }
}
