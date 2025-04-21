import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * Generates a random secret for use in atomic swaps
 * @returns The generated secret as a hex string
 */
export function generateSecret(): string {
  // Generate a random 32-byte secret
  const secret = crypto.randomBytes(32);
  return '0x' + secret.toString('hex');
}

/**
 * Derives a public key from a secret (private key)
 * @param secret The secret as a hex string
 * @returns The derived public key as a hex string
 */
export function derivePublicKey(secret: string): string {
  // Remove 0x prefix if present
  const secretWithoutPrefix = secret.startsWith('0x') ? secret.slice(2) : secret;
  
  // Convert to Buffer
  const secretBuffer = Buffer.from(secretWithoutPrefix, 'hex');
  
  // Create a secp256k1 keypair
  const key = crypto.createECDH('secp256k1');
  key.setPrivateKey(secretBuffer);
  
  // Get the public key
  const publicKey = key.getPublicKey('hex', 'uncompressed');
  
  return '0x' + publicKey;
}

/**
 * Generates a commitment from a secret
 * @param secret The secret as a hex string
 * @returns The commitment as a hex string
 */
export function generateCommitment(secret: string): string {
  // Derive the public key from the secret
  const publicKey = derivePublicKey(secret);
  
  // Hash the public key to create the commitment
  return ethers.keccak256(publicKey);
}

/**
 * Verifies that a secret matches a commitment
 * @param secret The secret as a hex string
 * @param commitment The commitment as a hex string
 * @returns True if the secret matches the commitment, false otherwise
 */
export function verifySecret(secret: string, commitment: string): boolean {
  const calculatedCommitment = generateCommitment(secret);
  return calculatedCommitment.toLowerCase() === commitment.toLowerCase();
}

/**
 * Generates a random nonce for use in atomic swaps
 * @returns The generated nonce as a BigInt
 */
export function generateNonce(): bigint {
  // Generate a random 32-byte nonce
  const nonceBytes = crypto.randomBytes(32);
  return BigInt('0x' + nonceBytes.toString('hex'));
}

/**
 * Calculates a swap ID from the swap parameters
 * @param swap The swap parameters
 * @returns The calculated swap ID as a hex string
 */
export function calculateSwapId(swap: any): string {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    [
      'address', // owner
      'address', // claimer
      'bytes32', // claimCommitment
      'bytes32', // refundCommitment
      'uint256', // timeout1
      'uint256', // timeout2
      'address', // asset
      'uint256', // value
      'uint256'  // nonce
    ],
    [
      swap.owner,
      swap.claimer,
      swap.claimCommitment,
      swap.refundCommitment,
      swap.timeout1,
      swap.timeout2,
      swap.asset,
      swap.value,
      swap.nonce
    ]
  ));
}
