use risc0_zkvm::guest::env;
use monero_verifier::*;

fn main() {
    let input: MoneroProofInput = env::read();
    
    let output = verify_monero_transaction(input);
    
    env::commit(&output);
}