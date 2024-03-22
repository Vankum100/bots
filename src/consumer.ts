import { SyncModule } from './sync.module';
import { NestFactory } from '@nestjs/core';
import { InteractionService } from './telegram/services/interaction.service';
import { EventProducer } from './broker/event-producer.service';
import { EventConsumer } from './broker/event-consumer.service';

async function bootstrap() {
  const syncModule = await NestFactory.create(SyncModule);
  const interactionService = syncModule.get(InteractionService);
  const eventProducer = syncModule.get(EventProducer);
  const eventConsumer = syncModule.get(EventConsumer);
  const flushedAreas = await interactionService.deleteAllAreas();
  console.log('flushedAreas Result ', flushedAreas);
  await interactionService.getAllRangeips();
  setInterval(async () => {
    await interactionService.getAllRangeips();
    const areas = await interactionService.getAreas();
    await eventProducer.produceEvents();
    await eventConsumer.consumeEvents(areas[0].areaId);
  }, 6000);
}

bootstrap();
