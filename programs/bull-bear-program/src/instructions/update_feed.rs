use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::get_feed_id_from_hex;

use crate::states::*;

// this is mainly for testing as I havne't figured out how to run a mock oracle for the price
pub fn update_feed(ctx: Context<UpdateFeedContext>, feed_id: String) -> Result<()> {

    let game = &mut ctx.accounts.game;

    game.feed_id = get_feed_id_from_hex(&feed_id)?;

    msg!("Feed updated.");
    Ok(())
}


#[derive(Accounts)]
pub struct UpdateFeedContext<'info> {
    #[account(mut)]
    pub game_authority: Signer<'info>,
     #[account(
        seeds = [
            PROTOCOL_SEED.as_bytes(),
            protocol.authority.key().as_ref()
            ],
        bump = protocol.bump,
    )]
    pub protocol: Account<'info, Protocol>,
    #[account(
        mut,
        seeds = [
            // may need additional seed so one account can have multiple games with same duration
            GAME_SEED.as_bytes(),
            game_authority.key().as_ref(),
            protocol.key().as_ref(),
            game.round_interval.to_le_bytes().as_ref(),
            game.token.as_ref(),
            ],
        bump = game.bump)]
    pub game: Account<'info, Game>
}