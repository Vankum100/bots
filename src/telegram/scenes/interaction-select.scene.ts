import { Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import {
  INTERACTION_ADD_SCENE,
  INTERACTION_SELECT_SCENE,
} from '../constants/scenes';
import { Context } from '../interfaces/context.interface';
import { interactionSelectKeyboard } from '../keyboards/interaction-select.keyboard';
import { InteractionEnum } from '../enums/interactionEnum';
import { InteractionService } from '../services/interaction.service';
import { formattedAreas } from '../utils/areas';

@Scene(INTERACTION_SELECT_SCENE)
export class InteractionSelectScene {
  constructor(
    private interactionService: InteractionService,
  ) {}

  @SceneEnter()
  async sceneEnter(@Ctx() ctx: Context) {
    await ctx.telegram.sendMessage(ctx.from.id, 'Выбери вид операции', {
      reply_markup: interactionSelectKeyboard,
    });
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
    } else {
      await this.sceneEnter(ctx);
    }
  }
}
