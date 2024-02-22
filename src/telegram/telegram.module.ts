import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { LoginScene } from './scenes/login.scene';
import { InteractionSelectScene } from './scenes/interaction-select.scene';
import { InteractionAddScene } from './scenes/interaction-add.scene';
import { InteractionService } from './services/interaction.service';
import { UserService } from './services/user.service';

const scenes = [LoginScene, InteractionSelectScene, InteractionAddScene];

const services = [TelegramUpdate, UserService, InteractionService];

@Module({
  providers: [...services, ...scenes],
})
export class TelegramModule {}
