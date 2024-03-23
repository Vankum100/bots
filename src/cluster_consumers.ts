import { SyncModule } from './sync.module';
import { NestFactory } from '@nestjs/core';
import * as cluster from 'cluster';
import * as os from 'os';

const numCPUs = os.cpus().length;
import { EventConsumer } from './broker/event-consumer.service';

async function bootstrap() {
  const syncModule = await NestFactory.create(SyncModule);

  const _cluster: any = cluster;
  if (_cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    const eventConsumer = syncModule.get(EventConsumer);
    if (process.env.FLUSH_CONSUMERS === 'true') {
      const flushedConsumers = await eventConsumer.deleteExistingConsumers();
      console.log('flushed consumers: ', flushedConsumers);
    }
    await eventConsumer.createConsumerGroupIfNeeded();

    for (let i = 1; i <= numCPUs; i++) {
      await _cluster.fork({ consumerName: `consumer_${i}` });
    }
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
