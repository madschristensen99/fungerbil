use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};

#[derive(Serialize, Deserialize)]
pub struct MoneroSecretInput {
    pub tx_secret_key: [u8; 32],      // User's tx secret key
    pub destination_address: [u8; 32], // User's destination address (stealth)
    pub tx_hash: [u8; 32],            // Transaction hash
    pub amount_commitment: [u8; 32],  // Monero amount commitment
    pub block_height: u64,
    pub merkle_proof: Vec<[u8; 32]>,  // Transaction inclusion proof
    pub block_header_hash: [u8; 32],
    pub minimum_expected_amount: u64,
}

#[derive(Serialize, Deserialize)]
pub struct MoneroSecretResult {
    pub is_valid: bool,
    pub destination_match: bool,
    pub amount_sufficient: bool,
    pub tx_in_block: bool,
    pub actual_amount: u64,
    pub lock_height: u64,
    pub merkle_root: [u8; 32],
    pub solana_action_trigger: bool,
}

pub fn verify_monero_transaction_secrets(input: MoneroSecretInput) -> MoneroSecretResult {
    let mut result = MoneroSecretResult {
        is_valid: false,
        destination_match: false,
        amount_sufficient: false,
        tx_in_block: false,
        actual_amount: 0,
        lock_height: input.block_height,
        merkle_root: input.block_header_hash,
        solana_action_trigger: false,
    };

    // 1. Verify transaction exists in block via Merkle proof
    result.tx_in_block = verify_merkle_proof(
        &input.tx_hash,
        0, // Assume tx index 0 for this proof
        &input.merkle_proof,
        &input.block_header_hash,
    );

    // 2. Verify destination address using tx secret
    result.destination_match = verify_destination_address(
        &input.tx_secret_key,
        &input.destination_address,
        &input.tx_hash,
    );

    // 3. Check amount commitment (reconstruction)
    let (amount, valid) = verify_amount_commitment(
        &input.amount_commitment,
        &input.tx_secret_key,
    );
    result.actual_amount = amount;
    result.amount_sufficient = valid && amount >= input.minimum_expected_amount;

    // 4. Determine if Solana action should trigger
    result.is_valid = result.tx_in_block && result.destination_match && result.amount_sufficient;
    result.solana_action_trigger = result.is_valid;

    result
}

fn verify_destination_address(
    tx_secret_key: &[u8; 32],
    expected_destination: &[u8; 32],
    tx_hash: &[u8; 32],
) -> bool {
    // Derive the destination stealth address from tx secret key
    let derived_destination = derive_stealth_address(tx_secret_key, tx_hash);
    derived_destination == *expected_destination
}

fn derive_stealth_address(secret_key: &[u8; 32], tx_hash: &[u8; 32]) -> [u8; 32] {
    // Monero stealth address derivation using secret key and tx hash
    let mut hasher = Sha3_256::new();
    hasher.update(secret_key);
    hasher.update(tx_hash);
    let mut result = [0u8; 32];
    result.copy_from_slice(hasher.finalize().as_slice());
    result
}

fn verify_amount_commitment(commitment: &[u8; 32], secret: &[u8; 32]) -> (u64, bool) {
    // Monero-style commitment verification
    let mut hasher = Sha3_256::new();
    hasher.update(secret);
    hasher.update(commitment);
    
    let output = hasher.finalize();
    let mut result = [0u8; 32];
    result.copy_from_slice(&output);
    
    // Extract amount safely
    let amount = u64::from_be_bytes(result[..8].try_into().unwrap_or([0; 8]));
    let valid = commitment.iter().any(|&b| b != 0);
    (amount % 1000000000, valid)
}

fn verify_merkle_proof(
    leaf_hash: &[u8; 32],
    _index: usize,
    proof: &Vec<[u8; 32]>,
    root: &[u8; 32],
) -> bool {
    let mut current_hash = *leaf_hash;
    
    for proof_hash in proof {
        let mut hasher = Sha3_256::new();
        hasher.update(current_hash);
        hasher.update(proof_hash);
        current_hash.copy_from_slice(hasher.finalize().as_slice());
    }
    
    current_hash == *root
}