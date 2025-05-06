// Swap Server - Main entry point
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initializeMoneroWallet } from './monero-wallet-service.js';
import { createUsdcToXmrSwap, getUsdcToXmrSwap, setUsdcToXmrSwapReady, claimUsdcToXmrSwap, getAllUsdcToXmrSwaps } from './usdc-to-xmr-handler.js';
import { createXmrToUsdcSwap, getXmrToUsdcSwap, sendXmrForSwap, createEvmSwapAfterXmrSent, setXmrToUsdcSwapReady, claimXmrToUsdcSwap, getAllXmrToUsdcSwaps } from './xmr-to-usdc-handler.js';
import web3SwapApi from './web3-swap-api.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000; // Using port 3000 to match test expectations

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes for USDC to XMR swaps
app.post('/api/swaps/usdc-to-xmr', async (req, res) => {
  try {
    const result = await createUsdcToXmrSwap(req.body);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/swaps/usdc-to-xmr/:swapId/ready', async (req, res) => {
  try {
    const result = await setUsdcToXmrSwapReady(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/swaps/usdc-to-xmr/:swapId/claim', async (req, res) => {
  try {
    const result = await claimUsdcToXmrSwap(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/swaps/usdc-to-xmr/:swapId', (req, res) => {
  try {
    const result = getUsdcToXmrSwap(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/swaps/usdc-to-xmr', (req, res) => {
  try {
    const result = getAllUsdcToXmrSwaps();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Routes for XMR to USDC swaps
app.post('/api/swaps/xmr-to-usdc', async (req, res) => {
  try {
    const result = await createXmrToUsdcSwap(req.body);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/swaps/xmr-to-usdc/:swapId/send-xmr', async (req, res) => {
  try {
    const result = await sendXmrForSwap(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/swaps/xmr-to-usdc/:swapId/create-evm-swap', async (req, res) => {
  try {
    const result = await createEvmSwapAfterXmrSent(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/swaps/xmr-to-usdc/:swapId/ready', async (req, res) => {
  try {
    const result = await setXmrToUsdcSwapReady(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/swaps/xmr-to-usdc/:swapId/claim', async (req, res) => {
  try {
    const result = await claimXmrToUsdcSwap(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/swaps/xmr-to-usdc/:swapId', (req, res) => {
  try {
    const result = getXmrToUsdcSwap(req.params.swapId);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/swaps/xmr-to-usdc', (req, res) => {
  try {
    const result = getAllXmrToUsdcSwaps();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Register Web3 API routes
app.use('/api/web3', web3SwapApi);

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({
    message: 'Fungerbil Swap Server is running',
    endpoints: {
      usdcToXmr: {
        create: 'POST /api/swaps/usdc-to-xmr',
        setReady: 'POST /api/swaps/usdc-to-xmr/:swapId/ready',
        claim: 'POST /api/swaps/usdc-to-xmr/:swapId/claim',
        getById: 'GET /api/swaps/usdc-to-xmr/:swapId',
        getAll: 'GET /api/swaps/usdc-to-xmr'
      },
      xmrToUsdc: {
        create: 'POST /api/swaps/xmr-to-usdc',
        sendXmr: 'POST /api/swaps/xmr-to-usdc/:swapId/send-xmr',
        createEvmSwap: 'POST /api/swaps/xmr-to-usdc/:swapId/create-evm-swap',
        setReady: 'POST /api/swaps/xmr-to-usdc/:swapId/ready',
        claim: 'POST /api/swaps/xmr-to-usdc/:swapId/claim',
        getById: 'GET /api/swaps/xmr-to-usdc/:swapId',
        getAll: 'GET /api/swaps/xmr-to-usdc'
      },
      web3Integration: {
        prepareUsdcToXmr: 'POST /api/web3/prepare-usdc-to-xmr',
        notifyUsdcToXmrCreated: 'POST /api/web3/notify-usdc-to-xmr-created',
        notifyUsdcToXmrReady: 'POST /api/web3/notify-usdc-to-xmr-ready',
        prepareXmrToUsdc: 'POST /api/web3/prepare-xmr-to-usdc',
        notifyXmrToUsdcCreated: 'POST /api/web3/notify-xmr-to-usdc-created',
        getStatus: 'GET /api/web3/status/:swapId'
      }
    }
  });
});

// Start server with initialized wallet
async function startServer() {
  try {
    // Initialize the Monero wallet first
    await initializeMoneroWallet();
    
    // Then start the Express server
    app.listen(PORT, () => {
      console.log(`Swap server running on port ${PORT} with synced Monero wallet`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error}`);
    process.exit(1);
  }
}

// Start the server
startServer();
