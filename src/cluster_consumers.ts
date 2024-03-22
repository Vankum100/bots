import { SyncModule } from './sync.module';
import { NestFactory } from '@nestjs/core';
import { InteractionService } from './telegram/services/interaction.service';

import * as cluster from 'cluster';

async function bootstrap() {
  const syncModule = await NestFactory.create(SyncModule);
  const interactionService = syncModule.get(InteractionService);
  const areas = await interactionService.getAreas();

  const _cluster: any = cluster;
  if (_cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    for (let i = 0; i < areas.length; i++) {
      _cluster.fork();
    }
    let i = 0;
    for (const id in _cluster.workers) {
      _cluster.workers[id].send({
        type: 'areas',
        data: { id: areas[i].areaId, areas },
      });
      i++;
    }
  } else {
    console.log(`Cluster server started on ${process.pid}`);

    process.on('message', async (msg: any) => {
      if (msg.type === 'areas') {
        console.log(`Worker ${process.pid} started with areas: ${msg.data.id}`);

        setInterval(async () => {

        }, 6000);
      }
    });
  }
}

bootstrap();
