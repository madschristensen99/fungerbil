// EVM configuration with increased timeouts
import { ethers } from 'ethers';

// Keep track of the latest nonce for each address
const nonceTracker = new Map();

/**
 * Create an EVM provider with increased timeouts
 * @param {string} rpcUrl - The RPC URL to connect to
 * @returns {ethers.JsonRpcProvider} The configured provider
 */
export function createProviderWithTimeout(rpcUrl) {
  return new ethers.JsonRpcProvider(rpcUrl, undefined, {
    staticNetwork: true,
    polling: true,
    pollingInterval: 1000,
    timeout: 120000 // 2 minute timeout
  });
}

/**
 * Create a wallet with the provider
 * @param {string} privateKey - The private key
 * @param {string} rpcUrl - The RPC URL to connect to
 * @returns {ethers.Wallet} The wallet
 */
export function createWallet(privateKey, rpcUrl) {
  const provider = createProviderWithTimeout(rpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Create a wallet with nonce management
 * @param {string} privateKey - The private key
 * @param {string} rpcUrl - The RPC URL to connect to
 * @returns {Promise<ethers.Wallet>} The wallet with a getNextNonce method
 */
export async function createWalletWithNonceManagement(privateKey, rpcUrl) {
  const wallet = createWallet(privateKey, rpcUrl);
  const address = await wallet.getAddress();
  
  // Initialize the nonce if not already tracked
  if (!nonceTracker.has(address)) {
    const currentNonce = await wallet.provider.getTransactionCount(address, 'pending');
    nonceTracker.set(address, currentNonce);
  }
  
  // Add a method to get the next nonce
  wallet.getNextNonce = () => {
    const currentNonce = nonceTracker.get(address);
    nonceTracker.set(address, currentNonce + 1);
    return currentNonce;
  };
  
  return wallet;
}
