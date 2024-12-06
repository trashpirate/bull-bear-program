
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount, Token, Transfer, transfer};
use anchor_spl::associated_token::AssociatedToken;

use crate::errors::BullBearProgramError;
use crate::states::*;

pub fn withdraw_funds(ctx: Context<WithdrawFundsContext>) -> Result<()> {

    let game = &mut ctx.accounts.game;
    let token_balance = ctx.accounts.vault.amount;

    // check if authorized
    require!(game.game_authority == *ctx.accounts.game_authority.key, BullBearProgramError::SignerNotAuthorized);

    // check if funds available
    require!(token_balance > 0, BullBearProgramError::NothingToWithdraw);
    
    // transfer prize
    let game_authority =  *ctx.accounts.game_authority.key;
    let game_protocol = game.protocol;
    let game_interval = game.round_interval.to_le_bytes();
    let bump = game.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[GAME_SEED.as_bytes(),
            game_authority.as_ref(),
            game_protocol.as_ref(),
            game_interval.as_ref(), 
            &[bump]]];
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer{from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.signer_vault.to_account_info(), authority: game.to_account_info()},
        signer_seeds
    );
    
    transfer(cpi_context, token_balance)?;

    msg!("Funds claimed: {}", token_balance);
    Ok(())
}


#[derive(Accounts)]
pub struct WithdrawFundsContext<'info> {
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
        constraint = mint.key() == game.token @ BullBearProgramError::InvalidMintAccount
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = game,
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = game_authority,
    )]
    pub signer_vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}