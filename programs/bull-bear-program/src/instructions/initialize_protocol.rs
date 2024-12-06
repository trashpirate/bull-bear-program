use anchor_lang::prelude::*;

use crate::states::*;

pub fn initialize_protocol(ctx: Context<InitializeProtocolContext>, game_fee: u64) -> Result<()> {
    let initialized_protocol = &mut ctx.accounts.protocol;
    initialized_protocol.authority = ctx.accounts.authority.key();
    initialized_protocol.game_fee = game_fee;
    initialized_protocol.bump = ctx.bumps.protocol;
    msg!("Protocol initialized.");
    Ok(())
}


#[derive(Accounts)]
pub struct InitializeProtocolContext<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8  + Protocol::INIT_SPACE,
        seeds = [
            PROTOCOL_SEED.as_bytes(),
            authority.key().as_ref()
            ],
        bump,
    )]
    pub protocol: Account<'info, Protocol>,
    pub system_program: Program<'info, System>,
}