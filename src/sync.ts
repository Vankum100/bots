import { SyncModule } from './sync.module';
import { NestFactory } from '@nestjs/core';
import { InteractionService } from './telegram/services/interaction.service';

async function bootstrap() {
  const syncModule = await NestFactory.create(SyncModule);
  const interactionService = syncModule.get(InteractionService);
  await interactionService.getAllRangeips();
  setInterval(async () => {
    const areas = await interactionService.getAreas();
    console.log('areas: ', areas);
  }, 6000);
}

bootstrap();
