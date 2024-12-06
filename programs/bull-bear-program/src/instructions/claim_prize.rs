
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token, Transfer, transfer};
use anchor_spl::associated_token::AssociatedToken;

use crate::errors::BullBearProgramError;
use crate::states::*;

pub fn claim_prize(ctx: Context<ClaimPrizeContext>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let round = &mut ctx.accounts.round;
    let bet = &mut ctx.accounts.bet; 

    // check if authorized
    require!(bet.player == *ctx.accounts.player.key, BullBearProgramError::SignerNotAuthorized);
    // check if round ended
    require!(round.status == RoundStatus::Ended, BullBearProgramError::CurrentRoundNotEnded);
    // check if claimable
    require!(round.result == bet.prediction, BullBearProgramError::NoPrizeClaimable);
    // check if already claimed
    require!(bet.claimed == false, BullBearProgramError::PrizeAlreadyClaimed);

    // calculate prize
    let prize_pool = round.total_up + round.total_down;
    let mut prize = 0;
    
    if round.result == PriceMovement::Up && round.total_up > 0 {
        prize = bet.amount  / round.total_up * prize_pool
    }
    else if round.result == PriceMovement::Down && round.total_down > 0 {
        prize = bet.amount  / round.total_down * prize_pool ;
    }
    
    // transfer prize
    let game_id = game.key();
    let round_ref = round.round_nr.to_le_bytes();
    let bump = round.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[ROUND_SEED.as_bytes(),
            game_id.as_ref(),
            round_ref.as_ref(), &[bump]]];
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer{from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.signer_vault.to_account_info(), authority: round.to_account_info()},
        signer_seeds
    );
    
    transfer(cpi_context, prize)?;

    bet.claimed = true;

    msg!("Prize claimed: {}", prize);
    Ok(())
}


#[derive(Accounts)]
pub struct ClaimPrizeContext<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        seeds = [
            GAME_SEED.as_bytes(),
            game.game_authority.as_ref(),
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
            round.round_nr.to_le_bytes().as_ref(),
        ],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,
    #[account(
        mut,
        seeds = [
            BET_SEED.as_bytes(),
            player.key().as_ref(),
            round.key().as_ref()
            ],
        bump = bet.bump)]
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
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}