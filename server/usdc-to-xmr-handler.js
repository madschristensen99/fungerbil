// USDC to XMR swap handler - Implementing Athanor atomic swap protocol
// In this flow, Alice has ETH/USDC and wants XMR, Bob has XMR and wants ETH/USDC
import { ethers } from 'ethers';
import moneroTs from 'monero-ts';
import crypto from 'crypto';
import { createProviderWithTimeout, createWallet, createWalletWithNonceManagement } from './evm-config.js';
import { getMoneroWallet } from './monero-wallet-service.js';
import { generateMoneroKeyPair, createSharedMoneroAddress, verifyFundsReceived, claimXmrWithCombinedKeys } from './monero-key-exchange.js';
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
 * Create a new USDC to XMR swap following the Athanor protocol
 * Step 1 of the protocol: Alice deploys a smart contract and locks her ETH/USDC
 * @param {Object} params - Swap parameters
 * @param {string} params.claimer - Claimer address (EVM) - This is Bob's address
 * @param {string} params.value - Amount in USDC (atomic units)
 * @param {string} params.xmrAddress - XMR address to receive funds (Alice's XMR address)
 * @returns {Promise<Object>} Swap details
 */
async function createUsdcToXmrSwap(params) {
  try {
    console.log(`Creating USDC to XMR swap for ${params.value} USDC following Athanor protocol...`);
    
    // In the Athanor protocol, Alice and Bob each generate Monero secret keys
    // Alice's keys will be used to create a shared Monero address with Bob
    console.log('Generating Alice\'s Monero key pair...');
    const aliceMoneroKeys = await generateMoneroKeyPair();
    
    // Generate secrets for the EVM contract
    // In the Athanor protocol:
    // - claimSecret is Bob's secret (s_b)
    // - refundSecret is Alice's secret (s_a)
    console.log('Generating cryptographic secrets for the swap...');
    const refundSecret = generateRandomScalar(); // Alice's secret (s_a)
    const claimSecret = generateRandomScalar();  // Bob's secret (s_b) - In a real implementation, Bob would generate this
    
    // Calculate commitments from the secrets
    const claimCommitment = calculateCommitment(claimSecret);   // P_b
    const refundCommitment = calculateCommitment(refundSecret); // P_a
    
    // Generate a random nonce for the swap
    const nonce = generateNonce();
    
    // Set timeout durations (in seconds) for the two-phase timelock
    // t_0: Before this time, Alice can call Ready() or Refund()
    // t_1: After t_0 but before t_1, Bob can call Claim()
    //      After t_1, Alice can call Refund() again if Bob hasn't claimed
    const timeoutDuration1 = 3600; // 1 hour - time until t_0
    const timeoutDuration2 = 7200; // 2 hours - additional time until t_1
    
    // Connect to the EVM network
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
    console.log(`Alice's USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    
    if (usdcBalance < BigInt(params.value)) {
      throw new Error(`Insufficient USDC balance: ${ethers.formatUnits(usdcBalance, 6)} < ${ethers.formatUnits(params.value, 6)}`);
    }
    
    // Approve the swap creator contract to spend USDC
    console.log('Approving USDC transfer...');
    const approveTx = await usdcContract.approve(SWAP_CREATOR_ADDRESS, params.value);
    await approveTx.wait();
    console.log(`Approval transaction confirmed: ${approveTx.hash}`);
    
    // Create the swap on the EVM chain
    // This deploys the smart contract with the specified parameters
    console.log('Creating swap on the EVM chain...');
    const createSwapTx = await swapCreatorContract.newSwap(
      claimCommitment,  // Bob's public key (P_b)
      refundCommitment, // Alice's public key (P_a)
      params.claimer,   // Bob's EVM address
      timeoutDuration1, // t_0
      timeoutDuration2, // t_1 - t_0
      USDC_ADDRESS,     // Asset being swapped
      params.value,     // Amount of USDC
      nonce             // Unique nonce for this swap
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
      exactTimeout1 = parsedLog.args[3]; // t_0 from the event
      exactTimeout2 = parsedLog.args[4]; // t_1 from the event
      console.log(`Exact t_0 from contract: ${exactTimeout1}`);
      console.log(`Exact t_1 from contract: ${exactTimeout2}`);
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
    
    // Create the swap data including Alice's Monero keys
    const swap = {
      id: swapId,
      owner: wallet.address,          // Alice's EVM address
      claimer: params.claimer,        // Bob's EVM address
      claimCommitment,                // Bob's public key (P_b)
      refundCommitment,               // Alice's public key (P_a)
      timeout1: exactTimeout1,        // t_0
      timeout2: exactTimeout2,        // t_1
      asset: USDC_ADDRESS,
      value: params.value,
      nonce: nonce.toString(),
      xmrAddress: params.xmrAddress,  // Alice's XMR address to receive funds
      xmrAmount,                      // Amount of XMR to receive
      claimSecret,                    // Bob's secret (s_b) - In a real implementation, only Bob would know this
      refundSecret,                   // Alice's secret (s_a)
      aliceMoneroKeys,                // Alice's Monero keys
      bobMoneroPublicKey: null,       // Will be set when Bob provides his public key
      bobMoneroPrivateViewKey: null,  // Will be set when Bob provides his private view key
      sharedMoneroAddress: null,      // Will be set when Bob locks XMR
      status: 'PENDING',              // Initial status
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
      aliceMoneroPublicKey: aliceMoneroKeys.publicSpendKey, // Share this with Bob
      status: 'PENDING',
      message: 'Swap created. Waiting for Bob to lock XMR in the shared address.'
    };
  } catch (error) {
    console.error(`Failed to create USDC to XMR swap: ${error}`);
    throw error;
  }
}

/**
 * Set a USDC to XMR swap as ready following the Athanor protocol
 * Step 3 of the protocol: Alice sees that XMR has been locked and calls Ready()
 * @param {string} swapId - The swap ID
 * @param {Object} params - Additional parameters
 * @param {string} params.bobMoneroPublicKey - Bob's Monero public key
 * @param {string} params.bobMoneroPrivateViewKey - Bob's Monero private view key
 * @param {string} params.sharedMoneroAddress - The shared Monero address where Bob locked XMR
 * @param {string} params.xmrTxHash - Transaction hash of Bob's XMR transfer
 * @returns {Promise<Object>} Updated swap details
 */
async function setUsdcToXmrSwapReady(swapId, params = {}) {
  try {
    console.log(`Setting USDC to XMR swap ${swapId} as ready following Athanor protocol...`);
    
    // Check if the swap exists
    if (!usdcToXmrSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = usdcToXmrSwaps.get(swapId);
    
    // If Bob's Monero keys are provided, update the swap data
    if (params.bobMoneroPublicKey && params.bobMoneroPrivateViewKey) {
      console.log('Updating swap with Bob\'s Monero keys...');
      swap.bobMoneroPublicKey = params.bobMoneroPublicKey;
      swap.bobMoneroPrivateViewKey = params.bobMoneroPrivateViewKey;
    }
    
    // If shared address is provided, update it
    if (params.sharedMoneroAddress) {
      console.log(`Setting shared Monero address: ${params.sharedMoneroAddress}`);
      swap.sharedMoneroAddress = params.sharedMoneroAddress;
    }
    
    // If XMR transaction hash is provided, update it
    if (params.xmrTxHash) {
      console.log(`Setting XMR transaction hash: ${params.xmrTxHash}`);
      swap.xmrTxHash = params.xmrTxHash;
    }
    
    // Verify that Bob has locked the correct amount of XMR in the shared address
    // In the Athanor protocol, Alice can verify this because Bob shared his private view key
    if (swap.sharedMoneroAddress && swap.bobMoneroPrivateViewKey) {
      console.log('Verifying that Bob has locked the correct amount of XMR...');
      
      // Create shared address info using Alice and Bob's keys
      const aliceKeys = {
        publicSpendKey: swap.aliceMoneroPublicKey,
        privateViewKey: swap.aliceMoneroPrivateViewKey || 'dummy_key' // We don't actually need this for testing
      };
      
      const bobKeys = {
        publicSpendKey: swap.bobMoneroPublicKey,
        privateViewKey: swap.bobMoneroPrivateViewKey,
        primaryAddress: swap.sharedMoneroAddress // For testing, we're using Bob's address as the shared address
      };
      
      // Get the shared address info
      const sharedAddressInfo = await createSharedMoneroAddress(aliceKeys, bobKeys);
      
      // Verify that the funds have been received using the shared private view key
      const expectedAmount = BigInt(Math.floor(parseFloat(swap.xmrAmount) * 1e12)); // Convert to atomic units
      const fundsReceived = await verifyFundsReceived(
        sharedAddressInfo.sharedAddress,
        sharedAddressInfo.sharedPrivateViewKey,
        expectedAmount
      );
      
      if (!fundsReceived) {
        throw new Error(`XMR funds not received or incorrect amount at shared address: ${sharedAddressInfo.sharedAddress}`);
      }
      
      console.log('XMR funds verified successfully!');
    } else {
      console.log('Skipping XMR verification - missing shared address or Bob\'s view key');
    }
    
    // Connect to the EVM network
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
    
    // Call the Ready() function on the contract
    // In the Athanor protocol, this allows Bob to proceed with redeeming his ETH/USDC
    console.log('Calling Ready() function on the smart contract...');
    const setReadyTx = await swapCreatorContract.setReady(swapObj);
    await setReadyTx.wait();
    console.log(`Ready() transaction confirmed: ${setReadyTx.hash}`);
    
    // Update the swap status
    swap.status = 'READY';
    swap.updatedAt = Date.now();
    usdcToXmrSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'READY',
      updatedAt: swap.updatedAt,
      message: 'Swap is ready. Bob can now claim the USDC by revealing his secret.'
    };
  } catch (error) {
    console.error(`Failed to set USDC to XMR swap as ready: ${error}`);
    throw error;
  }
}

/**
 * Claim a USDC to XMR swap following the Athanor protocol
 * In the Athanor protocol, there are two claim scenarios:
 * 1. Bob calls Claim() to get his USDC, revealing his secret (s_b)
 * 2. Alice uses Bob's revealed secret to claim the XMR from the shared address
 * 
 * This function handles both scenarios based on the claimerType parameter
 * 
 * @param {string} swapId - The swap ID
 * @param {Object} params - Additional parameters
 * @param {string} params.claimerType - Who is claiming: 'bob' (for USDC) or 'alice' (for XMR)
 * @param {string} params.bobSecret - Bob's secret (s_b), required when Alice is claiming XMR
 * @returns {Promise<Object>} Claim details
 */
async function claimUsdcToXmrSwap(swapId, params = {}) {
  try {
    const claimerType = params.claimerType || 'bob'; // Default to Bob claiming USDC
    console.log(`Claiming USDC to XMR swap ${swapId} as ${claimerType.toUpperCase()}...`);
    
    // Check if the swap exists
    if (!usdcToXmrSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = usdcToXmrSwaps.get(swapId);
    
    // Verify the swap is in the correct state
    if (swap.status !== 'READY' && claimerType === 'bob') {
      throw new Error(`Swap is not ready for Bob to claim. Current status: ${swap.status}`);
    }
    
    if (claimerType === 'bob') {
      // BOB CLAIMING USDC
      console.log('Bob is claiming USDC by revealing his secret...');
      
      // Connect to the EVM network with nonce management
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
      
      // In the Athanor protocol, Bob calls Claim() with his secret (s_b)
      // This reveals his secret, allowing Alice to claim the XMR
      console.log('Calling Claim() function on the smart contract with Bob\'s secret...');
      const claimTx = await swapCreatorContract.claim(swapObj, swap.claimSecret, {
        nonce: nonce
      });
      await claimTx.wait();
      console.log(`Claim transaction confirmed: ${claimTx.hash}`);
      
      // Update the swap status to indicate Bob has claimed his USDC
      swap.status = 'BOB_CLAIMED_USDC';
      swap.updatedAt = Date.now();
      swap.evmClaimTxHash = claimTx.hash;
      usdcToXmrSwaps.set(swapId, swap);
      
      return {
        swapId,
        status: 'BOB_CLAIMED_USDC',
        evmClaimTxHash: claimTx.hash,
        updatedAt: swap.updatedAt,
        message: 'Bob has claimed USDC by revealing his secret. Alice can now claim the XMR.'
      };
    } else if (claimerType === 'alice') {
      // ALICE CLAIMING XMR
      console.log('Alice is claiming XMR using both secrets...');
      
      // In the Athanor protocol, Alice needs both her secret (s_a) and Bob's secret (s_b)
      // to access the XMR locked in the shared address
      
      // Get Bob's secret - either from params or from the swap data
      let bobSecret = params.bobSecret || swap.claimSecret;
      if (!bobSecret) {
        throw new Error('Bob\'s secret is required for Alice to claim XMR');
      }
      
      // Remove '0x' prefix if present in Bob's secret
      if (bobSecret.startsWith('0x')) {
        bobSecret = bobSecret.slice(2);
        console.log(`Removed 0x prefix from Bob's secret: ${bobSecret}`);
      }
      
      // Get Alice's secret from the swap data
      let aliceSecret = swap.refundSecret;
      
      // Remove '0x' prefix if present in Alice's secret
      if (aliceSecret && aliceSecret.startsWith('0x')) {
        aliceSecret = aliceSecret.slice(2);
        console.log(`Removed 0x prefix from Alice's secret: ${aliceSecret}`);
      }
      
      // Verify the swap has the necessary Monero information
      if (!swap.sharedMoneroAddress) {
        throw new Error('Shared Monero address is missing');
      }
      
      // In the Athanor protocol, Alice can now claim the XMR using both secrets
      console.log(`Claiming XMR from shared address ${swap.sharedMoneroAddress} to ${swap.xmrAddress}...`);
      
      // Use the combined keys to claim the XMR
      const claimResult = await claimXmrWithCombinedKeys(
        aliceSecret,           // Alice's private spend key (s_a)
        bobSecret,             // Bob's private spend key (s_b)
        swap.xmrAddress        // Alice's XMR address to receive funds
      );
      
      // Update the swap status
      swap.status = 'COMPLETED';
      swap.updatedAt = Date.now();
      swap.xmrTxHash = claimResult.txHash;
      usdcToXmrSwaps.set(swapId, swap);
      
      return {
        swapId,
        status: 'COMPLETED',
        xmrTxHash: claimResult.txHash,
        amount: claimResult.amount,
        fee: claimResult.fee,
        updatedAt: swap.updatedAt,
        message: 'Alice has successfully claimed the XMR using both secrets. Swap is complete.'
      };
    } else {
      throw new Error(`Invalid claimer type: ${claimerType}. Must be 'bob' or 'alice'.`);
    }
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
/**
 * Refund a USDC to XMR swap following the Athanor protocol
 * In the Athanor protocol, Alice can call Refund() in two scenarios:
 * 1. Before calling Ready() or before t_0 is reached
 * 2. After t_1 if Bob hasn't claimed his ETH/USDC
 * 
 * @param {string} swapId - The swap ID
 * @returns {Promise<Object>} Refund details
 */
async function refundUsdcToXmrSwap(swapId) {
  try {
    console.log(`Refunding USDC to XMR swap ${swapId}...`);
    
    // Check if the swap exists
    if (!usdcToXmrSwaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }
    
    const swap = usdcToXmrSwaps.get(swapId);
    
    // Check if the swap is in a state that allows refund
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const beforeT0 = currentTime < BigInt(swap.timeout1);
    const afterT1 = currentTime > BigInt(swap.timeout2);
    const notReady = swap.status === 'PENDING';
    
    // In the Athanor protocol, Alice can only refund before t_0 or after t_1
    if (!(beforeT0 && notReady) && !afterT1) {
      throw new Error(`Cannot refund at this time. Current status: ${swap.status}, ` +
        `Current time: ${currentTime}, t_0: ${swap.timeout1}, t_1: ${swap.timeout2}`);
    }
    
    // Connect to the EVM network with nonce management
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
    
    // In the Athanor protocol, Alice calls Refund() with her secret (s_a)
    // This reveals her secret, allowing Bob to claim the XMR if he already locked it
    console.log('Calling Refund() function on the smart contract with Alice\'s secret...');
    const refundTx = await swapCreatorContract.refund(swapObj, swap.refundSecret);
    await refundTx.wait();
    console.log(`Refund transaction confirmed: ${refundTx.hash}`);
    
    // Update the swap status
    swap.status = 'REFUNDED';
    swap.updatedAt = Date.now();
    swap.refundTxHash = refundTx.hash;
    usdcToXmrSwaps.set(swapId, swap);
    
    return {
      swapId,
      status: 'REFUNDED',
      refundTxHash: refundTx.hash,
      updatedAt: swap.updatedAt,
      message: 'Alice has refunded the swap by revealing her secret. Bob can claim XMR if he already locked it.'
    };
  } catch (error) {
    console.error(`Failed to refund USDC to XMR swap: ${error}`);
    throw error;
  }
}

export {
  createUsdcToXmrSwap,
  setUsdcToXmrSwapReady,
  claimUsdcToXmrSwap,
  refundUsdcToXmrSwap,
  getUsdcToXmrSwap,
  getAllUsdcToXmrSwaps
};
