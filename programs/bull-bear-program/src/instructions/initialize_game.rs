use anchor_lang::{prelude::*, solana_program};
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token::{Mint, TokenAccount, Token};
use anchor_spl::associated_token::AssociatedToken;
use pyth_solana_receiver_sdk::price_update::get_feed_id_from_hex;

use crate::states::*;

pub fn initialize_game(ctx: Context<InitializeGameContext>, interval: u64, feed_id: String) -> Result<()> {
    
    let game_authority = &ctx.accounts.game_authority;
    let protocol = &ctx.accounts.protocol;
    let initialized_game = &mut ctx.accounts.game;

    initialized_game.protocol = protocol.key();
    initialized_game.game_authority = game_authority.key();
    initialized_game.counter = 0;
    initialized_game.round_interval = interval;

    initialized_game.feed_id = get_feed_id_from_hex(&feed_id)?;
    initialized_game.vault = ctx.accounts.vault.key();
    initialized_game.token = ctx.accounts.mint.key();
    initialized_game.bump = ctx.bumps.game;

    // Transfer SOL from game_authority to protocol
    let ix = system_instruction::transfer(&game_authority.key(), &protocol.key(), protocol.game_fee);
    solana_program::program::invoke(
        &ix,
        &[
            game_authority.to_account_info(),
            protocol.to_account_info(),
        ],
    )?;


    msg!("Game initialized.");
    Ok(())
}


#[derive(Accounts)]
#[instruction(round_interval: i64)]
pub struct InitializeGameContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,
     #[account(
        mut,
        seeds = [
            PROTOCOL_SEED.as_bytes(),
            protocol.authority.key().as_ref()
            ],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,
    #[account(
        init,
        payer = game_authority,
        space = 8 + Game::INIT_SPACE,
        seeds = [
            // this should include the token address
            GAME_SEED.as_bytes(),
            game_authority.key().as_ref(),
            protocol.key().as_ref(),
            round_interval.to_le_bytes().as_ref(),
            mint.key().as_ref(),
            ],
        bump)]
    pub game: Account<'info, Game>,
    // this constraint should also include a check with token address provided as parameter?
    #[account(constraint = mint.mint_authority.is_some())]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = game_authority,
        associated_token::mint = mint,
        associated_token::authority = game,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}