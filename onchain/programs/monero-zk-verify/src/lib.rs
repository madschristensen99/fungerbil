use anchor_lang::prelude::*;
use groth16_solana::groth16::{verify_groth16, Groth16Verifier};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLn");

#[program]
pub mod monero_zk_verify {
    use super::*;

    pub fn handler(
        ctx: Context<VerifyMonero>,
        pub_signals: [u128; 4],
        p_a: [[u8; 32]; 2],
        p_b: [[u8; 32]; 4],
        p_c: [[u8; 32]; 2],
    ) -> Result<()> {
        let vk = include_bytes!("../../monero_payment.vk.bin");
        let ok = verify_groth16(&p_a, &p_b, &p_c, &pub_signals, vk)?;
        require!(ok, ErrorCode::InvalidProof);
        
        // store pub_signals hash in PDA for replay protection
        let proof_hash = keccak::hashv(&[
            &pub_signals[0].to_le_bytes(),
            &pub_signals[1].to_le_bytes(),
            &pub_signals[2].to_le_bytes(),
            &pub_signals[3].to_le_bytes(),
        ]);
        
        ctx.accounts.verification_record.proof_hash = proof_hash.0;
        ctx.accounts.verification_record.verified_at = Clock::get()?.unix_timestamp;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyMonero<'info> {
    #[account(init, payer = payer, space = 8 + 32 + 8)]
    pub verification_record: Account<'info, VerificationRecord>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct VerificationRecord {
    pub proof_hash: [u8; 32],
    pub verified_at: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid zero-knowledge proof")]
    InvalidProof,
}