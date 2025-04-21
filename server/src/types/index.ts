// Swap direction enum
export enum SwapDirection {
  USDC_TO_XMR = 'USDC_TO_XMR',
  XMR_TO_USDC = 'XMR_TO_USDC'
}

// Swap status enum (matches the contract's Stage enum)
export enum SwapStatus {
  INVALID = 0,
  PENDING = 1,
  READY = 2,
  COMPLETED = 3
}

// Swap data interface
export interface SwapData {
  id: string;                    // Swap ID (keccak256 hash of the swap parameters)
  direction: SwapDirection;      // Swap direction
  status: SwapStatus;            // Current swap status
  owner: string;                 // Alice's address (swap initiator)
  claimer: string;               // Bob's address (swap claimer)
  claimCommitment: string;       // Commitment for claim secret
  refundCommitment: string;      // Commitment for refund secret
  timeout1: number;              // First timeout timestamp
  timeout2: number;              // Second timeout timestamp
  asset: string;                 // Token address (or 0x0 for native currency)
  value: string;                 // Amount to swap
  nonce: string;                 // Random nonce
  xmrAddress?: string;           // XMR address for receiving funds
  xmrAmount?: string;            // XMR amount
  xmrPaymentId?: string;         // XMR payment ID (if applicable)
  createdAt: number;             // Timestamp when the swap was created
  updatedAt: number;             // Timestamp when the swap was last updated
}

// Monero wallet interface
export interface MoneroWalletInfo {
  address: string;               // Primary address
  seed: string;                  // Mnemonic seed phrase
  height: number;                // Current blockchain height
  balance: string;               // Total balance
  unlockedBalance: string;       // Unlocked balance
}

// EVM transaction interface
export interface EvmTransaction {
  hash: string;                  // Transaction hash
  from: string;                  // Sender address
  to: string;                    // Recipient address
  value: string;                 // Transaction value
  data: string;                  // Transaction data
  gasLimit: string;              // Gas limit
  gasPrice: string;              // Gas price
  nonce: number;                 // Transaction nonce
  chainId: number;               // Chain ID
}

// API response interface
export interface ApiResponse<T> {
  success: boolean;              // Whether the request was successful
  data?: T;                      // Response data
  error?: string;                // Error message
  timestamp: number;             // Response timestamp
}

// Swap creation request interface
export interface CreateSwapRequest {
  direction: SwapDirection;      // Swap direction
  claimer: string;               // Bob's address
  value: string;                 // Amount to swap
  xmrAddress?: string;           // XMR address for receiving funds
  timeoutDuration1?: number;     // Optional custom timeout duration 1
  timeoutDuration2?: number;     // Optional custom timeout duration 2
}

// Swap claim request interface
export interface ClaimSwapRequest {
  swapId: string;                // Swap ID
  secret: string;                // Secret key for claiming
}

// Swap refund request interface
export interface RefundSwapRequest {
  swapId: string;                // Swap ID
  secret: string;                // Secret key for refunding
}

// Contract event interface
export interface ContractEvent {
  name: string;                  // Event name
  args: any;                     // Event arguments
  blockNumber: number;           // Block number
  transactionHash: string;       // Transaction hash
  timestamp: number;             // Event timestamp
}
