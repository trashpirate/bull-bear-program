
use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use anchor_spl::token::{spl_token, transfer, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::{spl_associated_token_account, AssociatedToken};

use crate::errors::BullBearProgramError;
use crate::states::*;

pub fn end_round(ctx: Context<EndRoundContext>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let round = &mut ctx.accounts.round;

    // check game authority
    require!(game.game_authority == *ctx.accounts.game_authority.key, BullBearProgramError::SignerNotAuthorized);
    // check if round active
    require!(round.status == RoundStatus::Active, BullBearProgramError::RoundNotActive);
    // check if betting open
    require!(round.betting == BettingStatus::Closed, BullBearProgramError::BettingNeedsToBeClosed);

    // check if round has ended
    let clock = Clock::get()?;
    let end_time = clock.unix_timestamp;
    require!((round.end_time) <= end_time, BullBearProgramError::BettingPhaseNotEnded);

    let price_update = &mut ctx.accounts.price_update;

    
    let price = price_update.get_price_no_older_than(
        &Clock::get()?,
        MAXIMUM_AGE,
        &game.feed_id,
    )?;
    
    let sol_price = price.price;

    round.end_price = sol_price;
    round.end_time = end_time;
    if round.start_price < sol_price {
        round.result = PriceMovement::Bull;
    }
    else if round.start_price > sol_price {
        round.result = PriceMovement::Bear;
    }
    else {
        round.result = PriceMovement::NoChange;

        // get token balance
        let amount = ctx.accounts.round_vault.amount;

        // transfer tokens back to game vault
        let game_id = game.key();
        let round_ref = round.round_nr.to_le_bytes();
        let bump = round.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[ROUND_SEED.as_bytes(),
            game_id.as_ref(),
            round_ref.as_ref(), &[bump]]];
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer{from: ctx.accounts.round_vault.to_account_info(), to: ctx.accounts.game_vault.to_account_info(), authority: round.to_account_info()},
            signer_seeds
        );
        
        transfer(cpi_context, amount)?;
    }
    
    round.status = RoundStatus::Ended;
    game.counter += 1;

    msg!("Round ended with: {:?}", sol_price);
    Ok(())
}


#[derive(Accounts)]
pub struct EndRoundContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [
            GAME_SEED.as_bytes(),
            game_authority.key().as_ref(),
            game.protocol.as_ref(),
            game.token.as_ref(),
            game.feed_account.as_ref()
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

     #[account(
        constraint = mint.key() == game.token @ BullBearProgramError::InvalidMintAccount
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = round,
    )]
    pub round_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = game,
    )]
    pub game_vault: Account<'info, TokenAccount>,

    #[account(address = game.feed_account)]
    pub price_update: Account<'info, PriceUpdateV2>,

    #[account(address = spl_token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = spl_associated_token_account::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}