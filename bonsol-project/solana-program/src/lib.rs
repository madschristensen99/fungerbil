use anchor_lang::prelude::*;
use bonsol_anchor_sdk::{Bonsol, ExecutionConfig, create_executable_account};

declare_id!("He11oZK1111111111111111111111111111111111111");

#[program]
pub mod bonsol_verifier {
    use super::*;

    pub fn verify_hello_proof(ctx: Context<VerifyHello>, name: String, greeting: String) -> Result<()> {
        let execution_config = ExecutionConfig {
            image_id: *b"say_hello\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0",
            execution_fees: 100_000,
            max_cycles: 1_000_000,
            inputs_commitment: None,
            input_signature_required: false,
        };

        msg!("Verifying greeting: {} for name: {}", greeting, name);

        let verified_greeting = &mut ctx.accounts.verified_greeting;
        verified_greeting.name = name;
        verified_greeting.greeting = greeting;
        verified_greeting.verified_at = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn get_verified_greeting(ctx: Context<GetVerifiedGreeting>) -> Result<GreetingData> {
        let account = &ctx.accounts.verified_greeting;
        Ok(GreetingData {
            name: account.name.clone(),
            greeting: account.greeting.clone(),
            verified_at: account.verified_at,
        })
    }
}

#[derive(Accounts)]
pub struct VerifyHello<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + GreetingAccount::SIZE,
        seeds = [b"greeting", payer.key().as_ref()],
        bump
    )]
    pub verified_greeting: Account<'info, GreetingAccount>,

    #[account(mut)]
    pub execution_config: AccountInfo<'info>,

    pub bonsol_program: Program<'info, Bonsol>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetVerifiedGreeting<'info> {
    #[account(seeds = [b"greeting", verifier.key().as_ref()], bump)]
    pub verified_greeting: Account<'info, GreetingAccount>,
    pub verifier: Signer<'info>,
}

#[account]
pub struct GreetingAccount {
    pub name: String,
    pub greeting: String,
    pub verified_at: i64,
}

impl GreetingAccount {
    pub const SIZE: usize = 32 + 100 + 8 + 8; // Conservative estimate
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct GreetingData {
    pub name: String,
    pub greeting: String,
    pub verified_at: i64,
}