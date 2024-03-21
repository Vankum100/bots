import { SyncModule } from './sync.module';
import { NestFactory } from '@nestjs/core';
import { InteractionService } from './telegram/services/interaction.service';
import { EventProducer } from './broker/event-producer.service';
import { EventConsumer } from './broker/event-consumer.service';
import * as cluster from 'cluster';

async function bootstrap() {
  const syncModule = await NestFactory.create(SyncModule);
  const interactionService = syncModule.get(InteractionService);
  const areas = await interactionService.getAreas();
  const eventProducer = syncModule.get(EventProducer);
  const eventConsumer = syncModule.get(EventConsumer);
  const _cluster: any = cluster;
  if (_cluster.isMaster) {
    await eventProducer.produceEvents();
    await eventConsumer.consumeEvents(areas[0].areaId);
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < areas.length; i++) {
      _cluster.fork();
    }
    let i = 0;
    for (const id in _cluster.workers) {
      _cluster.workers[id].send({
        type: 'areas',
        data: { id: areas[i].areaId, areas, eventProducer, eventConsumer },
      });
      i++;
    }
  } else {
    console.log(`Cluster server started on ${process.pid}`);

    process.on('message', async (msg: any) => {
      if (msg.type === 'areas') {
        console.log(`Worker ${process.pid} started with areas: ${msg.data.id}`);

        setInterval(async () => {
          await eventProducer.produceEvents();
          await eventConsumer.consumeEvents(String(msg.data.id));
        }, 6000);
      }
    });
  }
}

bootstrap();
