
use anchor_lang::prelude::*;

use crate::errors::BullBearProgramError;
use crate::states::*;

pub fn close_betting(ctx: Context<CloseBettingContext>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let round = &mut ctx.accounts.round;

    // check game authority
    require!(game.game_authority == *ctx.accounts.game_authority.key, BullBearProgramError::SignerNotAuthorized);
    // check if round active
    require!(round.status == RoundStatus::Active, BullBearProgramError::RoundNotActive);
    // check if betting open
    require!(round.betting == BettingStatus::Open, BullBearProgramError::BettingIsClosed);

    // check if betting phase has ended
    let clock = Clock::get()?;
    require!((round.start_time + i64::from_ne_bytes((game.round_interval / 2).to_ne_bytes()) ) <= clock.unix_timestamp, BullBearProgramError::BettingPhaseNotEnded);

    round.betting = BettingStatus::Closed;

    msg!("Betting closed.");
    Ok(())
}


#[derive(Accounts)]
pub struct CloseBettingContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,
    #[account(
        seeds = [
            GAME_SEED.as_bytes(),
            game_authority.key().as_ref(),
            game.protocol.as_ref(),
            game.round_interval.to_le_bytes().as_ref(),
            game.token.as_ref(),
        ],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [
            ROUND_SEED.as_bytes(),
            game.key().as_ref(),
            game.counter.to_le_bytes().as_ref(),
        ],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,
    pub system_program: Program<'info, System>,
}