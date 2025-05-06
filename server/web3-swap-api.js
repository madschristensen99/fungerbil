// API endpoints for Web3 wallet integration
import express from 'express';
import { ethers } from 'ethers';
import { generateRandomScalar } from './correct-secp256k1-implementation.js';
import { getMoneroWallet } from './monero-wallet-service.js';
import { SWAP_CREATOR_ADDRESS, SWAP_CREATOR_ABI, USDC_ADDRESS } from './swap-utils.js';

// Maps to store swap data
const usdcToXmrSwaps = new Map();
const xmrToUsdcSwaps = new Map();

const router = express.Router();

// Prepare parameters for a USDC to XMR swap
router.post('/prepare-usdc-to-xmr', async (req, res) => {
  try {
    const { evmAddress, xmrAddress, value } = req.body;
    
    if (!evmAddress || !xmrAddress || !value) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log(`Preparing USDC to XMR swap for ${evmAddress}...`);
    
    // Generate random secrets for claim and refund
    const claimSecret = generateRandomScalar();
    const refundSecret = generateRandomScalar();
    
    // Calculate commitments (this would use the secp256k1 implementation)
    const claimCommitment = ethers.keccak256(ethers.toUtf8Bytes(`claim-${claimSecret}`));
    const refundCommitment = ethers.keccak256(ethers.toUtf8Bytes(`refund-${refundSecret}`));
    
    // Calculate timeouts
    const now = Math.floor(Date.now() / 1000);
    const timeout1 = now + 3600; // 1 hour
    const timeout2 = now + 7200; // 2 hours
    
    // Generate a unique swap ID
    const nonce = Math.floor(Math.random() * 1000000);
    const swapData = {
      owner: evmAddress,
      claimer: evmAddress, // Self-swap for testing
      claimCommitment,
      refundCommitment,
      timeout1,
      timeout2,
      asset: USDC_ADDRESS,
      value,
      nonce
    };
    
    // Calculate swap ID as it would be on the contract
    const swapId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address', 'uint256', 'uint256'],
      [swapData.owner, swapData.claimer, swapData.claimCommitment, swapData.refundCommitment, 
       swapData.timeout1, swapData.timeout2, swapData.asset, swapData.value, swapData.nonce]
    ));
    
    // Store the swap data
    usdcToXmrSwaps.set(swapId, {
      ...swapData,
      xmrAddress,
      claimSecret,
      refundSecret,
      status: 'PREPARED',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    // Return the parameters needed for the frontend to create the swap
    return res.json({
      swapId,
      swapParams: swapData,
      claimSecret, // In a real implementation, this would be kept secure
      refundSecret // In a real implementation, this would be kept secure
    });
  } catch (error) {
    console.error(`Error preparing USDC to XMR swap: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Notify backend that a USDC to XMR swap has been created on the contract
router.post('/notify-usdc-to-xmr-created', async (req, res) => {
  try {
    const { swapId, txHash } = req.body;
    
    if (!swapId || !txHash) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Check if the swap exists
    if (!usdcToXmrSwaps.has(swapId)) {
      return res.status(404).json({ error: `Swap with ID ${swapId} not found` });
    }
    
    const swap = usdcToXmrSwaps.get(swapId);
    
    // Update the swap status
    swap.status = 'CREATED';
    swap.txHash = txHash;
    swap.updatedAt = Date.now();
    usdcToXmrSwaps.set(swapId, swap);
    
    return res.json({
      swapId,
      status: swap.status,
      updatedAt: swap.updatedAt
    });
  } catch (error) {
    console.error(`Error notifying USDC to XMR swap creation: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Notify backend that a USDC to XMR swap is ready for XMR sending
router.post('/notify-usdc-to-xmr-ready', async (req, res) => {
  try {
    const { swapId } = req.body;
    
    if (!swapId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Check if the swap exists
    if (!usdcToXmrSwaps.has(swapId)) {
      return res.status(404).json({ error: `Swap with ID ${swapId} not found` });
    }
    
    const swap = usdcToXmrSwaps.get(swapId);
    
    // Update the swap status
    swap.status = 'READY';
    swap.updatedAt = Date.now();
    usdcToXmrSwaps.set(swapId, swap);
    
    // Send XMR to the recipient
    console.log(`Sending XMR to ${swap.xmrAddress}...`);
    
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
    
    // Calculate XMR amount based on USDC value
    // In a real implementation, this would use an exchange rate
    const usdcValue = Number(swap.value) / 1e6; // Convert from atomic units
    const xmrAmount = usdcValue * 0.005; // Simple conversion for testing (1 USDC ≈ 0.005 XMR)
    const xmrAmountAtomic = BigInt(Math.round(xmrAmount * 1e12));
    
    console.log(`Need ${xmrAmount} XMR (${xmrAmountAtomic} atomic units) for this swap`);
    
    // Create and relay the transaction
    console.log('Creating transaction with exact amount:', xmrAmountAtomic.toString());
    const tx = await xmrWallet.createTx({
      accountIndex: 0,
      address: swap.xmrAddress,
      amount: xmrAmountAtomic,
      relay: true // Automatically submit to the network
    });
    
    const txHash = tx.getHash();
    console.log(`XMR transaction created and relayed: ${txHash}`);
    
    // Update the swap status
    swap.status = 'COMPLETED';
    swap.updatedAt = Date.now();
    swap.xmrTxHash = txHash;
    usdcToXmrSwaps.set(swapId, swap);
    
    return res.json({
      swapId,
      status: swap.status,
      xmrTxHash: txHash,
      updatedAt: swap.updatedAt
    });
  } catch (error) {
    console.error(`Error sending XMR for USDC to XMR swap: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Prepare parameters for a XMR to USDC swap
router.post('/prepare-xmr-to-usdc', async (req, res) => {
  try {
    const { evmAddress, value, xmrAmount } = req.body;
    
    if (!evmAddress || !value || !xmrAmount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    console.log(`Preparing XMR to USDC swap for ${evmAddress}...`);
    
    // Generate random secrets for claim and refund
    const claimSecret = generateRandomScalar();
    const refundSecret = generateRandomScalar();
    
    // Calculate commitments (this would use the secp256k1 implementation)
    const claimCommitment = ethers.keccak256(ethers.toUtf8Bytes(`claim-${claimSecret}`));
    const refundCommitment = ethers.keccak256(ethers.toUtf8Bytes(`refund-${refundSecret}`));
    
    // Get the Monero wallet address
    const xmrWallet = getMoneroWallet();
    const xmrAddress = await xmrWallet.getAddress(0, 0);
    
    // Generate a unique swap ID
    const swapId = ethers.keccak256(ethers.toUtf8Bytes(`xmr-to-usdc-${Date.now()}-${Math.random()}`));
    
    // Store the swap data
    xmrToUsdcSwaps.set(swapId, {
      evmAddress,
      value,
      xmrAmount,
      xmrAddress,
      claimSecret,
      refundSecret,
      claimCommitment,
      refundCommitment,
      status: 'PREPARED',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return res.json({
      swapId,
      xmrAddress,
      xmrAmount,
      claimCommitment,
      refundCommitment
    });
  } catch (error) {
    console.error(`Error preparing XMR to USDC swap: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Notify backend of XMR to USDC swap creation on the contract
router.post('/notify-xmr-to-usdc-created', async (req, res) => {
  try {
    const { swapId, txHash } = req.body;
    
    if (!swapId || !txHash) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Check if the swap exists
    if (!xmrToUsdcSwaps.has(swapId)) {
      return res.status(404).json({ error: `Swap with ID ${swapId} not found` });
    }
    
    const swap = xmrToUsdcSwaps.get(swapId);
    
    // Update the swap status
    swap.status = 'CREATED';
    swap.txHash = txHash;
    swap.updatedAt = Date.now();
    xmrToUsdcSwaps.set(swapId, swap);
    
    return res.json({
      swapId,
      status: swap.status,
      updatedAt: swap.updatedAt
    });
  } catch (error) {
    console.error(`Error notifying XMR to USDC swap creation: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

// Get swap status
router.get('/status/:swapId', async (req, res) => {
  try {
    const { swapId } = req.params;
    
    // Check if the swap exists in either map
    if (usdcToXmrSwaps.has(swapId)) {
      const swap = usdcToXmrSwaps.get(swapId);
      return res.json({
        swapId,
        type: 'USDC_TO_XMR',
        status: swap.status,
        createdAt: swap.createdAt,
        updatedAt: swap.updatedAt,
        xmrTxHash: swap.xmrTxHash
      });
    } else if (xmrToUsdcSwaps.has(swapId)) {
      const swap = xmrToUsdcSwaps.get(swapId);
      return res.json({
        swapId,
        type: 'XMR_TO_USDC',
        status: swap.status,
        createdAt: swap.createdAt,
        updatedAt: swap.updatedAt,
        xmrTxHash: swap.xmrTxHash
      });
    } else {
      return res.status(404).json({ error: `Swap with ID ${swapId} not found` });
    }
  } catch (error) {
    console.error(`Error getting swap status: ${error}`);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
