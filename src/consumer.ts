import { SyncModule } from './sync.module';
import { NestFactory } from '@nestjs/core';
import { InteractionService } from './telegram/services/interaction.service';
import { EventConsumer } from './broker/event-consumer.service';

async function bootstrap() {
  process.env.consumerName = `consumer_1`;

  const syncModule = await NestFactory.create(SyncModule);
  const eventConsumer = syncModule.get(EventConsumer);
  const interactionService = syncModule.get(InteractionService);
  if (process.env.FLUSH_CONSUMERS === 'true') {
    const flushedConsumers = await eventConsumer.deleteExistingConsumers();
    console.log('flushed consumers: ', flushedConsumers);
  }
  if (process.env.FLUSH_AREAS === 'true') {
    const flushedAreas = await interactionService.flushAreas();
    console.log('flushedAreas Result ', flushedAreas.length);
  }

  if (process.env.FLUSH_RANGEIPS === 'true') {
    const flushedRanges = await interactionService.flushRangeips();
    console.log('flushedRanges Result ', flushedRanges.length);
  }
  await eventConsumer.createConsumerGroupIfNeeded();
  await syncModule.init();
  await interactionService.getAllRangeips();

  setInterval(async () => {
    await interactionService.getAllRangeips();
  }, 6000);
}

bootstrap();
