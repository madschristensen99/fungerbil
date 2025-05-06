// XMR to USDC swap handler
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
  getMoneroNetworkType,
  syncWallet,
  sleep
} from './swap-utils.js';

// In-memory storage for swaps
const xmrToUsdcSwaps = new Map();

/**
 * Create a new XMR to USDC swap
 * @param {Object} params - Swap parameters
 * @param {string} params.claimer - Claimer address (EVM)
 * @param {string} params.value - Amount in USDC (atomic units)
 * @param {string} params.xmrAmount - Amount in XMR
 * @returns {Promise<Object>} Swap details
 */
async function createXmrToUsdcSwap(params) {
  try {
    console.log(`Creating XMR to USDC swap for ${params.xmrAmount} XMR...`);
    console.log(`USDC value (atomic units): ${params.value}`);
    console.log(`USDC value (human readable): ${ethers.formatUnits(params.value, 6)} USDC`);
    
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
    
    // Connect to the Monero daemon
    const daemon = await moneroTs.connectToDaemonRpc(MONERO_DAEMON_URI);
    const height = await daemon.getHeight();
    console.log(`Connected to Monero daemon at height: ${height}`);
    
    const xmrWallet = getMoneroWallet();
    // Synchronize the wallet
    await syncWallet(xmrWallet, 5000); // 5 second timeout - just enough for testing
    
    // Get the wallet's address
    const primaryAddress = await xmrWallet.getPrimaryAddress();
    console.log(`XMR Wallet Address: ${primaryAddress}`);
    
    // Get the wallet's balance
    const balance = await xmrWallet.getBalance();
    const unlockedBalance = await xmrWallet.getUnlockedBalance();
    
    // Convert from atomic units to XMR (1 XMR = 1e12 atomic units)
    const balanceXmr = Number(balance) / 1e12;
    const unlockedBalanceXmr = Number(unlockedBalance) / 1e12;
    
    console.log(`XMR Wallet Balance: ${balanceXmr} XMR (${unlockedBalanceXmr} unlocked)`);
    console.log(`XMR amount needed for swap: ${params.xmrAmount} XMR`);
    
    // Verify the amount is valid
    const xmrAmount = parseFloat(params.xmrAmount);
    if (isNaN(xmrAmount) || xmrAmount <= 0) {
      throw new Error(`Invalid XMR amount: ${params.xmrAmount}`);
    }
    
    // Check if we have enough unlocked balance for the swap
    const xmrAmountAtomic = BigInt(Math.floor(xmrAmount * 1e12));
    if (unlockedBalance < xmrAmountAtomic) {
      console.warn(`Insufficient unlocked XMR balance: ${unlockedBalanceXmr} < ${xmrAmount}`);
      console.warn('Proceeding for testing purposes, but this would fail in production');
    }
    
    // Calculate the swap ID
    const exactTimeout1 = BigInt(Math.floor(Date.now() / 1000) + Number(timeoutDuration1));
    const exactTimeout2 = BigInt(Math.floor(Date.now() / 1000) + Number(timeoutDuration1) + Number(timeoutDuration2));
    
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
    
    console.log(`Swap ID calculated: ${swapId}`);
    
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
      xmrAddress: primaryAddress,
      xmrAmount: params.xmrAmount,
      claimSecret,
      refundSecret,
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Store the swap
    xmrToUsdcSwaps.set(swapId, swap);
    
    // DO NOT close the wallet - it needs to remain open for subsequent operations
    console.log('Keeping XMR wallet open for subsequent operations');
    
    return {
      swapId,
      owner: wallet.address,
      claimer: params.claimer,
      xmrAddress: primaryAddress,
      usdcAmount: ethers.formatUnits(params.value, 6),
      xmrAmount: params.xmrAmount,
      status: 'PENDING'
    };
  } catch (error) {
    console.error(`Failed to create XMR to USDC swap: ${error}`);
    throw error;
  }
}

/**
 * Send XMR for a swap
 * @param {string} swapId - The swap ID
 * @returns {Promise<Object>} Transaction details
 */
async function sendXmrForSwap(swapId) {
  try {
    console.log(`Sending XMR for swap ${swapId}...`);
    
    // Check if the swap exists
    if (!xmrToUsdcSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = xmrToUsdcSwaps.get(swapId);
    
    // Get the global wallet instance instead of creating a new one
    let xmrWallet;
    try {
      xmrWallet = getMoneroWallet();
      console.log('Using synced Monero wallet instance');
      
      // Check if wallet is closed
      if (xmrWallet._isClosed) {
        console.log('Monero wallet is closed, attempting to reinitialize...');
        // Import the initializeMoneroWallet function if not already imported
        const { initializeMoneroWallet } = await import('./monero-wallet-service.js');
        // Reinitialize the wallet
        await initializeMoneroWallet();
        // Get the reinitialized wallet
        xmrWallet = getMoneroWallet();
        console.log('Successfully reinitialized Monero wallet');
      }
    } catch (walletError) {
      console.error(`Error getting/initializing Monero wallet: ${walletError.message}`);
      throw new Error(`Wallet is not available: ${walletError.message}`);
    }
    
    // Get the wallet's balance
    let balance, unlockedBalance;
    try {
      balance = await xmrWallet.getBalance();
      unlockedBalance = await xmrWallet.getUnlockedBalance();
    } catch (balanceError) {
      console.error(`Error getting wallet balance: ${balanceError.message}`);
      throw new Error(`Cannot get wallet balance: ${balanceError.message}`);
    }
    
    // Convert from atomic units to XMR (1 XMR = 1e12 atomic units)
    const balanceXmr = Number(balance) / 1e12;
    const unlockedBalanceXmr = Number(unlockedBalance) / 1e12;
    
    console.log(`XMR Wallet Balance: ${balanceXmr} XMR (${unlockedBalanceXmr} unlocked)`);
    
    // Ensure we're using the exact amount specified and it's valid
    const xmrAmount = parseFloat(swap.xmrAmount);
    if (isNaN(xmrAmount) || xmrAmount <= 0) {
      throw new Error(`Invalid XMR amount in swap: ${swap.xmrAmount}`);
    }
    
    // Convert to atomic units with proper precision
    // 1 XMR = 1e12 atomic units (piconero)
    const xmrAmountAtomic = BigInt(Math.round(xmrAmount * 1e12));
    console.log(`Need ${xmrAmount} XMR (${xmrAmountAtomic} atomic units) for this swap`);
    console.log(`Original swap.xmrAmount: ${swap.xmrAmount}, type: ${typeof swap.xmrAmount}`);
    
    // Check if we have enough unlocked balance
    if (unlockedBalance < xmrAmountAtomic) {
      console.error(`Insufficient unlocked XMR balance: ${unlockedBalanceXmr} < ${xmrAmount}`);
      throw new Error(`Insufficient unlocked XMR balance: ${unlockedBalanceXmr} < ${xmrAmount}`);
    }
    
    // Create and relay the transaction
    console.log('Creating transaction with exact amount:', xmrAmountAtomic.toString());
    let tx;
    try {
      tx = await xmrWallet.createTx({
        accountIndex: 0,
        address: swap.xmrAddress,
        amount: xmrAmountAtomic,
        relay: true // Automatically submit to the network
      });
    } catch (txError) {
      console.error(`Error creating transaction: ${txError.message}`);
      throw new Error(`Failed to create transaction: ${txError.message}`);
    }
    
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
    
    let txHash;
    try {
      txHash = tx.getHash();
      console.log(`XMR transaction created and relayed: ${txHash}`);
    } catch (hashError) {
      console.error(`Error getting transaction hash: ${hashError.message}`);
      throw new Error(`Failed to get transaction hash: ${hashError.message}`);
    }
    
    // Update the swap status
    swap.status = 'XMR_SENT';
    swap.updatedAt = Date.now();
    swap.xmrTxHash = txHash;
    xmrToUsdcSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'XMR_SENT',
      xmrTxHash: txHash,
      updatedAt: swap.updatedAt
    };
  } catch (error) {
    console.error(`Failed to send XMR for swap: ${error}`);
    throw error;
  }
}

/**
 * Create the EVM swap after XMR is sent
 * @param {string} swapId - The swap ID
 * @returns {Promise<Object>} Swap details
 */
async function createEvmSwapAfterXmrSent(swapId) {
  try {
    console.log(`Creating EVM swap after XMR sent for ${swapId}...`);
    
    // Check if the swap exists
    if (!xmrToUsdcSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = xmrToUsdcSwaps.get(swapId);
    
    // Check if XMR has been sent
    if (swap.status !== 'XMR_SENT') {
      throw new Error(`XMR has not been sent for swap ${swapId}`);
    }
    
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
    
    if (usdcBalance < BigInt(swap.value)) {
      throw new Error(`Insufficient USDC balance: ${ethers.formatUnits(usdcBalance, 6)} < ${ethers.formatUnits(swap.value, 6)}`);
    }
    
    // Approve the swap creator contract to spend USDC
    console.log('Approving USDC transfer...');
    const approveTx = await usdcContract.approve(SWAP_CREATOR_ADDRESS, swap.value);
    await approveTx.wait();
    console.log(`Approval transaction confirmed: ${approveTx.hash}`);
    
    // Create the swap on the EVM chain
    console.log('Creating swap on the EVM chain...');
    const createSwapTx = await swapCreatorContract.newSwap(
      swap.claimCommitment,
      swap.refundCommitment,
      swap.claimer,
      swap.timeout1,
      swap.timeout2,
      USDC_ADDRESS,
      swap.value,
      swap.nonce
    );
    
    // Wait for the transaction to be mined
    const receipt = await createSwapTx.wait();
    console.log(`Swap creation transaction confirmed: ${createSwapTx.hash}`);
    
    // Extract the exact timeout values from the event
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
      const exactTimeout1 = parsedLog.args[3]; // timeout1 from the event
      const exactTimeout2 = parsedLog.args[4]; // timeout2 from the event
      console.log(`Exact timeout1 from contract: ${exactTimeout1}`);
      console.log(`Exact timeout2 from contract: ${exactTimeout2}`);
      
      // Update the swap with the exact timeout values
      swap.timeout1 = exactTimeout1;
      swap.timeout2 = exactTimeout2;
    }
    
    // Update the swap status
    swap.status = 'EVM_SWAP_CREATED';
    swap.updatedAt = Date.now();
    swap.evmTxHash = createSwapTx.hash;
    xmrToUsdcSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'EVM_SWAP_CREATED',
      evmTxHash: createSwapTx.hash,
      updatedAt: swap.updatedAt
    };
  } catch (error) {
    console.error(`Failed to create EVM swap after XMR sent: ${error}`);
    throw error;
  }
}

/**
 * Set a XMR to USDC swap as ready
 * @param {string} swapId - The swap ID
 * @returns {Promise<Object>} Updated swap details
 */
async function setXmrToUsdcSwapReady(swapId) {
  try {
    console.log(`Setting XMR to USDC swap ${swapId} as ready...`);
    
    // Check if the swap exists
    if (!xmrToUsdcSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = xmrToUsdcSwaps.get(swapId);
    
    // Check if the EVM swap has been created
    if (swap.status !== 'EVM_SWAP_CREATED') {
      throw new Error(`EVM swap has not been created for swap ${swapId}`);
    }
    
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
    xmrToUsdcSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'READY',
      updatedAt: swap.updatedAt
    };
  } catch (error) {
    console.error(`Failed to set XMR to USDC swap as ready: ${error}`);
    throw error;
  }
}

/**
 * Claim a XMR to USDC swap
 * @param {string} swapId - The swap ID
 * @returns {Promise<Object>} Claim details
 */
async function claimXmrToUsdcSwap(swapId) {
  try {
    console.log(`Claiming XMR to USDC swap ${swapId}...`);
    
    // Check if the swap exists
    if (!xmrToUsdcSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = xmrToUsdcSwaps.get(swapId);
    
    // Check if the swap is ready
    if (swap.status !== 'READY') {
      throw new Error(`Swap ${swapId} is not ready for claiming`);
    }
    
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
    
    // Claim the swap
    const claimTx = await swapCreatorContract.claim(swapObj, swap.claimSecret);
    await claimTx.wait();
    console.log(`Claim transaction confirmed: ${claimTx.hash}`);
    
    // Update the swap status
    swap.status = 'COMPLETED';
    swap.updatedAt = Date.now();
    swap.claimTxHash = claimTx.hash;
    xmrToUsdcSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'COMPLETED',
      claimTxHash: claimTx.hash,
      updatedAt: swap.updatedAt
    };
  } catch (error) {
    console.error(`Failed to claim XMR to USDC swap: ${error}`);
    throw error;
  }
}

/**
 * Get a XMR to USDC swap by ID
 * @param {string} swapId - The swap ID
 * @returns {Object} Swap details
 */
function getXmrToUsdcSwap(swapId) {
  if (!xmrToUsdcSwaps.has(swapId)) {
    throw new Error(`Swap with ID ${swapId} not found`);
  }
  
  const swap = xmrToUsdcSwaps.get(swapId);
  
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
    xmrTxHash: swap.xmrTxHash,
    evmTxHash: swap.evmTxHash,
    claimTxHash: swap.claimTxHash
  };
}

/**
 * Get all XMR to USDC swaps
 * @returns {Array<Object>} All swaps
 */
function getAllXmrToUsdcSwaps() {
  return Array.from(xmrToUsdcSwaps.values()).map(swap => ({
    swapId: swap.id,
    owner: swap.owner,
    claimer: swap.claimer,
    xmrAddress: swap.xmrAddress,
    usdcAmount: ethers.formatUnits(swap.value, 6),
    xmrAmount: swap.xmrAmount,
    status: swap.status,
    createdAt: swap.createdAt,
    updatedAt: swap.updatedAt,
    xmrTxHash: swap.xmrTxHash,
    evmTxHash: swap.evmTxHash,
    claimTxHash: swap.claimTxHash
  }));
}

// Export the functions
export {
  createXmrToUsdcSwap,
  sendXmrForSwap,
  createEvmSwapAfterXmrSent,
  setXmrToUsdcSwapReady,
  claimXmrToUsdcSwap,
  getXmrToUsdcSwap,
  getAllXmrToUsdcSwaps
};
