import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { LoginScene } from './scenes/login.scene';
import { InteractionScene } from './scenes/interaction.scene';
// import { InteractionAddAreaScene } from './scenes/interaction-add-area.scene';
import { InteractionService } from './services/interaction.service';
import { UserService } from './services/user.service';
import { CommandHandler } from './commands/command-handler';
// import { InteractionSelectContainerScene } from './scenes/interaction-select-container.scene';

const scenes = [
  LoginScene,
  InteractionScene,
  // InteractionAddAreaScene,
  // InteractionSelectContainerScene,
];

const services = [
  TelegramUpdate,
  UserService,
  InteractionService,
  CommandHandler,
];

@Module({
  providers: [...services, ...scenes],
})
export class TelegramModule {}
