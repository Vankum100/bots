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
  if (process.env.FLUSH_AREAS === 'true') {
    const flushedAreas = await interactionService.flushAreas();
    console.log('flushedAreas Result ', flushedAreas);
  }

  if (process.env.FLUSH_RANGEIPS === 'true') {
    const flushedAreas = await interactionService.flushRangeips();
    console.log('flushedRanges Result ', flushedAreas);
  }
  await interactionService.getAllRangeips();
  setInterval(async () => {
    await interactionService.getAllRangeips();
    const areas = await interactionService.getAreas();
    await eventProducer.produceEvents();
    await eventConsumer.consumeEvents(areas[0].areaId);
  }, 6000);
}

bootstrap();
