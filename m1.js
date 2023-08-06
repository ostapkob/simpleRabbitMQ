const amqp = require('amqplib');
const express = require('express');
const winston = require('winston');

const app = express();
app.use(express.json());

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      // winston.format.timestamp(), // adds a timestamp property
      winston.format.json()
  ),
    transports: [
      new winston.transports.File({ filename: "./log/err_m1.log", level: "warn" }),
      new winston.transports.File({ filename: "./log/m1.log" }),
  ],
});

// Подключение к RabbitMQ
const connectToRabbitMQ = async () => {
    const connection = await amqp.connect('amqp://localhost');
    return connection;
};


// Получение задания из очереди result_queue
const consumeFromQueue = async (queue) => {
    const connection = await connectToRabbitMQ();
    const channel = await connection.createChannel();

    // Объявление очереди
    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    logger.info("M1 is waiting for results...");

    // Обработка результатов из очереди
    channel.consume(queue, async (message) => {
        const requestData = JSON.parse(message.content.toString());

        requestData.text = requestData.text + '!'
        logger.info(`Result received by M1: ${JSON.stringify(requestData)}`);

        // Подтверждение получения результата
        channel.ack(message);
    });
};

// Отправка задания в очередь
const sendToQueue = async (requestData, queue) => {
    const connection = await connectToRabbitMQ();
    const channel = await connection.createChannel();

    // Объявление очереди
    await channel.assertQueue(queue, { durable: true });

    // Отправка задания в очередь
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(requestData)), {
        persistent: true
    });

    logger.info(`Sent task to RabbitMQ: ${JSON.stringify(requestData)}`);

    // Закрытие соединения 
    await channel.close();
    await connection.close();
};

// Запуск получения результатов
(async () => {
    try {
        await consumeFromQueue('result_queue');
    } catch (error) {
        logger.error("Error:", error);
    }
})();

// Отправка задания по маршруту /send
app.post('/send', async (req, res) => {
    const requestData = req.body;

    // Преобразование текста в заглавные буквы
    requestData.text = requestData.text.toUpperCase();

    // Отправка задания в очередь R
    sendToQueue(requestData, 'task_queue');

    res.json({ message: `Task sent to RabbitMQ: ${JSON.stringify(requestData)}` });
});

const port = 8001;
app.listen(port, () => {
    console.log(`M1 is running on port ${port}`);
    logger.info(`----------------restart-------------------`);
    logger.info(`M1 restart port ${port}`);

});

