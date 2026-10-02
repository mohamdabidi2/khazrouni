import pino from 'pino';

// Detect production or cloud environments (Render, Heroku, etc.)
const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RENDER) ||
  Boolean(process.env.PORT && process.env.PORT !== '3000');

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
});
