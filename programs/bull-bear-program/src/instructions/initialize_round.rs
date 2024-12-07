use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use anchor_spl::token::{spl_token, Mint, Token, TokenAccount};
use anchor_spl::associated_token::{spl_associated_token_account, AssociatedToken};

use crate::errors::BullBearProgramError;
use crate::states::*;

pub fn initialize_round(ctx: Context<InitializeRoundContext>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let initialized_round = &mut ctx.accounts.round; 

    // check game authority (this I think is not necessary as contraints are already checked.)
    require!(game.game_authority == *ctx.accounts.game_authority.key, BullBearProgramError::SignerNotAuthorized);
    
    initialized_round.game = game.key();
    initialized_round.round_nr = game.counter;
    
    initialized_round.betting = BettingStatus::Closed;
    initialized_round.result = PriceMovement::None;
    initialized_round.status = RoundStatus::Inactive;
    initialized_round.bump = ctx.bumps.round;

    msg!("Round {} initalized.", initialized_round.round_nr.to_string());

    Ok(())
}


#[derive(Accounts)]
pub struct InitializeRoundContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,

    #[account(
        seeds = [
            GAME_SEED.as_bytes(),
            game_authority.key().as_ref(),
            game.protocol.as_ref(),
            game.token.as_ref(),
            game.feed_account.as_ref()
        ],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        init,
        payer = game_authority,
        space = 8 + Round::INIT_SPACE,
        seeds = [
            ROUND_SEED.as_bytes(),
            game.key().as_ref(),
            game.counter.to_le_bytes().as_ref(),
            ],
        bump)]
    pub round: Account<'info, Round>,

    #[account(
        constraint = mint.key() == game.token @ BullBearProgramError::InvalidMintAccount
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = game_authority,
        associated_token::mint = mint,
        associated_token::authority = round,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(address = spl_token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = spl_associated_token_account::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,

}

