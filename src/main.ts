import { InteractionService } from './telegram/services/interaction.service';
require('dotenv').config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const interactionService = app.get(InteractionService);
  app.useGlobalPipes(new ValidationPipe({ stopAtFirstError: true }));
  app.enableCors();
  app.listen(Number(process.env.MICROSERVICE_BOT_PORT), () =>
    console.log('Bot API launched.'),
  );
  await interactionService.handleStatusChange();
}

bootstrap();
