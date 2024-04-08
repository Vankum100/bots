import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { LoginScene } from './scenes/login.scene';
import { InteractionScene } from './scenes/interaction.scene';
import { InteractionService } from './services/interaction.service';
import { UserService } from './services/user.service';
import { CommandHandler } from './commands/command-handler';

const scenes = [LoginScene, InteractionScene];

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
