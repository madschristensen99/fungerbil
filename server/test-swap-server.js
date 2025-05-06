// Test script for the swap server
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { generateRandomScalar } from './correct-secp256k1-implementation.js';

// Load environment variables
dotenv.config();

// Constants
const SERVER_URL = 'http://localhost:3000';
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
const EVM_RPC_URL = process.env.EVM_RPC_URL;

// Connect to EVM
async function connectToEvm() {
  const provider = new ethers.JsonRpcProvider(EVM_RPC_URL);
  const wallet = new ethers.Wallet(EVM_PRIVATE_KEY, provider);
  const address = await wallet.getAddress();
  console.log(`Connected to EVM with address: ${address}`);
  return { provider, wallet, address };
}

// Test USDC to XMR swap flow
async function testUsdcToXmrSwap() {
  console.log('\n=== TESTING USDC TO XMR SWAP ===\n');
  
  // Step 1: Connect to EVM
  console.log('Step 1: Connecting to EVM...');
  const { address } = await connectToEvm();
  
  // Step 2: Create a USDC to XMR swap
  console.log('\nStep 2: Creating a USDC to XMR swap...');
  const createSwapResponse = await fetch(`${SERVER_URL}/api/swaps/usdc-to-xmr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claimer: address, // Self-swap for testing
      value: '10000', // 0.01 USDC (6 decimals) - smaller amount for testing
      xmrAddress: '59FYw84NrHCJVcaVpe6Pb3MVqi1bRhgAajMbJ3Bd4ABq9fPpBw7GpP7QcxHWPdiDt85ib4VYTZBgHQDUnEDrW2efPbpf1ym' // Test XMR address
    })
  });
  
  const createSwapResult = await createSwapResponse.json();
  console.log('Swap created:', createSwapResult);
  
  const swapId = createSwapResult.swapId;
  
  // Step 3: Set the swap as ready
  console.log('\nStep 3: Setting the swap as ready...');
  const setReadyResponse = await fetch(`${SERVER_URL}/api/swaps/usdc-to-xmr/${swapId}/ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const setReadyResult = await setReadyResponse.json();
  console.log('Swap set as ready:', setReadyResult);
  
  // Step 4: Claim the swap
  console.log('\nStep 4: Claiming the swap...');
  const claimResponse = await fetch(`${SERVER_URL}/api/swaps/usdc-to-xmr/${swapId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const claimResult = await claimResponse.json();
  console.log('Swap claimed:', claimResult);
  
  // Step 5: Get the swap details
  console.log('\nStep 5: Getting the swap details...');
  const getSwapResponse = await fetch(`${SERVER_URL}/api/swaps/usdc-to-xmr/${swapId}`);
  const getSwapResult = await getSwapResponse.json();
  console.log('Swap details:', getSwapResult);
  
  return swapId;
}

// Test XMR to USDC swap flow
async function testXmrToUsdcSwap() {
  console.log('\n=== TESTING XMR TO USDC SWAP ===\n');
  
  // Step 1: Connect to EVM
  console.log('Step 1: Connecting to EVM...');
  const { address } = await connectToEvm();
  
  // Step 2: Create a XMR to USDC swap
  console.log('\nStep 2: Creating a XMR to USDC swap...');
  const createSwapResponse = await fetch(`${SERVER_URL}/api/swaps/xmr-to-usdc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      claimer: address, // Self-swap for testing
      value: '10000', // 0.01 USDC (6 decimals) - smaller amount for testing
      xmrAmount: '0.001' // 0.001 XMR - smaller amount for testing
    })
  });
  
  const createSwapResult = await createSwapResponse.json();
  console.log('Swap created:', createSwapResult);
  
  const swapId = createSwapResult.swapId;
  
  // Step 3: Send XMR for the swap
  console.log('\nStep 3: Sending XMR for the swap...');
  const sendXmrResponse = await fetch(`${SERVER_URL}/api/swaps/xmr-to-usdc/${swapId}/send-xmr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const sendXmrResult = await sendXmrResponse.json();
  console.log('XMR sent:', sendXmrResult);
  
  // Step 4: Create the EVM swap
  console.log('\nStep 4: Creating the EVM swap...');
  const createEvmSwapResponse = await fetch(`${SERVER_URL}/api/swaps/xmr-to-usdc/${swapId}/create-evm-swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const createEvmSwapResult = await createEvmSwapResponse.json();
  console.log('EVM swap created:', createEvmSwapResult);
  
  // Step 5: Set the swap as ready
  console.log('\nStep 5: Setting the swap as ready...');
  const setReadyResponse = await fetch(`${SERVER_URL}/api/swaps/xmr-to-usdc/${swapId}/ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const setReadyResult = await setReadyResponse.json();
  console.log('Swap set as ready:', setReadyResult);
  
  // Step 6: Claim the swap
  console.log('\nStep 6: Claiming the swap...');
  const claimResponse = await fetch(`${SERVER_URL}/api/swaps/xmr-to-usdc/${swapId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const claimResult = await claimResponse.json();
  console.log('Swap claimed:', claimResult);
  
  // Step 7: Get the swap details
  console.log('\nStep 7: Getting the swap details...');
  const getSwapResponse = await fetch(`${SERVER_URL}/api/swaps/xmr-to-usdc/${swapId}`);
  const getSwapResult = await getSwapResponse.json();
  console.log('Swap details:', getSwapResult);
  
  return swapId;
}

// Main function to run the tests
async function runTests() {
  try {
    console.log('Starting swap server tests...');
    
    // Test server is running
    console.log('Checking if server is running...');
    const response = await fetch(SERVER_URL);
    const data = await response.json();
    console.log('Server response:', data.message);
    
    // Test USDC to XMR swap
    const usdcToXmrSwapId = await testUsdcToXmrSwap();
    
    // Test XMR to USDC swap
    const xmrToUsdcSwapId = await testXmrToUsdcSwap();
    
    console.log('\n=== TEST SUMMARY ===');
    console.log(`USDC to XMR Swap ID: ${usdcToXmrSwapId}`);
    console.log(`XMR to USDC Swap ID: ${xmrToUsdcSwapId}`);
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();
