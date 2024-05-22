# Telegram Bot Overview

This project includes a Telegram bot implemented using the NestJS framework. The bot has various functionalities, including handling user commands, interacting with Redis for event streaming, and managing multiple worker processes for consuming and producing events.

## Project Structure

### TelegramUpdate Class

The `TelegramUpdate` class handles the main interactions with the Telegram bot. It listens to various commands and messages and delegates the appropriate actions to other services.

#### Key Methods:

- **start**: Triggered when the bot starts.
- **startCommand**: Handles the `/start` command.
- **restartCommand**: Handles the `/restart` command.
- **poolOnCommand**: Handles the `/poolon` command.
- **poolOffCommand**: Handles the `/pooloff` command.
- **enableCommand**: Handles the `/enable` command.
- **disableCommand**: Handles the `/disable` command.
- **logoutCommand**: Handles the `/logout` command.
- **selectStatusCommand**: Handles the `/select` command.
- **selectStatusAction**: Handles the selection of a status.
- **callbackQuery**: Handles callback queries.
- **onText**: Handles text messages.
- **authorization**: Handles contact information for authorization.

The bot uses services like `UserService`, `CommandHandler`, `LoginScene`, and `InteractionScene` to manage different aspects of its functionality, such as user management, command handling, and scene transitions.

### EventProducer Class

The `EventProducer` class is responsible for producing events to be consumed by the bot. It periodically checks for new events and pushes them to a Redis stream.

#### Key Methods:

- **onModuleInit**: Initializes the event producer when the module is started.
- **onModuleDestroy**: Cleans up resources when the module is destroyed.
- **produceEvents**: Fetches events from Redis and processes them.
- **populateEvents**: Sets up an interval to produce events periodically.

### EventConsumer Class

The `EventConsumer` class is designed to consume events from a Redis stream and process them, including sending messages to Telegram users.

#### Key Methods:

- **onModuleInit**: Initializes the event consumer when the module is started.
- **onModuleDestroy**: Cleans up resources when the module is destroyed.
- **sendTelegramMessage**: Sends a message to a Telegram chat.
- **consumeEvents**: Fetches messages from the Redis stream and processes them.
- **processMessageQueue**: Handles the message queue and processes messages sequentially.
- **getMessagesFromStream**: Retrieves messages from the Redis stream.
- **createConsumerGroupIfNeeded**: Ensures the Redis consumer group is created if it does not exist.
- **startConsumer**: Starts the consumer process.
- **deleteExistingConsumers**: Deletes existing consumers from the Redis stream.

### Cluster Setup

The application uses clustering to take advantage of multicore processors, improving performance and reliability.

#### Key Functions:

- **bootstrap**: Initializes the application and sets up the cluster. If running as the master process, it sets up the Redis consumer group and forks worker processes. It also handles periodic updates and flushing data if needed.
- **bootstrapWorker**: Initializes individual worker processes.

### Environment Variables

- `MICROSERVICE_BOT_NAME`: The name of the microservice bot.
- `TELEGRAM_BOT_TOKEN`: The token for accessing the Telegram bot API.
- `FLUSH_CONSUMERS`: Flag to determine if existing consumers should be flushed.
- `FLUSH_AREAS`: Flag to determine if areas should be flushed.
- `FLUSH_RANGEIPS`: Flag to determine if range IPs should be flushed.
- `consumerName`: The name of the consumer instance.

## Running the Application

To start the application, simply run  ` npm install && npm run start:dev `  and then in  different terminal run ` npm run cli:consumer ` or `npm run cli:consumers`
