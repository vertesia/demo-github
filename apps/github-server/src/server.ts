import { logger } from "@dglabs/logger";

process.on('uncaughtException', function (err) {
    console.error('Uncaught error!', err.stack);
});

export default function start() {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
    logger.info(`Starting GitHub Server on port ${PORT}...`);
}

logger.info(`Node version: ${process.version}`);
start();
