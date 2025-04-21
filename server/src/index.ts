import express from 'express';
import cors from 'cors';
import swapRoutes from './routes/swap.routes.js';
import swapService from './services/swap.service.js';
import logger from './utils/logger.js';
import config from './config/index.js';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/swaps', swapRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: Date.now()
  });
});

// Initialize the swap service and start the server
async function startServer() {
  try {
    // Initialize the swap service
    await swapService.initialize();
    
    // Start the server
    app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port} in ${config.server.env} mode`);
      logger.info(`Monero daemon: ${config.monero.daemonUri}`);
      logger.info(`EVM RPC URL: ${config.evm.rpcUrl}`);
      logger.info(`Swap Creator contract: ${config.evm.swapCreatorAddress}`);
      logger.info(`USDC contract: ${config.evm.usdcAddress}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error}`);
  process.exit(1);
});

// Start the server
startServer();
