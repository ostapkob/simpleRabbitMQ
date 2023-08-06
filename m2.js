const amqp = require('amqplib');
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      // winston.format.timestamp(), // adds a timestamp property
      winston.format.json()
  ),
    transports: [
      new winston.transports.File({ filename: "./log/err_m2.log", level: "warn" }),
      new winston.transports.File({ filename: "./log/m2.log" }),
  ],
});

// Подключение к RabbitMQ
const connectToRabbitMQ = async () => {
    const connection = await amqp.connect('amqp://localhost');
    return connection;
};


const consumeFromQueue = async (taskQueue, resultQueue) => {
    const connection = await connectToRabbitMQ();
    const channel = await connection.createChannel();

    await channel.assertQueue(taskQueue, { durable: true });
    channel.prefetch(1);

    console.log("M2 is waiting for tasks...");

    while (true) { 
        await new Promise(resolve => {
            channel.consume(taskQueue, async (message) => {
                const requestData = JSON.parse(message.content.toString());
                logger.info(`Result received by M2: ${JSON.stringify(requestData)}`);

                //перевернуть текст
                requestData.text = requestData.text.split('').reverse().join('');

                await new Promise(resolve => setTimeout(resolve, 2000));

                await channel.assertQueue(resultQueue, { durable: true });
                channel.sendToQueue(resultQueue, Buffer.from(JSON.stringify(requestData)), {
                    persistent: true
                });

                logger.info(`Task processed by M2: ${JSON.stringify(requestData)}`);

                // Acknowledge the message after processing
                channel.ack(message);

                resolve();
            });
        });
    }
};

consumeFromQueue('task_queue', 'result_queue').catch(error => logger.error("Error:", error));
logger.info(`----------------restart-------------------`);
