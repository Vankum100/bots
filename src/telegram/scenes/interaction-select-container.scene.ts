// import { Command, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
// import {
//   INTERACTION_ADD_AREA_SCENE,
//   INTERACTION_SCENE,
//   INTERACTION_SELECT_CONTAINER_SCENE,
// } from '../constants/scenes';
// import { Context } from '../interfaces/context.interface';
// import {
//   interactionFullySubscribedKeyboard,
//   interactionSelectContainerKeyboard,
// } from '../keyboards/interaction-select-container.keyboard';
// import { InteractionContainerEnum } from '../enums/interactionContainerEnum';
// import { formattedContainers, splitArrayIntoChunks } from '../utils/areas';
// import { UserService } from '../services/user.service';
// import { CommandHandler } from '../commands/command-handler';
// import { BotCommand } from '../enums/commandEnum';
// import { InteractionService } from '../services/interaction.service';
// import { BACK, SELECT_AREA_TEXT } from '../constants/menu';
//
// @Scene(INTERACTION_SELECT_CONTAINER_SCENE)
// export class InteractionSelectContainerScene {
//   constructor(
//     private interactionService: InteractionService,
//     private readonly userService: UserService,
//     private readonly commandHandler: CommandHandler,
//   ) {}
//
//   @SceneEnter()
//   async sceneEnter(@Ctx() ctx: Context) {
//     const state_ = ctx.scene.session.state;
//     // @ts-ignore
//     const text = state_.interactionType;
//     if (Object.values(InteractionContainerEnum).includes(text)) {
//       return this.onTextHandler(ctx, text);
//     } else {
//       // @ts-ignore
//       const areaId = ctx.scene.session.state.areaId;
//       // @ts-ignore
//       const area = ctx.scene.session.state.name;
//       const containers_ = await this.interactionService.getUnsubscribedRangeips(
//         ctx.from.id,
//         areaId,
//       );
//
//       const uniqueRangeipNames = new Map();
//       containers_.forEach((container) => {
//         if (!uniqueRangeipNames.has(container.rangeipName)) {
//           uniqueRangeipNames.set(container.rangeipName, container);
//         }
//       });
//
//       const responseText =
//         containers_.length === 0
//           ? `Вы уже подписались на все контейнеры площадкой ${area}, выберете другую площадку `
//           : `Контейнеры для площадкой ${area}:\n\n${formattedContainers(Array.from(uniqueRangeipNames.values()))}\n\n Выберете вид операции:`;
//
//       await ctx.telegram.sendMessage(ctx.from.id, responseText, {
//         reply_markup:
//           containers_.length === 0
//             ? interactionFullySubscribedKeyboard
//             : interactionSelectContainerKeyboard,
//       });
//     }
//   }
//
//   @Command(BotCommand.Start)
//   async startCommand(@Ctx() ctx: Context) {
//     await this.commandHandler.startCommand(ctx);
//   }
//
//   @Command(BotCommand.Restart)
//   async restartCommand(@Ctx() ctx: Context) {
//     await this.commandHandler.startCommand(ctx);
//   }
//
//   @Command(BotCommand.Enable)
//   async enableCommand(@Ctx() ctx: Context) {
//     return this.commandHandler.enableCommand(ctx, this.userService);
//   }
//
//   @Command(BotCommand.Disable)
//   async disableCommand(@Ctx() ctx: Context) {
//     return this.commandHandler.disableCommand(ctx, this.userService);
//   }
//
//   @Command(BotCommand.Logout)
//   async logoutCommand(@Ctx() ctx: Context) {
//     return this.commandHandler.logoutCommand(ctx, this.userService);
//   }
//
//   @On('text')
//   async onText(@Ctx() ctx: Context) {
//     // @ts-ignore
//     const text = ctx.message.text;
//     const command = text.trim().split(' ')[0];
//
//     switch (command) {
//       case BotCommand.Start:
//         return this.commandHandler.startCommand(ctx);
//       case BotCommand.Restart:
//         return this.commandHandler.startCommand(ctx);
//       case BotCommand.Enable:
//         return this.commandHandler.enableCommand(ctx, this.userService);
//       case BotCommand.Disable:
//         return this.commandHandler.disableCommand(ctx, this.userService);
//       case BotCommand.Logout:
//         return this.commandHandler.logoutCommand(ctx, this.userService);
//       default:
//         return this.onTextHandler(ctx, text);
//     }
//   }
//
//   private async onTextHandler(ctx: Context, text: any) {
//     if (
//       text === InteractionContainerEnum.INTERACTION_CONTAINER_SUBSCRIBE ||
//       text === InteractionContainerEnum.INTERACTION_CONTAINER_UNSUBSCRIBE
//     ) {
//       // @ts-ignore
//       const areaId = ctx.scene.session.state.areaId;
//
//       // @ts-ignore
//       const area = ctx.scene.session.state.name;
//
//       if (text === InteractionContainerEnum.INTERACTION_CONTAINER_UNSUBSCRIBE) {
//         const subscribedContainers_ =
//           await this.interactionService.getSubscribedRangeips(
//             ctx.from.id,
//             areaId,
//           );
//         const uniqueRangeipNames = new Map();
//         subscribedContainers_.forEach((container) => {
//           if (!uniqueRangeipNames.has(container.rangeipName)) {
//             uniqueRangeipNames.set(container.rangeipName, container);
//           }
//         });
//         const subscribedContainers = Array.from(uniqueRangeipNames.values());
//
//         const inline_keyboard = subscribedContainers
//           .sort((a, b) => a.rangeipNumber - b.rangeipNumber)
//           .map((container, index) => ({
//             text: `${index + 1}`,
//             callback_data: `${text}_${container.rangeipNumber}`,
//           }));
//
//         const inline_buttons = splitArrayIntoChunks(inline_keyboard, 3);
//         await ctx.telegram.sendMessage(
//           ctx.from.id,
//           `Контейнеры для площадкой ${area} :\n${formattedContainers(subscribedContainers)}\n`,
//         );
//
//         await ctx.telegram.sendMessage(
//           ctx.from.id,
//           'Выберите номер контейнера',
//           {
//             reply_markup: {
//               inline_keyboard: inline_buttons,
//             },
//           },
//         );
//       } else if (
//         text === InteractionContainerEnum.INTERACTION_CONTAINER_SUBSCRIBE
//       ) {
//         const unsubscribedContainers_ =
//           await this.interactionService.getUnsubscribedRangeips(
//             ctx.from.id,
//             areaId,
//           );
//         const uniqueRangeipNames = new Map();
//         unsubscribedContainers_.forEach((container) => {
//           if (!uniqueRangeipNames.has(container.rangeipName)) {
//             uniqueRangeipNames.set(container.rangeipName, container);
//           }
//         });
//         const unsubscribedContainers = Array.from(uniqueRangeipNames.values());
//
//         const inline_keyboard = unsubscribedContainers
//           .sort((a, b) => a.rangeipNumber - b.rangeipNumber)
//           .map((container, index) => ({
//             text: `${index + 1}`,
//             callback_data: `${text}_${container.rangeipNumber}`,
//           }));
//
//         const inline_buttons = splitArrayIntoChunks(inline_keyboard, 3);
//         await ctx.telegram.sendMessage(
//           ctx.from.id,
//           `Контейнеры для площадкой ${area} :\n${formattedContainers(unsubscribedContainers)}\n`,
//         );
//
//         await ctx.telegram.sendMessage(
//           ctx.from.id,
//           'Выберите номер контейнера',
//           {
//             reply_markup: {
//               inline_keyboard: inline_buttons,
//             },
//           },
//         );
//       }
//     } else if (
//       text === InteractionContainerEnum.INTERACTION_SELECT_DIFFERENT_AREA
//     ) {
//       await ctx.scene.enter(INTERACTION_ADD_AREA_SCENE, {
//         interactionType: SELECT_AREA_TEXT,
//       });
//     } else if (text === BACK) {
//       await ctx.scene.enter(INTERACTION_SCENE);
//     } else if (
//       text === InteractionContainerEnum.INTERACTION_SHOW_AREA_CONTAINERS
//     ) {
//       // @ts-expect-error
//       const areaId = ctx.scene.state.areaId;
//       // @ts-expect-error
//       const name = ctx.scene.state.name;
//       const containers_ =
//         await this.interactionService.getRangeipsByAreaId(areaId);
//       const uniqueRangeipNames = new Map();
//       containers_.forEach((container) => {
//         if (!uniqueRangeipNames.has(container.rangeipName)) {
//           uniqueRangeipNames.set(container.rangeipName, container);
//         }
//       });
//       return `все контейнеры для площадкой ${name}:\n${formattedContainers(Array.from(uniqueRangeipNames.values()))}`;
//     } else if (
//       text === InteractionContainerEnum.INTERACTION_SHOW_SUBSCRIBED_CONTAINERS
//     ) {
//       const { userId } = await this.userService.findOne(ctx.from.id);
//       const containers_ =
//         await this.interactionService.getRangeipNamesByChatId(userId);
//       const uniqueRangeipNames = new Map();
//       containers_.forEach((container) => {
//         if (
//           !uniqueRangeipNames.has(
//             `${container.rangeipName}_${container.areaId}`,
//           )
//         ) {
//           container.rangeipName = `${container.areaName} ${container.rangeipName}`;
//           uniqueRangeipNames.set(container.rangeipName, container);
//         }
//       });
//       const names = Array.from(uniqueRangeipNames.values());
//       return names.length === 0
//         ? 'Вы не подписали еще на контейнеры'
//         : `Вы подписаны на следующие контейнеры:\n${formattedContainers(names)}`;
//     } else {
//       await this.sceneEnter(ctx);
//     }
//   }
// }
