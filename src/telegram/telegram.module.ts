import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { LoginScene } from './scenes/login.scene';
import { InteractionSelectScene } from './scenes/interaction-select.scene';
import { InteractionAddScene } from './scenes/interaction-add.scene';
import { InteractionService } from './services/interaction.service';
import { UserService } from './services/user.service';
import { CommandHandler } from './commands/command-handler';

const scenes = [LoginScene, InteractionSelectScene, InteractionAddScene];

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
