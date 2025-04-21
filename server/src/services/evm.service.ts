import { ethers } from 'ethers';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { EvmTransaction, SwapStatus } from '../types/index.js';

// Import ABI from frontend constants
const SWAP_CREATOR_ABI = [
  "function newSwap(bytes32 _claimCommitment, bytes32 _refundCommitment, address payable _claimer, uint256 _timeoutDuration1, uint256 _timeoutDuration2, address _asset, uint256 _value, uint256 _nonce) public payable returns (bytes32)",
  "function setReady(tuple(address payable owner, address payable claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint256 timeout1, uint256 timeout2, address asset, uint256 value, uint256 nonce) _swap) public",
  "function claim(tuple(address payable owner, address payable claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint256 timeout1, uint256 timeout2, address asset, uint256 value, uint256 nonce) _swap, bytes32 _secret) public",
  "function refund(tuple(address payable owner, address payable claimer, bytes32 claimCommitment, bytes32 refundCommitment, uint256 timeout1, uint256 timeout2, address asset, uint256 value, uint256 nonce) _swap, bytes32 _secret) public",
  "function swaps(bytes32) public view returns (uint8)",
  "event New(bytes32 swapID, bytes32 claimKey, bytes32 refundKey, uint256 timeout1, uint256 timeout2, address asset, uint256 value)",
  "event Ready(bytes32 indexed swapID)",
  "event Claimed(bytes32 indexed swapID, bytes32 indexed s)",
  "event Refunded(bytes32 indexed swapID, bytes32 indexed s)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)",
  "function symbol() public view returns (string)"
];

// Define the extended contract transaction type
interface ExtendedContractTransaction extends ethers.ContractTransaction {
  wait: () => Promise<ethers.TransactionReceipt>;
  hash: string;
  from: string;
  to: string;
  value: bigint;
  data: string;
  gasLimit: bigint;
  gasPrice?: bigint;
  nonce: number;
  chainId: bigint;
}

class EvmService {
  private provider: ethers.JsonRpcProvider;
  private swapCreatorContract: ethers.Contract;
  private usdcContract: ethers.Contract;
  private defaultSigner: ethers.Wallet | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the EVM service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing EVM service...');
      
      // Create a provider for the EVM network
      this.provider = new ethers.JsonRpcProvider(config.evm.rpcUrl);
      
      // Create contract instances
      this.swapCreatorContract = new ethers.Contract(
        config.evm.swapCreatorAddress,
        SWAP_CREATOR_ABI,
        this.provider
      );
      
      this.usdcContract = new ethers.Contract(
        config.evm.usdcAddress,
        ERC20_ABI,
        this.provider
      );
      
      // Set up default signer if private key is provided
      if (config.evm.privateKey) {
        this.defaultSigner = new ethers.Wallet(config.evm.privateKey, this.provider);
        logger.info(`Using default signer with address: ${this.defaultSigner.address}`);
      }
      
      // Check if we can connect to the network
      const blockNumber = await this.provider.getBlockNumber();
      logger.info(`Connected to EVM network at block: ${blockNumber}`);
      
      this.isInitialized = true;
      logger.info('EVM service initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize EVM service: ${error}`);
      throw error;
    }
  }

  /**
   * Get a signer for the EVM network
   * @param privateKey The private key to use for signing (optional if default signer is available)
   * @returns The signer
   */
  getSigner(privateKey?: string): ethers.Wallet {
    if (!this.isInitialized) {
      throw new Error('EVM service not initialized');
    }
    
    if (privateKey) {
      return new ethers.Wallet(privateKey, this.provider);
    }
    
    if (this.defaultSigner) {
      return this.defaultSigner;
    }
    
    throw new Error('No private key provided and no default signer available');
  }

  /**
   * Get the swap status from the contract
   * @param swapId The swap ID
   * @returns The swap status
   */
  async getSwapStatus(swapId: string): Promise<SwapStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const status = await this.swapCreatorContract.swaps(swapId);
      return Number(status) as SwapStatus;
    } catch (error) {
      logger.error(`Failed to get swap status: ${error}`);
      throw error;
    }
  }

  /**
   * Create a new swap
   * @param signer The signer to use for the transaction
   * @param claimCommitment The commitment for the claim secret
   * @param refundCommitment The commitment for the refund secret
   * @param claimer The address of the claimer
   * @param timeoutDuration1 The first timeout duration in seconds
   * @param timeoutDuration2 The second timeout duration in seconds
   * @param asset The address of the asset to swap (0x0 for native currency)
   * @param value The amount to swap
   * @param nonce A random nonce
   * @returns The transaction and the swap ID
   */
  async createSwap(
    signer: ethers.Wallet,
    claimCommitment: string,
    refundCommitment: string,
    claimer: string,
    timeoutDuration1: number,
    timeoutDuration2: number,
    asset: string,
    value: string,
    nonce: string
  ): Promise<{ tx: EvmTransaction; swapId: string }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info(`Creating new swap with value ${value}...`);
      
      // Connect the signer to the contract
      const contract = this.swapCreatorContract.connect(signer) as ethers.Contract & {
        newSwap: (
          _claimCommitment: string,
          _refundCommitment: string,
          _claimer: string,
          _timeoutDuration1: number,
          _timeoutDuration2: number,
          _asset: string,
          _value: string,
          _nonce: string,
          overrides?: any
        ) => Promise<ExtendedContractTransaction>
      };
      
      // If the asset is a token, approve the contract to spend it
      if (asset !== ethers.ZeroAddress) {
        const tokenContract = this.usdcContract.connect(signer) as ethers.Contract & {
          allowance: (owner: string, spender: string) => Promise<bigint>,
          approve: (spender: string, amount: string) => Promise<ExtendedContractTransaction>
        };
        
        const allowance = await tokenContract.allowance(signer.address, config.evm.swapCreatorAddress);
        
        if (allowance < BigInt(value)) {
          logger.info(`Approving contract to spend ${value} tokens...`);
          const approveTx = await tokenContract.approve(config.evm.swapCreatorAddress, value);
          await approveTx.wait();
          logger.info(`Approved contract to spend tokens. Transaction hash: ${approveTx.hash}`);
        }
      }
      
      // Create the swap
      const tx = await contract.newSwap(
        claimCommitment,
        refundCommitment,
        claimer,
        timeoutDuration1,
        timeoutDuration2,
        asset,
        value,
        nonce,
        {
          value: asset === ethers.ZeroAddress ? value : 0
        }
      );
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Find the New event in the transaction receipt
      const newEvent = receipt?.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .filter((event: any) => event && event.name === 'New')[0];
      
      if (!newEvent) {
        throw new Error('New event not found in transaction receipt');
      }
      
      const swapId = newEvent.args[0];
      
      logger.info(`Created new swap with ID: ${swapId}. Transaction hash: ${tx.hash}`);
      
      return {
        tx: {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          data: tx.data,
          gasLimit: tx.gasLimit.toString(),
          gasPrice: tx.gasPrice?.toString() || '0',
          nonce: tx.nonce,
          chainId: Number(tx.chainId)
        },
        swapId
      };
    } catch (error) {
      logger.error(`Failed to create swap: ${error}`);
      throw error;
    }
  }

  /**
   * Set a swap as ready
   * @param signer The signer to use for the transaction
   * @param swap The swap parameters
   * @returns The transaction
   */
  async setSwapReady(
    signer: ethers.Wallet,
    swap: any
  ): Promise<EvmTransaction> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info(`Setting swap as ready...`);
      
      // Connect the signer to the contract
      const contract = this.swapCreatorContract.connect(signer) as ethers.Contract & {
        setReady: (swap: any) => Promise<ExtendedContractTransaction>
      };
      
      // Set the swap as ready
      const tx = await contract.setReady(swap);
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      logger.info(`Set swap as ready. Transaction hash: ${tx.hash}`);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        data: tx.data,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        nonce: tx.nonce,
        chainId: Number(tx.chainId)
      };
    } catch (error) {
      logger.error(`Failed to set swap as ready: ${error}`);
      throw error;
    }
  }

  /**
   * Claim a swap
   * @param signer The signer to use for the transaction
   * @param swap The swap parameters
   * @param secret The secret to use for claiming
   * @returns The transaction
   */
  async claimSwap(
    signer: ethers.Wallet,
    swap: any,
    secret: string
  ): Promise<EvmTransaction> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info(`Claiming swap...`);
      
      // Connect the signer to the contract
      const contract = this.swapCreatorContract.connect(signer) as ethers.Contract & {
        claim: (swap: any, secret: string) => Promise<ExtendedContractTransaction>
      };
      
      // Claim the swap
      const tx = await contract.claim(swap, secret);
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      logger.info(`Claimed swap. Transaction hash: ${tx.hash}`);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        data: tx.data,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        nonce: tx.nonce,
        chainId: Number(tx.chainId)
      };
    } catch (error) {
      logger.error(`Failed to claim swap: ${error}`);
      throw error;
    }
  }

  /**
   * Refund a swap
   * @param signer The signer to use for the transaction
   * @param swap The swap parameters
   * @param secret The secret to use for refunding
   * @returns The transaction
   */
  async refundSwap(
    signer: ethers.Wallet,
    swap: any,
    secret: string
  ): Promise<EvmTransaction> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info(`Refunding swap...`);
      
      // Connect the signer to the contract
      const contract = this.swapCreatorContract.connect(signer) as ethers.Contract & {
        refund: (swap: any, secret: string) => Promise<ExtendedContractTransaction>
      };
      
      // Refund the swap
      const tx = await contract.refund(swap, secret);
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      logger.info(`Refunded swap. Transaction hash: ${tx.hash}`);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        data: tx.data,
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        nonce: tx.nonce,
        chainId: Number(tx.chainId)
      };
    } catch (error) {
      logger.error(`Failed to refund swap: ${error}`);
      throw error;
    }
  }

  /**
   * Listen for contract events
   * @param eventName The name of the event to listen for
   * @param callback The callback function to call when an event is emitted
   */
  async listenForEvents(
    eventName: string,
    callback: (event: any) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info(`Setting up polling for ${eventName} events...`);
      
      // Instead of using event filters (which may not be supported by all RPC providers),
      // we'll implement a polling approach to check for events
      
      // Get the current block number
      const currentBlock = await this.provider.getBlockNumber();
      let lastCheckedBlock = currentBlock;
      
      // Set up a polling interval to check for events
      const pollInterval = setInterval(async () => {
        try {
          // Get the latest block number
          const latestBlock = await this.provider.getBlockNumber();
          
          // If there are new blocks, check for events
          if (latestBlock > lastCheckedBlock) {
            logger.debug(`Checking for ${eventName} events from block ${lastCheckedBlock + 1} to ${latestBlock}`);
            
            // Query for events in the range of blocks
            const filter = this.swapCreatorContract.filters[eventName]();
            const events = await this.swapCreatorContract.queryFilter(
              filter,
              lastCheckedBlock + 1,
              latestBlock
            );
            
            // Process each event
            for (const event of events) {
              logger.info(`Found ${eventName} event in block ${event.blockNumber}`);
              
              // Get the block timestamp
              const block = await this.provider.getBlock(event.blockNumber);
              const timestamp = block ? Number(block.timestamp) * 1000 : Date.now();
              
              // Parse the event to get the arguments
              const parsedEvent = this.swapCreatorContract.interface.parseLog(
                {
                  topics: [...event.topics],
                  data: event.data
                }
              );
              
              // Call the callback function with the event data
              callback({
                name: eventName,
                args: parsedEvent ? parsedEvent.args : [],
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp
              });
            }
            
            // Update the last checked block
            lastCheckedBlock = latestBlock;
          }
        } catch (error) {
          logger.error(`Error polling for ${eventName} events: ${error}`);
        }
      }, 15000); // Poll every 15 seconds
      
      // Add a cleanup function to the process
      process.on('SIGINT', () => {
        clearInterval(pollInterval);
        logger.info(`Stopped polling for ${eventName} events`);
      });
      
      logger.info(`Started polling for ${eventName} events every 15 seconds`);
    } catch (error) {
      logger.error(`Failed to set up polling for ${eventName} events: ${error}`);
      throw error;
    }
  }

  /**
   * Get the USDC balance of an address
   * @param address The address to check
   * @returns The USDC balance
   */
  async getUsdcBalance(address: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const balance = await this.usdcContract.balanceOf(address);
      return balance.toString();
    } catch (error) {
      logger.error(`Failed to get USDC balance: ${error}`);
      throw error;
    }
  }

  /**
   * Get the USDC decimals
   * @returns The number of decimals
   */
  async getUsdcDecimals(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const decimals = await this.usdcContract.decimals();
      return Number(decimals);
    } catch (error) {
      logger.error(`Failed to get USDC decimals: ${error}`);
      throw error;
    }
  }
}

export default new EvmService();
