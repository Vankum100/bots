import { SyncModule } from './sync.module';
import { NestFactory } from '@nestjs/core';
import * as cluster from 'cluster';
import * as os from 'os';

const numCPUs = os.cpus().length;
import { EventConsumer } from './broker/event-consumer.service';
import { InteractionService } from './telegram/services/interaction.service';

async function bootstrap() {
  const syncModule = await NestFactory.createApplicationContext(SyncModule);

  const _cluster: any = cluster;
  if (_cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
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
    await interactionService.getAllRangeips();
    await eventConsumer.createConsumerGroupIfNeeded();

    for (let i = 1; i <= numCPUs; i++) {
      await _cluster.fork({ consumerName: `consumer_${i}` });
    }

    setInterval(async () => {
      await interactionService.getAllRangeips();
    }, 7 * 6000);
  } else {
    console.log(
      `Worker ${process.pid} started with consumerName: ${process.env.consumerName}`,
    );
    await bootstrapWorker(syncModule);
  }
}

async function bootstrapWorker(syncModule: any) {
  console.log(`Cluster server started on ${process.pid}`);
  await syncModule.init();
}

bootstrap();
