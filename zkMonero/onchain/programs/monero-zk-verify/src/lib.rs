use anchor_lang::prelude::*;
use groth16_solana::groth16::{verify_groth16, Groth16Verifier};
use sha2::{Sha256, Digest};

declare_id!("MoneroZKVerify111111111111111111111111111111");

#[program]
pub mod monero_zk_verify {
    use super::*;

    pub fn verify_monero_payment(
        ctx: Context<VerifyMonero>,
        pub_signals: [u128; 4],
        p_a: [[u8; 32]; 2],
        p_b: [[u8; 32]; 4],
        p_c: [[u8; 32]; 2],
    ) -> Result<()> {
        let proof_hash = {
            let mut hasher = Sha256::new();
            hasher.update(pub_signals[0].to_le_bytes());
            hasher.update(pub_signals[1].to_le_bytes());
            hasher.update(pub_signals[2].to_le_bytes());
            hasher.update(pub_signals[3].to_le_bytes());
            hasher.finalize()
        };
        
        let proof_hash_bytes = proof_hash.as_ref();
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(proof_hash_bytes);
        let proof_key = Pubkey::from(bytes);
        
        let proof_account = &mut ctx.accounts.proof_account;
        require!(!proof_account.used, ErrorCode::ProofAlreadyUsed);
        
        const VK: &[u8] = &[0; 512]; // Placeholder - will be populated during key generation
        let ok = verify_groth16(&p_a, &p_b, &p_c, &pub_signals, VK)?;
        require!(ok, ErrorCode::InvalidProof);
        
        proof_account.used = true;
        proof_account.pub_signals = pub_signals;
        proof_account.verifier = ctx.accounts.signer.key();
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyMonero<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 32 + 1 + 32,
        seeds = [b"proof", signer.key().as_ref()],
        bump
    )]
    pub proof_account: Account<'info, ProofAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProofAccount {
    pub used: bool,
    pub pub_signals: [u128; 4],
    pub verifier: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Proof already used")]
    ProofAlreadyUsed,
    #[msg("Invalid proof")]
    InvalidProof,
}