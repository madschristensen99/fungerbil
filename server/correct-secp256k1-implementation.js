// Correct implementation of the secp256k1 verification method used by the contract
import { ethers } from 'ethers';
import crypto from 'crypto';
import dotenv from 'dotenv';
import * as secp256k1 from '@noble/secp256k1';

// Load environment variables
dotenv.config();

// Constants from the environment
const EVM_RPC_URL = process.env.EVM_RPC_URL;
const SWAP_CREATOR_ADDRESS = process.env.SWAP_CREATOR_ADDRESS;
const EVM_PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;

// Secp256k1 constants from the contract
const GX = '0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798';
const M = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141';

/**
 * Generate a random scalar (private key) for use as a secret
 * @returns {string} A random 32-byte hex string that is valid for secp256k1
 */
function generateRandomScalar() {
  // Generate a random private key that is valid for secp256k1
  const privateKey = secp256k1.utils.randomPrivateKey();
  return '0x' + Buffer.from(privateKey).toString('hex');
}

/**
 * Calculate the commitment from a secret using the same method as the contract
 * This implements the mulVerify function from the Secp256k1 contract
 * @param {string} secret The secret (scalar) in hex format
 * @returns {string} The commitment in hex format
 */
function calculateCommitment(secret) {
  try {
    // Remove '0x' prefix if present
    const secretHex = secret.startsWith('0x') ? secret.slice(2) : secret;
    
    // Convert to Uint8Array
    const secretBytes = Uint8Array.from(Buffer.from(secretHex, 'hex'));
    
    // Generate the public key from the private key (secret)
    const publicKey = secp256k1.getPublicKey(secretBytes, false); // false = uncompressed format
    
    // Hash the public key to get the Ethereum address
    // We need to skip the first byte (0x04) which indicates uncompressed format
    const publicKeyWithoutPrefix = publicKey.slice(1);
    const addressBytes = ethers.keccak256(publicKeyWithoutPrefix);
    
    // Take the last 20 bytes (160 bits) of the hash to get the Ethereum address
    const address = '0x' + addressBytes.slice(-40);
    
    // Pad to 32 bytes (bytes32)
    const commitment = '0x' + address.slice(2).padStart(64, '0');
    
    return commitment;
  } catch (error) {
    console.error(`Error calculating commitment: ${error}`);
    throw error;
  }
}

/**
 * Verify a secret against a commitment using the same method as the contract
 * @param {string} secret The secret (scalar) in hex format
 * @param {string} commitment The commitment in hex format
 * @returns {boolean} True if the secret is valid for the commitment
 */
function verifySecret(secret, commitment) {
  try {
    const calculatedCommitment = calculateCommitment(secret);
    
    // In the contract, the comparison is: uint160(qKeccak) == uint160(qRes)
    // So we need to compare only the lower 160 bits (20 bytes) of the commitments
    const calculatedLower160 = BigInt(calculatedCommitment) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    const commitmentLower160 = BigInt(commitment) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
    
    return calculatedLower160 === commitmentLower160;
  } catch (error) {
    console.error(`Error verifying secret: ${error}`);
    return false;
  }
}

/**
 * Generate a proper secret and commitment pair
 * @returns {Object} An object containing the secret and commitment
 */
function generateSecretAndCommitment() {
  const secret = generateRandomScalar();
  const commitment = calculateCommitment(secret);
  return { secret, commitment };
}

/**
 * Test the secp256k1 verification implementation
 */
async function testSecp256k1Implementation() {
  try {
    console.log('Testing secp256k1 implementation...');
    
    // Generate a proper secret and commitment pair
    const { secret, commitment } = generateSecretAndCommitment();
    console.log('Generated secret and commitment:');
    console.log(`Secret: ${secret}`);
    console.log(`Commitment: ${commitment}`);
    
    // Verify the secret against the commitment
    const isValid = verifySecret(secret, commitment);
    console.log(`Verification result: ${isValid}`);
    
    if (isValid) {
      console.log('✅ Secret verification successful!');
    } else {
      console.log('❌ Secret verification failed!');
    }
    
    // Generate multiple pairs to ensure consistency
    console.log('\nGenerating and verifying multiple pairs...');
    for (let i = 0; i < 5; i++) {
      const pair = generateSecretAndCommitment();
      const valid = verifySecret(pair.secret, pair.commitment);
      console.log(`Pair ${i+1}: Secret=${pair.secret.substring(0, 18)}..., Commitment=${pair.commitment.substring(0, 18)}..., Valid=${valid}`);
    }
    
    // Test verification with an invalid secret
    console.log('\nTesting verification with an invalid secret...');
    const invalidSecret = generateRandomScalar();
    const validPair = generateSecretAndCommitment();
    const invalidResult = verifySecret(invalidSecret, validPair.commitment);
    console.log(`Invalid secret verification result: ${invalidResult}`);
    
    if (!invalidResult) {
      console.log('✅ Invalid secret correctly rejected!');
    } else {
      console.log('❌ Invalid secret incorrectly accepted!');
    }
    
    return { secret, commitment, isValid };
  } catch (error) {
    console.error(`Failed to test secp256k1 implementation: ${error}`);
    throw error;
  }
}

// Export the functions for use in other scripts
export {
  generateRandomScalar,
  calculateCommitment,
  verifySecret,
  generateSecretAndCommitment
};

// Execute the test if this script is run directly
if (process.argv[1].endsWith('correct-secp256k1-implementation.js')) {
  testSecp256k1Implementation()
    .then((result) => {
      console.log('\nSecp256k1 implementation test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
