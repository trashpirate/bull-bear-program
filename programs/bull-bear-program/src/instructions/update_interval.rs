use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

use crate::errors::BullBearProgramError;
use crate::states::*;

pub fn update_interval(ctx: Context<UpdateIntervalContext>, interval: u64) -> Result<()> {
    
    let game = &mut ctx.accounts.game;

    // check game authority (this I think is not necessary as contraints are already checked.)
    require!(game.game_authority == *ctx.accounts.game_authority.key, BullBearProgramError::SignerNotAuthorized);

    // might need some additional check like only when current round not running?

    game.round_interval = interval;

    msg!("Interval updated.");
    Ok(())
}


#[derive(Accounts)]
pub struct UpdateIntervalContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [
            GAME_SEED.as_bytes(),
            game_authority.key().as_ref(),
            game.protocol.as_ref(),
            game.token.as_ref(),
            game.feed_account.as_ref(),
            ],
        bump)]
    pub game: Account<'info, Game>,

     #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,

}