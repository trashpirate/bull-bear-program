
use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use anchor_spl::token::{spl_token, transfer, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::{spl_associated_token_account, AssociatedToken};

use crate::errors::BullBearProgramError;
use crate::states::*;

pub fn place_bet(ctx: Context<PlaceBetContext>, prediction: PriceMovement, amount: u64) -> Result<()> {

    let round = &mut ctx.accounts.round;
    let bet = &mut ctx.accounts.bet; 

    // check if round active
    require!(round.status == RoundStatus::Active, BullBearProgramError::RoundNotActive);
    // check if betting open
    require!(round.betting == BettingStatus::Open, BullBearProgramError::BettingIsClosed);

    match prediction {
        PriceMovement::Up => {
            round.total_up = round.total_up.checked_add(amount).ok_or(BullBearProgramError::MaximumBetAmountReached)?;
        }
        PriceMovement::Down => {
            round.total_down = round.total_down.checked_add(amount).ok_or(BullBearProgramError::MaximumBetAmountReached)?;
        }
        PriceMovement::None => {
            return Err(BullBearProgramError::InvalidPrediction.into());
        }
        PriceMovement::NoChange => {
            return Err(BullBearProgramError::InvalidPrediction.into());
        }
    }

    bet.player = ctx.accounts.player.key();
    bet.round = round.key();
    bet.prediction = prediction;
    bet.amount = amount;
    bet.claimed = false;
    bet.bump = ctx.bumps.bet;

    // transfer tokens from player to vault
    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer{from: ctx.accounts.signer_vault.to_account_info(), to: ctx.accounts.vault.to_account_info(), authority: ctx.accounts.player.to_account_info()}
    );

    transfer(cpi_context, amount)?;

    round.num_bets += 1;

    msg!("Bet placed: {:?}", amount);
    Ok(())
}


#[derive(Accounts)]
pub struct PlaceBetContext<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        seeds = [
            GAME_SEED.as_bytes(),
            game.game_authority.key().as_ref(),
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
        init,
        payer = player,
        space = 8 + Bet::INIT_SPACE,
        seeds = [
            BET_SEED.as_bytes(),
            player.key().as_ref(),
            round.key().as_ref()
            ],
        bump)]
    pub bet: Account<'info, Bet>,
     #[account(
        constraint = mint.key() == game.token @ BullBearProgramError::InvalidMintAccount
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = round,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = player,
    )]
    pub signer_vault: Account<'info, TokenAccount>,
    
    #[account(address = spl_token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = spl_associated_token_account::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}