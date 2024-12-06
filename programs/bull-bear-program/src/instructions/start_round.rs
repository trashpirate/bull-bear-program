
use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2, VerificationLevel};
use core::cmp::max;

use crate::errors::BullBearProgramError;
use crate::states::*;


pub fn start_round(ctx: Context<StartRoundContext>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let round = &mut ctx.accounts.round;

    // check game authority
    require!(game.game_authority == *ctx.accounts.game_authority.key, BullBearProgramError::SignerNotAuthorized);
    
    // check if round already started
    require!(round.start_time == 0, BullBearProgramError::RoundAlreadyStarted);
    
    let clock = Clock::get()?;
    round.start_time = clock.unix_timestamp;
    round.end_time = clock.unix_timestamp + i64::from_ne_bytes(game.round_interval.to_ne_bytes());

    let price_update = &mut ctx.accounts.price_update;
    let price = price_update.get_price_no_older_than_with_custom_verification_level(&Clock::get()?,
        max(MAXIMUM_AGE, game.round_interval),
        &game.feed_id,VerificationLevel::Partial{num_signatures: 1})?;
   
    let sol_price = price.price;

    round.start_price = sol_price;
    
    round.status = RoundStatus::Active;
    round.betting = BettingStatus::Open;
    round.result = PriceMovement::None;

    msg!("Round {} started.", round.round_nr.to_string());

    Ok(())
}


#[derive(Accounts)]
pub struct StartRoundContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,
    #[account(
        seeds = [
            GAME_SEED.as_bytes(),
            game_authority.key().as_ref(),
            game.protocol.as_ref(),
            game.round_interval.to_le_bytes().as_ref()
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
    pub price_update: Account<'info, PriceUpdateV2>,
    pub system_program: Program<'info, System>,
}