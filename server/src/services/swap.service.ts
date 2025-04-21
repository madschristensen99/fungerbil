import { ethers } from 'ethers';
import moneroService from './monero.service.js';
import evmService from './evm.service.js';
import { generateSecret, generateCommitment, generateNonce, calculateSwapId } from '../utils/crypto.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { SwapData, SwapDirection, SwapStatus, CreateSwapRequest } from '../types/index.js';

class SwapService {
  private swaps: Map<string, SwapData> = new Map();
  private isInitialized: boolean = false;

  /**
   * Initialize the swap service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing swap service...');
      
      // Initialize the Monero and EVM services
      await moneroService.initialize();
      await evmService.initialize();
      
      // Listen for contract events
      await this.setupEventListeners();
      
      this.isInitialized = true;
      logger.info('Swap service initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize swap service: ${error}`);
      throw error;
    }
  }

  /**
   * Set up event listeners for the swap contract
   */
  private async setupEventListeners(): Promise<void> {
    // Listen for New events
    await evmService.listenForEvents('New', (event) => {
      const swapId = event.args[0];
      const claimCommitment = event.args[1];
      const refundCommitment = event.args[2];
      const timeout1 = event.args[3];
      const timeout2 = event.args[4];
      const asset = event.args[5];
      const value = event.args[6];
      
      logger.info(`New swap created with ID: ${swapId}`);
      
      // If we're tracking this swap, update its status
      if (this.swaps.has(swapId)) {
        const swap = this.swaps.get(swapId)!;
        swap.status = SwapStatus.PENDING;
        swap.updatedAt = Date.now();
        this.swaps.set(swapId, swap);
      }
    });
    
    // Listen for Ready events
    await evmService.listenForEvents('Ready', (event) => {
      const swapId = event.args[0];
      
      logger.info(`Swap ${swapId} marked as ready`);
      
      // If we're tracking this swap, update its status
      if (this.swaps.has(swapId)) {
        const swap = this.swaps.get(swapId)!;
        swap.status = SwapStatus.READY;
        swap.updatedAt = Date.now();
        this.swaps.set(swapId, swap);
      }
    });
    
    // Listen for Claimed events
    await evmService.listenForEvents('Claimed', (event) => {
      const swapId = event.args[0];
      const secret = event.args[1];
      
      logger.info(`Swap ${swapId} claimed with secret: ${secret}`);
      
      // If we're tracking this swap, update its status
      if (this.swaps.has(swapId)) {
        const swap = this.swaps.get(swapId)!;
        swap.status = SwapStatus.COMPLETED;
        swap.updatedAt = Date.now();
        this.swaps.set(swapId, swap);
      }
    });
    
    // Listen for Refunded events
    await evmService.listenForEvents('Refunded', (event) => {
      const swapId = event.args[0];
      const secret = event.args[1];
      
      logger.info(`Swap ${swapId} refunded with secret: ${secret}`);
      
      // If we're tracking this swap, update its status
      if (this.swaps.has(swapId)) {
        const swap = this.swaps.get(swapId)!;
        swap.status = SwapStatus.COMPLETED;
        swap.updatedAt = Date.now();
        this.swaps.set(swapId, swap);
      }
    });
  }

  /**
   * Create a new USDC to XMR swap
   * @param request The swap creation request
   * @param privateKey The private key of the swap creator
   * @returns The created swap data
   */
  async createUsdcToXmrSwap(request: CreateSwapRequest, privateKey: string): Promise<SwapData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info('Creating new USDC to XMR swap...');
      
      // Generate secrets and commitments
      const claimSecret = generateSecret();
      const refundSecret = generateSecret();
      const claimCommitment = generateCommitment(claimSecret);
      const refundCommitment = generateCommitment(refundSecret);
      
      // Generate a random nonce
      const nonce = generateNonce().toString();
      
      // Get the signer
      const signer = evmService.getSigner(privateKey);
      
      // Set timeout durations
      const timeoutDuration1 = request.timeoutDuration1 || config.swap.timeoutDuration1;
      const timeoutDuration2 = request.timeoutDuration2 || config.swap.timeoutDuration2;
      
      // Create the swap on the EVM chain
      const { tx, swapId } = await evmService.createSwap(
        signer,
        claimCommitment,
        refundCommitment,
        request.claimer,
        timeoutDuration1,
        timeoutDuration2,
        config.evm.usdcAddress,
        request.value,
        nonce
      );
      
      // Calculate the current and future timestamps
      const now = Math.floor(Date.now() / 1000);
      const timeout1 = now + timeoutDuration1;
      const timeout2 = timeout1 + timeoutDuration2;
      
      // Create the swap data
      const swapData: SwapData = {
        id: swapId,
        direction: SwapDirection.USDC_TO_XMR,
        status: SwapStatus.PENDING,
        owner: signer.address,
        claimer: request.claimer,
        claimCommitment,
        refundCommitment,
        timeout1,
        timeout2,
        asset: config.evm.usdcAddress,
        value: request.value,
        nonce,
        xmrAddress: request.xmrAddress,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Store the swap data
      this.swaps.set(swapId, swapData);
      
      logger.info(`Created USDC to XMR swap with ID: ${swapId}`);
      
      return swapData;
    } catch (error) {
      logger.error(`Failed to create USDC to XMR swap: ${error}`);
      throw error;
    }
  }

  /**
   * Create a new XMR to USDC swap
   * @param request The swap creation request
   * @returns The created swap data and XMR wallet info
   */
  async createXmrToUsdcSwap(request: CreateSwapRequest): Promise<{ swap: SwapData; xmrWallet: any }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info('Creating new XMR to USDC swap...');
      
      // Create a new XMR wallet for the swap
      const xmrWallet = await moneroService.createWallet();
      
      // Generate secrets and commitments
      const claimSecret = generateSecret();
      const refundSecret = generateSecret();
      const claimCommitment = generateCommitment(claimSecret);
      const refundCommitment = generateCommitment(refundSecret);
      
      // Generate a random nonce
      const nonce = generateNonce().toString();
      
      // Set timeout durations
      const timeoutDuration1 = request.timeoutDuration1 || config.swap.timeoutDuration1;
      const timeoutDuration2 = request.timeoutDuration2 || config.swap.timeoutDuration2;
      
      // Calculate the current and future timestamps
      const now = Math.floor(Date.now() / 1000);
      const timeout1 = now + timeoutDuration1;
      const timeout2 = timeout1 + timeoutDuration2;
      
      // Create the swap data
      const swapData: SwapData = {
        id: '', // Will be set after the EVM swap is created
        direction: SwapDirection.XMR_TO_USDC,
        status: SwapStatus.PENDING,
        owner: request.claimer, // In XMR to USDC, the claimer is the EVM address that will receive USDC
        claimer: ethers.ZeroAddress, // Placeholder, will be set when the EVM swap is created
        claimCommitment,
        refundCommitment,
        timeout1,
        timeout2,
        asset: config.evm.usdcAddress,
        value: request.value,
        nonce,
        xmrAddress: xmrWallet.address,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Listen for incoming XMR transactions
      await moneroService.listenForTransactions(xmrWallet.address, async (txHash, amount) => {
        logger.info(`Received ${amount} XMR in transaction ${txHash} for swap`);
        
        // TODO: Implement the logic to create the EVM swap once XMR is received
        // This would typically be done by the user who wants to receive USDC
      });
      
      logger.info(`Created XMR to USDC swap with XMR address: ${xmrWallet.address}`);
      
      return { swap: swapData, xmrWallet };
    } catch (error) {
      logger.error(`Failed to create XMR to USDC swap: ${error}`);
      throw error;
    }
  }

  /**
   * Set a swap as ready
   * @param swapId The ID of the swap to set as ready
   * @param privateKey The private key of the swap owner
   * @returns The updated swap data
   */
  async setSwapReady(swapId: string, privateKey: string): Promise<SwapData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.swaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }

    try {
      logger.info(`Setting swap ${swapId} as ready...`);
      
      const swap = this.swaps.get(swapId)!;
      
      // Get the signer
      const signer = evmService.getSigner(privateKey);
      
      // Ensure the signer is the swap owner
      if (signer.address.toLowerCase() !== swap.owner.toLowerCase()) {
        throw new Error('Only the swap owner can set it as ready');
      }
      
      // Create the swap object for the contract
      const swapObj = {
        owner: swap.owner,
        claimer: swap.claimer,
        claimCommitment: swap.claimCommitment,
        refundCommitment: swap.refundCommitment,
        timeout1: swap.timeout1,
        timeout2: swap.timeout2,
        asset: swap.asset,
        value: swap.value,
        nonce: swap.nonce
      };
      
      // Set the swap as ready on the contract
      await evmService.setSwapReady(signer, swapObj);
      
      // Update the swap status
      swap.status = SwapStatus.READY;
      swap.updatedAt = Date.now();
      this.swaps.set(swapId, swap);
      
      logger.info(`Set swap ${swapId} as ready`);
      
      return swap;
    } catch (error) {
      logger.error(`Failed to set swap as ready: ${error}`);
      throw error;
    }
  }

  /**
   * Claim a swap
   * @param swapId The ID of the swap to claim
   * @param secret The secret to use for claiming
   * @param privateKey The private key of the claimer
   * @returns The updated swap data
   */
  async claimSwap(swapId: string, secret: string, privateKey: string): Promise<SwapData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.swaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }

    try {
      logger.info(`Claiming swap ${swapId}...`);
      
      const swap = this.swaps.get(swapId)!;
      
      // Get the signer
      const signer = evmService.getSigner(privateKey);
      
      // Ensure the signer is the swap claimer
      if (signer.address.toLowerCase() !== swap.claimer.toLowerCase()) {
        throw new Error('Only the swap claimer can claim it');
      }
      
      // Create the swap object for the contract
      const swapObj = {
        owner: swap.owner,
        claimer: swap.claimer,
        claimCommitment: swap.claimCommitment,
        refundCommitment: swap.refundCommitment,
        timeout1: swap.timeout1,
        timeout2: swap.timeout2,
        asset: swap.asset,
        value: swap.value,
        nonce: swap.nonce
      };
      
      // Claim the swap on the contract
      await evmService.claimSwap(signer, swapObj, secret);
      
      // Update the swap status
      swap.status = SwapStatus.COMPLETED;
      swap.updatedAt = Date.now();
      this.swaps.set(swapId, swap);
      
      logger.info(`Claimed swap ${swapId}`);
      
      return swap;
    } catch (error) {
      logger.error(`Failed to claim swap: ${error}`);
      throw error;
    }
  }

  /**
   * Refund a swap
   * @param swapId The ID of the swap to refund
   * @param secret The secret to use for refunding
   * @param privateKey The private key of the owner
   * @returns The updated swap data
   */
  async refundSwap(swapId: string, secret: string, privateKey: string): Promise<SwapData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.swaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }

    try {
      logger.info(`Refunding swap ${swapId}...`);
      
      const swap = this.swaps.get(swapId)!;
      
      // Get the signer
      const signer = evmService.getSigner(privateKey);
      
      // Ensure the signer is the swap owner
      if (signer.address.toLowerCase() !== swap.owner.toLowerCase()) {
        throw new Error('Only the swap owner can refund it');
      }
      
      // Create the swap object for the contract
      const swapObj = {
        owner: swap.owner,
        claimer: swap.claimer,
        claimCommitment: swap.claimCommitment,
        refundCommitment: swap.refundCommitment,
        timeout1: swap.timeout1,
        timeout2: swap.timeout2,
        asset: swap.asset,
        value: swap.value,
        nonce: swap.nonce
      };
      
      // Refund the swap on the contract
      await evmService.refundSwap(signer, swapObj, secret);
      
      // Update the swap status
      swap.status = SwapStatus.COMPLETED;
      swap.updatedAt = Date.now();
      this.swaps.set(swapId, swap);
      
      logger.info(`Refunded swap ${swapId}`);
      
      return swap;
    } catch (error) {
      logger.error(`Failed to refund swap: ${error}`);
      throw error;
    }
  }

  /**
   * Get a swap by ID
   * @param swapId The ID of the swap to get
   * @returns The swap data
   */
  async getSwap(swapId: string): Promise<SwapData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.swaps.has(swapId)) {
      throw new Error(`Swap with ID ${swapId} not found`);
    }

    try {
      // Get the swap from memory
      const swap = this.swaps.get(swapId)!;
      
      // Get the current status from the contract
      const status = await evmService.getSwapStatus(swapId);
      
      // Update the status if it has changed
      if (status !== swap.status) {
        swap.status = status;
        swap.updatedAt = Date.now();
        this.swaps.set(swapId, swap);
      }
      
      return swap;
    } catch (error) {
      logger.error(`Failed to get swap: ${error}`);
      throw error;
    }
  }

  /**
   * Get all swaps
   * @returns All swap data
   */
  async getAllSwaps(): Promise<SwapData[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return Array.from(this.swaps.values());
  }
}

export default new SwapService();
