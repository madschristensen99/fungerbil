// USDC to XMR swap handler
import { ethers } from 'ethers';
import moneroTs from 'monero-ts';
import crypto from 'crypto';
import { createProviderWithTimeout, createWallet, createWalletWithNonceManagement } from './evm-config.js';
import { getMoneroWallet } from './monero-wallet-service.js';
import {
  EVM_RPC_URL,
  SWAP_CREATOR_ADDRESS,
  EVM_PRIVATE_KEY,
  USDC_ADDRESS,
  MONERO_DAEMON_URI,
  MONERO_WALLET_PASSWORD,
  MONERO_WALLET_SEED,
  SWAP_CREATOR_ABI,
  ERC20_ABI,
  generateRandomScalar,
  calculateCommitment,
  generateNonce,
  calculateSwapId,
  getMoneroNetworkType
} from './swap-utils.js';

// In-memory storage for swaps
const usdcToXmrSwaps = new Map();

/**
 * Create a new USDC to XMR swap
 * @param {Object} params - Swap parameters
 * @param {string} params.claimer - Claimer address (EVM)
 * @param {string} params.value - Amount in USDC (atomic units)
 * @param {string} params.xmrAddress - XMR address to receive funds
 * @returns {Promise<Object>} Swap details
 */
async function createUsdcToXmrSwap(params) {
  try {
    console.log(`Creating USDC to XMR swap for ${params.value} USDC...`);
    
    // Generate secrets and commitments
    const claimSecret = generateRandomScalar();
    const refundSecret = generateRandomScalar();
    
    const claimCommitment = calculateCommitment(claimSecret);
    const refundCommitment = calculateCommitment(refundSecret);
    
    // Generate a random nonce
    const nonce = generateNonce();
    
    // Set timeout durations (in seconds)
    const timeoutDuration1 = 3600; // 1 hour
    const timeoutDuration2 = 7200; // 2 hours
    
    // Connect to the EVM network with increased timeout
    const wallet = createWallet(EVM_PRIVATE_KEY, EVM_RPC_URL);
    
    // Get the swap creator contract
    const swapCreatorContract = new ethers.Contract(
      SWAP_CREATOR_ADDRESS,
      SWAP_CREATOR_ABI,
      wallet
    );
    
    // Get the USDC contract
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ERC20_ABI,
      wallet
    );
    
    // Check USDC balance
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    console.log(`USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    
    if (usdcBalance < BigInt(params.value)) {
      throw new Error(`Insufficient USDC balance: ${ethers.formatUnits(usdcBalance, 6)} < ${ethers.formatUnits(params.value, 6)}`);
    }
    
    // Approve the swap creator contract to spend USDC
    console.log('Approving USDC transfer...');
    const approveTx = await usdcContract.approve(SWAP_CREATOR_ADDRESS, params.value);
    await approveTx.wait();
    console.log(`Approval transaction confirmed: ${approveTx.hash}`);
    
    // Create the swap on the EVM chain
    console.log('Creating swap on the EVM chain...');
    const createSwapTx = await swapCreatorContract.newSwap(
      claimCommitment,
      refundCommitment,
      params.claimer,
      timeoutDuration1,
      timeoutDuration2,
      USDC_ADDRESS,
      params.value,
      nonce
    );
    
    // Wait for the transaction to be mined
    const receipt = await createSwapTx.wait();
    console.log(`Swap creation transaction confirmed: ${createSwapTx.hash}`);
    
    // Extract the exact timeout values from the event
    let exactTimeout1, exactTimeout2;
    const swapIdEvent = receipt.logs.find(log => {
      try {
        const parsedLog = swapCreatorContract.interface.parseLog(log);
        return parsedLog && parsedLog.name === 'New';
      } catch (e) {
        return false;
      }
    });
    
    if (swapIdEvent) {
      const parsedLog = swapCreatorContract.interface.parseLog(swapIdEvent);
      exactTimeout1 = parsedLog.args[3]; // timeout1 from the event
      exactTimeout2 = parsedLog.args[4]; // timeout2 from the event
      console.log(`Exact timeout1 from contract: ${exactTimeout1}`);
      console.log(`Exact timeout2 from contract: ${exactTimeout2}`);
    } else {
      exactTimeout1 = BigInt(Math.floor(Date.now() / 1000) + Number(timeoutDuration1));
      exactTimeout2 = BigInt(Math.floor(Date.now() / 1000) + Number(timeoutDuration1) + Number(timeoutDuration2));
      console.log('Could not find event, using calculated timeouts');
    }
    
    // Calculate the swap ID using the exact timeout values from the contract
    const swapId = calculateSwapId({
      owner: wallet.address,
      claimer: params.claimer,
      claimCommitment,
      refundCommitment,
      timeout1: exactTimeout1,
      timeout2: exactTimeout2,
      asset: USDC_ADDRESS,
      value: params.value,
      nonce
    });
    
    console.log(`Swap created with ID: ${swapId}`);
    
    // Calculate the XMR amount based on the USDC value
    // This would typically involve an exchange rate calculation
    // For now, we'll use a 10:1 conversion for testing (0.1 USDC = 0.01 XMR)
    const xmrAmount = (Number(params.value) / 1e7).toString(); // Convert from USDC (6 decimals) to XMR with 10:1 ratio
    
    // Create the swap data
    const swap = {
      id: swapId,
      owner: wallet.address,
      claimer: params.claimer,
      claimCommitment,
      refundCommitment,
      timeout1: exactTimeout1,
      timeout2: exactTimeout2,
      asset: USDC_ADDRESS,
      value: params.value,
      nonce: nonce.toString(),
      xmrAddress: params.xmrAddress,
      xmrAmount,
      claimSecret,
      refundSecret,
      status: 'PENDING',
      createdAt: Date.now()
    };
    
    // Store the swap data
    usdcToXmrSwaps.set(swapId, swap);
    
    return {
      swapId,
      owner: wallet.address,
      claimer: params.claimer,
      xmrAddress: params.xmrAddress,
      usdcAmount: ethers.formatUnits(params.value, 6),
      xmrAmount,
      status: 'PENDING'
    };
  } catch (error) {
    console.error(`Failed to create USDC to XMR swap: ${error}`);
    throw error;
  }
}

/**
 * Set a USDC to XMR swap as ready
 * @param {string} swapId - The swap ID
 * @returns {Promise<Object>} Updated swap details
 */
async function setUsdcToXmrSwapReady(swapId) {
  try {
    console.log(`Setting USDC to XMR swap ${swapId} as ready...`);
    
    // Check if the swap exists
    if (!usdcToXmrSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = usdcToXmrSwaps.get(swapId);
    
    // Connect to the EVM network with increased timeout
    const wallet = createWallet(EVM_PRIVATE_KEY, EVM_RPC_URL);
    
    // Get the swap creator contract
    const swapCreatorContract = new ethers.Contract(
      SWAP_CREATOR_ADDRESS,
      SWAP_CREATOR_ABI,
      wallet
    );
    
    // Create the swap object for the contract as an array (Solidity tuple)
    const swapObj = [
      swap.owner,
      swap.claimer,
      swap.claimCommitment,
      swap.refundCommitment,
      BigInt(swap.timeout1),
      BigInt(swap.timeout2),
      swap.asset,
      BigInt(swap.value),
      BigInt(swap.nonce)
    ];
    
    // Set the swap as ready
    const setReadyTx = await swapCreatorContract.setReady(swapObj);
    await setReadyTx.wait();
    console.log(`Set ready transaction confirmed: ${setReadyTx.hash}`);
    
    // Update the swap status
    swap.status = 'READY';
    swap.updatedAt = Date.now();
    usdcToXmrSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'READY',
      updatedAt: swap.updatedAt
    };
  } catch (error) {
    console.error(`Failed to set USDC to XMR swap as ready: ${error}`);
    throw error;
  }
}

/**
 * Claim a USDC to XMR swap
 * @param {string} swapId - The swap ID
 * @returns {Promise<Object>} Claim details
 */
async function claimUsdcToXmrSwap(swapId) {
  try {
    console.log(`Claiming USDC to XMR swap ${swapId}...`);
    
    // Check if the swap exists
    if (!usdcToXmrSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = usdcToXmrSwaps.get(swapId);
    
    // Connect to the EVM network with increased timeout and nonce management
    const wallet = await createWalletWithNonceManagement(EVM_PRIVATE_KEY, EVM_RPC_URL);
    
    // Get the swap creator contract
    const swapCreatorContract = new ethers.Contract(
      SWAP_CREATOR_ADDRESS,
      SWAP_CREATOR_ABI,
      wallet
    );
    
    // Create the swap object for the contract as an array (Solidity tuple)
    const swapObj = [
      swap.owner,
      swap.claimer,
      swap.claimCommitment,
      swap.refundCommitment,
      BigInt(swap.timeout1),
      BigInt(swap.timeout2),
      swap.asset,
      BigInt(swap.value),
      BigInt(swap.nonce)
    ];
    
    // Claim the swap with explicit nonce management
    const nonce = wallet.getNextNonce();
    console.log(`Using nonce: ${nonce} for claim transaction`);
    
    const claimTx = await swapCreatorContract.claim(swapObj, swap.claimSecret, {
      nonce: nonce
    });
    await claimTx.wait();
    console.log(`Claim transaction confirmed: ${claimTx.hash}`);
    
    // Send XMR to the recipient
    console.log(`Sending ${swap.xmrAmount} XMR to ${swap.xmrAddress}...`);
    
    // Get the global wallet instance
    const xmrWallet = getMoneroWallet();
    console.log('Using synced Monero wallet instance');
    
    // Get the wallet's balance
    const balance = await xmrWallet.getBalance();
    const unlockedBalance = await xmrWallet.getUnlockedBalance();
    
    // Convert from atomic units to XMR (1 XMR = 1e12 atomic units)
    const balanceXmr = Number(balance) / 1e12;
    const unlockedBalanceXmr = Number(unlockedBalance) / 1e12;
    
    console.log(`XMR Wallet Balance: ${balanceXmr} XMR (${unlockedBalanceXmr} unlocked)`);
    
    // For testing, we'll proceed with the transaction regardless of balance
    // Ensure we're using the exact amount specified
    const xmrAmount = parseFloat(swap.xmrAmount);
    const xmrAmountAtomic = BigInt(Math.floor(xmrAmount * 1e12));
    console.log(`Need ${xmrAmount} XMR (${xmrAmountAtomic} atomic units) for this swap`);
    console.log(`Original swap.xmrAmount: ${swap.xmrAmount}, type: ${typeof swap.xmrAmount}`);
    console.log('Proceeding with transaction regardless of actual balance');
    
    // Create and relay the transaction
    let txHash;
    
    // Create a transaction to send XMR to the recipient
    console.log('Creating transaction with exact amount:', xmrAmountAtomic.toString());
    const tx = await xmrWallet.createTx({
      accountIndex: 0,
      address: swap.xmrAddress,
      amount: xmrAmountAtomic,
      relay: true // Automatically submit to the network
    });
    
    // Log detailed transaction information
    try {
      const txFee = tx.getFee ? tx.getFee() : null;
      const txAmount = tx.getAmount ? tx.getAmount() : null;
      console.log(`Transaction details:`);
      if (txAmount !== null) {
        console.log(`- Amount: ${txAmount} atomic units (${Number(txAmount) / 1e12} XMR)`);
      } else {
        console.log(`- Amount: Unable to retrieve amount`);
      }
      if (txFee !== null) {
        console.log(`- Fee: ${txFee} atomic units (${Number(txFee) / 1e12} XMR)`);
      } else {
        console.log(`- Fee: Unable to retrieve fee`);
      }
      if (txAmount !== null && txFee !== null) {
        console.log(`- Total: ${BigInt(txAmount) + BigInt(txFee)} atomic units (${(Number(txAmount) + Number(txFee)) / 1e12} XMR)`);
      } else {
        console.log(`- Total: Unable to calculate total`);
      }
    } catch (error) {
      console.log(`Error logging transaction details: ${error.message}`);
    }
    
    txHash = tx.getHash();
    console.log(`XMR transaction created and relayed: ${txHash}`);
    // Update the swap status
    swap.status = 'COMPLETED';
    swap.updatedAt = Date.now();
    swap.xmrTxHash = txHash;
    usdcToXmrSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'COMPLETED',
      xmrTxHash: txHash,
      updatedAt: swap.updatedAt
    };
  } catch (error) {
    console.error(`Failed to claim USDC to XMR swap: ${error}`);
    throw error;
  }
}

/**
 * Get a USDC to XMR swap by ID
 * @param {string} swapId - The swap ID
 * @returns {Object} Swap details
 */
function getUsdcToXmrSwap(swapId) {
  if (!usdcToXmrSwaps.has(swapId)) {
    throw new Error(`Swap with ID ${swapId} not found`);
  }
  
  const swap = usdcToXmrSwaps.get(swapId);
  
  return {
    swapId: swap.id,
    owner: swap.owner,
    claimer: swap.claimer,
    xmrAddress: swap.xmrAddress,
    usdcAmount: ethers.formatUnits(swap.value, 6),
    xmrAmount: swap.xmrAmount,
    status: swap.status,
    createdAt: swap.createdAt,
    updatedAt: swap.updatedAt,
    xmrTxHash: swap.xmrTxHash
  };
}

/**
 * Get all USDC to XMR swaps
 * @returns {Array<Object>} All swaps
 */
function getAllUsdcToXmrSwaps() {
  return Array.from(usdcToXmrSwaps.values()).map(swap => ({
    swapId: swap.id,
    owner: swap.owner,
    claimer: swap.claimer,
    xmrAddress: swap.xmrAddress,
    usdcAmount: ethers.formatUnits(swap.value, 6),
    xmrAmount: swap.xmrAmount,
    status: swap.status,
    createdAt: swap.createdAt,
    updatedAt: swap.updatedAt,
    xmrTxHash: swap.xmrTxHash
  }));
}

// Export the functions
export {
  createUsdcToXmrSwap,
  setUsdcToXmrSwapReady,
  claimUsdcToXmrSwap,
  getUsdcToXmrSwap,
  getAllUsdcToXmrSwaps
};
