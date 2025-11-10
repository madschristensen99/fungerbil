import { MoneroZKData, ZKProof } from './types';
import { MoneroRPCClient } from './monero-rpc';

// Re-export real implementations
export { createMoneroZKProof as createRealMoneroZKProof, verifyMoneroZKProof as verifyRealMoneroZKProof } from './monero-zk';

// Direct RPC methods for advanced usage
export { MoneroRPCClient } from './monero-rpc';

// Connection utilities
export async function testMoneroConnection(rpcUrl?: string): Promise<boolean> {
  const client = new MoneroRPCClient(rpcUrl);
  return await client.testConnection();
}

// Context for RPC calls
export async function validateTransactionWithRealCrypto(data: MoneroZKData): Promise<{
  valid: boolean;
  transaction: any;
  amountDetails: any;
  blockchainValidated: boolean;
  cryptographicVerified: boolean;
}> {
  const client = new MoneroRPCClient();
  
  try {
    const transaction = await client.getTransaction(data.txHash);
    const amountDetails = await client.getAmountDetails(data.txHash);
    
    const blockchainValidated = await client.verifyTransactionInBlock(data.txHash, data.blockHeight);
    const cryptographicVerified = await client.validateRingSignature(transaction) &&
                                 await client.validateRangeProof(transaction);
    
    const valid = blockchainValidated && 
                  amountDetails.amount === data.amount &&
                  cryptographicVerified;

    return {
      valid,
      transaction,
      amountDetails,
      blockchainValidated,
      cryptographicVerified
    };
  } catch (error) {
    return {
      valid: false,
      transaction: null,
      amountDetails: null,
      blockchainValidated: false,
      cryptographicVerified: false
    };
  }
}

// Configuration
export interface MoneroConfig {
  rpcUrl: string;
  username?: string;
  password?: string;
  network: 'mainnet' | 'stagenet' | 'testnet';
  daemonUrl?: string;
  walletUrl?: string;
}

export function configureMoneroRPC(config: Partial<MoneroConfig>) {
  const urls = {
    mainnet: 'http://node.moneroworld.com:18081',
    stagenet: 'http://stagenet.community.xmr.to:38089',
    testnet: 'http://testnet.moneroworld.com:28081'
  };
  
  const rpcUrl = config.rpcUrl || urls[config.network || 'stagenet'];
  return new MoneroRPCClient(rpcUrl, config.username, config.password);
}