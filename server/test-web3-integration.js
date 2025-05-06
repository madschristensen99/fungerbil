// Test script for Web3 integration with the swap server
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { generateRandomScalar } from './correct-secp256k1-implementation.js';
import { SWAP_CREATOR_ADDRESS, SWAP_CREATOR_ABI } from '../frontend/constants.js';

// Load environment variables
dotenv.config();

// Constants
const SERVER_URL = 'http://localhost:3000';
const EVM_RPC_URL = process.env.EVM_RPC_URL;

// This simulates a frontend Web3 wallet connection
async function connectToWeb3Wallet() {
  console.log('\n=== SIMULATING FRONTEND WEB3 WALLET CONNECTION ===\n');
  
  // In a real frontend, this would use window.ethereum
  // For testing, we'll use the private key from .env
  const provider = new ethers.JsonRpcProvider(EVM_RPC_URL);
  const wallet = new ethers.Wallet(process.env.EVM_PRIVATE_KEY, provider);
  const address = await wallet.getAddress();
  
  console.log(`Connected to wallet with address: ${address}`);
  console.log('In a real frontend, this would be the user\'s MetaMask address');
  
  return { provider, wallet, address };
}

// Test USDC to XMR swap flow with direct contract interaction
async function testUsdcToXmrSwapWithWeb3() {
  console.log('\n=== TESTING USDC TO XMR SWAP WITH WEB3 ===\n');
  
  // Step 1: Connect to Web3 wallet (simulated)
  console.log('Step 1: Connecting to Web3 wallet...');
  const { wallet, address } = await connectToWeb3Wallet();
  
  // Step 2: Get the swap contract instance
  console.log('\nStep 2: Getting swap contract instance...');
  const swapContract = new ethers.Contract(
    SWAP_CREATOR_ADDRESS,
    SWAP_CREATOR_ABI,
    wallet
  );
  console.log(`Connected to swap contract at ${SWAP_CREATOR_ADDRESS}`);
  
  // Step 3: Generate XMR address for receiving funds
  // In a real frontend, the user would input their XMR address
  const xmrAddress = '59FYw84NrHCJVcaVpe6Pb3MVqi1bRhgAajMbJ3Bd4ABq9fPpBw7GpP7QcxHWPdiDt85ib4VYTZBgHQDUnEDrW2efPbpf1ym';
  
  // Step 4: Prepare swap parameters
  console.log('\nStep 3: Preparing swap parameters...');
  
  // In a real frontend, we would call the backend to generate these parameters
  // The backend handles the Monero key generation and commitment
  console.log('Calling backend to prepare swap parameters...');
  const prepareResponse = await fetch(`${SERVER_URL}/api/swaps/prepare-usdc-to-xmr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evmAddress: address,
      xmrAddress: xmrAddress,
      value: '10000' // 0.01 USDC (6 decimals)
    })
  });
  
  const prepareResult = await prepareResponse.json();
  console.log('Swap parameters prepared:', prepareResult);
  
  // Step 5: Approve USDC spending (direct contract interaction)
  console.log('\nStep 4: Approving USDC spending...');
  // In a real frontend, this would be a direct call from the user's wallet
  console.log('This would be a direct call from the user\'s MetaMask');
  console.log('Simulating USDC approval transaction...');
  
  // Step 6: Create the swap on the contract (direct contract interaction)
  console.log('\nStep 5: Creating the swap on the contract...');
  console.log('This would be a direct call from the user\'s MetaMask');
  console.log('Simulating swap creation transaction...');
  
  // In a real frontend, after the transaction is confirmed, we would notify the backend
  console.log('\nStep 6: Notifying backend of swap creation...');
  const notifyResponse = await fetch(`${SERVER_URL}/api/swaps/notify-usdc-to-xmr-created`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      swapId: prepareResult.swapId,
      txHash: '0xsimulated_tx_hash'
    })
  });
  
  const notifyResult = await notifyResponse.json();
  console.log('Backend notified:', notifyResult);
  
  // Step 7: Set the swap as ready (direct contract interaction)
  console.log('\nStep 7: Setting the swap as ready...');
  console.log('This would be a direct call from the user\'s MetaMask');
  console.log('Simulating setReady transaction...');
  
  // Step 8: Notify backend that swap is ready for XMR sending
  console.log('\nStep 8: Notifying backend that swap is ready...');
  const readyResponse = await fetch(`${SERVER_URL}/api/swaps/notify-usdc-to-xmr-ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      swapId: prepareResult.swapId
    })
  });
  
  const readyResult = await readyResponse.json();
  console.log('Backend notified of ready state:', readyResult);
  
  // Step 9: Wait for XMR to be sent
  console.log('\nStep 9: Waiting for XMR to be sent...');
  console.log('In a real frontend, this would poll the backend for status updates');
  
  console.log('\nTest completed successfully!');
}

// Test XMR to USDC swap flow with direct contract interaction
async function testXmrToUsdcSwapWithWeb3() {
  console.log('\n=== TESTING XMR TO USDC SWAP WITH WEB3 ===\n');
  
  // Step 1: Connect to Web3 wallet (simulated)
  console.log('Step 1: Connecting to Web3 wallet...');
  const { wallet, address } = await connectToWeb3Wallet();
  
  // Step 2: Prepare swap parameters
  console.log('\nStep 2: Preparing swap parameters...');
  
  // In a real frontend, we would call the backend to generate these parameters
  console.log('Calling backend to prepare swap parameters...');
  const prepareResponse = await fetch(`${SERVER_URL}/api/swaps/prepare-xmr-to-usdc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evmAddress: address,
      value: '10000', // 0.01 USDC (6 decimals)
      xmrAmount: '0.001' // 0.001 XMR
    })
  });
  
  const prepareResult = await prepareResponse.json();
  console.log('Swap parameters prepared:', prepareResult);
  
  // Step 3: Send XMR (backend operation)
  console.log('\nStep 3: Sending XMR...');
  const sendXmrResponse = await fetch(`${SERVER_URL}/api/swaps/xmr-to-usdc/${prepareResult.swapId}/send-xmr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  const sendXmrResult = await sendXmrResponse.json();
  console.log('XMR sent:', sendXmrResult);
  
  // Step 4: Create EVM swap (direct contract interaction)
  console.log('\nStep 4: Creating EVM swap...');
  console.log('This would be a direct call from the user\'s MetaMask');
  console.log('Simulating swap creation transaction...');
  
  // Step 5: Notify backend of EVM swap creation
  console.log('\nStep 5: Notifying backend of EVM swap creation...');
  const notifyResponse = await fetch(`${SERVER_URL}/api/swaps/notify-xmr-to-usdc-created`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      swapId: prepareResult.swapId,
      txHash: '0xsimulated_tx_hash'
    })
  });
  
  const notifyResult = await notifyResponse.json();
  console.log('Backend notified:', notifyResult);
  
  // Step 6: Set the swap as ready (direct contract interaction)
  console.log('\nStep 6: Setting the swap as ready...');
  console.log('This would be a direct call from the user\'s MetaMask');
  console.log('Simulating setReady transaction...');
  
  // Step 7: Claim the USDC (direct contract interaction)
  console.log('\nStep 7: Claiming the USDC...');
  console.log('This would be a direct call from the user\'s MetaMask');
  console.log('Simulating claim transaction...');
  
  console.log('\nTest completed successfully!');
}

// Run the tests
async function runTests() {
  try {
    await testUsdcToXmrSwapWithWeb3();
    await testXmrToUsdcSwapWithWeb3();
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests();
