use serde::{Deserialize, Serialize};
use monero::blockdata::block::{Block, BlockHeader};
use monero::blockdata::transaction::Transaction;
use monero::consensus::encode::Encodable;
use sha3::{Digest, Sha3_256};

#[derive(Serialize, Deserialize, Debug)]
pub struct MoneroProofInput {
    pub block_header: BlockHeader,
    pub transaction: Transaction,
    pub merkle_proof: Vec<[u8; 32]>,
    pub transaction_index: u32,
    pub stagenet: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MoneroProofOutput {
    pub tx_hash: [u8; 32],
    pub block_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub is_valid: bool,
    pub height: u64,
    pub timestamp: u64,
}

pub fn verify_monero_transaction(input: MoneroProofInput) -> MoneroProofOutput {
    let mut output = MoneroProofOutput {
        tx_hash: [0u8; 32],
        block_hash: [0u8; 32],
        merkle_root: [0u8; 32],
        is_valid: false,
        height: input.block_header.height,
        timestamp: input.block_header.timestamp,
    };

    // Compute transaction hash
    let mut tx_hasher = Sha3_256::new();
    input.transaction.consensus_encode(&mut tx_hasher).unwrap();
    output.tx_hash.copy_from_slice(tx_hasher.finalize().as_slice());

    // Compute block hash
    let mut block_hasher = Sha3_256::new();
    input.block_header.hashable().encode(&mut block_hasher).unwrap();
    output.block_hash.copy_from_slice(block_hasher.finalize().as_slice());

    // Verify Merkle proof
    output.merkle_root = input.block_header.merkle_root.0;
    output.is_valid = verify_merkle_proof(
        &output.tx_hash,
        input.transaction_index as usize,
        &input.merkle_proof,
        &output.merkle_root,
    );

    output
}

fn verify_merkle_proof(
    leaf_hash: &[u8; 32],
    index: usize,
    proof: &Vec<[u8; 32]>,
    root: &[u8; 32],
) -> bool {
    let mut current_hash = *leaf_hash;
    let mut current_index = index;
    
    for proof_hash in proof {
        let mut hasher = Sha3_256::new();
        
        if current_index % 2 == 0 {
            hasher.update(current_hash);
            hasher.update(proof_hash);
        } else {
            hasher.update(proof_hash);
            hasher.update(current_hash);
        }
        
        current_hash.copy_from_slice(hasher.finalize().as_slice());
        current_index /= 2;
    }
    
    current_hash == *root
}