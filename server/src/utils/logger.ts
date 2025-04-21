import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Create the logger
const logger = winston.createLogger({
  level: config.server.env === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        logFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      dirname: 'logs' 
    }),
    // File transport for all logs
    new winston.transports.File({ 
      filename: 'combined.log',
      dirname: 'logs'
    })
  ]
});

export default logger;
