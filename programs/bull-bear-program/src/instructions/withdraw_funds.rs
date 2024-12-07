
use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
use anchor_spl::token::{spl_token, transfer, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::{spl_associated_token_account, AssociatedToken};

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
    let game_token = game.token;
    let game_feed = game.feed_account;
    let bump = game.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[GAME_SEED.as_bytes(),
            game_authority.as_ref(),
            game_protocol.as_ref(),
            game_token.as_ref(), 
            game_feed.as_ref(),
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
            game.token.as_ref(),
            game.feed_account.as_ref()
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

    #[account(address = spl_token::ID)]
    pub token_program: Program<'info, Token>,

    #[account(address = spl_associated_token_account::ID)]
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}