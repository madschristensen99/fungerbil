import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Server configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Monero configuration
const MONERO_DAEMON_URI = process.env.MONERO_DAEMON_URI || 'https://node.sethforprivacy.com';
const MONERO_WALLET_PASSWORD = process.env.MONERO_WALLET_PASSWORD || 'supersecretpassword123';
const MONERO_NETWORK = process.env.MONERO_NETWORK || 'mainnet';
const MONERO_WALLET_SEED = process.env.MONERO_WALLET_SEED || '';

// EVM configuration
const EVM_RPC_URL = process.env.EVM_RPC_URL || 'https://sepolia.base.org';
const SWAP_CREATOR_ADDRESS = process.env.SWAP_CREATOR_ADDRESS || '0x5C9450561e28741c5C76aE863a65AC7215fcAEDc';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY || '';

// Swap configuration
const DEFAULT_TIMEOUT_DURATION_1 = parseInt(process.env.DEFAULT_TIMEOUT_DURATION_1 || '3600'); // 1 hour in seconds
const DEFAULT_TIMEOUT_DURATION_2 = parseInt(process.env.DEFAULT_TIMEOUT_DURATION_2 || '7200'); // 2 hours in seconds

export default {
  server: {
    port: PORT,
    env: NODE_ENV,
    rootDir
  },
  monero: {
    daemonUri: MONERO_DAEMON_URI,
    walletPassword: MONERO_WALLET_PASSWORD,
    network: MONERO_NETWORK,
    walletSeed: MONERO_WALLET_SEED
  },
  evm: {
    rpcUrl: EVM_RPC_URL,
    swapCreatorAddress: SWAP_CREATOR_ADDRESS,
    usdcAddress: USDC_ADDRESS,
    privateKey: EVM_PRIVATE_KEY
  },
  swap: {
    timeoutDuration1: DEFAULT_TIMEOUT_DURATION_1,
    timeoutDuration2: DEFAULT_TIMEOUT_DURATION_2
  }
};
